const express = require('express');
const { makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// LARAVEL URL
const WEBHOOK_URL = process.env.LARAVEL_WEBHOOK_URL || 'http://backend:8000/api/webhooks/whatsapp';
const PORT = process.env.PORT || 3002;
const AUTH_DIR = path.join(__dirname, 'baileys_auth_info');

let sock = null;
let currentQr = null;
let currentStatus = 'disconnected'; // 'disconnected', 'qr_ready', 'connected', 'connecting'
let connectionAttemptInProgress = false;

function clearAuthState() {
    try {
        if (!fs.existsSync(AUTH_DIR)) {
            fs.mkdirSync(AUTH_DIR, { recursive: true });
            return;
        }

        for (const entry of fs.readdirSync(AUTH_DIR)) {
            fs.rmSync(path.join(AUTH_DIR, entry), { recursive: true, force: true });
        }
    } catch (e) {
        console.error('Error removing auth dir:', e.message);
    }
}

async function connectToWhatsApp() {
    if (connectionAttemptInProgress) {
        console.log('Connection attempt already in progress, skipping...');
        return;
    }
    connectionAttemptInProgress = true;
    currentStatus = 'connecting';

    try {
        const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
        const { version } = await fetchLatestBaileysVersion();

        sock = makeWASocket({
            version: version,
            auth: state,
            logger: pino({ level: 'silent' }),
            browser: Browsers.macOS('Desktop'),
            connectTimeoutMs: 60000,
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            let statusCode = lastDisconnect?.error?.output?.statusCode;
            if (connection || statusCode) {
                console.log(JSON.stringify({
                    event: 'connection.update',
                    connection: connection,
                    statusCode: statusCode
                }));
            }

            if (qr) {
                currentQr = qr;
                currentStatus = 'qr_ready';
                console.log('QR Generated, awaiting scan...');
                await sendWebhook({ action: 'qr', payload: qr });
            }

            if (connection === 'close') {
                const authExpired = statusCode === DisconnectReason.loggedOut || statusCode === 401;
                const shouldReconnect = true;
                console.log('Connection closed, status code:', statusCode, ', reconnecting:', shouldReconnect, ', authExpired:', authExpired);
                currentStatus = 'disconnected';
                currentQr = null;
                connectionAttemptInProgress = false;
                await sendWebhook({ action: 'status', status: 'disconnected' });

                if (authExpired) {
                    clearAuthState();
                }

                if (shouldReconnect) {
                    console.log('RECONNECTING...');
                    setTimeout(connectToWhatsApp, 3000);
                }
            } else if (connection === 'open') {
                console.log('Connected to WhatsApp successfully!');
                currentStatus = 'connected';
                currentQr = null;
                connectionAttemptInProgress = false;

                // Get user info
                const myId = sock.user?.id || 'unknown';
                const myName = sock.user?.name || '';
                await sendWebhook({
                    action: 'status',
                    status: 'connected',
                    number: myId,
                    name: myName
                });
            }
        });

        sock.ev.on('messages.upsert', async (m) => {
            if (!m.messages || m.messages.length === 0) return;
            const msg = m.messages[0];
            if (!msg.message || msg.key.fromMe) return;

            // Extract payload safely
            const type = Object.keys(msg.message)[0];
            let body = '[Unsupported Message Type]';
            if (type === 'conversation') {
                body = msg.message.conversation;
            } else if (type === 'extendedTextMessage') {
                body = msg.message.extendedTextMessage?.text || '';
            } else if (type === 'imageMessage') {
                body = '[Image] ' + (msg.message.imageMessage?.caption || '');
            } else if (type === 'documentMessage') {
                body = '[Document] ' + (msg.message.documentMessage?.fileName || '');
            }

            const remoteJid = msg.key.remoteJid;
            const msgId = msg.key.id;

            // Extract sender name (pushName)
            const senderName = msg.pushName || msg.key.participant || 'Unknown';

            console.log(`Msg from ${senderName} (${remoteJid}): ${body.substring(0, 80)}`);

            // Post to Laravel webhook
            await sendWebhook({
                action: 'inbound_message',
                external_id: msgId,
                remote_jid: remoteJid,
                sender_name: senderName,
                body: body,
                message_type: type,
                timestamp: msg.messageTimestamp,
                fromMe: false
            });
        });

    } catch (err) {
        console.error('Connection error:', err.message);
        connectionAttemptInProgress = false;
        // Retry after delay
        setTimeout(connectToWhatsApp, 5000);
    }
}

async function sendWebhook(data) {
    try {
        await axios.post(WEBHOOK_URL, data, { timeout: 5000 });
    } catch (err) {
        console.error('Failed to dispatch webhook to Laravel:', err.message);
    }
}

// ---------------- REST API ----------------

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', whatsapp_status: currentStatus, uptime: process.uptime() });
});

app.post('/api/session/start', async (req, res) => {
    if (currentStatus === 'connected') {
        return res.json({ status: 'connected', message: 'Already connected' });
    }

    // Connect if not already attempting
    if (!connectionAttemptInProgress) {
        connectToWhatsApp();
    }
    res.json({ success: true, message: 'Initialization started', status: currentStatus });
});

app.get('/api/session/status', (req, res) => {
    res.json({
        status: currentStatus,
        qr: currentQr,
        number: sock?.user?.id || null,
        has_auth: fs.existsSync(path.join(AUTH_DIR, 'creds.json')),
    });
});

app.post('/api/session/refresh-qr', async (req, res) => {
    // To refresh QR: disconnect and reconnect
    if (sock) {
        try {
            sock.end(new Error('QR refresh requested'));
        } catch (e) {
            // Ignore socket teardown errors
        }
        sock = null;
    }
    currentStatus = 'disconnected';
    currentQr = null;
    connectionAttemptInProgress = false;

    // Remove saved auth to force new QR
    clearAuthState();

    // Start fresh connection
    setTimeout(connectToWhatsApp, 500);
    res.json({ success: true, message: 'QR refresh initiated' });
});

app.post('/api/session/disconnect', async (req, res) => {
    if (sock) {
        try {
            await sock.logout();
        } catch (e) {
            // Ignore
        }
        sock = null;
    }
    currentStatus = 'disconnected';
    currentQr = null;
    connectionAttemptInProgress = false;
    res.json({ success: true });
});

app.post('/api/messages/send', async (req, res) => {
    if (currentStatus !== 'connected' || !sock) {
        return res.status(400).json({ error: 'WhatsApp is not connected.' });
    }

    const { jid, text } = req.body;
    if (!jid || !text) {
        return res.status(400).json({ error: 'Missing jid or text' });
    }

    try {
        // jid must be e.g. "6281234567890@s.whatsapp.net"
        const formattedJid = jid.includes('@s.whatsapp.net') ? jid : `${jid}@s.whatsapp.net`;
        const sentMsg = await sock.sendMessage(formattedJid, { text: text });

        res.json({ success: true, external_id: sentMsg.key.id });
    } catch (err) {
        console.error('Send message error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`WhatsApp Baileys Service running on port ${PORT}`);
    console.log(`Pointing webhooks to: ${WEBHOOK_URL}`);
});
