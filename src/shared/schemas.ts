/**
 * @fileoverview Zod runtime validation schemas for all bridge layer data.
 * Every value crossing the Rust<->TypeScript boundary is validated here.
 */

import { z } from "zod";

// AI


export const ProviderSchema = z.enum([
  "openai",
  "anthropic",
  "gemini",
  "grok",
  "ollama",
  "custom",
]);

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

export const StreamParamsSchema = z.object({
  provider: ProviderSchema,
  model: z.string().min(1),
  customUrl: z.string().url().optional(),
  messages: z.array(ChatMessageSchema).min(1),
  requestId: z.string().uuid(),
});

// Reminders


export const ReminderSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  fireAt: z.string(),
  recurrence: z.string().optional(),
  fired: z.boolean(),
  createdAt: z.string(),
});

export const ReminderInputSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  fireAt: z.string(),
  recurrence: z.string().optional(),
});

// Notes


export const NoteSchema = z.object({
  id: z.string(),
  content: z.string(),
  posX: z.number(),
  posY: z.number(),
  updatedAt: z.string(),
});

export const NoteInputSchema = z.object({
  id: z.string().optional(),
  content: z.string(),
  posX: z.number().optional(),
  posY: z.number().optional(),
});

// Settings


export const AppSettingsSchema = z.object({
  provider: ProviderSchema,
  model: z.string().min(1),
  customUrl: z.string().url().optional(),
  autonomousMovement: z.boolean(),
  reactionsEnabled: z.boolean(),
  pomodoroFocusMinutes: z.number().int().min(1).max(120),
  pomodoroBreakMinutes: z.number().int().min(1).max(60),
  theme: z.enum(["dark", "light", "system"]),
  characterSkin: z.string().optional(),
});

export const CompanionMovementStateSchema = z.object({
  x: z.number().int(),
  y: z.number().int(),
  minX: z.number().int(),
  maxX: z.number().int(),
  minY: z.number().int(),
  maxY: z.number().int(),
});

// Anti-Gravity CLI companion activity


export const AntigravityActivityEventSchema = z.object({
  detected: z.boolean(),
  processName: z.union([z.literal("Anti-Gravity CLI"), z.literal("")]),
  phase: z.enum([
    "interacting",
    "coding",
    "awaitingApproval",
    "completed",
    "waiting",
    "idle",
    "inactive",
  ]),
  confidence: z.enum(["inferred", "confirmed"]),
  observedAt: z.number().int().nonnegative(),
  historyUpdated: z.boolean(),
});

// Frame Map (animation engine)


export const FrameStateSchema = z.object({
  sheet: z.string(),
  frameCount: z.number().int().positive(),
  fps: z.number().positive(),
  loop: z.boolean(),
  oneShot: z.boolean(),
});

export const FrameMapSchema = z.object({
  frameWidth: z.number().int().positive(),
  frameHeight: z.number().int().positive(),
  attribution: z.object({
    author: z.string(),
    asset: z.string(),
    license: z.string(),
    url: z.string(),
  }),
  states: z.record(z.string(), FrameStateSchema),
});

export type FrameState = z.infer<typeof FrameStateSchema>;
export type FrameMap = z.infer<typeof FrameMapSchema>;
