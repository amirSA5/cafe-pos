import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI missing");

  await mongoose.connect(uri);

  const username = "admin";
  const password = "admin123"; // change after login
  const role = "admin";

  const existing = await User.findOne({ username });
  if (existing) {
    console.log("Admin user already exists:", existing.username);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await User.create({ username, passwordHash, role, active: true });

  console.log("Seeded admin:", { username, password });
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
