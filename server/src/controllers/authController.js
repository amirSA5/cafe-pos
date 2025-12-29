import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { signToken } from "../middleware/auth.js";

export async function login(req, res) {
  const { username, password } = req.body || {};
  const u = String(username || "")
    .trim()
    .toLowerCase();
  const p = String(password || "");

  if (!u || !p)
    return res
      .status(400)
      .json({ message: "username and password are required" });

  const user = await User.findOne({ username: u, active: true });
  if (!user)
    return res.status(401).json({ message: "Invalid username/password" });

  const ok = await bcrypt.compare(p, user.passwordHash);
  if (!ok)
    return res.status(401).json({ message: "Invalid username/password" });

  const token = signToken({
    id: String(user._id),
    username: user.username,
    role: user.role,
  });

  res.json({
    token,
    user: { id: String(user._id), username: user.username, role: user.role },
  });
}
