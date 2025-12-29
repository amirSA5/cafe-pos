import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, required: true, trim: true, maxlength: 80 },
    price: { type: Number, required: true, min: 0 },
    sku: { type: String, trim: true, maxlength: 64, default: "" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Helpful index for searching/filtering
productSchema.index({ name: 1, category: 1 });

export const Product = mongoose.model("Product", productSchema);
