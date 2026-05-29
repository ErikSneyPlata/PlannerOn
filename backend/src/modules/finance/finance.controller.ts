// finance.controller.ts
import { Response } from "express";
import prisma from "../../config/prisma";
import { z } from "zod";

const transactionSchema = z.object({
  title: z.string().min(1),
  amount: z.number(),
  type: z.enum(["INCOME", "EXPENSE", "INVESTMENT", "SUBSCRIPTION"]),
  category: z.string(),
  date: z.string().optional(),
});

export const getTransactions = async (req: any, res: Response) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.userId },
      orderBy: { date: "desc" },
    });
    res.json(transactions);
  } catch (error: any) {
    console.error("Finance fetch error:", error);
    res.status(500).json({ error: "Fetch failed", details: error.message });
  }
};

export const createTransaction = async (req: any, res: Response) => {
  try {
    const data = transactionSchema.parse(req.body);
    const transaction = await prisma.transaction.create({
      data: {
        ...data,
        date: data.date ? new Date(data.date) : new Date(),
        userId: req.userId,
      },
    });
    res.json(transaction);
  } catch (error: any) {
    console.error("Finance creation error:", error);
    res.status(500).json({ error: "Creation failed", details: error.message });
  }
};

export const deleteTransaction = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.transaction.delete({ where: { id, userId: req.userId } });
    res.json({ message: "Deleted" });
  } catch (error) {
    res.status(500).json({ error: "Delete failed" });
  }
};
