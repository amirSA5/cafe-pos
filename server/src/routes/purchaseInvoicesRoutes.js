import { Router } from "express";
import { authRequired, requireRole } from "../middleware/auth.js";
import {
  createPurchaseInvoice,
  getPurchaseInvoice,
  listPurchaseInvoices,
  postPurchaseInvoice,
} from "../controllers/purchaseInvoicesController.js";

export const purchaseInvoicesRoutes = Router();

purchaseInvoicesRoutes.use(authRequired, requireRole("admin"));

purchaseInvoicesRoutes.get("/", listPurchaseInvoices);
purchaseInvoicesRoutes.post("/", createPurchaseInvoice);
purchaseInvoicesRoutes.get("/:id", getPurchaseInvoice);
purchaseInvoicesRoutes.post("/:id/post", postPurchaseInvoice);
