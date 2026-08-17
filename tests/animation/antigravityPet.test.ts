import { describe, expect, it } from "vitest";
import { initialPetReaction, reducePetReaction } from "../../src/animation/antigravityPet";
import type { AntigravityActivityEvent } from "../../src/shared/types";

function event(phase: AntigravityActivityEvent["phase"], observedAt: number): AntigravityActivityEvent {
  return {
    detected: phase !== "inactive",
    processName: phase === "inactive" ? "" : "Anti-Gravity CLI",
    phase,
    confidence: "inferred",
    observedAt,
    historyUpdated: false,
  };
}

describe("Anti-Gravity pet reaction reducer", () => {
  it("maps work to the focused running animation", () => {
    const reaction = reducePetReaction(initialPetReaction(0), event("coding", 10));
    expect(reaction).toMatchObject({ mood: "working", animation: "Run" });
  });

  it("keeps walking while the user is interacting with Anti-Gravity", () => {
    const reaction = reducePetReaction(initialPetReaction(0), event("interacting", 10));
    expect(reaction).toMatchObject({ mood: "thinking", animation: "Walk" });
  });

  it("does not guess that a quiet CLI needs approval", () => {
    const reaction = reducePetReaction(initialPetReaction(0), event("awaitingApproval", 10));
    expect(reaction).toMatchObject({ mood: "waiting", animation: "Idle" });
  });

  it("holds the falling loop only for confirmed approval", () => {
    const approval = { ...event("awaitingApproval", 10), confidence: "confirmed" as const };
    const reaction = reducePetReaction(initialPetReaction(0), approval);
    expect(reaction).toMatchObject({ mood: "attention", animation: "FallLoop" });
  });

  it("uses the combo animation only for an explicit completion phase", () => {
    const reaction = reducePetReaction(initialPetReaction(0), event("completed", 10));
    expect(reaction).toMatchObject({ mood: "celebrating", animation: "Combo1" });
  });

  it("does not flicker to idle during a working minimum duration", () => {
    const working = reducePetReaction(initialPetReaction(0), event("coding", 10));
    const idle = reducePetReaction(working, event("idle", 100));
    expect(idle).toBe(working);
  });

  it("returns to idle once the work minimum duration has elapsed", () => {
    const working = reducePetReaction(initialPetReaction(0), event("coding", 10));
    const idle = reducePetReaction(working, event("inactive", 1_300));
    expect(idle).toMatchObject({ mood: "idle", animation: "Idle" });
  });
});
