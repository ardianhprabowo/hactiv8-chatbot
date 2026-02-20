/**
 * Hacktiv8 Mentor AI - Script Terintegrasi
 * Dikembangkan dari starter/script.js dengan integrasi Gemini API.
 */

const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');
const sendBtn = document.getElementById('send-btn');

/**
 * Handle submit form chat
 */
form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const userMessage = input.value.trim();
    if (!userMessage) return;

    // 1. Tampilkan pesan user ke UI
    appendMessage('user', userMessage);
    input.value = '';

    // Matikan tombol saat loading
    sendBtn.disabled = true;

    // 2. Berikan indikator bot sedang berpikir
    const loadingId = appendLoadingMessage();

    try {
        // 3. Panggil API ke Backend
        const response = await fetch('/generate-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userMessage })
        });

        const data = await response.json();

        // Hapus indikator loading
        removeMessageById(loadingId);

        if (data.success) {
            // 4. Tampilkan balasan asli dari Gemini
            appendMessage('bot', data.text);
        } else {
            appendMessage('bot', 'Maaf, saya sedang mengalami kendala teknis. Harap coba lagi nanti.');
        }
    } catch (error) {
        removeMessageById(loadingId);
        appendMessage('bot', 'Terjadi kesalahan koneksi. Pastikan server sudah berjalan.');
        console.error('Fetch error:', error);
    } finally {
        // Aktifkan kembali tombol
        sendBtn.disabled = false;
        input.focus();
    }
});

/**
 * Fungsi untuk menambahkan pesan ke UI
 */
function appendMessage(sender, text) {
    const msg = document.createElement('div');
    msg.classList.add('message', sender);

    // Format teks (ganti newline dengan <br>)
    msg.innerHTML = text.replace(/\n/g, '<br>');

    chatBox.appendChild(msg);

    // Auto-scroll ke bawah
    chatBox.scrollTop = chatBox.scrollHeight;
}

/**
 * Fungsi pembantu untuk indikator loading
 */
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
