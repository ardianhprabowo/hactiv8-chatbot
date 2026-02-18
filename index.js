import { GoogleGenAI } from "@google/genai";
// import dan jalankan config() dari 'dotenv'
import 'dotenv/config';
import express from 'express';
import multer from 'multer';

// setup aplikasi
const app = express();

// setup AI agent-nya dengan Google Gemini API
// secara default, GoogleGenAI akan mencari env yang bernama GEMINI_API_KEY
const ai = new GoogleGenAI({});

// setup middleware
// multer
const upload = multer();

// untuk memproses semua request dengan header 'Content-Type' berupa 'application/json'
app.use(express.json());

// tambahkan routes
app.get("/halo", (req, res) => {
  res.json({ halo: "Bandung" });
});

// implementasi Google Gemini API di sini
// pakai method POST
app.post("/generate-text", async (req, res) => {
  const payload = req.body;

  const aiResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: payload.message,
    config: {
      systemInstruction: "Tolong jawab dengan bahasa Jawa ya!"
    }
  });

  res.json(aiResponse.text);
})

app.post("/generate-text-from-image", upload.single("image"), async (req, res) => {
  const message = req.body.message;
  const file = req.file;

  const base64File = file.buffer.toString("base64");

  const aiResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      { text: message, type: "text" },
      { inlineData: { data: base64File, mimeType: file.mimetype } }
    ],
    config: {
      systemInstruction: "Tolong jawab dengan bahasa Jawa ya!"
    }
  });

  res.json(aiResponse.text);
})

// kita "dengarkan" request dari user
app.listen(23000, () => {
  console.log("I LOVE YOU 23000");
});
