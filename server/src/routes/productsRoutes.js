import { Router } from "express";
import { authRequired, requireRole } from "../middleware/auth.js";
import {
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  updateProduct,
} from "../controllers/productsController.js";

export const productsRoutes = Router();

// Everyone logged in can read products (needed by Cashier)
productsRoutes.get(
  "/",
  authRequired,
  requireRole("admin", "cashier"),
  listProducts
);
productsRoutes.get(
  "/:id",
  authRequired,
  requireRole("admin", "cashier"),
  getProduct
);

// Only admin can modify products
productsRoutes.post("/", authRequired, requireRole("admin"), createProduct);
productsRoutes.put("/:id", authRequired, requireRole("admin"), updateProduct);
productsRoutes.delete(
  "/:id",
  authRequired,
  requireRole("admin"),
  deleteProduct
);
