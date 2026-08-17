// @vitest-environment jsdom
/**
 * Unit tests for ByteWebsite component.
 * Validates animation selection, one-shot return-to-idle behavior,
 * metadata display, and Anti-Gravity activity simulation.
 */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ByteWebsite, { ANIMATION_PRESETS } from "../../src/windows/website/ByteWebsite";
import type { FrameMap } from "../../src/shared/schemas";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// ---------------------------------------------------------------------------
// Test fixture: Full frame map with all available states
// ---------------------------------------------------------------------------
const MOCK_FRAME_MAP: FrameMap = {
  frameWidth: 128,
  frameHeight: 128,
  attribution: { author: "Ozzbit Games", asset: "Fantasy Character", license: "Free", url: "http://example.com" },
  states: {
    Idle:      { sheet: "sheets/idle.png",        frameCount: 10, fps: 10, loop: true,  oneShot: false },
    Walk:      { sheet: "sheets/walk.png",        frameCount: 10, fps: 8,  loop: true,  oneShot: false },
    Run:       { sheet: "sheets/run.png",         frameCount: 10, fps: 12, loop: true,  oneShot: false },
    Jump:      { sheet: "sheets/jump.png",        frameCount: 6,  fps: 10, loop: false, oneShot: true  },
    Fall:      { sheet: "sheets/fall.png",        frameCount: 4,  fps: 10, loop: false, oneShot: true  },
    FallLoop:  { sheet: "sheets/fall_loop.png",   frameCount: 3,  fps: 10, loop: true,  oneShot: false },
    Combo1:    { sheet: "sheets/combo_1.png",     frameCount: 3,  fps: 12, loop: false, oneShot: true  },
    Combo1End: { sheet: "sheets/combo_1_end.png", frameCount: 4,  fps: 10, loop: false, oneShot: true  },
  },
};

describe("ByteWebsite", () => {
  let container: HTMLDivElement;
  let root: Root;
  let rafCallbacks: FrameRequestCallback[];
  let rafId: number;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    rafCallbacks = [];
    rafId = 0;

    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return ++rafId;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    // Mock matchMedia
    vi.stubGlobal("matchMedia", vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));

    // Mock canvas 2d context
    const mockCtx = {
      clearRect: vi.fn(),
      drawImage: vi.fn(),
    };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(mockCtx as unknown as CanvasRenderingContext2D);

    // Mock fetch for frame-map.json
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => MOCK_FRAME_MAP,
    }));
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  function advanceFrames(count: number, msPerFrame = 100): void {
    let ts = 0;
    for (let i = 0; i < count; i++) {
      ts += msPerFrame;
      const cbs = [...rafCallbacks];
      rafCallbacks = [];
      cbs.forEach((cb) => cb(ts));
    }
  }

  it("renders Byte's name and description", async () => {
    await act(async () => {
      root.render(<ByteWebsite />);
    });

    expect(container.querySelector("h1")?.textContent).toBe("Byte");
    expect(container.textContent).toContain("Byte is an animated AI companion for the Anti-Gravity CLI");
  });

  it("loads frame-map dynamically and renders all animation preset buttons", async () => {
    await act(async () => {
      root.render(<ByteWebsite />);
    });

    ANIMATION_PRESETS.forEach((preset) => {
      const btn = Array.from(container.querySelectorAll("button")).find((b) =>
        b.textContent?.includes(preset)
      );
      expect(btn).toBeDefined();
    });
  });

  it("selects and plays loopable animations without auto-returning to Idle", async () => {
    await act(async () => {
      root.render(<ByteWebsite />);
    });

    const runBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Run")
    );
    expect(runBtn).toBeDefined();

    await act(async () => {
      runBtn?.click();
    });

    expect(runBtn?.getAttribute("aria-pressed")).toBe("true");
    expect(container.textContent).toContain("State: Run (Looping)");

    // Advance frames — should stay Run
    act(() => {
      advanceFrames(20);
    });

    expect(container.textContent).toContain("State: Run (Looping)");
  });

  it("selects a one-shot animation (Jump) and returns to Idle on completion", async () => {
    await act(async () => {
      root.render(<ByteWebsite />);
    });

    const jumpBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Jump")
    );
    expect(jumpBtn).toBeDefined();

    await act(async () => {
      jumpBtn?.click();
    });

    expect(container.textContent).toContain("State: Jump (One-Shot)");

    // Advance enough frames for Jump to finish (6 frames at 10fps = ~600ms)
    act(() => {
      advanceFrames(15, 100);
    });

    // Should return to Idle
    expect(container.textContent).toContain("State: Idle (Looping)");
  });

  it("displays animation metadata correctly for the active state", async () => {
    await act(async () => {
      root.render(<ByteWebsite />);
    });

    // Idle metadata
    expect(container.textContent).toContain("10 frames");
    expect(container.textContent).toContain("10 fps");
    expect(container.textContent).toContain("sheets/idle.png");

    // Click Walk
    const walkBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Walk")
    );
    await act(async () => {
      walkBtn?.click();
    });

    expect(container.textContent).toContain("8 fps");
    expect(container.textContent).toContain("sheets/walk.png");
  });

  it("simulates Anti-Gravity CLI activities correctly", async () => {
    await act(async () => {
      root.render(<ByteWebsite />);
    });

    // 1. Simulate Coding -> Run
    const codingBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.closest("div")?.textContent?.includes("Anti-Gravity Coding") && b.textContent === "Simulate"
    );
    expect(codingBtn).toBeDefined();

    await act(async () => {
      codingBtn?.click();
    });

    expect(container.textContent).toContain("State: Run (Looping)");
    expect(container.textContent).toContain("Activity Simulator: Anti-Gravity coding → Run.");

    // 2. Simulate Awaiting Approval -> FallLoop
    const approvalBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.closest("div")?.textContent?.includes("Awaiting Confirmed Approval") && b.textContent === "Simulate"
    );
    await act(async () => {
      approvalBtn?.click();
    });

    expect(container.textContent).toContain("State: FallLoop (Looping)");

    // 3. Simulate Task Completed sequence: Combo1 -> Combo1End -> Idle
    const completedBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.closest("div")?.textContent?.includes("Task Completed") && b.textContent === "Simulate"
    );
    await act(async () => {
      completedBtn?.click();
    });

    expect(container.textContent).toContain("State: Combo1 (One-Shot)");

    // Advance through Combo1 (3 frames at 12fps = 250ms; advance 3 ticks of 100ms)
    await act(async () => {
      advanceFrames(3, 100);
    });

    expect(container.textContent).toContain("State: Combo1End (One-Shot)");

    // Advance through Combo1End (4 frames at 10fps = 400ms; advance 5 ticks of 100ms)
    await act(async () => {
      advanceFrames(5, 100);
    });

    expect(container.textContent).toContain("State: Idle (Looping)");
  });

  it("handles prefers-reduced-motion appropriately", async () => {
    vi.stubGlobal("matchMedia", vi.fn().mockImplementation((query) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));

    await act(async () => {
      root.render(<ByteWebsite />);
    });

    expect(container.textContent).toContain("Reduced motion active");
  });
});
