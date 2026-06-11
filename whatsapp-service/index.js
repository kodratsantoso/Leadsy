require('dotenv').config();
const express = require('express');
const { makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers, fetchLatestBaileysVersion, makeInMemoryStore } = require('@whiskeysockets/baileys');
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

const sessions = {};

function clearAuthState(sessionName) {
    try {
        const sessionAuthDir = path.join(AUTH_DIR, sessionName);
        if (fs.existsSync(sessionAuthDir)) {
            fs.rmSync(sessionAuthDir, { recursive: true, force: true });
        }
    } catch (e) {
        console.error(`[${sessionName}] Error removing auth dir:`, e.message);
    }
}

async function connectToWhatsApp(sessionName) {
    if (!sessions[sessionName]) {
        sessions[sessionName] = {
            sock: null,
            currentQr: null,
            status: 'disconnected',
            connectionAttemptInProgress: false,
            store: makeInMemoryStore({ logger: pino({ level: 'silent' }) })
        };
    }

    const session = sessions[sessionName];

    if (session.connectionAttemptInProgress) {
        console.log(`[${sessionName}] Connection attempt already in progress, skipping...`);
        return;
    }
    session.connectionAttemptInProgress = true;
    session.status = 'connecting';

    const sessionAuthDir = path.join(AUTH_DIR, sessionName);
    if (!fs.existsSync(sessionAuthDir)) {
        fs.mkdirSync(sessionAuthDir, { recursive: true });
    }

    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionAuthDir);
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version: version,
            auth: state,
            logger: pino({ level: 'silent' }),
            browser: Browsers.macOS('Desktop'),
            connectTimeoutMs: 60000,
            syncFullHistory: true,
            shouldSyncHistoryMessage: () => true,
        });

        session.sock = sock;
        session.store.bind(sock.ev);

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            let statusCode = lastDisconnect?.error?.output?.statusCode;
            if (connection || statusCode) {
                console.log(JSON.stringify({
                    session: sessionName,
                    event: 'connection.update',
                    connection: connection,
                    statusCode: statusCode
                }));
            }

            if (qr) {
                session.currentQr = qr;
                session.status = 'qr_ready';
                console.log(`[${sessionName}] QR Generated, awaiting scan...`);
                await sendWebhook({ action: 'qr', payload: qr, session: sessionName });
            }

            if (connection === 'close') {
                const authExpired = statusCode === DisconnectReason.loggedOut || statusCode === 401;
                const shouldReconnect = session.status !== 'disconnected_by_user';
                console.log(`[${sessionName}] Connection closed, status code:`, statusCode, ', reconnecting:', shouldReconnect, ', authExpired:', authExpired);
                session.status = 'disconnected';
                session.currentQr = null;
                session.connectionAttemptInProgress = false;
                await sendWebhook({ action: 'status', status: 'disconnected', session: sessionName });

                if (authExpired) {
                    clearAuthState(sessionName);
                }

                if (shouldReconnect) {
                    console.log(`[${sessionName}] RECONNECTING...`);
                    setTimeout(() => connectToWhatsApp(sessionName), 3000);
                }
            } else if (connection === 'open') {
                console.log(`[${sessionName}] Connected to WhatsApp successfully!`);
                session.status = 'connected';
                session.currentQr = null;
                session.connectionAttemptInProgress = false;

                const myId = sock.user?.id || 'unknown';
                const myName = sock.user?.name || '';
                await sendWebhook({
                    action: 'status',
                    status: 'connected',
                    number: myId,
                    name: myName,
                    session: sessionName
                });
            }
        });

        sock.ev.on('messages.upsert', async (m) => {
            if (!m.messages || m.messages.length === 0) return;
            const msg = m.messages[0];
            if (!msg.message || msg.key.fromMe) return;

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
            const senderName = msg.pushName || msg.key.participant || 'Unknown';

            console.log(`[${sessionName}] Msg from ${senderName} (${remoteJid}): ${body.substring(0, 80)}`);

            await sendWebhook({
                action: 'inbound_message',
                external_id: msgId,
                remote_jid: remoteJid,
                sender_name: senderName,
                body: body,
                message_type: type,
                timestamp: msg.messageTimestamp,
                fromMe: false,
                session: sessionName
            });
        });

        sock.ev.on('messaging-history.set', async ({ chats, contacts, messages, isLatest }) => {
            console.log(`[${sessionName}] History sync received: ${messages?.length || 0} messages, ${chats?.length || 0} chats`);
            
            const contactNames = {};
            for (const contact of contacts || []) {
                if (contact.id && contact.name) {
                    contactNames[contact.id] = contact.name;
                }
            }
            
            const formattedMessages = [];
            for (const msg of messages || []) {
                if (!msg.message) continue;
                
                const type = Object.keys(msg.message)[0];
                if (!type) continue;
                
                let body = '';
                if (type === 'conversation') {
                    body = msg.message.conversation;
                } else if (type === 'extendedTextMessage') {
                    body = msg.message.extendedTextMessage?.text || '';
                } else if (type === 'imageMessage') {
                    body = '[Image] ' + (msg.message.imageMessage?.caption || '');
                } else if (type === 'documentMessage') {
                    body = '[Document] ' + (msg.message.documentMessage?.fileName || '');
                } else {
                    continue;
                }
                
                const remoteJid = msg.key.remoteJid;
                if (!remoteJid || !remoteJid.endsWith('@s.whatsapp.net')) {
                    continue;
                }
                
                const msgId = msg.key.id;
                const fromMe = msg.key.fromMe || false;
                const senderName = msg.pushName || contactNames[remoteJid] || (fromMe ? 'Me' : 'Unknown');
                const timestamp = msg.messageTimestamp;
                
                formattedMessages.push({
                    external_id: msgId,
                    remote_jid: remoteJid,
                    sender_name: senderName,
                    body: body,
                    direction: fromMe ? 'outbound' : 'inbound',
                    timestamp: timestamp,
                });
            }
            
            // Send in chunks of 50
            const chunkSize = 50;
            for (let i = 0; i < formattedMessages.length; i += chunkSize) {
                const chunk = formattedMessages.slice(i, i + chunkSize);
                console.log(`[${sessionName}] Sending history chunk ${i / chunkSize + 1} with ${chunk.length} messages`);
                await sendWebhook({
                    action: 'history_sync',
                    messages: chunk,
                    session: sessionName
                });
            }
        });

    } catch (err) {
        console.error(`[${sessionName}] Connection error:`, err.message);
        session.connectionAttemptInProgress = false;
        setTimeout(() => connectToWhatsApp(sessionName), 5000);
    }
}

