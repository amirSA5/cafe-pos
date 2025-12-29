import mongoose from "mongoose";
import { PurchaseInvoice } from "../models/PurchaseInvoice.js";
import { Supplier } from "../models/Supplier.js";
import { Product } from "../models/Product.js";
import { StockMovement } from "../models/StockMovement.js";

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

async function generatePurchaseInvoiceNumber() {
  const today = new Date();
  const y = String(today.getFullYear());
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  const prefix = `PINV-${y}${m}${d}-`;

  const last = await PurchaseInvoice.findOne({
    number: { $regex: `^${prefix}` },
  })
    .sort({ createdAt: -1 })
    .lean();

  const lastSeq = last?.number?.slice(prefix.length) || "0000";
  const seq = String(parseInt(lastSeq, 10) + 1).padStart(4, "0");
  return `${prefix}${seq}`;
}

export async function listPurchaseInvoices(req, res) {
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(req.query.limit || "50", 10))
  );

  const total = await PurchaseInvoice.countDocuments({});
  const items = await PurchaseInvoice.find({})
    .populate("supplierId", "name")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  res.json({ items, total, page, limit });
}

export async function getPurchaseInvoice(req, res) {
  const inv = await PurchaseInvoice.findById(req.params.id)
    .populate("supplierId", "name phone email address")
    .lean();
  if (!inv) return res.status(404).json({ message: "Invoice not found" });
  res.json(inv);
}

export async function createPurchaseInvoice(req, res) {
  const b = req.body || {};
  const supplierId = b.supplierId;

  if (!supplierId)
    return res.status(400).json({ message: "supplierId is required" });

  const supplier = await Supplier.findById(supplierId).lean();
  if (!supplier) return res.status(404).json({ message: "Supplier not found" });

  const inputLines = Array.isArray(b.lines) ? b.lines : [];
  if (inputLines.length === 0)
    return res.status(400).json({ message: "lines are required" });

  const ids = inputLines.map((l) => l.productId).filter(Boolean);
  const products = await Product.find({ _id: { $in: ids } }).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const lines = [];
  for (const l of inputLines) {
    const p = byId.get(String(l.productId));
    if (!p) return res.status(400).json({ message: "Some products not found" });

    const qty = parseInt(l.qty, 10);
    if (!Number.isFinite(qty) || qty < 1)
      return res.status(400).json({ message: "qty must be >= 1" });

    const unitCost = Number(l.unitCost);
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      return res.status(400).json({ message: "unitCost must be >= 0" });
    }

    const lineTotal = round2(unitCost * qty);

    lines.push({
      productId: p._id,
      name: p.name,
      category: p.category,
      qty,
      unitCost: round2(unitCost),
      lineTotal,
    });
  }

  const subtotal = round2(lines.reduce((s, x) => s + x.lineTotal, 0));
  const number = await generatePurchaseInvoiceNumber();

  const created = await PurchaseInvoice.create({
    number,
    supplierId,
    status: "draft",
    lines,
    subtotal,
    note: String(b.note || "").trim(),
    createdBy: req.user?.id || null,
  });

  res.status(201).json(created);
}

/**
 * Post an invoice:
 * - creates StockMovement(type="in") for each line
 * - increments Product.stockQty
 * - optionally updates Product.cost:
 *   mode = "last" (default) or "weighted"
 */
export async function postPurchaseInvoice(req, res) {
  const { id } = req.params;
  const { costMode = "last" } = req.body || {};

  try {
    const inv = await PurchaseInvoice.findById(id);
    if (!inv) return res.status(404).json({ message: "Invoice not found" });

    if (inv.status !== "draft") {
      return res
        .status(400)
        .json({ message: `Invoice is ${inv.status}, cannot post` });
    }

    const productIds = inv.lines.map((l) => l.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    const byId = new Map(products.map((p) => [String(p._id), p]));

    for (const line of inv.lines) {
      const p = byId.get(String(line.productId));
      if (!p)
        return res.status(400).json({ message: "Product missing during post" });

      const qty = Number(line.qty);
      const unitCost = Number(line.unitCost);

      const oldStock = Number(p.stockQty ?? 0);
      const oldCost = Number(p.cost ?? 0);

      p.stockQty = oldStock + qty;

      if (costMode === "weighted") {
        const denom = oldStock + qty;
        const w =
          denom > 0 ? (oldCost * oldStock + unitCost * qty) / denom : unitCost;
        p.cost = round2(w);
      } else {
        p.cost = round2(unitCost);
      }

      await p.save();

      await StockMovement.create({
        type: "in",
        productId: p._id,
        qty,
        unitCost: round2(unitCost),
        supplier: "",
        note: `Purchase invoice ${inv.number}`,
        createdBy: req.user?.id || null,
      });
    }

    inv.status = "posted";
    inv.postedAt = new Date();
    inv.postedBy = req.user?.id || null;
    await inv.save();

    res.json(inv);
  } catch (e) {
    res.status(500).json({ message: e.message || "Post failed" });
  }
}
