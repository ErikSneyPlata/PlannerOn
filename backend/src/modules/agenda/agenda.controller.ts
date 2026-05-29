import { Response } from "express";
import prisma from "../../config/prisma";
import { z } from "zod";

const eventSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullish(),
  startDate: z.string(),
  endDate: z.string(),
  category: z.enum(["WORK", "STUDY", "REST", "MEETING", "EXERCISE", "PERSONAL"]).default("PERSONAL"),
});

export const getEvents = async (req: any, res: Response) => {
  try {
    const events = await prisma.agendaEvent.findMany({
      where: { userId: req.userId },
      orderBy: { startDate: "asc" },
    });
    res.json(events);
  } catch (error: any) {
    console.error("Agenda fetch error:", error);
    res.status(500).json({ error: "Fetch failed", details: error.message });
  }
};

export const createEvent = async (req: any, res: Response) => {
  try {
    const data = eventSchema.parse(req.body);
    const event = await prisma.agendaEvent.create({
      data: {
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        userId: req.userId,
      },
    });
    res.json(event);
  } catch (error: any) {
    console.error("Agenda creation error:", error);
    res.status(500).json({ error: "Creation failed", details: error.message });
  }
};

export const deleteEvent = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.agendaEvent.delete({ where: { id, userId: req.userId } });
    res.json({ message: "Deleted" });
  } catch (error) {
    res.status(500).json({ error: "Delete failed" });
  }
};
