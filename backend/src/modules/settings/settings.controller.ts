// backend/src/modules/settings/settings.controller.ts

import { Response } from 'express';
import prisma from '../../config/prisma';
import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
// SCHEMAS
// ─────────────────────────────────────────────────────────────

const settingsSchema = z.object({
  theme:            z.string().min(1).max(30).default('dark'),
  language:         z.string().min(1).max(20).default('es'),
  timezone:         z.string().min(1).max(100).default('America/Bogota'),

  notifications:    z.boolean().default(true),
  analytics:        z.boolean().default(true),
  crossDeviceSync:  z.boolean().default(false),
});

const profileSchema = z.object({
  name:   z.string().min(2).max(100).optional(),
  avatar: z.string().url().nullable().optional(),
});

// ─────────────────────────────────────────────────────────────
// GET /settings
// ─────────────────────────────────────────────────────────────

export const getSettings = async (req: any, res: Response) => {
  try {
    let settings = await prisma.userSettings.findUnique({
      where: {
        userId: req.userId,
      },
    });

    // Create default settings automatically
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId: req.userId,
        },
      });
    }

    res.json(settings);
  } catch (error: any) {
    console.error('Settings fetch error:', error);

    res.status(500).json({
      error: 'Fetch failed',
      details: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────
// PATCH /settings
// ─────────────────────────────────────────────────────────────

export const updateSettings = async (req: any, res: Response) => {
  try {
    const data = settingsSchema.partial().parse(req.body);

    const settings = await prisma.userSettings.upsert({
      where: {
        userId: req.userId,
      },

      update: data,

      create: {
        userId: req.userId,
        ...data,
      },
    });

    res.json(settings);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      });
    }

    console.error('Settings update error:', error);

    res.status(500).json({
      error: 'Update failed',
      details: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /settings/profile
// ─────────────────────────────────────────────────────────────

export const getProfile = async (req: any, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.userId,
      },

      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    res.json(user);
  } catch (error: any) {
    console.error('Profile fetch error:', error);

    res.status(500).json({
      error: 'Fetch failed',
      details: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────
// PATCH /settings/profile
// ─────────────────────────────────────────────────────────────

export const updateProfile = async (req: any, res: Response) => {
  try {
    const data = profileSchema.parse(req.body);

    const user = await prisma.user.update({
      where: {
        id: req.userId,
      },

      data,

      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        updatedAt: true,
      },
    });

    res.json(user);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      });
    }

    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    console.error('Profile update error:', error);

    res.status(500).json({
      error: 'Update failed',
      details: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /settings/account
// ─────────────────────────────────────────────────────────────

export const deleteAccount = async (req: any, res: Response) => {
  try {
    await prisma.user.delete({
      where: {
        id: req.userId,
      },
    });

    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    console.error('Account delete error:', error);

    res.status(500).json({
      error: 'Delete failed',
      details: error.message,
    });
  }
};