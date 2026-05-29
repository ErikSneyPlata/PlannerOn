import { Response } from "express";
import prisma from "../../config/prisma";
import { z } from "zod";

const documentationSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().default(""),
  category: z.enum(["DEVELOPMENT", "ARCHITECTURE", "DESIGN", "DATABASE", "OTHER"]).default("DEVELOPMENT"),
  projectId: z.string().min(1),
});

// ─── GET /documentation ───────────────────────────────────────────────────────
export const getDocumentations = async (req: any, res: Response) => {
  try {
    const { projectId } = req.query;
    
    const whereClause: any = { userId: req.userId };
    if (projectId) {
      whereClause.projectId = projectId;
    }

    const docs = await prisma.projectDocumentation.findMany({
      where: whereClause,
      include: {
        project: {
          select: {
            title: true,
            color: true,
          }
        }
      },
      orderBy: { updatedAt: "desc" },
    });
    res.json(docs);
  } catch (error: any) {
    console.error("Documentation fetch error:", error);
    res.status(500).json({ error: "Fetch failed", details: error.message });
  }
};

// ─── GET /documentation/:id ───────────────────────────────────────────────────
export const getDocumentationById = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const doc = await prisma.projectDocumentation.findFirst({
      where: { id, userId: req.userId },
      include: {
        project: {
          select: {
            title: true,
            color: true,
          }
        }
      }
    });

    if (!doc) {
      return res.status(404).json({ error: "Documentation not found" });
    }

    res.json(doc);
  } catch (error: any) {
    console.error("Documentation view error:", error);
    res.status(500).json({ error: "View failed", details: error.message });
  }
};

// ─── POST /documentation ──────────────────────────────────────────────────────
export const createDocumentation = async (req: any, res: Response) => {
  try {
    const data = documentationSchema.parse(req.body);

    // Verify project belongs to user
    const project = await prisma.project.findFirst({
      where: { id: data.projectId, userId: req.userId },
    });

    if (!project) {
      return res.status(403).json({ error: "No tienes permiso para este proyecto o el proyecto no existe." });
    }

    const doc = await prisma.projectDocumentation.create({
      data: {
        ...data,
        userId: req.userId,
      },
      include: {
        project: {
          select: {
            title: true,
            color: true,
          }
        }
      }
    });

    res.status(201).json(doc);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("Documentation create error:", error);
    res.status(500).json({ error: "Creation failed", details: error.message });
  }
};

// ─── PATCH /documentation/:id ─────────────────────────────────────────────────
export const updateDocumentation = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const data = documentationSchema.partial().parse(req.body);

    // If updating project, verify new project is owned by user
    if (data.projectId) {
      const project = await prisma.project.findFirst({
        where: { id: data.projectId, userId: req.userId },
      });
      if (!project) {
        return res.status(403).json({ error: "No tienes permiso para este proyecto o el proyecto no existe." });
      }
    }

    const updated = await prisma.projectDocumentation.update({
      where: { id, userId: req.userId },
      data,
      include: {
        project: {
          select: {
            title: true,
            color: true,
          }
        }
      }
    });

    res.json(updated);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Documentation not found" });
    }
    console.error("Documentation update error:", error);
    res.status(500).json({ error: "Update failed", details: error.message });
  }
};

// ─── DELETE /documentation/:id ────────────────────────────────────────────────
export const deleteDocumentation = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.projectDocumentation.delete({
      where: { id, userId: req.userId },
    });
    res.status(204).send();
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Documentation not found" });
    }
    console.error("Documentation delete error:", error);
    res.status(500).json({ error: "Delete failed", details: error.message });
  }
};
