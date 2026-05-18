import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from './firebase-applet-config.json';

dotenv.config();

// Initialize Firebase Admin for Server-side logic (bypass security rules)
let db: admin.firestore.Firestore;

try {
  if (!admin.apps || admin.apps.length === 0) {
    admin.initializeApp({
      projectId: firebaseConfig.projectId,
    });
  }
  
  const app = admin.apps[0];
  if (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)") {
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  } else {
    db = getFirestore(app);
  }
} catch (e) {
  console.error("Firebase Admin Init Error:", e);
  // Last resort fallback
  db = admin.firestore();
}

const FieldValue = admin.firestore.FieldValue;

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
      const userSnap = await db.collection('users').where('apiKey', '==', apiKey).limit(1).get();
      
      if (userSnap.empty) {
        return res.status(401).json({ error: "Invalid API Key" });
      }
      
      const userId = userSnap.docs[0].id;

      const docRef = await db.collection('depositRequests').add({
        userId,
        amount: Number(amount),
        senderPhone: senderPhone || "",
        provider: provider || "Unknown",
        webhookUrl: webhookUrl || "",
        externalId: externalId || "",
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      res.json({ status: "success", requestId: docRef.id });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Public: Fetch Deposit Request Info for Checkout Page
  app.get("/api/v1/checkout-info/:requestId", async (req, res) => {
    const { requestId } = req.params;
    try {
      const docSnap = await db.collection('depositRequests').doc(requestId).get();
      if (!docSnap.exists) {
        return res.status(404).json({ error: "Request not found" });
      }
      const data = docSnap.data() as any;
      
      // Fetch merchant name
      const userSnap = await db.collection('users').doc(data.userId).get();
      const merchant = !userSnap.exists ? "Merchant" : userSnap.data()?.name;
      const userData = userSnap.exists ? userSnap.data() as any : {};

      // Only return necessary public info
      res.json({
        status: data.status,
        amount: data.amount,
        provider: data.provider,
        externalId: data.externalId,
        merchantName: merchant,
        merchantNumber: !userSnap.exists ? "Contact Business" : (userData[`${data.provider.toLowerCase()}Number`] || "Not Set")
      });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Update Deposit Request with manual TrxID (from checkout page)
  app.post("/api/v1/update-trxid/:requestId", async (req, res) => {
    const { requestId } = req.params;
    const { trxId } = req.body;
    if (!trxId) return res.status(400).json({ error: "Missing TrxID" });

    try {
      await db.collection('depositRequests').doc(requestId).update({ 
        trxId: trxId.toUpperCase().trim(),
        updatedAt: new Date().toISOString()
      });
      res.json({ status: "success" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update TrxID" });
    }
  });

  // System Billing: Create Deposit Request for Adding Funds (with retroactive match check)
  app.post("/api/v1/user-deposit", async (req, res) => {
    const { userId, userName, method, amount, trxId } = req.body;
    if (!userId || !amount || !trxId) return res.status(400).json({ error: "Missing fields" });

    const cleanTrxId = trxId.toUpperCase().trim();
    const cleanAmount = parseFloat(amount);

    try {
      // 1. Fetch transaction by TrxID only (Avoiding multi-operator query index requirement)
      const txSnap = await db.collection('transactions')
        .where('trxId', '==', cleanTrxId)
        .limit(1)
        .get();

      let status = 'pending';
      let matchedAt = null;
      let txIdToMark = null;

      if (!txSnap.empty) {
        const txDoc = txSnap.docs[0];
        const txData = txDoc.data() as any;
        
        // 2. Check if transaction is already used OR amount mismatch
        if (txData.isUsed === true) {
           console.log(`[USER DEPOSIT] TrxID ${cleanTrxId} already used.`);
        } else if (Math.abs(txData.amount - cleanAmount) < 0.1) {
          status = 'approved';
          matchedAt = new Date().toISOString();
          txIdToMark = txDoc.id;
        }
      }

      // 2. Save the deposit request
      const depositRef = await db.collection('userDeposits').add({
        userId,
        userName,
        method,
        amount: cleanAmount,
        trxId: cleanTrxId,
        status,
        matchedAt,
        createdAt: new Date().toISOString()
      });

      // 3. If auto-approved, increment balance and mark transaction as used
      if (status === 'approved') {
        // Mark transaction as USED
        if (txIdToMark) {
          await db.collection('transactions').doc(txIdToMark).update({
            isUsed: true,
            matchedAt: new Date().toISOString(),
            matchedTo: depositRef.id
          });
        }

        await db.collection('users').doc(userId).update({
          balance: FieldValue.increment(cleanAmount)
        });
        console.log(`[RETRO-TOPUP] Auto-approved existing transaction for user: ${userId}`);
      }

      res.json({ status, requestId: depositRef.id });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Helper to notify merchant webhook
  const notifyMerchant = async (userId: string, requestId: string, depositData: any, amount: number, trxId: string, sender: string, provider: string) => {
    try {
      const userSnap = await db.collection('users').doc(userId).get();
      if (!userSnap.exists) return;
      const userData = userSnap.data() as any;
      const apiSecret = userData.apiSecret || 'none';
      const finalWebhookUrl = depositData.webhookUrl || userData.webhookUrl;

      if (finalWebhookUrl) {
        console.log(`[WEBHOOK] Notifying ${finalWebhookUrl} for request ${requestId}`);
        fetch(finalWebhookUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Gateway-Secret': apiSecret
          },
          body: JSON.stringify({
            event: 'payment.confirmed',
            success: true,
            requestId: requestId,
            externalId: depositData.externalId,
            amount: Number(amount),
            trxId: trxId,
            sender: sender || "Unknown",
            provider: provider || "Unknown",
            timestamp: new Date().toISOString(),
            note: "Matched during administrative rescan"
          })
        }).catch(e => console.error("[WEBHOOK ERROR]:", e));
      }
    } catch (e) {
      console.error("[WEBHOOK NOTIFY ERROR]:", e);
    }
  };

  // Admin: Rescan all pending deposits (both system deposits and merchant requests)
  app.post("/api/v1/admin/rescan-deposits", async (req, res) => {
    console.log("[RESCAN] Starting super-rescan...");
    try {
      let matchedCount = 0;
      
      // 1. Pre-fetch all data to avoid O(n^2) database queries in loops
      const [pendingSystemSnap, pendingMerchantSnap, recentTransactionsSnap, recentSmsSnap] = await Promise.all([
        db.collection('userDeposits').where('status', '==', 'pending').get(),
        db.collection('depositRequests').where('status', '==', 'pending').get(),
        db.collection('transactions').limit(500).get(), // Fetch a good window of recent transactions
        db.collection('raw_sms').limit(300).get() // Fetch recent logs for body search
      ]);

      const transactions = recentTransactionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      const smsLogs = recentSmsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

      console.log(`[RESCAN] Loaded ${pendingSystemSnap.size} system and ${pendingMerchantSnap.size} merchant requests.`);
      console.log(`[RESCAN] Matching against ${transactions.length} transactions and ${smsLogs.length} SMS logs.`);

      // Helper for matching logic
      const processRequest = async (docRef: any, data: any, isSystem: boolean) => {
        const trxId = (data.trxId || '').toUpperCase().trim();
        const amount = Number(data.amount);
        const userId = data.userId;
        const senderPhone = (data.senderPhone || '').trim();

        if (!amount) {
          console.log(`[RESCAN] Skipping invalid request ${docRef.id}: Amt=${amount}`);
          return false;
        }

        console.log(`[RESCAN] Attempting match for Request ${docRef.id} (${amount} TK) - TrxID: ${trxId || 'N/A'}`);

        // Strategy A: Match by Exact TrxID (High confidence)
        if (trxId && trxId.length > 5 && !trxId.startsWith('EXT_')) {
          const txSnap = await db.collection('transactions')
            .where('trxId', '==', trxId)
            .limit(1)
            .get();

          if (!txSnap.empty) {
            const txDoc = txSnap.docs[0];
            const txData = txDoc.data() as any;
            
            // Check if amount matches AND it's not already used
            if (txData.isUsed !== true && Math.abs(Number(txData.amount) - amount) < 0.1) {
              console.log(`[RESCAN MATCH] Strategy A: TrxID ${trxId} verified.`);
              
              // Mark the transaction as USED immediately to prevent double usage
              await db.collection('transactions').doc(txDoc.id).update({ 
                isUsed: true, 
                matchedAt: new Date().toISOString(),
                matchedTo: docRef.id 
              });

              if (isSystem) {
                await db.collection('userDeposits').doc(docRef.id).update({
                  status: 'approved',
                  matchedAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  matchingNote: 'Rescan: Matched via Transaction ID'
                });
                await db.collection('users').doc(userId).update({ balance: FieldValue.increment(amount) });
              } else {
                await db.collection('depositRequests').doc(docRef.id).update({
                  status: 'matched',
                  matchedAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  matchedTransactionId: txSnap.docs[0].id,
                  matchingNote: 'Rescan: Matched via Transaction ID'
                });
                
                await notifyMerchant(userId, docRef.id, data, amount, trxId, txData.customerPhone || txData.sender || "Unknown", txData.provider || "Unknown");
              }
              return true;
            }
          }
        }

        // Strategy B: Match by Amount + Phone (Medium confidence)
        if (amount > 0) {
          // Look for transactions with matching amount and NOT used
          const potentialTxs = transactions.filter(tx => 
            Math.abs(tx.amount - amount) < 0.1 && 
            tx.userId === userId &&
            tx.isUsed !== true // SKIP USED ONES
          );

          if (potentialTxs.length > 0) {
            let matchedTx = null;

            // If we have a sender phone, try to match it
            if (senderPhone) {
              const cleanReqPhone = senderPhone.slice(-10);
              matchedTx = potentialTxs.find(tx => {
                const txPhone = (tx.customerPhone || tx.sender || '').slice(-10);
                return txPhone === cleanReqPhone;
              });
            }

            // If still no match but only ONE potential transaction exists for this amount, fuzzy match it
            if (!matchedTx && potentialTxs.length === 1 && (!senderPhone || senderPhone === "")) {
              matchedTx = potentialTxs[0];
            }

            if (matchedTx) {
              console.log(`[RESCAN MATCH] Strategy B: Amount/Phone match for Request ${docRef.id}`);
              const finalTrxId = trxId || matchedTx.trxId;

              // Mark transaction as USED
              await db.collection('transactions').doc(matchedTx.id).update({
                isUsed: true,
                matchedAt: new Date().toISOString(),
                matchedTo: docRef.id
              });
              
              if (isSystem) {
                await db.collection('userDeposits').doc(docRef.id).update({
                  status: 'approved',
                  matchedAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  trxId: finalTrxId,
                  matchingNote: 'Rescan: Matched via Amount/Phone'
                });
                await db.collection('users').doc(userId).update({ balance: FieldValue.increment(amount) });
              } else {
                await db.collection('depositRequests').doc(docRef.id).update({
                  status: 'matched',
                  matchedAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  trxId: finalTrxId,
                  matchedTransactionId: matchedTx.id,
                  matchingNote: 'Rescan: Matched via Amount/Phone'
                });
                
                await notifyMerchant(userId, docRef.id, data, amount, finalTrxId, matchedTx.customerPhone || matchedTx.sender || "Unknown", matchedTx.provider || "Unknown");
              }
              return true;
            }
          }
        }

        // Strategy C: Deep search in raw SMS logs (Last resort)
        if (trxId && trxId.length > 5) {
          const smsMatch = smsLogs.find((sms: any) => {
            const body = (sms.message || '').toUpperCase();
            return body.includes(trxId) && (body.includes(amount.toString()) || body.includes(amount.toLocaleString()));
          });

          if (smsMatch) {
            console.log(`[RESCAN MATCH] Strategy C: Found in raw logs for Request ${docRef.id}`);
            if (isSystem) {
              await db.collection('userDeposits').doc(docRef.id).update({
                status: 'approved',
                matchedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                matchingNote: 'Rescan: Matched via Deep SMS Search'
              });
              await db.collection('users').doc(userId).update({ balance: FieldValue.increment(amount) });
            } else {
              await db.collection('depositRequests').doc(docRef.id).update({
                status: 'matched',
                matchedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                matchingNote: 'Rescan: Matched via Deep SMS Search'
              });

              await notifyMerchant(userId, docRef.id, data, amount, trxId, smsMatch.sender || "Unknown", smsMatch.provider || "Unknown");
            }
            return true;
          }
        }

        return false;
      };

      // 2. Process System Deposits
      for (const d of pendingSystemSnap.docs) {
        try {
          if (await processRequest(d, d.data(), true)) matchedCount++;
        } catch (e) {
          console.error(`[RESCAN ERROR] System Deposit ${d.id}:`, e);
        }
      }

      // 3. Process Merchant Requests
      for (const d of pendingMerchantSnap.docs) {
        try {
          if (await processRequest(d, d.data(), false)) matchedCount++;
        } catch (e) {
          console.error(`[RESCAN ERROR] Merchant Request ${d.id}:`, e);
        }
      }

      // 4. Update Device Offline Statuses (Cleanup)
      try {
        const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        const onlineDevicesSnap = await db.collection('devices').where('status', '==', 'online').get();
        for (const d of onlineDevicesSnap.docs) {
          const data = d.data() as any;
          const lastSeen = data.lastSeen || data.lastActive;
          if (!lastSeen || lastSeen < thirtyMinsAgo) {
            await db.collection('devices').doc(d.id).update({ status: 'offline' });
          }
        }
      } catch (e) {
        console.error("[RESCAN] Device cleanup failed:", e);
      }

      console.log(`[RESCAN COMPLETED] Matches found: ${matchedCount}`);
      res.json({ success: true, matchedCount, message: `Auto-match sequence finished. ${matchedCount} requests resolved.` });
    } catch (error: any) {
      console.error("Critical Rescan failure:", error);
      res.status(500).json({ success: false, error: "Rescan failed", details: error.message });
    }
  });

  // Transaction extraction API (Simulating the endpoint for the Android App)
  app.post("/api/v1/extract-sms", async (req, res) => {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: "Missing message" });
    }

    try {
      const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
      const model = (genAI as any).getGenerativeModel({ 
        model: "gemini-1.5-flash", 
      });

      const prompt = `Extract transaction details from this Bangladeshi mobile money SMS: "${message}".
          Return ONLY JSON format: 
          {
            "provider": "bKash | Nagad | Rocket | Upay | Unknown",
            "amount": number,
            "trxId": "string",
            "sender": "string",
            "transactionTime": "ISO string if possible, else null",
            "type": "received | sent | cashout | payment"
          }`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const responseText = response.text();
      
      const jsonMatch = responseText?.match(/\{[\s\S]*\}/);
      
      if (jsonMatch && jsonMatch.length > 0) {
        const data = JSON.parse(jsonMatch[0]);
        res.json({ status: "success", data });
      } else {
        throw new Error("Could not parse AI response: " + responseText);
      }
    } catch (error) {
      console.error("AI Extraction Error:", error);
      res.status(500).json({ error: "Failed to extract data via AI" });
    }
  });

  // Universal SMS Receiver Handler
  const universalSmsHandler = async (req: express.Request, res: express.Response) => {
    try {
      // 1. Extract Credentials (Support all possible field names used by different apps)
      const apiKey = (req.query.apiKey || req.body.apiKey || req.body.api_key || req.body.API_KEY || req.headers['x-api-key'])?.toString().trim();
      const apiSecret = (req.query.apiSecret || req.body.apiSecret || req.body.secret_key || req.body.API_SECRET || req.headers['x-api-secret'])?.toString().trim();
      
      // 2. Extract SMS Content & Metadata
      const message = (req.body.message || req.body.text || req.body.content || req.body.msg || req.body.SMS_MESSAGE || req.body.body || "")?.toString();
      const sender = (req.body.sender || req.body.from || req.body.phone || req.body.SENDER_NUMBER || req.body.address || req.body.number || req.body.sender_number || "External App")?.toString();
      const deviceId = (req.body.deviceId || req.body.device_id || req.body.DEVICE_ID || req.headers['x-device-id'] || "gateway_api")?.toString();

      console.log(`[HTTP RECEIVE] Device: ${deviceId}, Msg: ${message?.substring(0, 50)}...`);

      // 3. Log into raw_sms FIRST (Even if keys are invalid, we want to see it in logs for debugging)
      let userId = "unknown";
      let userData = null;

      if (apiKey) {
        let qUser;
        if (apiSecret) {
          qUser = db.collection('users').where('apiKey', '==', apiKey).where('apiSecret', '==', apiSecret).limit(1);
        } else {
          // Lenient lookup if secret is missing (Common in some SMS apps)
          qUser = db.collection('users').where('apiKey', '==', apiKey).limit(1);
        }
        
        const userSnap = await qUser.get();
        if (!userSnap.empty) {
          userId = userSnap.docs[0].id;
          userData = userSnap.docs[0].data() as any;
        }
      }

      const rawSmsRef = await db.collection('raw_sms').add({
        userId,
        deviceId,
        sender: sender || "System",
        message: message || "Structured Data Received",
        timestamp: new Date().toISOString(),
        status: 'received',
        originalBody: JSON.stringify(req.body)
      });

      if (userId === "unknown") {
        console.warn(`[AUTH FAILED] Invalid keys provided. Key: ${apiKey?.substring(0, 5)}...`);
        return res.status(200).json({ 
          status: false, 
          success: false,
          message: "মেসেজটি রিসিভ হয়েছে কিন্তু এপিআই কী ভুল থাকায় প্রসেস করা সম্ভব হয়নি। আপনার এপিআই কী ও সিক্রেট কী চেক করুন।",
          error: "Invalid Credentials"
        });
      }

      // 3.5 Check Plan Expiry
      if (userData?.planExpiry) {
        const expiry = new Date(userData.planExpiry);
        if (expiry < new Date()) {
          console.warn(`[PLAN EXPIRED] User: ${userId} attempt with expired plan.`);
          return res.status(200).json({
            status: false,
            success: false,
            message: "আপনার প্যাকেজের মেয়াদ শেষ হয়ে গেছে। দয়া করে রিনিউ করুন।",
            error: "PLAN_EXPIRED"
          });
        }
      }

      // 4. Extraction Logic (Prioritize structured data from request body if app already parsed it)
      let amount = parseFloat(req.body.amount || req.body.amount_tk || req.body.tk || req.body.value || req.body.money || req.body.Price || "0");
      let trxId = (req.body.trxId || req.body.transaction_id || req.body.txn_id || req.body.trx_id || req.body.txid || req.body.tid || req.body.TrxID || "")?.toString().toUpperCase().trim();
      let provider = (req.body.provider || req.body.method || req.body.type || req.body.gateway || req.body.operator || req.body.Provider || "Unknown")?.toString();
      let customerPhone = (req.body.customer_phone || req.body.sender_phone || req.body.phone_number || "")?.toString();

      // If structured data is missing, use Regex from message body
      if (message && (amount <= 0 || !trxId)) {
        // Robust patterns for various providers and languages
        const patterns = [
          // bKash Received (Standard)
          {
            regex: /You have received (?:Tk )?([\d,]+\.?\d*) from (\d+)\. .*TrxID ([A-Z0-9]+)/i,
            amtIdx: 1, phoneIdx: 2, trxIdx: 3, prov: "bKash"
          },
          // bKash Cash In
          {
            regex: /Cash In (?:Tk )?([\d,]+\.?\d*) from (\d+) is successful\. .*TrxID ([A-Z0-9]+)/i,
            amtIdx: 1, phoneIdx: 2, trxIdx: 3, prov: "bKash"
          },
          // bKash Generic
          {
            regex: /received (?:Tk )?([\d,]+\.?\d*).*TrxID ([A-Z0-9]+)/i,
            amtIdx: 1, trxIdx: 2, prov: "bKash"
          },
          // Nagad Received
          {
            regex: /Tk ([\d,]+\.?\d*) Received from (\d+)\. .*TxnID[:\s]+([A-Z0-9]+)/i,
            amtIdx: 1, phoneIdx: 2, trxIdx: 3, prov: "Nagad"
          },
          // Nagad Cash In
          {
            regex: /Cash In (?:Tk )?([\d,]+\.?\d*) from (\d+) successful\. .*TxnID[:\s]+([A-Z0-9]+)/i,
            amtIdx: 1, phoneIdx: 2, trxIdx: 3, prov: "Nagad"
          },
          // Nagad Generic
          {
            regex: /Received (?:Tk )?([\d,]+\.?\d*).*TxnID[:\s]+([A-Z0-9]+)/i,
            amtIdx: 1, trxIdx: 2, prov: "Nagad"
          },
          // Rocket Received
          {
            regex: /Tk\. ([\d,]+\.?\d*) received from (\d+)\. .*TrxID[:\s]+([A-Z0-9]+)/i,
            amtIdx: 1, phoneIdx: 2, trxIdx: 3, prov: "Rocket"
          },
          // Rocket Generic
          {
            regex: /received (?:Tk )?([\d,]+\.?\d*).*TrxID[:\s]+([A-Z0-9]+)/i,
            amtIdx: 1, trxIdx: 2, prov: "Rocket"
          },
          // Upay Received
          {
            regex: /You have received (?:Tk )?([\d,]+\.?\d*) from (\d+)\. .*TrxID ([A-Z0-9]+)/i,
            amtIdx: 1, phoneIdx: 2, trxIdx: 3, prov: "Upay"
          },
          // Generic Payment Matching (Multi-language)
          {
            regex: /(?:Tk|Amount|টাকা|পরিমাণ|পেমেন্ট|রিসিভ)[:\s]*([\d,]+\.?\d*)/i,
            amtIdx: 1
          },
          {
            regex: /(?:TrxID|TxnID|ID|ট্রানজেকশন|আইডি)[:\s]*([A-Z0-9]{6,})/i,
            trxIdx: 1
          }
        ];

        for (const p of patterns) {
          const m = message.match(p.regex);
          if (m) {
            if (p.amtIdx && amount <= 0) amount = parseFloat(m[p.amtIdx].replace(/,/g, ''));
            if (p.trxIdx && !trxId) trxId = m[p.trxIdx].trim().toUpperCase();
            if (p.phoneIdx && !customerPhone) customerPhone = m[p.phoneIdx];
            if (p.prov && provider === "Unknown") provider = p.prov;
          }
        }
        
        // Auto-detect provider if still missing
        if (provider === "Unknown") {
          const lowerBody = message.toLowerCase();
          if (lowerBody.includes("bkash")) provider = "bKash";
          else if (lowerBody.includes("nagad")) provider = "Nagad";
          else if (lowerBody.includes("rocket")) provider = "Rocket";
          else if (lowerBody.includes("upay")) provider = "Upay";
        }

        // Strategy AI: Fallback to Gemini if regex failed and we have an API key
        if ((amount <= 0 || !trxId || trxId.length < 5) && process.env.GEMINI_API_KEY) {
          try {
            console.log("[AI FALLBACK] Attempting AI extraction...");
            const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            const model = (genAI as any).getGenerativeModel({ model: "gemini-1.5-flash" });
            const prompt = `Extract transaction details (provider, amount, trxId, customerPhone) from this SMS: "${message}". 
              Return ONLY JSON: {"provider": "item", "amount": number, "trxId": "string", "customerPhone": "string"}`;
            
            const result = await model.generateContent(prompt);
            const aiData = JSON.parse(result.response.text().match(/\{[\s\S]*\}/)?.[0] || "{}");
            
            if (aiData.amount > 0 && amount <= 0) amount = aiData.amount;
            if (aiData.trxId && (!trxId || trxId.length < 5)) trxId = aiData.trxId.toUpperCase().trim();
            if (aiData.customerPhone && !customerPhone) customerPhone = aiData.customerPhone;
            if (aiData.provider && provider === "Unknown") provider = aiData.provider;
            
            console.log(`[AI SUCCESS] Extracted: ${trxId}, ${amount}`);
          } catch (aiErr) {
            console.error("[AI FALLBACK ERROR]", aiErr);
          }
        }
      }

      console.log(`[PARSED] Amt: ${amount}, TrxID: ${trxId}, Phone: ${customerPhone}, Prov: ${provider}`);

      // 5. If we have a valid transaction, save and match
      if (amount > 0 || trxId) {
        let txRefId = null;
        let isNewTransaction = false;

        // Prevent duplicate processing or allow retry if not yet used
        if (trxId && trxId.length > 5) {
          const dupSnap = await db.collection('transactions').where('userId', '==', userId).where('trxId', '==', trxId).limit(1).get();
          if (!dupSnap.empty) {
            const existingTx = dupSnap.docs[0].data() as any;
            txRefId = dupSnap.docs[0].id;
            
            if (existingTx.isUsed === true) {
              console.log(`[SMS] TrxID ${trxId} already used and confirmed.`);
              return res.status(200).json({ status: true, success: true, message: "Transaction already confirmed.", processed: false });
            }
            console.log(`[SMS] Existing unused TrxID found: ${trxId}. Attempting re-match.`);
          }
        }

        if (!txRefId) {
          isNewTransaction = true;
          const txData = {
            userId,
            deviceId,
            provider: provider || "Unknown",
            amount,
            trxId: trxId || "EXT_" + Math.random().toString(36).substring(7).toUpperCase(),
            customerPhone: customerPhone || "Unknown",
            sender: sender || "System", // Service center number
            message: message || `Data: ${amount} TK`,
            createdAt: new Date().toISOString(),
            isUsed: false
          };

          const txRef = await db.collection('transactions').add(txData);
          txRefId = txRef.id;
          
          await db.collection('raw_sms').doc(rawSmsRef.id).update({ 
            status: 'processed', 
            transactionId: txRefId,
            extractedTrxId: trxId || null,
            extractedAmount: amount || null
          });
        }

        // Update Device Status (Upsert)
        if (deviceId && deviceId !== 'gateway_api') {
          const dSnap = await db.collection('devices').where('deviceId', '==', deviceId).limit(1).get();
          if (!dSnap.empty) {
            await db.collection('devices').doc(dSnap.docs[0].id).update({
              lastSeen: new Date().toISOString(),
              status: 'online'
            });
          } else {
            // New device seen via SMS
            await db.collection('devices').add({
              userId,
              deviceId,
              deviceName: provider || "SMS Gateway",
              model: "Android", 
              status: 'online',
              lastSeen: new Date().toISOString(),
              createdAt: new Date().toISOString()
            });
          }
        }

        // 6. Intelligent Matching Engine
        const depositRef = db.collection('depositRequests');
        let matchedDoc = null;

        // Step 6a: Match by Exact TrxID (Highest confidence)
        if (trxId && trxId.length > 5 && !trxId.startsWith('EXT_')) {
          const snap = await depositRef.where('userId', '==', userId).where('trxId', '==', trxId).where('status', '==', 'pending').limit(1).get();
          if (!snap.empty) {
            matchedDoc = snap.docs[0];
            console.log(`[MATCH] High confidence TrxID match: ${trxId}`);
          }
        }

        // Step 6b: Match by Amount + Phone Number (Medium confidence)
        if (!matchedDoc && amount > 0) {
          const snap = await depositRef.where('userId', '==', userId).where('amount', '==', amount).where('status', '==', 'pending').get();
          if (!snap.empty) {
            // Try matching with extracted customer phone
            if (customerPhone) {
              const cleanCustomerPhone = customerPhone.slice(-10);
              matchedDoc = snap.docs.find(d => {
                const data = d.data() as any;
                return data.senderPhone && data.senderPhone.includes(cleanCustomerPhone);
              }) || null;
            }

            // Fallback: If only one request exists for this amount and no phone was specified, auto-approve
            if (!matchedDoc && snap.size === 1) {
              const singleData = snap.docs[0].data() as any;
              if (!singleData.senderPhone || singleData.senderPhone.trim() === "") {
                matchedDoc = snap.docs[0];
                console.log(`[MATCH] Unique amount match: ${amount}`);
              }
            }
          }
        }

        // 7. Update Deposit Status and Notify Webhook
        if (matchedDoc) {
          const depositData = matchedDoc.data() as any;
          const matchNote = trxId ? `Matched via TrxID: ${trxId}` : `Matched via Amount/Phone: ${amount}`;
          
          await db.collection('depositRequests').doc(matchedDoc.id).update({
            status: 'matched',
            matchedTransactionId: txRefId,
            matchedAt: new Date().toISOString(),
            trxId: depositData.trxId || trxId, // Save the extracted ID if empty
            matchingNote: matchNote
          });

          // Mark the transaction as USED to prevent reusing it for another request
          await db.collection('transactions').doc(txRefId).update({
            isUsed: true,
            matchedAt: new Date().toISOString(),
            matchedTo: matchedDoc.id
          });

          console.log(`[MATCH SUCCESS] Request ${matchedDoc.id} matched!`);

          // Webhook Trigger
          const finalWebhookUrl = depositData.webhookUrl || userData?.webhookUrl;
          if (finalWebhookUrl) {
            console.log(`[WEBHOOK] Sending confirmation to ${finalWebhookUrl}`);
            fetch(finalWebhookUrl, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'X-Gateway-Secret': apiSecret || 'none'
              },
              body: JSON.stringify({
                event: 'payment.confirmed',
                success: true,
                requestId: matchedDoc.id,
                externalId: depositData.externalId,
                amount,
                trxId: trxId || depositData.trxId,
                sender: customerPhone || "Unknown",
                provider: provider || "Unknown",
                timestamp: new Date().toISOString(),
                note: matchNote
              })
            }).catch(e => console.error("[WEBHOOK ERROR]:", e));
          }
        } else {
          console.log(`[NO MATCH] No pending request found for TrxID: ${trxId}, Amt: ${amount}`);
        }

        // 8. System Balance Topup Logic (Matching "Add Funds" requests)
        // We allow this if the user is an admin OR if the SMS matches a pending user deposit
        // Note: We check userDeposits regardless of admin status for better robustness in testing,
        // but normally only admins should receive these SMS.
        if (trxId && amount > 0) {
          const userDepositsRef = db.collection('userDeposits');
          let topupDoc = null;

          // Try match by TrxID (Ensure it hasn't been used yet)
          const topupSnap = await userDepositsRef.where('trxId', '==', trxId).where('status', '==', 'pending').limit(1).get();
          
          if (!topupSnap.empty) {
            topupDoc = topupSnap.docs[0];
          } else {
            // Fuzzy match by amount (Only if a single pending deposit exists for this amount)
            const amtSnap = await userDepositsRef.where('amount', '==', amount).where('status', '==', 'pending').get();
            if (amtSnap.size === 1) {
              topupDoc = amtSnap.docs[0];
              console.log(`[TOPUP] Fuzzy match by amount: ${amount}`);
            }
          }

          if (topupDoc) {
            // Check if this transaction is already linked to another deposit (Security second check)
            const txCheck = await db.collection('transactions').doc(txRefId).get();
            if (txCheck.exists && (txCheck.data() as any).isUsed) {
              console.log(`[TOPUP SKIP] Transaction ${txRefId} already used for another match.`);
              return;
            }

            const depositData = topupDoc.data() as any;
            console.log(`[TOPUP] Processing balance increase for user: ${depositData.userId}`);
            
            // 1. Update deposit status
            await db.collection('userDeposits').doc(topupDoc.id).update({
              status: 'approved',
              matchedTrxId: trxId,
              matchedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });

            // 2. Mark Transaction as Used
            await db.collection('transactions').doc(txRefId).update({
              isUsed: true,
              matchedAt: new Date().toISOString(),
              matchedTo: topupDoc.id
            });

            // 3. Increment user balance
            await db.collection('users').doc(depositData.userId).update({
              balance: FieldValue.increment(amount)
            });

            console.log(`[TOPUP SUCCESS] User ${depositData.userId} balance increased by ${amount}`);
          }
        }
      }

      // Always return 200 Success if the script didn't crash
      return res.status(200).json({ 
        status: true, 
        success: true, 
        message: "রিসিভ সফল",
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("[CRITICAL ERROR] in SMS Handler:", error);
      // We still return 200 with success: false to the app if it's a known logic error, 
      // but if it's a crash we let the framework handle it or catch it here.
      return res.status(200).json({ 
        status: false, 
        success: false, 
        message: "সার্ভার এরর",
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
      const userSnap = await db.collection('users').where('apiKey', '==', apiKey).where('apiSecret', '==', apiSecret).limit(1).get();

      if (userSnap.empty) {
        return res.status(401).json({ 
          status: false, 
          message: "ভুল এপিআই কি অথবা সিক্রেট কি ব্যবহার করা হয়েছে",
          error_code: "INVALID_CREDENTIALS"
        });
      }

      const userId = userSnap.docs[0].id;
      const userProfile = userSnap.docs[0].data() as any;

      // Check if user is active
      if (userProfile.status === 'inactive' || userProfile.status === 'suspended') {
        return res.status(403).json({ 
          status: false, 
          message: "আপনার একাউন্টটি বর্তমানে বন্ধ আছে। এডমিনের সাথে যোগাযোগ করুন।",
          error_code: "ACCOUNT_SUSPENDED"
        });
      }

      // Check Plan Expiry
      if (userProfile.planExpiry) {
        const expiry = new Date(userProfile.planExpiry);
        if (expiry < new Date()) {
          return res.status(403).json({ 
            status: false, 
            message: "আপনার প্যাকেজের মেয়াদ শেষ হয়ে গেছে। দয়া করে রিনিউ করুন।",
            error_code: "PLAN_EXPIRED"
          });
        }
      }

      // 2. Register/Update Device
      let deviceSnap;
      const cleanDeviceId = (deviceId || '').toString().trim();

      if (cleanDeviceId) {
        deviceSnap = await db.collection('devices').where('userId', '==', userId).where('deviceId', '==', cleanDeviceId).limit(1).get();
      }

      // Check Device Limit (Only for NEW devices)
      if (!deviceSnap || deviceSnap.empty) {
        const activeDevicesSnap = await db.collection('devices').where('userId', '==', userId).get();
        const limitCount = userProfile.planDeviceLimit || 1;
        if (activeDevicesSnap.size >= limitCount) {
          return res.status(403).json({ 
            status: false, 
            message: `আপনার প্যাকেজের ডিভাইস লিমিট (${limitCount}) শেষ হয়ে গেছে। আরও ডিভাইস কানেক্ট করতে আপগ্রেড করুন।`,
            error_code: "DEVICE_LIMIT_REACHED"
          });
        }
      }

      const deviceData = {
        userId,
        deviceName: deviceName || model || "Unknown Device",
        deviceId: cleanDeviceId || `DEV_${Math.random().toString(36).substring(7).toUpperCase()}`,
        deviceToken: `TOK_${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        model: model || "Unknown",
        version: version || "1.0.0",
        status: "online",
        lastSeen: new Date().toISOString(),
      };

      if (deviceSnap && !deviceSnap.empty) {
        // Update existing
        await db.collection('devices').doc(deviceSnap.docs[0].id).update(deviceData);
      } else {
        // Create new
        await db.collection('devices').add(deviceData);
      }

      res.json({ 
        status: true, 
        message: "ডিভাইসটি সফলভাবে কানেক্ট করা হয়েছে",
        data: {
          userId,
          deviceName: deviceData.deviceName,
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
