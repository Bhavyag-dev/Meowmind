/**
 * @fileoverview Frame map loader and validator.
 *
 * Loads assets/character/frame-map.json (via Vite's asset import),
 * validates it with Zod, and exposes the typed result.
 *
 * Import this once at app startup and pass the result into
 * CharacterStateMachine.
 */

import { FrameMapSchema, type FrameMap } from "../shared/schemas";

let _cached: FrameMap | null = null;

/**
 * Load and validate the frame map for the character sprite.
 *
 * Caches the result after first load.
 */
export async function loadFrameMap(basePath = "/assets/character/"): Promise<FrameMap> {
  if (_cached) return _cached;

  const resp = await fetch(`${basePath}frame-map.json`);
  if (!resp.ok) {
    throw new Error(`Failed to load frame-map.json: ${resp.status} ${resp.statusText}`);
  }

  const raw = await resp.json();

  // Zod parse — throws ZodError with helpful messages on mismatch
  const parsed = FrameMapSchema.parse(raw);
  _cached = parsed;
  return parsed;
}

/** Clear the cached frame map (useful in tests). */
export function clearFrameMapCache(): void {
  _cached = null;
}
