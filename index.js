const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

app.get("/", (req, res) => res.send("Bot is running!"));

// Webhook verification
app.get("/webhook", (req, res) => {
  console.log("Verification request received");
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified!");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// Receive messages
app.post("/webhook", async (req, res) => {
  console.log("Incoming webhook:", JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
  
  try {
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];
    
    if (!message || message.type !== "text") return;
    
    const userText = message.text.body;
    const phoneNumber = message.from;
    console.log("Message from:", phoneNumber, "Text:", userText);

    const reply = await askGemini(userText);
    console.log("Gemini reply:", reply);
    
    await sendMessage(phoneNumber, reply);
    console.log("Reply sent!");
    
  } catch (err) {
    console.error("Error details:", JSON.stringify(err.response?.data || err.message));
  }
});

async function askGemini(userMessage) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-001:generateContent?key=${GEMINI_API_KEY}`;
  const res = await axios.post(url, {
    contents: [{ role: "user", parts: [{ text: userMessage }] }]
  });
  return res.data.candidates[0].content.parts[0].text;
}

async function sendMessage(to, body) {
  await axios.post(
    `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to: to,
      type: "text",
      text: { body: body }
    },
    {
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json"
      }
    }
  );
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Bot running on port ${PORT}`));
