import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";

import { productsRoutes } from "./routes/productsRoutes.js";
import { ordersRoutes } from "./routes/ordersRoutes.js";
import { authRoutes } from "./routes/authRoutes.js";
import { usersRoutes } from "./routes/usersRoutes.js";
import { stockRoutes } from "./routes/stockRoutes.js";
import { suppliersRoutes } from "./routes/suppliersRoutes.js";
import { purchaseInvoicesRoutes } from "./routes/purchaseInvoicesRoutes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "cafe-pos-api" });
});

// Auth
app.use("/api/auth", authRoutes);
// Users
app.use("/api/users", usersRoutes);
// Products
app.use("/api/products", productsRoutes);
// Orders
app.use("/api/orders", ordersRoutes);
// Stock
app.use("/api/stock", stockRoutes);
// Suppliers
app.use("/api/suppliers", suppliersRoutes);
// Purchase Invoices
app.use("/api/purchase-invoices", purchaseInvoicesRoutes);

async function start() {
  const port = process.env.PORT || 4000;

  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) throw new Error("Missing MONGO_URI in .env");

    await mongoose.connect(mongoUri);
    console.log("✅ MongoDB connected");

    app.listen(port, () => {
      console.log(`✅ API listening on http://localhost:${port}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  }
}

start();
