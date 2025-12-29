import { Router } from "express";
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/productsController.js";

export const productsRoutes = Router();

productsRoutes.get("/", listProducts);
productsRoutes.get("/:id", getProduct);
productsRoutes.post("/", createProduct);
productsRoutes.put("/:id", updateProduct);
productsRoutes.delete("/:id", deleteProduct);
