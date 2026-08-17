/**
 * @fileoverview Shared type contracts between the native Rust layer and the
 * React UI. These types must stay in sync with the Rust command structs.
 *
 * All types are validated at runtime using Zod schemas defined in schemas.ts.
 */

// AI


/** Supported AI provider identifiers — must match Rust `Provider` enum. */
export type Provider =
  | "openai"
  | "anthropic"
  | "gemini"
  | "grok"
  | "ollama"
  | "custom";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface StreamParams {
  provider: Provider;
  model: string;
  customUrl?: string;
  messages: ChatMessage[];
  requestId: string;
}

export interface ChunkEvent {
  delta: string;
}

export interface DoneEvent {
  usage: { promptTokens?: number; completionTokens?: number } | null;
}

export interface ErrorEvent {
  message: string;
}

// Chat Sessions


export interface Session {
  id: string;
  title: string;
  provider: Provider;
  model: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

// Reminders


export interface Reminder {
  id: string;
  title: string;
  description?: string;
  fireAt: string;       // ISO 8601 UTC
  recurrence?: string;  // e.g. "daily", "weekly", cron-style
  fired: boolean;
  createdAt: string;
}

export interface ReminderInput {
  title: string;
  description?: string;
  fireAt: string;
  recurrence?: string;
}

// Notes


export interface Note {
  id: string;
  content: string;
  posX: number;
  posY: number;
  updatedAt: string;
}

export interface NoteInput {
  id?: string;
  content: string;
  posX?: number;
  posY?: number;
}

// Settings


export interface AppSettings {
  provider: Provider;
  model: string;
  customUrl?: string;
  autonomousMovement: boolean;
  reactionsEnabled: boolean;
  pomodoroFocusMinutes: number;
  pomodoroBreakMinutes: number;
  theme: "dark" | "light" | "system";
  characterSkin?: "default" | "crimson" | "emerald" | "gold" | "amethyst" | "shadow" | "cyber" | string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  provider: "openai",
  model: "gpt-4o",
  autonomousMovement: true,
  reactionsEnabled: true,
  pomodoroFocusMinutes: 25,
  pomodoroBreakMinutes: 5,
  theme: "dark",
  characterSkin: "default",
};

// Animation / Character


/** All animation states available from the Ozzbit Games sprite pack. */
export type CharacterState =
  | "Idle"
  | "Run"
  | "Walk"
  | "Jump"
  | "Fall"
  | "FallLoop"
  | "Combo1"
  | "Combo1End";

/** States that are one-shot (play once then call onComplete). */
export const ONE_SHOT_STATES: CharacterState[] = [
  "Jump",
  "Fall",
  "Combo1",
  "Combo1End",
];

/** States that loop indefinitely until explicitly changed. */
export const LOOP_STATES: CharacterState[] = [
  "Idle",
  "Run",
  "Walk",
  "FallLoop",
];

/** Native-window coordinates and the complete virtual desktop range. */
export interface CompanionMovementState {
  x: number;
  y: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

// Anti-Gravity CLI companion activity


/**
 * Privacy-safe phases inferred from Anti-Gravity CLI lifecycle signals.
 * These are intentionally broad: the companion never receives terminal text,
 * prompts, command arguments, file names, or error output.
 */
export type AntigravityActivityPhase =
  | "interacting"
  | "coding"
  | "awaitingApproval"
  | "completed"
  | "waiting"
  | "idle"
  | "inactive";

export interface AntigravityActivityEvent {
  detected: boolean;
  processName: "Anti-Gravity CLI" | "";
  phase: AntigravityActivityPhase;
  confidence: "inferred" | "confirmed";
  observedAt: number;
  historyUpdated: boolean;
}
