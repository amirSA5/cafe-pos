import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function pad4(n) {
  return String(n).padStart(4, "0");
}

// POS-YYYYMMDD-0001
async function generateOrderNumber() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const prefix = `POS-${y}${m}${day}-`;

  const last = await Order.findOne({ number: { $regex: `^${prefix}` } })
    .sort({ createdAt: -1 })
    .lean();

  if (!last?.number) return `${prefix}0001`;

  const lastSeq = parseInt(last.number.split("-").pop(), 10);
  const nextSeq = Number.isFinite(lastSeq) ? lastSeq + 1 : 1;
  return `${prefix}${pad4(nextSeq)}`;
}

// GET /api/orders?from=&to=&status=paid&page=1&limit=20
export async function listOrders(req, res) {
  const status = (req.query.status || "").trim();
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(req.query.limit || "20", 10))
  );
  const skip = (page - 1) * limit;

  const filter = {};
  if (status) filter.status = status;

  const from = req.query.from ? new Date(req.query.from) : null;
  const to = req.query.to ? new Date(req.query.to) : null;

  if (from || to) {
    filter.createdAt = {};
    if (from && !isNaN(from)) filter.createdAt.$gte = from;
    if (to && !isNaN(to)) filter.createdAt.$lte = to;
  }

  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(filter),
  ]);

  res.json({
    items,
    page,
    limit,
    total,
    pages: Math.ceil(total / limit) || 1,
  });
}

// GET /api/orders/:id
export async function getOrder(req, res) {
  const item = await Order.findById(req.params.id);
  if (!item) return res.status(404).json({ message: "Order not found" });
  res.json(item);
}

/**
 * POST /api/orders/checkout
 * body:
 * {
 *   items: [{ productId, qty }],
 *   taxRate: 0.19,
 *   payment: { method: "cash", paidAmount: 50 },
 *   note: ""
 * }
 */
export async function checkout(req, res) {
  const body = req.body || {};
  const inputItems = Array.isArray(body.items) ? body.items : [];
  const taxRate = Number(body.taxRate ?? 0);
  const payment = body.payment || {};
  const note = String(body.note || "").trim();

  if (inputItems.length === 0) {
    return res.status(400).json({ message: "Cart is empty" });
  }
  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 1) {
    return res.status(400).json({ message: "taxRate must be between 0 and 1" });
  }

  // Load products
  const ids = inputItems.map((i) => i.productId).filter(Boolean);
  const products = await Product.find({
    _id: { $in: ids },
    active: true,
  }).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const items = [];
  for (const i of inputItems) {
    const p = byId.get(String(i.productId));
    const qty = parseInt(i.qty || "0", 10);

    if (!p)
      return res
        .status(400)
        .json({ message: "Some products not found or inactive" });
    if (!Number.isFinite(qty) || qty < 1)
      return res.status(400).json({ message: "qty must be >= 1" });

    const lineTotal = round2(p.price * qty);

    items.push({
      productId: p._id,
      name: p.name,
      category: p.category,
      price: p.price,
      qty,
      lineTotal,
    });
  }

  const subtotal = round2(items.reduce((s, it) => s + it.lineTotal, 0));
  const taxAmount = round2(subtotal * taxRate);
  const total = round2(subtotal + taxAmount);

  const paidAmount = Number(payment.paidAmount ?? 0);
  if (!Number.isFinite(paidAmount) || paidAmount < total) {
    return res.status(400).json({ message: "paidAmount must be >= total" });
  }

  const method = ["cash", "card", "other"].includes(payment.method)
    ? payment.method
    : "cash";
  const change = round2(paidAmount - total);

  const number = await generateOrderNumber();

  const created = await Order.create({
    number,
    status: "paid",
    items,
    subtotal,
    taxRate,
    taxAmount,
    total,
    payment: { method, paidAmount: round2(paidAmount), change },
    note,
  });

  res.status(201).json(created);
}
