import { Product } from "../models/Product.js";
import { StockMovement } from "../models/StockMovement.js";

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

export async function restock(req, res) {
  const {
    productId,
    qty,
    unitCost,
    supplier = "",
    note = "",
    updateCost = false,
  } = req.body || {};

  if (!productId)
    return res.status(400).json({ message: "productId is required" });

  const q = parseInt(qty, 10);
  if (!Number.isFinite(q) || q < 1)
    return res.status(400).json({ message: "qty must be >= 1" });

  const c = unitCost == null || unitCost === "" ? null : Number(unitCost);
  if (c != null && (!Number.isFinite(c) || c < 0)) {
    return res
      .status(400)
      .json({ message: "unitCost must be a non-negative number" });
  }

  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ message: "Product not found" });

  product.stockQty = Number(product.stockQty ?? 0) + q;

  if (updateCost && c != null) {
    product.cost = round2(c);
  }

  await product.save();

  const move = await StockMovement.create({
    type: "in",
    productId: product._id,
    qty: q,
    unitCost: c == null ? 0 : round2(c),
    supplier: String(supplier || "").trim(),
    note: String(note || "").trim(),
    createdBy: req.user?.id || null,
  });

  res.status(201).json({ product, movement: move });
}

export async function listMovements(req, res) {
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(req.query.limit || "50", 10))
  );
  const productId = String(req.query.productId || "").trim();

  const filter = {};
  if (productId) filter.productId = productId;

  const total = await StockMovement.countDocuments(filter);
  const items = await StockMovement.find(filter)
    .populate("productId", "name category")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  res.json({ items, total, page, limit });
}
