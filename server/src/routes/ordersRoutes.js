import { Router } from "express";
import {
  checkout,
  getOrder,
  listOrders,
  voidOrder,
  salesSummary,
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

// Summary: admin only
ordersRoutes.get("/summary", authRequired, requireRole("admin"), salesSummary);

// Orders view/list: admin only
ordersRoutes.get("/", authRequired, requireRole("admin"), listOrders);

// Get by id: admin + cashier (needed for receipt)
ordersRoutes.get(
  "/:id",
  authRequired,
  requireRole("admin", "cashier"),
  getOrder
);

// Void: admin only
ordersRoutes.post("/:id/void", authRequired, requireRole("admin"), voidOrder);
