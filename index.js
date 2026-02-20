import { GoogleGenAI } from "@google/genai";
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// setup aplikasi
const app = express();

// setup AI agent-nya dengan Google Gemini API
const ai = new GoogleGenAI({});

// setup middleware
const upload = multer();
app.use(cors()); // Aktifkan CORS untuk semua origin
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// tambahkan rute health check
app.get("/api/health", (req, res) => {
  return res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// implementasi Google Gemini API di sini
// pakai method POST
app.post("/generate-text", async (req, res) => {
  try {
    const { message, history } = req.body;

    // Log request body as stringified JSON
    console.log("Incoming Request:", JSON.stringify(req.body, null, 2));

    if (!message) {
      return res.status(400).json({ error: "Pesan (message) wajib diisi." });
    }

    // Initialize model with enhanced tech support persona
    const model = ai.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: "Anda adalah Technical Support Specialist yang sangat manusiawi, berempati, dan proaktif. Anda bukan sekadar bot, melainkan rekan teknis yang cerdas. Tugas Anda:\n1. Selesaikan masalah teknis (troubleshooting) secara akurat dan step-by-step.\n2. Pelajari konteks dari riwayat percakapan. Jika pengguna menanyakan hal yang serupa atau berkaitan, hubungkan jawaban Anda dengan topik sebelumnya secara natural.\n3. Berikan saran proaktif atau tips tambahan yang relevan dengan pertanyaan pengguna untuk mencegah masalah di masa depan.\n4. Gunakan gaya bahasa yang profesional namun hangat dan mengayomi (seperti mentor/senior dev). Hindari jawaban yang terlalu kaku atau repetitif.\n5. Selalu tutup jawaban Anda dengan pertanyaan yang memotivasi atau follow-up teknis untuk memastikan bantuan Anda sudah tuntas."
    });

    // Start a chat session with the provided history
    const chat = model.startChat({
      history: history || [],
      generationConfig: {
        temperature: 0.7, // Lebih tinggi sedikit agar bahasa lebih natural dan tidak robotik
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 1024,
      }
    });

    const result = await chat.sendMessage(message);
    const aiResponse = result.response;

    // Log full AI response as stringified JSON
    console.log("AI Response Object:", JSON.stringify(aiResponse, null, 2));

    res.json({
      success: true,
      text: aiResponse.text(),
      aiResponse: aiResponse // Kirim full response object ke client
    });
  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({ success: false, error: "Gagal memproses AI." });
  }
})

// Rute untuk gambar tetap tersedia
app.post("/generate-text-from-image", upload.single("image"), async (req, res) => {
  try {
    const message = req.body.message;
    const file = req.file;

    if (!file) return res.status(400).json({ error: "Gambar wajib diunggah." });

    const base64File = file.buffer.toString("base64");

    const aiResponse = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        { text: message, type: "text" },
        { inlineData: { data: base64File, mimeType: file.mimetype } }
      ],
      config: {
        temperature: 0.1,
        systemInstruction: "Anda adalah Technical Support Specialist yang sedang menganalisa screenshot error atau log sistem. Identifikasi masalahnya dan berikan solusi teknis yang tepat."
      }
    });

    res.json({ success: true, text: aiResponse.text });
  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({ success: false, error: "Gagal memproses gambar." });
  }
})

// Fallback ke index.html (Express 5 mewajibkan regex atau penamaan untuk wildcard)
app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// kita "dengarkan" request dari user
app.listen(23000, () => {
  console.log("I LOVE YOU 23000 - Hacktiv8 Mentor AI is Online");
});
