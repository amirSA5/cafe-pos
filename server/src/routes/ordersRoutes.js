import { Router } from "express";
import {
  checkout,
  getOrder,
  listOrders,
} from "../controllers/ordersController.js";
import { authRequired, requireRole } from "../middleware/auth.js";

export const ordersRoutes = Router();

// Checkout: admin or cashier
ordersRoutes.post(
  "/checkout",
  authRequired,
  requireRole("admin", "cashier"),
  checkout
);

// Orders view/list: admin only (you can relax later if needed)
ordersRoutes.get("/", authRequired, requireRole("admin"), listOrders);
ordersRoutes.get("/:id", authRequired, requireRole("admin"), getOrder);
