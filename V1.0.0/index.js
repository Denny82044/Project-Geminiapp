import pkg from '@whiskeysockets/baileys';
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = pkg;

import qrcode from 'qrcode-terminal';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

let activeModel = null;

async function detectPreferredGeminiModel() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not found in .env');

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`ListModels API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const validModels = (data.models || []).filter(m =>
        m.supportedGenerationMethods?.includes('generateContent')
    );

    if (validModels.length === 0) {
        throw new Error('No Gemini models support generateContent');
    }

    // Prefer fastest
    let picked = validModels.find(m => m.name.includes('flash'));
    if (!picked) picked = validModels[0];

    activeModel = picked.name.replace('models/', '');
    console.log(`Using Gemini model: ${activeModel}`);
}

async function getGeminiReply(prompt) {
    if (!activeModel) throw new Error('No active Gemini model detected');
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${apiKey}`;

    const body = {
        contents: [{ parts: [{ text: prompt }] }],
    };

    console.log('Sending request to Gemini API...');
    const start = Date.now();
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    const duration = (Date.now() - start) / 1000;
    console.log(`Gemini API response time: ${duration}s`);

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini API error: ${res.status} ${res.statusText} - ${errText}`);
    }

    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No reply from Gemini (Error Code 01)';
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('Scan this QR code to log in:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = reason !== DisconnectReason.loggedOut;
            console.log(`Connection closed. Reconnect? ${shouldReconnect}`);
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('WhatsApp bot connected!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg?.message) return;

        const from = msg.key.remoteJid;
        const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            '';

        if (!text.trim()) return;

        if (!/gemini/i.test(text)) {
            console.log('Ignoring message without "Gemini"');
            return;
        }

        console.log(`Message from ${from}: ${text}`);

        try {
            await sock.sendPresenceUpdate('composing', from);

            const reply = await getGeminiReply(text);

            await sock.sendMessage(from, { text: reply });

            await sock.sendPresenceUpdate('paused', from);
        } catch (err) {
            console.error('Error processing message:', err.message);
            await sock.sendMessage(from, { text: 'Something went wrong (Error code 02)' });
        }
    });
}

(async () => {
    await detectPreferredGeminiModel(); // fastest model
    await startBot();
})();
