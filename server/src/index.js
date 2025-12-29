import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "cafe-pos-api" });
});

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
