import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },

    // NEW: snapshot unit cost at sale time (COGS)
    cost: { type: Number, default: 0, min: 0 },

    qty: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },

    // NEW: line cost (cost * qty)
    lineCost: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      enum: ["cash", "card", "other"],
      default: "cash",
    },
    paidAmount: { type: Number, required: true, min: 0 },
    change: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    number: { type: String, required: true, unique: true }, // readable ref e.g. POS-20251229-0001
    status: { type: String, enum: ["paid", "void"], default: "paid" },

    voidedAt: { type: Date, default: null },
    voidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    voidReason: { type: String, default: "" },

    items: { type: [orderItemSchema], default: [] },

    subtotal: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, required: true, min: 0, max: 1 }, // e.g. 0.19
    taxAmount: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },

    // NEW: COGS totals + profit
    totalCost: { type: Number, default: 0, min: 0 },
    profit: { type: Number, default: 0 },

    payment: { type: paymentSchema, required: true },

    note: { type: String, trim: true, default: "" },

    // NEW: who created the order (cashier/admin)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ number: 1 });

export const Order = mongoose.model("Order", orderSchema);
