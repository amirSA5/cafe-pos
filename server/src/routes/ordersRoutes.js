import { Router } from "express";
import {
  checkout,
  getOrder,
  listOrders,
} from "../controllers/ordersController.js";

export const ordersRoutes = Router();

ordersRoutes.get("/", listOrders);
ordersRoutes.get("/:id", getOrder);
ordersRoutes.post("/checkout", checkout);
