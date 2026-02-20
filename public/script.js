/**
 * Hacktiv8 Mentor AI - Script Terintegrasi
 * Dikembangkan dari starter/script.js dengan integrasi Gemini API.
 */

// Variabel untuk menyimpan riwayat percakapan (format standar messages)
let chatMessages = [
    { role: 'model', content: 'Halo! Saya adalah Technical Support Specialist internal. Ada yang bisa saya bantu terkait kendala teknis atau troubleshooting sistem hari ini?' }
];

const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');
const sendBtn = document.getElementById('send-btn');

// Image Gen Elements
const imgGenToggle = document.getElementById('img-gen-toggle');
const imgGenContainer = document.getElementById('image-gen-container');
const closeImgGen = document.getElementById('close-img-gen');
const imgPrompt = document.getElementById('img-prompt');
const generateImgBtn = document.getElementById('generate-img-btn');
const imgResult = document.getElementById('img-result');

/**
 * Handle submit form chat
 */
form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const userMessage = input.value.trim();
    if (!userMessage) return;

    // 1. Tampilkan pesan user ke UI
    appendMessage('user', userMessage);

    // Simpan ke riwayat lokal (format baru)
    chatMessages.push({ role: 'user', content: userMessage });

    input.value = '';

    // Matikan tombol saat loading
    sendBtn.disabled = true;

    // 2. Berikan indikator bot sedang berpikir
    const loadingId = appendLoadingMessage();

    try {
        // 3. Panggil API ke Backend dengan menyertakan history lengkap
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: chatMessages })
        });

        const data = await response.json();

        // Hapus indikator loading
        removeMessageById(loadingId);

        if (data.success) {
            const botResponse = data.response.text;
            // 4. Tampilkan balasan asli dari Gemini
            appendMessage('bot', botResponse);

            // Simpan balasan bot ke riwayat lokal
            chatMessages.push({ role: 'model', content: botResponse });
        } else {
            appendMessage('bot', 'Maaf, saya sedang mengalami kendala teknis. Harap coba lagi nanti.');
        }
    } catch (error) {
        removeMessageById(loadingId);
        appendMessage('bot', 'Terjadi kesalahan koneksi. Pastikan server sudah berjalan.');
        console.error('Fetch error:', error);
    } finally {
        sendBtn.disabled = false;
        input.focus();
    }
});

/**
 * Image Generation Logic
 */
imgGenToggle.addEventListener('click', () => {
    imgGenContainer.classList.toggle('hidden');
});

closeImgGen.addEventListener('click', () => {
    imgGenContainer.classList.add('hidden');
});

generateImgBtn.addEventListener('click', async () => {
    const prompt = imgPrompt.value.trim();
    if (!prompt) return;

    generateImgBtn.disabled = true;
    generateImgBtn.textContent = 'Generating...';
    imgResult.innerHTML = '<span style="font-size: 0.8rem; color: #94a3b8;">Processing image...</span>';

    try {
        const response = await fetch('/api/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: prompt })
        });

        const data = await response.json();

        if (data.success) {
            imgResult.innerHTML = `<img src="${data.imageUrl}" alt="Generated Image" />`;
        } else {
            imgResult.innerHTML = `<span style="font-size: 0.8rem; color: #ef4444;">${data.error}</span>`;
        }
    } catch (error) {
        imgResult.innerHTML = '<span style="font-size: 0.8rem; color: #ef4444;">Gagal generate gambar.</span>';
    } finally {
        generateImgBtn.disabled = false;
        generateImgBtn.textContent = 'Generate';
    }
});

/**
 * Parallax Interactivity
 */
document.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth) - 0.5;
    const y = (e.clientY / window.innerHeight) - 0.5;

    document.querySelector('.layer-1').style.transform = `translate(${x * 20}px, ${y * 20}px)`;
    document.querySelector('.layer-2').style.transform = `translate(${x * 40}px, ${y * 40}px)`;
});

/**
 * Fungsi pembantu
 */
function appendMessage(sender, text) {
    const msg = document.createElement('div');
    msg.classList.add('message', sender);
    msg.innerHTML = text.replace(/\n/g, '<br>');
    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function appendLoadingMessage() {
    const id = 'loading-' + Date.now();
    const msg = document.createElement('div');
    msg.classList.add('message', 'bot');
    msg.id = id;
    msg.textContent = 'Support sedang menganalisa...';
    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
    return id;
}

function removeMessageById(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}
