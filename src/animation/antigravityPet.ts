/**
 * Converts privacy-safe Anti-Gravity lifecycle events into companion moments.
 * Keeping this pure makes the behavior predictable and prevents UI code from
 * making claims based on terminal output it never received.
 */

import type { AntigravityActivityEvent, CharacterState } from "../shared/types";

export type PetMood = "idle" | "thinking" | "working" | "waiting" | "attention" | "celebrating";

export interface PetReaction {
  mood: PetMood;
  animation: CharacterState;
  thought: string;
  ariaLabel: string;
  shownSince: number;
  minimumUntil: number;
}

interface MoodDefinition {
  animation: CharacterState;
  thought: string;
  ariaLabel: string;
  minimumMs: number;
  priority: number;
}

const MOODS: Record<PetMood, MoodDefinition> = {
  idle: { animation: "Idle", thought: "", ariaLabel: "Companion is resting", minimumMs: 0, priority: 0 },
  thinking: { animation: "Walk", thought: "Looking around.", ariaLabel: "You are using Anti-Gravity", minimumMs: 1_000, priority: 1 },
  waiting: { animation: "Idle", thought: "Ready when you are.", ariaLabel: "Anti-Gravity is idle", minimumMs: 1_000, priority: 1 },
  working: { animation: "Run", thought: "Working on it.", ariaLabel: "Anti-Gravity is coding", minimumMs: 1_200, priority: 3 },
  attention: { animation: "FallLoop", thought: "Need your approval.", ariaLabel: "Anti-Gravity is awaiting approval", minimumMs: 1_500, priority: 4 },
  celebrating: { animation: "Combo1", thought: "Nice work!", ariaLabel: "Anti-Gravity completed a task", minimumMs: 2_000, priority: 5 },
};

export function initialPetReaction(now = Date.now()): PetReaction {
  return makeReaction("idle", now);
}

/** Derive a stable pet reaction. Higher-priority moods may interrupt lower ones. */
export function reducePetReaction(
  current: PetReaction,
  event: AntigravityActivityEvent,
): PetReaction {
  const now = event.observedAt;
  const candidate = moodForEvent(event);

  if (candidate === current.mood) return current;

  const candidateDefinition = MOODS[candidate];
  const currentDefinition = MOODS[current.mood];
  if (now < current.minimumUntil && candidateDefinition.priority <= currentDefinition.priority) {
    return current;
  }

  return makeReaction(candidate, now);
}

function moodForEvent(event: AntigravityActivityEvent): PetMood {
  switch (event.phase) {
    case "coding": return "working";
    case "interacting": return "thinking";
    // `awaitingApproval` is safe to show only when a future Anti-Gravity hook
    // confirms it. CPU/process inactivity alone must never make the pet claim
    // that the user needs to approve something.
    case "awaitingApproval": return event.confidence === "confirmed" ? "attention" : "waiting";
    case "completed": return "celebrating";
    case "waiting": return "waiting";
    case "idle":
    case "inactive": return "idle";
  }
}

function makeReaction(mood: PetMood, now: number): PetReaction {
  const definition = MOODS[mood];
  return {
    mood,
    animation: definition.animation,
    thought: definition.thought,
    ariaLabel: definition.ariaLabel,
    shownSince: now,
    minimumUntil: now + definition.minimumMs,
  };
}
