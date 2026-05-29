// src/modules/tasks/tasks.controller.ts
import { Response } from "express";
import prisma from "../../config/prisma";
import { z } from "zod";

const taskSchema = z.object({
  title:         z.string().min(1),
  description:   z.string().nullish(),
  priority:      z.enum(["CRITICAL", "HIGH", "NORMAL", "LOW", "SOMEDAY"]).default("NORMAL"),
  status:        z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "BLOCKED", "COMPLETED", "ARCHIVED"]).default("TODO"),
  tags:          z.string().nullish(),          // ← ahora existe en la DB
  dueDate:       z.string().nullish(),
  projectId:     z.string().nullish(),
  estimatedTime: z.number().int().nullish(),
  actualTime:    z.number().int().nullish(),
});

// ── GET /api/tasks ────────────────────────────────────────────────────────────
export const getTasks = async (req: any, res: Response) => {
  try {
    const tasks = await prisma.task.findMany({
      where:   { userId: req.userId },
      include: { project: true, focusSessions: { orderBy: { createdAt: "desc" } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(tasks);
  } catch (error: any) {
    console.error("[Tasks] Fetch error:", error.message);
    res.status(500).json({ error: "Fetch failed", details: error.message });
  }
};

// ── POST /api/tasks ───────────────────────────────────────────────────────────
export const createTask = async (req: any, res: Response) => {
  try {
    const data = taskSchema.parse(req.body);

    const task = await prisma.task.create({
      data: {
        title:         data.title,
        description:   data.description   ?? null,
        priority:      data.priority,
        status:        data.status,
        tags:          data.tags          ?? null,
        estimatedTime: data.estimatedTime ?? null,
        actualTime:    data.actualTime    ?? null,
        dueDate:       (data.dueDate && data.dueDate !== "")
                         ? new Date(data.dueDate)
                         : null,
        projectId:     data.projectId     ?? null,
        userId:        req.userId,
      },
      include: { project: true, focusSessions: { orderBy: { createdAt: "desc" } } },
    });

    res.json(task);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      console.error("[Tasks] Validation error:", error.issues);
      return res.status(400).json({ error: "Validation failed", details: error.issues });
    }
    console.error("[Tasks] Creation error:", error.message);
    res.status(500).json({ error: "Creation failed", details: error.message });
  }
};

// ── PATCH /api/tasks/:id ──────────────────────────────────────────────────────
export const updateTask = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const data   = taskSchema.partial().parse(req.body);

    const task = await prisma.task.update({
      where: { id, userId: req.userId },
      data: {
        ...(data.title         !== undefined && { title:         data.title         }),
        ...(data.description   !== undefined && { description:   data.description   }),
        ...(data.priority      !== undefined && { priority:      data.priority      }),
        ...(data.status        !== undefined && { status:        data.status        }),
        ...(data.tags          !== undefined && { tags:          data.tags          }),
        ...(data.estimatedTime !== undefined && { estimatedTime: data.estimatedTime }),
        ...(data.actualTime    !== undefined && { actualTime:    data.actualTime    }),
        ...(data.projectId     !== undefined && { projectId:     data.projectId     }),
        ...(data.dueDate !== undefined && {
          dueDate: (data.dueDate && data.dueDate !== "")
                     ? new Date(data.dueDate)
                     : null,
        }),
      },
      include: { project: true, focusSessions: { orderBy: { createdAt: "desc" } } },
    });

    res.json(task);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.issues });
    }
    console.error("[Tasks] Update error:", error.message);
    res.status(500).json({ error: "Update failed", details: error.message });
  }
};

// ── DELETE /api/tasks/:id ─────────────────────────────────────────────────────
export const deleteTask = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.task.delete({ where: { id, userId: req.userId } });
    res.json({ message: "Deleted" });
  } catch (error: any) {
    console.error("[Tasks] Delete error:", error.message);
    res.status(500).json({ error: "Delete failed", details: error.message });
  }
};