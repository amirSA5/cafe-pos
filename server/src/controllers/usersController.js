import bcrypt from "bcryptjs";
import { User } from "../models/User.js";

function sanitizeUser(u) {
  return {
    id: String(u._id),
    username: u.username,
    role: u.role,
    active: u.active,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

export async function listUsers(req, res) {
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(req.query.limit || "50", 10))
  );
  const search = String(req.query.search || "")
    .trim()
    .toLowerCase();
  const role = String(req.query.role || "").trim();
  const active = req.query.active;

  const filter = {};
  if (search) filter.username = { $regex: search, $options: "i" };
  if (role) filter.role = role;
  if (active === "true") filter.active = true;
  if (active === "false") filter.active = false;

  const total = await User.countDocuments(filter);
  const items = await User.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  res.json({ items: items.map(sanitizeUser), total, page, limit });
}

export async function createUser(req, res) {
  const username = String(req.body?.username || "")
    .trim()
    .toLowerCase();
  const password = String(req.body?.password || "").trim();
  const role = String(req.body?.role || "").trim();
  const active = req.body?.active ?? true;

  if (!username || !password || !role) {
    return res
      .status(400)
      .json({ message: "username, password, role are required" });
  }
  if (!["admin", "cashier"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }
  if (password.length < 6) {
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters" });
  }

  const exists = await User.findOne({ username });
  if (exists)
    return res.status(409).json({ message: "Username already exists" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    username,
    passwordHash,
    role,
    active: Boolean(active),
  });

  res.status(201).json(sanitizeUser(user));
}

export async function updateUser(req, res) {
  const id = req.params.id;
  const role = req.body?.role;
  const active = req.body?.active;

  const patch = {};
  if (role != null) {
    if (!["admin", "cashier"].includes(role))
      return res.status(400).json({ message: "Invalid role" });
    patch.role = role;
  }
  if (active != null) patch.active = Boolean(active);

  const user = await User.findByIdAndUpdate(id, patch, { new: true });
  if (!user) return res.status(404).json({ message: "User not found" });

  res.json(sanitizeUser(user));
}

export async function resetPassword(req, res) {
  const id = req.params.id;
  const password = String(req.body?.password || "").trim();
  if (!password)
    return res.status(400).json({ message: "password is required" });
  if (password.length < 6)
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.findByIdAndUpdate(
    id,
    { passwordHash },
    { new: true }
  );
  if (!user) return res.status(404).json({ message: "User not found" });

  res.json({ ok: true });
}
