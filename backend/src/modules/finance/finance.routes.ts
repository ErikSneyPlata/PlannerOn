// finance.routes.ts
import { Router } from "express";
import { getTransactions, createTransaction, deleteTransaction } from "./finance.controller";
import { authMiddleware } from "../../shared/middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", getTransactions);
router.post("/", createTransaction);
router.delete("/:id", deleteTransaction);

export default router;
