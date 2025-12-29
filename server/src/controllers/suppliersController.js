import { Supplier } from "../models/Supplier.js";

function parseBool(v) {
  if (v === true || v === "true") return true;
  if (v === false || v === "false") return false;
  return undefined;
}

export async function listSuppliers(req, res) {
  const search = String(req.query.search || "").trim();
  const active = parseBool(req.query.active);

  const filter = {};
  if (active !== undefined) filter.active = active;
  if (search) filter.name = { $regex: search, $options: "i" };

  const items = await Supplier.find(filter).sort({ name: 1 }).limit(500);
  res.json({ items });
}

export async function createSupplier(req, res) {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ message: "name is required" });

  const created = await Supplier.create({
    name: String(b.name).trim(),
    phone: String(b.phone || "").trim(),
    email: String(b.email || "").trim(),
    address: String(b.address || "").trim(),
    note: String(b.note || "").trim(),
    active: b.active === undefined ? true : Boolean(b.active),
  });

  res.status(201).json(created);
}

export async function updateSupplier(req, res) {
  const { id } = req.params;
  const payload = req.body || {};

  if ("name" in payload) payload.name = String(payload.name || "").trim();
  if ("phone" in payload) payload.phone = String(payload.phone || "").trim();
  if ("email" in payload) payload.email = String(payload.email || "").trim();
  if ("address" in payload)
    payload.address = String(payload.address || "").trim();
  if ("note" in payload) payload.note = String(payload.note || "").trim();
  if ("active" in payload) payload.active = Boolean(payload.active);

  const updated = await Supplier.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
  if (!updated) return res.status(404).json({ message: "Supplier not found" });
  res.json(updated);
}

export async function deleteSupplier(req, res) {
  const { id } = req.params;
  const removed = await Supplier.findByIdAndDelete(id);
  if (!removed) return res.status(404).json({ message: "Supplier not found" });
  res.json({ ok: true });
}
