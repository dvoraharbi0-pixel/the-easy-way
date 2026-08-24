const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const QRCode = require('qrcode');

const { load } = require('./store');
const models = require('./models');
const { seedIfEmpty } = require('./seed');
const { registerSocket } = require('./socket');
const auth = require('./auth');

load();
seedIfEmpty();

const app = express();
const server = http.createServer(app);
const io = new Server(server);
registerSocket(io);

app.use(express.json());

// ---------- Exact page routes (checked before static so they never 301-redirect) ----------
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'home', 'index.html'));
});
app.get('/kitchen', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'kitchen', 'index.html'));
});
app.get('/bar', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'bar', 'index.html'));
});
app.get('/waiters', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'waiters', 'index.html'));
});
app.get('/waiters/bar', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'waiters-bar', 'index.html'));
});

// ---------- Static assets (real files, e.g. /master/app.js, /shared/style.css) ----------
app.use(express.static(path.join(__dirname, '..', 'public')));

// ---------- Token page routes (fallback once static found no matching file, so
// e.g. "/master/app.js" resolves to the real script above instead of "app.js" being
// misread as a table token) ----------
app.get('/t/:token', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'diner', 'index.html'));
});
app.get('/master/:token', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'master', 'index.html'));
});

// ---------- API ----------
app.post('/api/staff/login', (req, res) => {
  const pin = req.body && req.body.pin;
  if (!auth.checkPin(pin)) return res.status(401).json({ ok: false });
  res.json({ ok: true, token: auth.issueToken() });
});

app.post('/api/staff/verify', (req, res) => {
  res.json({ ok: auth.isValidToken(req.body && req.body.token) });
});

app.get('/api/tables', (req, res) => {
  res.json({ tables: models.listTables() });
});

app.get('/api/qr/:token.png', async (req, res) => {
  const url = `${req.protocol}://${req.get('host')}/t/${req.params.token}`;
  res.type('png');
  try {
    const buffer = await QRCode.toBuffer(url, { width: 300, margin: 1 });
    res.send(buffer);
  } catch (err) {
    res.status(500).end();
  }
});

app.get('/api/menu', (req, res) => {
  res.json({ items: models.listMenu(), courseOrder: models.COURSE_ORDER, courseLabels: models.COURSE_LABELS });
});

// A phone scans the table's QR/NFC token -> get (or open) the table's active session.
app.get('/api/table/:token', (req, res) => {
  const table = models.getTableByToken(req.params.token);
  if (!table) return res.status(404).json({ error: 'table not found' });
  const session = models.getOrCreateActiveSession(table.id);
  res.json({ table, session });
});

app.post('/api/session/:sessionId/diner', (req, res) => {
  const session = models.getSession(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'session not found' });
  const diner = models.createDiner(session.id, (req.body && req.body.name) || '');
  res.json({ diner });
});

app.get('/api/session/:sessionId/state', (req, res) => {
  const session = models.getSession(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'session not found' });
  res.json({ session, items: models.listSessionItems(session.id) });
});

app.get('/api/kitchen/queue', (req, res) => {
  res.json({ items: models.kitchenQueue() });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`the-easy-way listening on http://localhost:${PORT}`);
});
