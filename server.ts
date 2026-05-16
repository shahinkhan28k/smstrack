import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, where, getDocs, updateDoc, doc, limit, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

dotenv.config();

// Initialize Firebase for Server-side logic
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // External Website: Create Deposit Request
  app.post("/api/v1/deposit-request", async (req, res) => {
    const { apiKey, amount, senderPhone, provider, webhookUrl, externalId } = req.body;
    
    if (!apiKey || !amount) {
      return res.status(400).json({ error: "Missing required fields (apiKey, amount)" });
    }

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('apiKey', '==', apiKey), limit(1));
      const userSnap = await getDocs(q);
      
      if (userSnap.empty) {
        return res.status(401).json({ error: "Invalid API Key" });
      }
      
      const userId = userSnap.docs[0].id;

      const docRef = await addDoc(collection(db, 'depositRequests'), {
        userId,
        amount: Number(amount),
        senderPhone,
        provider,
        webhookUrl,
        externalId,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      res.json({ status: "success", requestId: docRef.id });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Transaction extraction API (Simulating the endpoint for the Android App)
  app.post("/api/v1/extract-sms", async (req, res) => {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: "Missing message" });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `
          Extract transaction details from this Bangladeshi mobile money SMS: "${message}".
          Return JSON format: 
          {
            "provider": "bKash | Nagad | Rocket | Upay | Unknown",
            "amount": number,
            "trxId": "string",
            "sender": "string",
            "transactionTime": "ISO string if possible, else null",
            "type": "received | sent | cashout | payment"
          }
          Only return the JSON block.
        `
      });

      const responseText = response.text;
      const jsonMatch = responseText?.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        res.json({ status: "success", data });
      } else {
        throw new Error("Could not parse AI response");
      }
    } catch (error) {
      console.error("AI Extraction Error:", error);
      res.status(500).json({ error: "Failed to extract data via AI" });
    }
  });

  app.post("/api/v1/store-transaction", async (req, res) => {
    const { apiKey, apiSecret, message, provider, deviceId } = req.body;
    
    if (!apiKey || !apiSecret || !message) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      // 1. Verify User
      const usersRef = collection(db, 'users');
      const qUser = query(usersRef, where('apiKey', '==', apiKey), where('apiSecret', '==', apiSecret), limit(1));
      const userSnap = await getDocs(qUser);
      
      if (userSnap.empty) {
        return res.status(401).json({ error: "Invalid Credentials" });
      }
      
      const userId = userSnap.docs[0].id;

      // 2. Extract Data (Simplified for prototype, real app uses a parser or Gemini)
      // Example extraction:
      let amount = 0;
      let trxId = "TRX" + Math.random().toString(36).substring(7).toUpperCase();
      let sender = "Unknown";
      
      // Basic regex for demonstration
      const amountMatch = message.match(/tk (\d+\.?\d*)/i) || message.match(/amount[:\s]+(\d+\.?\d*)/i);
      if (amountMatch) amount = parseFloat(amountMatch[1]);
      
      const trxMatch = message.match(/TrxID\s+([A-Z0-9]+)/i) || message.match(/ID:?\s*([A-Z0-9]+)/i);
      if (trxMatch) trxId = trxMatch[1];

      const senderMatch = message.match(/from\s+([0-9]+)/i) || message.match(/sender\s*([0-9]+)/i);
      if (senderMatch) sender = senderMatch[1];

      // 3. Save Transaction
      const txData = {
        userId,
        deviceId: deviceId || "unknown",
        provider: provider || "Unknown",
        amount,
        trxId,
        sender,
        message,
        createdAt: new Date().toISOString()
      };
      
      const txRef = await addDoc(collection(db, 'transactions'), txData);

      // 4. Matching Logic (The "Middleman" core)
      // Find a pending deposit request with same amount (and optionally phone)
      const depositRef = collection(db, 'depositRequests');
      const qMatch = query(
        depositRef, 
        where('userId', '==', userId), 
        where('amount', '==', amount), 
        where('status', '==', 'pending'),
        limit(1)
      );
      
      const matchSnap = await getDocs(qMatch);
      
      if (!matchSnap.empty) {
        const depositDoc = matchSnap.docs[0];
        const depositData = depositDoc.data();
        
        // Update deposit request as matched
        await updateDoc(doc(db, 'depositRequests', depositDoc.id), {
          status: 'matched',
          matchedTransactionId: txRef.id,
          matchedAt: new Date().toISOString()
        });

        // 5. Webhook Call (Simulation)
        if (depositData.webhookUrl) {
          console.log(`[GATEWAY] Triggering webhook for matched transaction: ${depositData.webhookUrl}`);
          // In real production code, use fetch() to ping the webhookURL with depositData and txData
        }
      }

      res.json({ 
        status: "success", 
        data: txData
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to process transaction" });
    }
  });

  // Device Connection API for Mobile Apps
  const deviceConnectHandler = async (req: express.Request, res: express.Response) => {
    // Support both camelCase and snake_case for mobile app compatibility
    const apiKey = req.body.apiKey || req.body.api_key;
    const apiSecret = req.body.apiSecret || req.body.secret_key;
    const { deviceName, deviceId, model, version } = req.body;

    if (!apiKey || !apiSecret) {
      return res.status(400).json({ status: false, message: "এপিআই কি এবং সিক্রেট কি প্রদান করুন (apiKey/api_key, apiSecret/secret_key)" });
    }

    try {
      // 1. Verify credentials
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('apiKey', '==', apiKey), where('apiSecret', '==', apiSecret), limit(1));
      const userSnap = await getDocs(q);

      if (userSnap.empty) {
        return res.status(401).json({ status: false, message: "ভুল এপিআই কি অথবা সিক্রেট কি ব্যবহার করা হয়েছে" });
      }

      const userId = userSnap.docs[0].id;

      // 2. Register/Update Device
      const devicesRef = collection(db, 'devices');
      // If a deviceId is provided by the app, try to find and update it
      let deviceSnap;
      if (deviceId) {
        const qDevice = query(devicesRef, where('userId', '==', userId), where('deviceId', '==', deviceId), limit(1));
        deviceSnap = await getDocs(qDevice);
      }

      const deviceData = {
        userId,
        name: deviceName || model || "Unknown Device",
        deviceId: deviceId || `DEV_${Math.random().toString(36).substring(7).toUpperCase()}`,
        model: model || "Unknown",
        version: version || "1.0.0",
        status: "online",
        lastActive: new Date().toISOString(),
      };

      if (deviceSnap && !deviceSnap.empty) {
        // Update existing
        await updateDoc(doc(db, 'devices', deviceSnap.docs[0].id), deviceData);
      } else {
        // Create new
        await addDoc(devicesRef, deviceData);
      }

      res.json({ 
        status: true, 
        message: "ডিভাইসটি সফলভাবে কানেক্ট করা হয়েছে",
        data: {
          userId,
          deviceName: deviceData.name,
          deviceId: deviceData.deviceId
        }
      });
    } catch (error) {
      console.error("Device Connection Error:", error);
      res.status(500).json({ status: false, message: "সার্ভারে সমস্যা হয়েছে, আবার চেষ্টা করুন" });
    }
  };

  app.get("/api/device/connect", (req, res) => {
    res.json({ 
      status: true, 
      message: "Gateway API logic is running. Use POST to connect devices.",
      endpoints: ["/api/device/connect", "/api/v1/device/connect"]
    });
  });

  app.get("/api/v1/device/connect", (req, res) => {
    res.json({ 
      status: true, 
      message: "Gateway V1 API logic is running. Use POST to connect devices."
    });
  });

  app.get("/api/v1/devices/connect", (req, res) => {
    res.json({ 
      status: true, 
      message: "Gateway V1 Devices API logic is running. Use POST to connect devices."
    });
  });

  app.post("/api/device/connect", deviceConnectHandler);
  app.post("/api/v1/device/connect", deviceConnectHandler);
  app.post("/api/v1/devices/connect", deviceConnectHandler);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
