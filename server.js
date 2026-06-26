const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'orders.json');

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Ensure data directory and file exist
function ensureData() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf-8');
}
function readOrders() {
  ensureData();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}
function writeOrders(orders) {
  ensureData();
  fs.writeFileSync(DATA_FILE, JSON.stringify(orders, null, 2), 'utf-8');
}

// GET all orders
app.get('/api/orders', (req, res) => {
  const orders = readOrders();
  res.json(orders);
});

// POST new order
app.post('/api/orders', (req, res) => {
  const orders = readOrders();
  const order = {
    ...req.body,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    createdAt: new Date().toISOString()
  };
  orders.unshift(order);
  writeOrders(orders);
  res.status(201).json(order);
});

// PUT update order
app.put('/api/orders/:id', (req, res) => {
  const orders = readOrders();
  const idx = orders.findIndex(o => o.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Order not found' });
  const updated = { ...req.body, id: req.params.id };
  if (orders[idx].createdAt) updated.createdAt = orders[idx].createdAt;
  orders[idx] = updated;
  writeOrders(orders);
  res.json(updated);
});

// DELETE order
app.delete('/api/orders/:id', (req, res) => {
  let orders = readOrders();
  const before = orders.length;
  orders = orders.filter(o => o.id !== req.params.id);
  if (orders.length === before) return res.status(404).json({ error: 'Order not found' });
  writeOrders(orders);
  res.json({ success: true });
});

// Serve dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.listen(PORT, () => {
  console.log(`👟 Shoesiholic Dashboard running on http://localhost:${PORT}`);
  console.log(`   Data file: ${DATA_FILE}`);
});
