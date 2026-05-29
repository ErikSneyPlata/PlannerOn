// projects.controller.ts
import { Response } from "express";
import prisma from "../../config/prisma";
import { z } from "zod";

// ─── Schema ───────────────────────────────────────────────────────────────────

const projectSchema = z.object({
  title:       z.string().min(1),
  description: z.string().nullish(),
  color:       z.string().nullish(),
  priority:    z.enum(["CRITICAL", "HIGH", "NORMAL", "LOW", "SOMEDAY"]).default("NORMAL"),
  status:      z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]).default("ACTIVE"),
  // FIX 1 — progress no estaba en el schema; el slider del frontend lo envía
  progress:    z.number().int().min(0).max(100).optional(),
  budget:      z.number().nullish(),
  revenue:     z.number().nullish(),
  startDate:   z.string().nullish(),
  dueDate:     z.string().nullish(),
});

// Reutilizamos el include en todas las operaciones para que el frontend
// siempre reciba _count y tasks con la misma forma.
const PROJECT_INCLUDE = {
  _count: { select: { tasks: true } },
  tasks:  { take: 5 },
} as const;

// Helper: convierte el string de fecha al tipo correcto para Prisma.
// FIX 2 — si el valor es null / undefined / "" lo ponemos explícitamente en null
//         para que Prisma borre la fecha en updates (antes se ignoraba el null).
function parseDate(value: string | null | undefined): Date | null {
  if (!value || value.trim() === "") return null;
  return new Date(value);
}

// ─── GET /projects ────────────────────────────────────────────────────────────

export const getProjects = async (req: any, res: Response) => {
  try {
    const projects = await prisma.project.findMany({
      where:   { userId: req.userId },
      include: PROJECT_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    res.json(projects);
  } catch (error: any) {
    console.error("Projects fetch error:", error);
    res.status(500).json({ error: "Fetch failed", details: error.message });
  }
};

// ─── POST /projects ───────────────────────────────────────────────────────────

export const createProject = async (req: any, res: Response) => {
  try {
    const data = projectSchema.parse(req.body);

    const project = await prisma.project.create({
      data: {
        title:       data.title,
        description: data.description ?? null,
        color:       data.color ?? "#4d8eff",
        priority:    data.priority,
        status:      data.status,
        // FIX 3 — progress se persiste ahora (venía undefined antes)
        progress:    data.progress ?? 0,
        budget:      data.budget   ?? null,
        revenue:     data.revenue  ?? null,
        startDate:   parseDate(data.startDate),
        dueDate:     parseDate(data.dueDate),
        userId:      req.userId,
      },
      // FIX 4 — create también devuelve _count y tasks
      include: PROJECT_INCLUDE,
    });

    res.status(201).json(project);
  } catch (error: any) {
    console.error("Projects creation error:", error);
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    res.status(500).json({ error: "Creation failed", details: error.message });
  }
};

// ─── PATCH /projects/:id ──────────────────────────────────────────────────────

export const updateProject = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const data = projectSchema.partial().parse(req.body);

    // FIX 5 — construimos el objeto de actualización explícitamente para que
    //         los campos ausentes en el body NO sobreescriban valores existentes,
    //         y los campos null SÍ borren fechas (antes data.startDate ? ... los ignoraba).
    const updateData: Record<string, unknown> = {};

    if (data.title       !== undefined) updateData.title       = data.title;
    if (data.description !== undefined) updateData.description = data.description ?? null;
    if (data.color       !== undefined) updateData.color       = data.color;
    if (data.priority    !== undefined) updateData.priority    = data.priority;
    if (data.status      !== undefined) updateData.status      = data.status;
    if (data.progress    !== undefined) updateData.progress    = data.progress;
    if (data.budget      !== undefined) updateData.budget      = data.budget   ?? null;
    if (data.revenue     !== undefined) updateData.revenue     = data.revenue  ?? null;
    // parseDate devuelve null cuando el valor es "" o null → Prisma borra la fecha
    if (data.startDate   !== undefined) updateData.startDate   = parseDate(data.startDate);
    if (data.dueDate     !== undefined) updateData.dueDate     = parseDate(data.dueDate);

    const project = await prisma.project.update({
      where:   { id, userId: req.userId },
      data:    updateData,
      // FIX 6 — update también devuelve _count y tasks
      include: PROJECT_INCLUDE,
    });

    res.json(project);
  } catch (error: any) {
    console.error("Projects update error:", error);
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Project not found" });
    }
    res.status(500).json({ error: "Update failed", details: error.message });
  }
};

// ─── DELETE /projects/:id ─────────────────────────────────────────────────────
// FIX 7 — esta función no existía; el botón de eliminar del frontend la necesita

export const deleteProject = async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.project.delete({
      where: { id, userId: req.userId },
    });

    res.status(204).send();
  } catch (error: any) {
    console.error("Projects delete error:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Project not found" });
    }
    res.status(500).json({ error: "Delete failed", details: error.message });
  }
};