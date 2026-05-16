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
  const PORT = Number(process.env.PORT) || 3000;

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

  // Universal SMS Receiver Handler
  const universalSmsHandler = async (req: express.Request, res: express.Response) => {
    try {
      // 1. Extract Credentials
      const apiKey = (req.query.apiKey || req.body.apiKey || req.body.api_key || req.headers['x-api-key'])?.toString().trim();
      const apiSecret = (req.query.apiSecret || req.body.apiSecret || req.body.secret_key || req.headers['x-api-secret'])?.toString().trim();
      
      // 2. Extract SMS Content (Fallback to placeholders if missing)
      const message = (req.body.message || req.body.text || req.body.content || req.body.msg || req.body.SMS_MESSAGE || req.body.body || "")?.toString();
      const sender = (req.body.sender || req.body.from || req.body.phone || req.body.SENDER_NUMBER || req.body.address || "External App")?.toString();
      const deviceId = (req.body.deviceId || req.body.device_id || req.body.DEVICE_ID || req.headers['x-device-id'] || "gateway_api")?.toString();

      console.log(`[SMS RECEIVE] From: ${sender}, Device: ${deviceId}, Msg: ${message?.substring(0, 50)}...`);

      if (!apiKey || !apiSecret) {
        return res.status(400).json({ 
          status: false, 
          success: false,
          message: "API Key এবং Secret Key প্রয়োজন",
          error: "Auth keys missing"
        });
      }

      // 3. Verify User
      const usersRef = collection(db, 'users');
      const qUser = query(usersRef, where('apiKey', '==', apiKey), where('apiSecret', '==', apiSecret), limit(1));
      const userSnap = await getDocs(qUser);
      
      if (userSnap.empty) {
        return res.status(401).json({ 
          status: false, 
          success: false,
          message: "ভুল এপিআই কি অথবা সিক্রেট কি ব্যবহার করা হয়েছে",
          error: "Authentication failed"
        });
      }
      
      const userId = userSnap.docs[0].id;
      const userData = userSnap.docs[0].data() as any;

      // 4. Log Raw SMS immediately (Always log for debugging)
      const rawSmsRef = await addDoc(collection(db, 'raw_sms'), {
        userId,
        deviceId,
        sender,
        message: message || "Structured Data Received",
        timestamp: new Date().toISOString(),
        status: 'received',
        originalBody: JSON.stringify(req.body) // Stored as string for Firestore
      });

      // 5. Extraction Logic (Prioritize structured data from request body)
      let amount = parseFloat(req.body.amount || req.body.amount_tk || req.body.tk || req.body.value || "0");
      let trxId = (req.body.trxId || req.body.transaction_id || req.body.txn_id || req.body.trx_id || req.body.txid || "")?.toString().toUpperCase();
      let provider = (req.body.provider || req.body.method || req.body.type || req.body.gateway || "Unknown")?.toString();

      // If structured data is missing or incomplete, attempt regex extraction from message
      if (message && (amount <= 0 || !trxId || provider === "Unknown")) {
        // Pattern definitions
        const bkashPattern = /You have received (?:Tk )?([\d,]+\.?\d*) from (\d+)\. .*TrxID ([A-Z0-9]+)/i;
        const nagadPattern = /Tk ([\d,]+\.?\d*) Received from (\d+)\. .*TxnID: ([A-Z0-9]+)/i;
        const rocketPattern = /Tk\. ([\d,]+\.?\d*) received from (\d+)\. .*TrxID: ([A-Z0-9]+)/i;

        let match;
        if ((match = message.match(bkashPattern))) {
          if (provider === "Unknown") provider = "bKash";
          if (amount <= 0) amount = parseFloat(match[1].replace(/,/g, ''));
          if (!trxId) trxId = match[3];
        } else if ((match = message.match(nagadPattern))) {
          if (provider === "Unknown") provider = "Nagad";
          if (amount <= 0) amount = parseFloat(match[1].replace(/,/g, ''));
          if (!trxId) trxId = match[3];
        } else if ((match = message.match(rocketPattern))) {
          if (provider === "Unknown") provider = "Rocket";
          if (amount <= 0) amount = parseFloat(match[1].replace(/,/g, ''));
          if (!trxId) trxId = match[3];
        } else {
          // Fallback generic extraction
          if (amount <= 0) {
            const amountMatch = message.match(/(?:Tk|Amount|Tk\.)\s?([\d,]+\.?\d*)/i);
            if (amountMatch) amount = parseFloat(amountMatch[1].replace(/,/g, ''));
          }
          
          if (!trxId) {
            const trxMatch = message.match(/(?:TrxID|TxnID|ID)[:\s]+([A-Z0-9]+)/i);
            if (trxMatch) trxId = trxMatch[1];
          }
        }
      }

      const txData = {
        userId,
        deviceId,
        provider,
        amount,
        trxId: trxId || "EXT_" + Math.random().toString(36).substring(7).toUpperCase(),
        sender,
        message,
        transactionTime: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      // 6. Save Transaction if valid amount/id found
      if (amount > 0 || trxId) {
        // 6.1 Check for duplicate TrxID for this user
        if (trxId) {
          const qDup = query(
            collection(db, 'transactions'), 
            where('userId', '==', userId), 
            where('trxId', '==', trxId),
            limit(1)
          );
          const dupSnap = await getDocs(qDup);
          if (!dupSnap.empty) {
            console.log(`[SMS] Duplicate TrxID detected: ${trxId}`);
            return res.status(200).json({ status: true, message: "Transaction already processed", isDuplicate: true });
          }
        }

        const txRef = await addDoc(collection(db, 'transactions'), txData);
        await updateDoc(doc(db, 'raw_sms', rawSmsRef.id), { status: 'processed', transactionId: txRef.id });

        // 7. Matching Logic (The "Smart Match" Engine)
        const depositRef = collection(db, 'depositRequests');
        
        // Priority 1: Match by TrxID if it exists in a pending request
        let matchedDoc = null;
        if (trxId) {
          const qTrxMatch = query(
            depositRef,
            where('userId', '==', userId),
            where('trxId', '==', trxId),
            where('status', '==', 'pending'),
            limit(1)
          );
          const trxMatchSnap = await getDocs(qTrxMatch);
          if (!trxMatchSnap.empty) {
            matchedDoc = trxMatchSnap.docs[0];
            console.log(`[MATCH] Found by TrxID: ${trxId}`);
          }
        }

        // Priority 2: Match by Amount + Phone if no TrxID match was found
        if (!matchedDoc && amount > 0) {
          const qAmountMatch = query(
            depositRef, 
            where('userId', '==', userId), 
            where('amount', '==', amount), 
            where('status', '==', 'pending')
          );
          
          const amountMatchSnap = await getDocs(qAmountMatch);
          if (!amountMatchSnap.empty) {
            // Precise phone match if possible (last 10 digits to be safe)
            const cleanSender = sender.slice(-10);
            matchedDoc = amountMatchSnap.docs.find(doc => {
              const data = doc.data() as any;
              if (!data.senderPhone) return false; // Don't auto-match if no phone provided in request (too risky for same amount)
              return data.senderPhone.includes(cleanSender);
            }) || null;

            // If still no match and only one pending request exists for this exact amount, match it as fallback
            if (!matchedDoc && amountMatchSnap.size === 1) {
              const singleData = amountMatchSnap.docs[0].data() as any;
              // Only auto-match single if no phone was provided in the request
              if (!singleData.senderPhone) {
                matchedDoc = amountMatchSnap.docs[0];
                console.log(`[MATCH] Found by unique amount: ${amount}`);
              }
            }
          }
        }

        if (matchedDoc) {
          const depositData = matchedDoc.data() as any;
          await updateDoc(doc(db, 'depositRequests', matchedDoc.id), {
            status: 'matched',
            matchedTransactionId: txRef.id,
            matchedAt: new Date().toISOString(),
            // Ensure trxId is saved if it extracted from SMS but wasn't in request
            trxId: depositData.trxId || trxId 
          });

          // 8. Webhook Notification (Server-to-Server)
          const finalWebhookUrl = depositData.webhookUrl || userData.webhookUrl;
          if (finalWebhookUrl) {
            console.log(`[WEBHOOK] Triggering for Request ${matchedDoc.id} to ${finalWebhookUrl}`);
            try {
              const webhookPayload = {
                event: 'payment.confirmed',
                status: 'success',
                requestId: matchedDoc.id,
                externalId: depositData.externalId,
                amount: amount,
                trxId: trxId,
                sender: sender,
                provider: provider,
                timestamp: new Date().toISOString(),
                hash: "to_be_implemented" // In production, add a signing hash here
              };

              await fetch(finalWebhookUrl, {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'X-Gateway-Event': 'payment.confirmed',
                  'X-API-Key': apiKey
                },
                body: JSON.stringify(webhookPayload)
              });
            } catch (err) {
              console.error("[WEBHOOK ERROR]:", err);
            }
          }
        }
      }

      res.json({ 
        status: true, 
        success: true, 
        message: "মেসেজটি সফলভাবে প্রসেস করা হয়েছে", 
        data: txData 
      });
    } catch (error: any) {
      console.error("SMS Processing Error:", error);
      res.status(500).json({ 
        status: false, 
        success: false, 
        error: error.message 
      });
    }
  };

  // Register multiple alias endpoints for maximum compatibility with Android apps
  const smsEndpoints = [
    "/api/v1/store-transaction",
    "/api/v1/sms/receive",
    "/api/v1/receive",
    "/api/v1/callback",
    "/api/v1/sms/webhook",
    "/api/receive",
    "/api/sms"
  ];

  smsEndpoints.forEach(endpoint => {
    app.post(endpoint, universalSmsHandler);
  });


  // Device Connection API for Mobile Apps
  const deviceConnectHandler = async (req: express.Request, res: express.Response) => {
    // Support multiple formats (apiKey/api_key, apiSecret/secret_key)
    // and also check headers just in case
    const apiKey = (req.body.apiKey || req.body.api_key || req.headers['x-api-key'])?.toString().trim();
    const apiSecret = (req.body.apiSecret || req.body.secret_key || req.headers['x-api-secret'])?.toString().trim();
    
    const { deviceName, deviceId, model, version } = req.body;

    if (!apiKey || !apiSecret) {
      return res.status(400).json({ 
        status: false, 
        message: "এপিআই কি এবং সিক্রেট কি প্রদান করুন",
        error_code: "MISSING_KEYS"
      });
    }

    try {
      // 1. Verify credentials
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('apiKey', '==', apiKey), where('apiSecret', '==', apiSecret), limit(1));
      const userSnap = await getDocs(q);

      if (userSnap.empty) {
        return res.status(401).json({ 
          status: false, 
          message: "ভুল এপিআই কি অথবা সিক্রেট কি ব্যবহার করা হয়েছে",
          error_code: "INVALID_CREDENTIALS"
        });
      }

      const userId = userSnap.docs[0].id;
      const userProfile = userSnap.docs[0].data();

      // Check if user is active
      if (userProfile.status === 'inactive' || userProfile.status === 'suspended') {
        return res.status(403).json({ 
          status: false, 
          message: "আপনার একাউন্টটি বর্তমানে বন্ধ আছে। এডমিনের সাথে যোগাযোগ করুন।",
          error_code: "ACCOUNT_SUSPENDED"
        });
      }

      // 2. Register/Update Device
      const devicesRef = collection(db, 'devices');
      let deviceSnap;
      const cleanDeviceId = (deviceId || '').toString().trim();

      if (cleanDeviceId) {
        const qDevice = query(devicesRef, where('userId', '==', userId), where('deviceId', '==', cleanDeviceId), limit(1));
        deviceSnap = await getDocs(qDevice);
      }

      const deviceData = {
        userId,
        name: deviceName || model || "Unknown Device",
        deviceId: cleanDeviceId || `DEV_${Math.random().toString(36).substring(7).toUpperCase()}`,
        deviceToken: `TOK_${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
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
    } catch (error: any) {
      console.error("Device Connection Error:", error);
      res.status(500).json({ 
        status: false, 
        message: "সার্ভারে সমস্যা হয়েছে, আবার চেষ্টা করুন",
        debug: error.message || String(error)
      });
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
