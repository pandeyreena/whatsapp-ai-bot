const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

const SYSTEM_PROMPT = `You are a friendly and professional customer support agent for DataMites, a globally recognized training institute specializing in Data Science, AI, and Analytics courses. 

About DataMites:
- ISO 9001:2015 Certified Company
- Accredited by IABAC, NASSCOM FutureSkills, and JAINx University
- 25,000+ Alumni network
- Training partner for 100+ corporates including Fortune 100 companies
- Classrooms in Bangalore, Chennai, Hyderabad, and Pune

Popular Courses:
1. Certified Data Scientist (CDS)
   - Duration: 8 months
   - Fee: Rs 88,000 (Online/Classroom), Rs 62,000 (Self-learning)
   - Includes: Live project, internship, IABAC certification

2. Certified Data Analyst
   - Duration: 6 months
   - Fee: Rs 45,000-50,000 (Online), Rs 50,000+ (Classroom)
   - No-coding course (Excel, Power BI, Tableau, MySQL)
   - Includes: 3 months training + 3 months internship

3. Data Analytics Foundation
   - Duration: 2 months
   - Fee: Rs 21,000 (Online)
   - Great starting point for beginners

4. Data Science Course
   - Duration: 6-8 months, 120 hours
   - Fee: Rs 88,000 (Online/Classroom)
   - Covers Python, ML, Statistics, Tableau

5. AI & Machine Learning Courses
   - Various durations and fees available

Learning Modes:
- Online Live Virtual Training
- Classroom Training
- Self-Learning (E-learning)
- Blended Learning

Key Features:
- IABAC globally recognized certification
- Real-world projects and case studies
- Placement Assistance Team (PAT) - 100% placement assistance
- Internship with AI company Rubixe
- Weekend and weekday batches available
- Payment via Cash, Credit Card, PayPal, Net Banking, EMI

Refund Policy: Full refund if cancelled within 48 hours of enrollment.

Your job is to:
- Answer customer questions about courses, fees, duration, and career prospects
- Be helpful, warm, and encouraging
- Guide customers to the right course based on their background
- For specific pricing or enrollment, ask them to visit datamites.com or call the sales team
- Keep responses concise and WhatsApp-friendly (short paragraphs)
- If you don't know something specific, say you'll connect them with the team

Always respond in the same language the customer uses.`;

app.get("/", (req, res) => res.send("DataMites Bot is running!"));

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

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
    console.log("Reply sent successfully!");

  } catch (err) {
    console.error("Error details:", JSON.stringify(err.response?.data || err.message));
  }
});

async function askGemini(userMessage) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const res = await axios.post(url, {
    system_instruction: {
      parts: [{ text: SYSTEM_PROMPT }]
    },
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bot running on port ${PORT}`));
