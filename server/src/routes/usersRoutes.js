import { Router } from "express";
import { authRequired, requireRole } from "../middleware/auth.js";
import {
  createUser,
  listUsers,
  resetPassword,
  updateUser,
} from "../controllers/usersController.js";

export const usersRoutes = Router();

usersRoutes.use(authRequired, requireRole("admin"));

usersRoutes.get("/", listUsers);
usersRoutes.post("/", createUser);
usersRoutes.put("/:id", updateUser);
usersRoutes.post("/:id/reset-password", resetPassword);
