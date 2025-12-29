import mongoose from "mongoose";

const invoiceLineSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: { type: String, required: true, trim: true }, // snapshot
    category: { type: String, required: true, trim: true }, // snapshot
    qty: { type: Number, required: true, min: 1 },
    unitCost: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const purchaseInvoiceSchema = new mongoose.Schema(
  {
    number: { type: String, required: true, unique: true }, // PINV-20251229-0001
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },

    status: {
      type: String,
      enum: ["draft", "posted", "void"],
      default: "draft",
    },
    postedAt: { type: Date, default: null },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    lines: { type: [invoiceLineSchema], default: [] },

    subtotal: { type: Number, required: true, min: 0 },
    note: { type: String, trim: true, default: "" },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

purchaseInvoiceSchema.index({ createdAt: -1 });
purchaseInvoiceSchema.index({ number: 1 });

export const PurchaseInvoice = mongoose.model(
  "PurchaseInvoice",
  purchaseInvoiceSchema
);
