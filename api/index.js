const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ─── STATIC FILES ────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'public')));

// ─── IN-MEMORY DATASTOR ──────────────────────
let orders = [];
let lastSync = 0;
const GITHUB_RAW = 'https://raw.githubusercontent.com/rizalworkplace-ui/shoesholic-dashboard/main/data/orders.json';
const GITHUB_API = 'https://api.github.com/repos/rizalworkplace-ui/shoesholic-dashboard/contents/data/orders.json';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

// Try loading from GitHub on startup
(async () => {
  try {
    const res = await fetch(GITHUB_RAW + '?t=' + Date.now(), {
      headers: GITHUB_TOKEN ? { Authorization: 'Bearer ' + GITHUB_TOKEN } : {}
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) { orders = data; lastSync = Date.now(); console.log('Loaded ' + orders.length + ' orders from GitHub'); }
    }
  } catch (e) { console.log('Startup load skipped:', e.message); }
})();

// ─── SYNC TO GITHUB ──────────────────────────
async function syncToGitHub() {
  if (!GITHUB_TOKEN) return false;
  try {
    // Get current file SHA
    let sha = '';
    try {
      const getRes = await fetch(GITHUB_API, {
        headers: { Authorization: 'Bearer ' + GITHUB_TOKEN, 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'shoeshholic' }
      });
      if (getRes.ok) { const d = await getRes.json(); sha = d.sha; }
    } catch (e) {}

    const content = Buffer.from(JSON.stringify(orders, null, 2)).toString('base64');
    const body = { message: 'Auto-sync orders', content };
    if (sha) body.sha = sha;

    const putRes = await fetch(GITHUB_API, {
      method: 'PUT',
      headers: { Authorization: 'Bearer ' + GITHUB_TOKEN, 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'shoeshholic', 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (putRes.ok) { lastSync = Date.now(); return true; }
  } catch (e) { console.error('GitHub sync failed:', e.message); }
  return false;
}

// ─── HELPERS ──────────────────────────────────
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ─── API ROUTES ───────────────────────────────

// GET all orders
app.get('/api/orders', (req, res) => {
  res.json(orders);
});

// POST new order
app.post('/api/orders', (req, res) => {
  const order = {
    ...req.body,
    id: genId(),
    createdAt: new Date().toISOString()
  };
  orders.unshift(order);
  syncToGitHub().catch(() => {});
  res.status(201).json(order);
});

// PUT update order
app.put('/api/orders/:id', (req, res) => {
  const idx = orders.findIndex(o => o.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  orders[idx] = { ...req.body, id: req.params.id };
  if (orders[idx].createdAt) {} // keep original
  syncToGitHub().catch(() => {});
  res.json(orders[idx]);
});

// DELETE order
app.delete('/api/orders/:id', (req, res) => {
  const before = orders.length;
  orders = orders.filter(o => o.id !== req.params.id);
  if (orders.length === before) return res.status(404).json({ error: 'Not found' });
  syncToGitHub().catch(() => {});
  res.json({ success: true });
});

// Manual backup
app.post('/api/sync', async (req, res) => {
  const ok = await syncToGitHub();
  res.json({ synced: ok, count: orders.length, tokenSet: !!GITHUB_TOKEN });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, orders: orders.length, lastSync, tokenSet: !!GITHUB_TOKEN });
});

// ─── SERVE DASHBOARD ──────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'));
});

// ─── EXPORT FOR VERCEL ───────────────────────
module.exports = app;
