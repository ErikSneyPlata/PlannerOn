// backend/src/modules/notes/notes.controller.ts
import { Response } from 'express';
import prisma from '../../config/prisma';
import { z } from 'zod';

const noteSchema = z.object({
  title:    z.string().min(1).max(200),
  content:  z.string().default(''),
  category: z.string().max(50).default('General'),
  color:    z.string().default('#4d8eff'),
  isPinned: z.boolean().default(false),
});

// ─── GET /notes ───────────────────────────────────────────────────────────────

export const getNotes = async (req: any, res: Response) => {
  try {
    const notes = await prisma.note.findMany({
      where:   { userId: req.userId },
      orderBy: [
        { isPinned: 'desc' },
        { updatedAt: 'desc' },
      ],
    });
    res.json(notes);
  } catch (error: any) {
    console.error('Notes fetch error:', error);
    res.status(500).json({ error: 'Fetch failed', details: error.message });
  }
};

// ─── POST /notes ──────────────────────────────────────────────────────────────

export const createNote = async (req: any, res: Response) => {
  try {
    const data = noteSchema.parse(req.body);
    const note = await prisma.note.create({
      data: { ...data, userId: req.userId },
    });
    res.status(201).json(note);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Note create error:', error);
    res.status(500).json({ error: 'Creation failed', details: error.message });
  }
};

// ─── PATCH /notes/:id ─────────────────────────────────────────────────────────

export const updateNote = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const data   = noteSchema.partial().parse(req.body);
    const note   = await prisma.note.update({
      where: { id, userId: req.userId },
      data,
    });
    res.json(note);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Note not found' });
    }
    console.error('Note update error:', error);
    res.status(500).json({ error: 'Update failed', details: error.message });
  }
};

// ─── DELETE /notes/:id ────────────────────────────────────────────────────────

export const deleteNote = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.note.delete({ where: { id, userId: req.userId } });
    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Note not found' });
    }
    console.error('Note delete error:', error);
    res.status(500).json({ error: 'Delete failed', details: error.message });
  }
};