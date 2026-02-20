import { GoogleGenerativeAI } from "@google/generative-ai";
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

// setup AI agent-nya dengan Google Gemini API resmi
const rawApiKey = process.env.GEMINI_API_KEY;
const apiKey = rawApiKey ? rawApiKey.trim() : null;

if (apiKey) {
  console.log(`API Key loaded: ${apiKey.substring(0, 7)}... (Length: ${apiKey.length})`);
} else {
  console.log("API Key NOT FOUND in .env");
}

const genAI = new GoogleGenerativeAI(apiKey);

// Tes koneksi otomatis saat startup (Internal Diagnostics)
(async () => {
  try {
    if (!apiKey) return;
    const testModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    await testModel.generateContent("ping");
    console.log("✅ Startup API Check: SUCCESS");
  } catch (e) {
    console.log("❌ Startup API Check: FAILED");
    console.error("Reason:", e.message);
  }
})();

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
// --- ENDPOINT UNTUK CHAT MULTI-TURN (STANDARD) ---
app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    // Log request body as stringified JSON
    console.log("Incoming Request /api/chat:", JSON.stringify(req.body, null, 2));

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Input 'messages' harus berupa array riwayat percakapan." });
    }

    // Ambil pesan terakhir dari user
    const lastUserMessage = messages[messages.length - 1];
    if (!lastUserMessage || lastUserMessage.role !== 'user') {
      return res.status(400).json({ error: "Pesan terakhir harus memiliki role 'user'." });
    }

    // Initialize model with enhanced tech support persona
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: "Anda adalah Technical Support Specialist yang sangat manusiawi, berempati, dan proaktif. Anda bukan sekadar bot, melainkan rekan teknis yang cerdas. Tugas Anda:\n1. Selesaikan masalah teknis (troubleshooting) secara akurat dan step-by-step.\n2. Pelajari konteks dari riwayat percakapan. Jika pengguna menanyakan hal yang serupa atau berkaitan, hubungkan jawaban Anda dengan topik sebelumnya secara natural.\n3. Berikan saran proaktif atau tips tambahan yang relevan dengan pertanyaan pengguna untuk mencegah masalah di masa depan.\n4. Gunakan gaya bahasa yang profesional namun hangat dan mengayomi (seperti mentor/senior dev). Hindari jawaban yang terlalu kaku atau repetitif.\n5. Selalu tutup jawaban Anda dengan pertanyaan yang memotivasi atau follow-up teknis untuk memastikan bantuan Anda sudah tuntas."
    });

    // Start a chat session with the provided history (excluding the latest message)
    let history = messages.slice(0, -1).map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content || m.text }]
    }));

    // Safeguard: Gemini API mewajibkan pesan pertama di history harus dari 'user'
    while (history.length > 0 && history[0].role !== 'user') {
      history.shift();
    }

    const chat = model.startChat({
      history: history,
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 1024,
      }
    });

    const result = await chat.sendMessage(lastUserMessage.content || lastUserMessage.text);
    const aiResponse = result.response;

    res.json({
      success: true,
      response: {
        text: aiResponse.text()
      },
      aiResponse: aiResponse // Full object for debugging
    });
  } catch (error) {
    console.error("AI Error:", error);
    // Mengembalikan pesan error yang lebih detail agar user tahu jika terkena limit kuota
    const errorMessage = error.message || "Gagal memproses AI.";
    res.status(500).json({
      success: false,
      error: errorMessage,
      details: error.toString()
    });
  }
});

// --- ENDPOINT UNTUK GENERATE IMAGE (GEMINI NATIVE) ---
app.post("/api/generate-image", async (req, res) => {
  try {
    const { prompt } = req.body;
    console.log("Incoming Image Request:", JSON.stringify(req.body, null, 2));

    if (!prompt) {
      return res.status(400).json({ error: "Prompt wajib diisi." });
    }

    // Menggunakan model Gemini 2.0 Flash untuk image generation (jika didukung)
    // Atau fallback ke skema generateContent khusus
    const model = genAI.getGenerativeModel({ model: "gemini-3.0-flash" });

    // Note: Native image generation might require specific parameters or model variations
    // This is a standard implementation assuming current SDK support
    const result = await model.generateContent(`Generate an image based on this technical description: ${prompt}`);
    const response = result.response;

    // Check if response contains image data in parts
    const part = response.candidates[0].content.parts.find(p => p.inlineData);
    if (part) {
      res.json({
        success: true,
        imageUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
      });
    } else {
      res.json({
        success: false,
        error: "Model tidak mengembalikan data gambar. Pastikan prompt relevan dengan visual."
      });
    }
  } catch (error) {
    console.error("Image Gen Error:", error);
    res.status(500).json({ success: false, error: "Fitur image generation sedang tidak tersedia atau quota habis." });
  }
});

// Backward compatibility (Deprecated)
app.post("/generate-text", (req, res) => {
  res.status(410).json({ error: "Endpoint /generate-text telah dideprecated. Harap gunakan /api/chat." });
});

app.post("/generate-text-from-image", upload.single("image"), async (req, res) => {
  try {
    const message = req.body.message;
    const file = req.file;
    if (!file) return res.status(400).json({ error: "Gambar wajib diunggah." });
    const base64File = file.buffer.toString("base64");
    const model = genAI.getGenerativeModel({ model: "gemini-3.0-flash" });
    const result = await model.generateContent({
      contents: [{
        role: 'user', parts: [
          { text: message },
          { inlineData: { data: base64File, mimeType: file.mimetype } }
        ]
      }]
    });
    res.json({ success: true, text: result.response.text() });
  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({ success: false, error: "Gagal memproses gambar." });
  }
});

// Fallback ke index.html (Express 5 mewajibkan regex atau penamaan untuk wildcard)
app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// kita "dengarkan" request dari user
app.listen(23000, () => {
  console.log("Port 23000 - Internal TS AI is Online");
});
