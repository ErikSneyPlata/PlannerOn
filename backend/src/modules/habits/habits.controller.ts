import { Response } from "express";
import prisma from "../../config/prisma";
import { z } from "zod";

const habitSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  frequency: z.string().default("daily"),
});

export const getHabits = async (req: any, res: Response) => {
  try {
    const habits = await prisma.habit.findMany({
      where: { userId: req.userId },
      include: { logs: true },
    });
    res.json(habits);
  } catch (error: any) {
    console.error("Habits fetch error:", error);
    res.status(500).json({ error: "Fetch failed", details: error.message });
  }
};

export const createHabit = async (req: any, res: Response) => {
  try {
    const data = habitSchema.parse(req.body);
    const habit = await prisma.habit.create({
      data: {
        ...data,
        userId: req.userId,
      },
      include: { logs: true },
    });
    res.json(habit);
  } catch (error: any) {
    console.error("Habit creation error:", error);
    res.status(500).json({ error: "Creation failed", details: error.message });
  }
};

export const logHabit = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const logSchema = z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "El formato debe ser YYYY-MM-DD"),
      completed: z.boolean(),
    });
    const { date, completed } = logSchema.parse(req.body);

    const habit = await prisma.habit.findFirst({
      where: { id, userId: req.userId },
    });

    if (!habit) {
      return res.status(404).json({ error: "Habito no encontrado" });
    }

    const log = await prisma.habitLog.upsert({
      where: {
        habitId_date: {
          habitId: id,
          date,
        },
      },
      update: {
        completed,
      },
      create: {
        habitId: id,
        date,
        completed,
      },
    });

    res.json(log);
  } catch (error: any) {
    console.error("Habit log error:", error);
    res.status(500).json({ error: "Logging failed", details: error.message });
  }
};

export const deleteHabit = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.habit.delete({ where: { id, userId: req.userId } });
    res.json({ message: "Deleted" });
  } catch (error) {
    res.status(500).json({ error: "Delete failed" });
  }
};

export const updateHabit = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const data = habitSchema.partial().parse(req.body);
    const updated = await prisma.habit.update({
      where: { id, userId: req.userId },
      data,
      include: { logs: true },
    });
    res.json(updated);
  } catch (error: any) {
    console.error("Habit update error:", error);
    res.status(500).json({ error: "Update failed", details: error.message });
  }
};
