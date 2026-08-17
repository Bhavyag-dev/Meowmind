import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { parseNaturalTime } from "../../src/components/ReminderList";

describe("parseNaturalTime", () => {
  const FIXED_DATE = new Date("2024-01-15T10:00:00.000Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_DATE);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("parses 'in 30 minutes'", () => {
    const result = parseNaturalTime("in 30 minutes");
    expect(result).not.toBeNull();
    const parsed = new Date(result!);
    expect(parsed.getTime()).toBe(FIXED_DATE.getTime() + 30 * 60_000);
  });

  it("parses 'in 2 hours'", () => {
    const result = parseNaturalTime("in 2 hours");
    expect(result).not.toBeNull();
    const parsed = new Date(result!);
    expect(parsed.getTime()).toBe(FIXED_DATE.getTime() + 2 * 3_600_000);
  });

  it("parses 'in 1 day'", () => {
    const result = parseNaturalTime("in 1 day");
    expect(result).not.toBeNull();
    const parsed = new Date(result!);
    expect(parsed.getTime()).toBe(FIXED_DATE.getTime() + 86_400_000);
  });

  it("parses 'tomorrow' (defaults to 9am)", () => {
    const result = parseNaturalTime("tomorrow");
    expect(result).not.toBeNull();
    const parsed = new Date(result!);
    expect(parsed.getHours()).toBe(9);
    expect(parsed.getMinutes()).toBe(0);
    const tomorrow = new Date(FIXED_DATE);
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(parsed.getDate()).toBe(tomorrow.getDate());
  });

  it("parses 'tomorrow at 3pm'", () => {
    const result = parseNaturalTime("tomorrow at 3pm");
    expect(result).not.toBeNull();
    const parsed = new Date(result!);
    expect(parsed.getHours()).toBe(15);
    expect(parsed.getMinutes()).toBe(0);
  });

  it("parses 'tomorrow at 9:30am'", () => {
    const result = parseNaturalTime("tomorrow at 9:30am");
    expect(result).not.toBeNull();
    const parsed = new Date(result!);
    expect(parsed.getHours()).toBe(9);
    expect(parsed.getMinutes()).toBe(30);
  });

  it("returns null for invalid input", () => {
    expect(parseNaturalTime("banana")).toBeNull();
    expect(parseNaturalTime("")).toBeNull();
    expect(parseNaturalTime("in abc hours")).toBeNull();
  });

  it("parses 'in 1 minute' (singular)", () => {
    const result = parseNaturalTime("in 1 minute");
    expect(result).not.toBeNull();
    const parsed = new Date(result!);
    expect(parsed.getTime()).toBe(FIXED_DATE.getTime() + 60_000);
  });
});
