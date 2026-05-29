// backend/src/modules/focus/focus.controller.ts
import { Response } from 'express';
import prisma from '../../config/prisma';
import { z } from 'zod';

const createSchema = z.object({
  duration:  z.number().int().min(1),           // seconds
  taskId:    z.string().optional().nullable(),
  completed: z.boolean().optional().default(false),
});

// ─── GET /focus ───────────────────────────────────────────────────────────────
// Returns aggregated stats + last 20 sessions

export const getFocusSessions = async (req: any, res: Response) => {
  try {
    const userId     = req.userId;
    const now        = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart  = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [sessions, todaySessions, weekSessions, monthSessions] = await Promise.all([
      prisma.focusSession.findMany({
        where:   { userId, completed: true },
        include: { task: { select: { id: true, title: true } } },
        orderBy: { createdAt: 'desc' },
        take:    20,
      }),
      prisma.focusSession.aggregate({
        where: { userId, completed: true, createdAt: { gte: todayStart } },
        _sum:  { duration: true },
        _count: true,
      }),
      prisma.focusSession.aggregate({
        where: { userId, completed: true, createdAt: { gte: weekStart } },
        _sum:  { duration: true },
        _count: true,
      }),
      prisma.focusSession.aggregate({
        where: { userId, completed: true, createdAt: { gte: monthStart } },
        _sum:  { duration: true },
        _count: true,
      }),
    ]);

    const totalAll = await prisma.focusSession.aggregate({
      where: { userId, completed: true },
      _sum:  { duration: true },
      _count: true,
    });

    res.json({
      stats: {
        todaySeconds:  todaySessions._sum.duration  ?? 0,
        todaySessions: todaySessions._count,
        weekSeconds:   weekSessions._sum.duration   ?? 0,
        weekSessions:  weekSessions._count,
        monthSeconds:  monthSessions._sum.duration  ?? 0,
        monthSessions: monthSessions._count,
        totalSeconds:  totalAll._sum.duration       ?? 0,
        totalSessions: totalAll._count,
      },
      sessions: sessions.map(s => ({
        id:        s.id,
        duration:  s.duration,
        completed: s.completed,
        createdAt: s.createdAt,
        task:      s.task ?? null,
      })),
    });
  } catch (error: any) {
    console.error('Focus fetch error:', error);
    res.status(500).json({ error: 'Fetch failed', details: error.message });
  }
};

// ─── POST /focus ──────────────────────────────────────────────────────────────
// Called when a session starts (or is saved on completion)

export const createFocusSession = async (req: any, res: Response) => {
  try {
    const data    = createSchema.parse(req.body);
    const session = await prisma.focusSession.create({
      data: {
        duration:  data.duration,
        completed: data.completed ?? false,
        taskId:    data.taskId   ?? null,
        userId:    req.userId,
      },
      include: { task: { select: { id: true, title: true } } },
    });
    res.status(201).json(session);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Focus create error:', error);
    res.status(500).json({ error: 'Creation failed', details: error.message });
  }
};

// ─── PATCH /focus/:id/complete ────────────────────────────────────────────────
// Marks an existing session as completed and sets the final duration

export const completeFocusSession = async (req: any, res: Response) => {
  try {
    const { id }   = req.params;
    const { duration } = z.object({ duration: z.number().int().min(1) }).parse(req.body);

    const session = await prisma.focusSession.update({
      where: { id, userId: req.userId },
      data:  { completed: true, duration },
      include: { task: { select: { id: true, title: true } } },
    });
    res.json(session);
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Session not found' });
    console.error('Focus complete error:', error);
    res.status(500).json({ error: 'Update failed', details: error.message });
  }
};

// ─── DELETE /focus/:id ────────────────────────────────────────────────────────

export const deleteFocusSession = async (req: any, res: Response) => {
  try {
    await prisma.focusSession.delete({ where: { id: req.params.id, userId: req.userId } });
    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Session not found' });
    res.status(500).json({ error: 'Delete failed', details: error.message });
  }
};