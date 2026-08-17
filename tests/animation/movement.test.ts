import { describe, it, expect } from "vitest";
import { clamp, stepToward } from "../../src/animation/movement";

describe("clamp", () => {
  it("returns value when within bounds", () => {
    expect(clamp(50, 0, 100)).toBe(50);
  });
  it("clamps to min", () => {
    expect(clamp(-10, 0, 100)).toBe(0);
  });
  it("clamps to max", () => {
    expect(clamp(200, 0, 100)).toBe(100);
  });
  it("handles equal min and max", () => {
    expect(clamp(50, 42, 42)).toBe(42);
  });
});

describe("stepToward", () => {
  it("moves toward target at given speed", () => {
    // Speed 100 px/s, dt 0.1s → step 10px; current 0, target 100
    const result = stepToward(0, 100, 100, 0.1);
    expect(result).toBeCloseTo(10);
  });

  it("does not overshoot the target", () => {
    // Current 95, target 100, speed 100, dt 1s → would overshoot by 95px
    const result = stepToward(95, 100, 100, 1);
    expect(result).toBe(100);
  });

  it("moves correctly in the negative direction", () => {
    const result = stepToward(100, 0, 100, 0.5);
    expect(result).toBeCloseTo(50);
  });

  it("returns current when already at target", () => {
    const result = stepToward(50, 50, 100, 1);
    expect(result).toBe(50);
  });

  it("handles zero dt", () => {
    expect(stepToward(10, 100, 100, 0)).toBe(10);
  });
});