async function sendWebhook(data) {
    try {
        await axios.post(WEBHOOK_URL, data, { timeout: 5000 });
    } catch (err) {
        console.error('Failed to dispatch webhook to Laravel:', err.message);
    }
}

function getSessionName(req) {
    return req.headers['x-session-id'] || req.query.session || req.body.session || 'default_session';
}

function initExistingSessions() {
    if (!fs.existsSync(AUTH_DIR)) {
        fs.mkdirSync(AUTH_DIR, { recursive: true });
        return;
    }
    const entries = fs.readdirSync(AUTH_DIR);
    for (const entry of entries) {
        const entryPath = path.join(AUTH_DIR, entry);
        if (fs.statSync(entryPath).isDirectory() && entry.startsWith('user_session_')) {
            console.log(`Auto-starting session for: ${entry}`);
            connectToWhatsApp(entry);
        }
    }
}

// ---------------- REST API ----------------

app.get('/api/health', (req, res) => {
    const sessionName = getSessionName(req);
    const session = sessions[sessionName];
    res.json({
        status: 'ok',
        whatsapp_status: session ? session.status : 'disconnected',
        uptime: process.uptime()
    });
});

app.post('/api/session/start', async (req, res) => {
    const sessionName = getSessionName(req);
    if (!sessions[sessionName]) {
        sessions[sessionName] = {
            sock: null,
            currentQr: null,
            status: 'disconnected',
            connectionAttemptInProgress: false,
            store: makeInMemoryStore({ logger: pino({ level: 'silent' }) })
        };
    }
    const session = sessions[sessionName];

    if (session.status === 'connected') {
        return res.json({ status: 'connected', message: 'Already connected' });
    }

    if (!session.connectionAttemptInProgress) {
        connectToWhatsApp(sessionName);
    }
    res.json({ success: true, message: 'Initialization started', status: session.status });
});

