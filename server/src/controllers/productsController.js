import { Product } from "../models/Product.js";

function parseNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// GET /api/products?search=&category=&active=true|false&page=1&limit=20
export async function listProducts(req, res) {
  const search = (req.query.search || "").trim();
  const category = (req.query.category || "").trim();
  const activeRaw = (req.query.active || "").trim();

  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(req.query.limit || "20", 10))
  );
  const skip = (page - 1) * limit;

  const filter = {};
  if (search) filter.name = { $regex: search, $options: "i" };
  if (category) filter.category = category;
  if (activeRaw === "true") filter.active = true;
  if (activeRaw === "false") filter.active = false;

  const [items, total] = await Promise.all([
    Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Product.countDocuments(filter),
  ]);

  res.json({
    items,
    page,
    limit,
    total,
    pages: Math.ceil(total / limit) || 1,
  });
}

// GET /api/products/:id
export async function getProduct(req, res) {
  const { id } = req.params;
  const item = await Product.findById(id);
  if (!item) return res.status(404).json({ message: "Product not found" });
  res.json(item);
}

// POST /api/products
export async function createProduct(req, res) {
  const { name, category, price, sku = "", active = true } = req.body || {};

  if (!name || !category) {
    return res.status(400).json({ message: "name and category are required" });
  }

  const p = parseNumber(price, NaN);
  if (!Number.isFinite(p) || p < 0) {
    return res
      .status(400)
      .json({ message: "price must be a non-negative number" });
  }

  const created = await Product.create({
    name: String(name).trim(),
    category: String(category).trim(),
    price: p,
    sku: String(sku || "").trim(),
    active: Boolean(active),
  });

  res.status(201).json(created);
}

// PUT /api/products/:id
export async function updateProduct(req, res) {
  const { id } = req.params;
  const payload = req.body || {};

  if ("price" in payload) {
    const p = parseNumber(payload.price, NaN);
    if (!Number.isFinite(p) || p < 0) {
      return res
        .status(400)
        .json({ message: "price must be a non-negative number" });
    }
    payload.price = p;
  }

  if ("name" in payload) payload.name = String(payload.name || "").trim();
  if ("category" in payload)
    payload.category = String(payload.category || "").trim();
  if ("sku" in payload) payload.sku = String(payload.sku || "").trim();
  if ("active" in payload) payload.active = Boolean(payload.active);

  const updated = await Product.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  if (!updated) return res.status(404).json({ message: "Product not found" });
  res.json(updated);
}

// DELETE /api/products/:id
export async function deleteProduct(req, res) {
  const { id } = req.params;
  const deleted = await Product.findByIdAndDelete(id);
  if (!deleted) return res.status(404).json({ message: "Product not found" });
  res.json({ ok: true });
}
