import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../../config/prisma";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-planneron";

export const register = async (req: Request, res: Response) => {
  try {
    // 1. Honeypot check: 'username' is an unused field rendered invisibly on the frontend.
    // If filled, we know it's an automated bot. We reject it.
    if (req.body.username) {
      console.warn("[SECURITY] Bot detected via invisible honeypot field 'username' during registration.");
      return res.status(400).json({ error: "La solicitud de registro no cumple con las políticas de autenticidad." });
    }

    // 2. Anti-bot slider proof: the user must slide the interactive slider to unlock this value on the submit body.
    if (req.body.botProof !== "human-slider-verified") {
      return res.status(400).json({ error: "Por favor, complete la verificación interactiva deslizante para corroborar que es un humano." });
    }

    const { email, password, name = "" } = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "El usuario ya existe con este correo electrónico." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { 
        email, 
        password: hashedPassword, 
        name,
        settings: {
          create: {},
        },
      },

      include: {
        settings: true,
      
      },
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });

    res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production" });
    res.json({ user: { id: user.id, email: user.email, name: user.name }, token });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: (error as any).errors || error.message });
    }
    res.status(500).json({ error: "Registration failed" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    // Honeypot check for login as well
    if (req.body.username) {
      console.warn("[SECURITY] Bot detected via invisible honeypot field 'username' during login.");
      return res.status(400).json({ error: "La solicitud de acceso no cumple con las políticas de autenticidad." });
    }

    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Las credenciales ingresadas son incorrectas." });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });

    res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production" });
    res.json({ user: { id: user.id, email: user.email, name: user.name }, token });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: (error as any).errors || error.message });
    }
    res.status(500).json({ error: "Login failed" });
  }
};

export const me = async (req: any, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, name: true },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Fetch failed" });
  }
};

export const logout = (req: Request, res: Response) => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
};
 