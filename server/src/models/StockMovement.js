import mongoose from "mongoose";

const stockMovementSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["in", "out", "adjust"], required: true }, // we use "in" now
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    qty: { type: Number, required: true }, // positive for "in"
    unitCost: { type: Number, default: 0, min: 0 }, // optional cost at restock time
    note: { type: String, trim: true, default: "" },
    supplier: { type: String, trim: true, default: "" },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

stockMovementSchema.index({ createdAt: -1 });
stockMovementSchema.index({ productId: 1, createdAt: -1 });

export const StockMovement = mongoose.model(
  "StockMovement",
  stockMovementSchema
);
