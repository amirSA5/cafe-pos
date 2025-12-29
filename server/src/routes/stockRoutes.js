import { Router } from "express";
import { authRequired, requireRole } from "../middleware/auth.js";
import { listMovements, restock } from "../controllers/stockController.js";

export const stockRoutes = Router();

stockRoutes.use(authRequired, requireRole("admin"));

stockRoutes.post("/restock", restock);
stockRoutes.get("/movements", listMovements);
