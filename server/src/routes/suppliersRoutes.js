import { Router } from "express";
import { authRequired, requireRole } from "../middleware/auth.js";
import {
  createSupplier,
  deleteSupplier,
  listSuppliers,
  updateSupplier,
} from "../controllers/suppliersController.js";

export const suppliersRoutes = Router();

suppliersRoutes.use(authRequired, requireRole("admin"));

suppliersRoutes.get("/", listSuppliers);
suppliersRoutes.post("/", createSupplier);
suppliersRoutes.put("/:id", updateSupplier);
suppliersRoutes.delete("/:id", deleteSupplier);
