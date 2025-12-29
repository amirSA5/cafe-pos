import { Router } from "express";
import { authRequired, requireRole } from "../middleware/auth.js";

import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/productsController.js";

export const productsRoutes = Router();
productsRoutes.use(authRequired, requireRole("admin"));

productsRoutes.get("/", listProducts);
productsRoutes.get("/:id", getProduct);
productsRoutes.post("/", createProduct);
productsRoutes.put("/:id", updateProduct);
productsRoutes.delete("/:id", deleteProduct);
