// @vitest-environment jsdom
/**
 * Unit tests for CharacterStateMachine.
 * Uses jsdom environment for HTMLCanvasElement and Image availability.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CharacterStateMachine } from "../../src/animation/stateMachine";
import type { FrameMap } from "../../src/shared/schemas";

// Test fixture: minimal frame map with 2 states
const FRAME_MAP: FrameMap = {
  frameWidth: 128,
  frameHeight: 128,
  attribution: { author: "Test", asset: "test", license: "test", url: "http://test.com" },
  states: {
    Idle:   { sheet: "sheets/idle.png",    frameCount: 4, fps: 8,  loop: true,  oneShot: false },
    Jump:   { sheet: "sheets/jump.png",    frameCount: 3, fps: 10, loop: false, oneShot: true  },
    Combo1: { sheet: "sheets/combo_1.png", frameCount: 3, fps: 12, loop: false, oneShot: true  },
  },
};

// Mock canvas (jsdom's canvas doesn't support 2d by default)
const mockCtx = {
  clearRect: vi.fn(),
  drawImage: vi.fn(),
};

function createMockCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  vi.spyOn(canvas, "getContext").mockReturnValue(mockCtx as unknown as CanvasRenderingContext2D);
  return canvas;
}

// Tests
describe("CharacterStateMachine", () => {
  let sm: CharacterStateMachine;
  let rafCallbacks: FrameRequestCallback[];
  let rafId: number;

  beforeEach(() => {
    rafCallbacks = [];
    rafId = 0;

    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return ++rafId;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const canvas = createMockCanvas();
    sm = new CharacterStateMachine(canvas, FRAME_MAP, "/", {});
  });

  afterEach(() => {
    sm.destroy();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  /** Advance the RAF loop by N frames. */
  function advanceFrames(n: number, msPerFrame = 200): void {
    let ts = 0;
    for (let i = 0; i < n; i++) {
      ts += msPerFrame;
      const cbs = [...rafCallbacks];
      rafCallbacks = [];
      cbs.forEach((cb) => cb(ts));
    }
  }

  it("starts in Idle state", () => {
    expect(sm.state).toBe("Idle");
  });

  it("transitions to a new state on play()", () => {
    sm.play("Jump");
    expect(sm.state).toBe("Jump");
  });

  it("does not restart the same state if already playing", () => {
    sm.play("Idle");
    const countBefore = rafCallbacks.length;
    sm.play("Idle"); // second call — should no-op
    expect(rafCallbacks.length).toBe(countBefore);
  });

  it("calls onComplete for one-shot states", () => {
    const onComplete = vi.fn();
    sm.play("Jump", onComplete);
    // Jump has 3 frames at 10 fps → 100ms/frame, advance 200ms/tick × 20 = 4 seconds
    advanceFrames(20, 200);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("does not call onComplete for looping states", () => {
    const onComplete = vi.fn();
    sm.play("Idle", onComplete);
    advanceFrames(50, 200);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("auto-returns to Idle after one-shot if no onComplete given", () => {
    sm.play("Jump");
    advanceFrames(20, 200);
    expect(sm.state).toBe("Idle");
  });

  it("pause() stops the animation loop", () => {
    sm.play("Idle");
    sm.pause();
    expect(cancelAnimationFrame).toHaveBeenCalled();
  });

  it("resume() restarts after pause", () => {
    sm.play("Idle");
    sm.pause();
    rafCallbacks = []; // clear
    sm.resume();
    expect(rafCallbacks.length).toBeGreaterThan(0);
  });
});
