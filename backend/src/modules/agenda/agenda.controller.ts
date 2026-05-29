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

const updateEventSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullish(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  category: z.enum(["WORK", "STUDY", "REST", "MEETING", "EXERCISE", "PERSONAL"]).optional(),
  completed: z.boolean().optional(),
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

export const updateEvent = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.agendaEvent.findUnique({
      where: { id },
    });
    if (!existing || existing.userId !== req.userId) {
      return res.status(404).json({ error: "Event not found" });
    }

    const data = updateEventSchema.parse(req.body);
    const updateData: any = { ...data };
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.endDate) updateData.endDate = new Date(data.endDate);

    const event = await prisma.agendaEvent.update({
      where: { id },
      data: updateData,
    });
    res.json(event);
  } catch (error: any) {
    console.error("Agenda update error:", error);
    res.status(500).json({ error: "Update failed", details: error.message });
  }
};

export const deleteEvent = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.agendaEvent.findUnique({
      where: { id },
    });
    if (!existing || existing.userId !== req.userId) {
      return res.status(404).json({ error: "Event not found" });
    }
    await prisma.agendaEvent.delete({ where: { id } });
    res.json({ message: "Deleted" });
  } catch (error: any) {
    console.error("Delete event failed:", error);
    res.status(500).json({ error: "Delete failed" });
  }
};