app.post('/api/session/sync', async (req, res) => {
    const sessionName = getSessionName(req);
    const session = sessions[sessionName];
    if (!session || !session.store) {
        return res.status(400).json({ error: 'Session not initialized or store not ready.' });
    }

    try {
        const chats = session.store.chats.all();
        console.log(`[${sessionName}] Manual sync requested. Chats in store: ${chats.length}`);

        const formattedMessages = [];
        const contactNames = {};
        if (session.store.contacts) {
            for (const [jid, contact] of Object.entries(session.store.contacts)) {
                if (contact && contact.name) {
                    contactNames[jid] = contact.name;
                }
            }
        }

        for (const chat of chats) {
            const jid = chat.id;
            if (!jid || !jid.endsWith('@s.whatsapp.net')) continue;

            let chatMessages = [];
            const msgRepo = session.store.messages[jid];
            if (msgRepo) {
                if (typeof msgRepo.all === 'function') {
                    chatMessages = msgRepo.all();
                } else if (Array.isArray(msgRepo)) {
                    chatMessages = msgRepo;
                } else if (typeof msgRepo.toArray === 'function') {
                    chatMessages = msgRepo.toArray();
                }
            }

            for (const msg of chatMessages) {
                if (!msg.message) continue;

                const type = Object.keys(msg.message)[0];
                if (!type) continue;

                let body = '';
                if (type === 'conversation') {
                    body = msg.message.conversation;
                } else if (type === 'extendedTextMessage') {
                    body = msg.message.extendedTextMessage?.text || '';
                } else if (type === 'imageMessage') {
                    body = '[Image] ' + (msg.message.imageMessage?.caption || '');
                } else if (type === 'documentMessage') {
                    body = '[Document] ' + (msg.message.documentMessage?.fileName || '');
                } else {
                    continue;
                }

                const msgId = msg.key.id;
                const fromMe = msg.key.fromMe || false;
                const senderName = msg.pushName || contactNames[jid] || chat.name || (fromMe ? 'Me' : 'Unknown');
                const timestamp = msg.messageTimestamp;

                formattedMessages.push({
                    external_id: msgId,
                    remote_jid: jid,
                    sender_name: senderName,
                    body: body,
                    direction: fromMe ? 'outbound' : 'inbound',
                    timestamp: timestamp,
                });
            }
        }

        const chunkSize = 50;
        let sentCount = 0;
        for (let i = 0; i < formattedMessages.length; i += chunkSize) {
            const chunk = formattedMessages.slice(i, i + chunkSize);
            await sendWebhook({
                action: 'history_sync',
                messages: chunk,
                session: sessionName
            });
            sentCount += chunk.length;
        }

        res.json({ success: true, message: `Dispatched ${sentCount} messages from store to Laravel` });
    } catch (err) {
        console.error(`[${sessionName}] Manual sync error:`, err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/session/status', (req, res) => {
    const sessionName = getSessionName(req);
    const session = sessions[sessionName] || {
        status: 'disconnected',
        currentQr: null,
        sock: null
    };
    const sessionAuthDir = path.join(AUTH_DIR, sessionName);
    res.json({
        status: session.status,
        qr: session.currentQr,
        number: session.sock?.user?.id || null,
        has_auth: fs.existsSync(path.join(sessionAuthDir, 'creds.json')),
    });
});

app.post('/api/session/refresh-qr', async (req, res) => {
    const sessionName = getSessionName(req);
    const session = sessions[sessionName];
    if (session && session.sock) {
        try {
            session.sock.end(new Error('QR refresh requested'));
        } catch (e) {}
        session.sock = null;
    }
    if (session) {
        session.status = 'disconnected';
        session.currentQr = null;
        session.connectionAttemptInProgress = false;
    }
    clearAuthState(sessionName);
    setTimeout(() => connectToWhatsApp(sessionName), 500);
    res.json({ success: true, message: 'QR refresh initiated' });
});

app.post('/api/session/disconnect', async (req, res) => {
    const sessionName = getSessionName(req);
    const session = sessions[sessionName];
    if (session) {
        session.status = 'disconnected_by_user';
        if (session.sock) {
            try {
                await session.sock.logout();
            } catch (e) {}
            session.sock = null;
        }
        session.currentQr = null;
        session.connectionAttemptInProgress = false;
        clearAuthState(sessionName);
    }
    res.json({ success: true });
});

app.post('/api/messages/send', async (req, res) => {
    const sessionName = getSessionName(req);
    const session = sessions[sessionName];
    if (!session || session.status !== 'connected' || !session.sock) {
        return res.status(400).json({ error: 'WhatsApp is not connected.' });
    }

    const { jid, text } = req.body;
    if (!jid || !text) {
        return res.status(400).json({ error: 'Missing jid or text' });
    }

    try {
        const formattedJid = jid.includes('@s.whatsapp.net') ? jid : `${jid}@s.whatsapp.net`;
        const sentMsg = await session.sock.sendMessage(formattedJid, { text: text });
        res.json({ success: true, external_id: sentMsg.key.id });
    } catch (err) {
        console.error('Send message error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/sessions/active', (req, res) => {
    const activeSessions = [];
    for (const [name, session] of Object.entries(sessions)) {
        const sessionAuthDir = path.join(AUTH_DIR, name);
        activeSessions.push({
            session: name,
            status: session.status,
            number: session.sock?.user?.id || null,
            name: session.sock?.user?.name || null,
            has_auth: fs.existsSync(path.join(sessionAuthDir, 'creds.json'))
        });
    }
    res.json({ data: activeSessions });
});

app.listen(PORT, () => {
    console.log(`WhatsApp Baileys Service running on port ${PORT}`);
    console.log(`Pointing webhooks to: ${WEBHOOK_URL}`);
    initExistingSessions();
});
