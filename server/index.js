import express from 'express';
import admin from 'firebase-admin';
// @ts-ignore
import serviceAccount from './serviceAccountKey.json' with { type: 'json' };

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Simple in-memory store for demo purposes
const received = [];
const fcmTokens = new Set();

app.post('/api/entries', (req, res) => {
  const entry = req.body;
  console.log('Servidor: Entrada recibida', entry);
  received.push({ ...entry, receivedAt: Date.now() });
  res.status(201).json({ ok: true });
});

app.get('/api/entries', (req, res) => {
  res.json(received);
});

// FCM subscription endpoint
app.post('/api/subscribe-fcm', (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'token required' });
  fcmTokens.add(token);
  console.log('Servidor: token FCM suscrito', token);
  res.json({ ok: true });
});

// Send FCM test notification to all subscribed tokens
app.post('/api/send-fcm', async (req, res) => {
  const { title, body } = req.body;
  const tokens = Array.from(fcmTokens);

  if (tokens.length === 0) {
    return res.status(400).json({ error: 'No subscribed tokens to send notification to.' });
  }

  const message = {
    notification: {
      title: title || 'Prueba desde el Servidor',
      body: body || 'Este es un mensaje de prueba enviado desde el backend.',
    },
    tokens: tokens,
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log('Successfully sent message:', response);
    // Process response
    const results = response.responses.map((r, i) => ({
      token: tokens[i],
      success: r.success,
      error: r.error ? r.error.message : null,
    }));
    res.json({ success: true, results });
  } catch (error) {
    console.log('Error sending message:', error);
    res.status(500).json({ success: false, error: 'Error sending notification' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor de ejemplo escuchando en http://localhost:${PORT}`);
});