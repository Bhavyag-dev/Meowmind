/**
 * @fileoverview Animation state machine for the Meowmind character sprite.
 *
 * Loads the frame-map.json, validates it with Zod, and provides a
 * `play(state, onComplete?)` API used by CharacterSprite.tsx.
 *
 * Each animation state references a separate PNG strip (one row of 128×128
 * frames). The machine advances frames using requestAnimationFrame, loops
 * looping states, and calls `onComplete` for one-shot states before
 * returning to Idle.
 *
 * @example
 * ```ts
 * const sm = new CharacterStateMachine(canvas, frameMap, "/assets/character/");
 * sm.play("Jump", () => sm.play("Idle"));
 * ```
 */

import { FrameMap, FrameState } from "../shared/schemas";
import { CharacterState, ONE_SHOT_STATES } from "../shared/types";

export interface StateMachineCallbacks {
  /** Called every frame with the current state and frame index (0-based). */
  onFrame?: (state: CharacterState, frameIndex: number) => void;
  /** Called when a one-shot animation completes before auto-returning to Idle. */
  onComplete?: (state: CharacterState) => void;
}

/**
 * Sprite animation state machine.
 *
 * Renders frames onto a provided HTMLCanvasElement by drawing
 * the correct horizontal slice of the per-state PNG strip.
 */
export class CharacterStateMachine {
  private currentState: CharacterState = "Idle";
  private frameIndex: number = 0;
  private lastFrameTime: number = 0;
  private rafId: number | null = null;
  private images: Partial<Record<CharacterState, HTMLImageElement>> = {};
  private onCompleteCb: (() => void) | null = null;
  private callbacks: StateMachineCallbacks;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly frameMap: FrameMap,
    private readonly assetBase: string,
    callbacks: StateMachineCallbacks = {}
  ) {
    this.callbacks = callbacks;
    this.preloadImages();
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /** Start playing an animation state.
   *
   * @param state - The target animation state.
   * @param onComplete - Optional callback fired when a one-shot state ends.
   *   For looping states this is never called.
   */
  play(state: CharacterState, onComplete?: () => void): void {
    if (this.currentState === state && this.rafId !== null) return;
    this.currentState = state;
    this.frameIndex = 0;
    this.lastFrameTime = 0;
    this.onCompleteCb = onComplete ?? null;
    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(this.tick);
    }
  }

  /** Pause animation (frame is held). */
  pause(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /** Resume from where it was paused. */
  resume(): void {
    if (this.rafId === null) {
      this.lastFrameTime = 0;
      this.rafId = requestAnimationFrame(this.tick);
    }
  }

  /** Destroy the state machine and release all resources. */
  destroy(): void {
    this.pause();
    this.images = {};
  }

  get state(): CharacterState {
    return this.currentState;
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private getStateMeta(state: CharacterState): FrameState | null {
    const s = this.frameMap.states[state as string];
    if (!s) return null;
    return s as FrameState;
  }

  private preloadImages(): void {
    for (const [stateName, meta] of Object.entries(this.frameMap.states)) {
      const img = new Image();
      img.src = `${this.assetBase}${meta.sheet}`;
      this.images[stateName as CharacterState] = img;
    }
  }

  private tick = (timestamp: number): void => {
    const meta = this.getStateMeta(this.currentState);
    if (!meta) {
      this.rafId = requestAnimationFrame(this.tick);
      return;
    }

    const frameDuration = 1000 / meta.fps;

    if (timestamp - this.lastFrameTime >= frameDuration) {
      this.lastFrameTime = timestamp;
      this.drawFrame(meta);

      this.callbacks.onFrame?.(this.currentState, this.frameIndex);

      this.frameIndex++;

      if (this.frameIndex >= meta.frameCount) {
        if (ONE_SHOT_STATES.includes(this.currentState)) {
          // One-shot animation complete
          const completedState = this.currentState;
          this.callbacks.onComplete?.(completedState);
          const cb = this.onCompleteCb;
          this.onCompleteCb = null;

          // Return to Idle if no explicit callback was given
          this.currentState = "Idle";
          this.frameIndex = 0;

          if (cb) {
            // Let caller decide what to do next
            this.rafId = requestAnimationFrame(this.tick);
            cb();
            return;
          }
        } else {
          // Loop
          this.frameIndex = 0;
        }
      }
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  private drawFrame(_meta: FrameState): void {
    const img = this.images[this.currentState];
    if (!img || !img.complete) return;

    const { frameWidth, frameHeight } = this.frameMap;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.drawImage(
      img,
      this.frameIndex * frameWidth,
      0,
      frameWidth,
      frameHeight,
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );
  }
}
