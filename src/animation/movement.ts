/**
 * @fileoverview Movement controller for the character sprite.
 *
 * Manages screen-space position and velocity for Run/Walk/Jump states.
 * All movement is bounded to the current monitor's usable area
 * (reported by Tauri's `window.screen`).
 *
 * Movement happens in "moves": the controller picks a target x-position,
 * transitions the animation to Run/Walk, and when the character arrives
 * it settles into Idle or a random idle variant.
 */

import { CharacterStateMachine } from "./stateMachine";


export interface Position {
  x: number;
  y: number;
}

/** Bounds of the virtual desktop in native window coordinates. */
export interface MovementBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface MovementOptions {
  /** Width of the character sprite on screen (px). */
  spriteWidth?: number;
  /** Height of the character sprite on screen (px). */
  spriteHeight?: number;
  /** Pixels per second during Run. */
  runSpeed?: number;
  /** Pixels per second during Walk. */
  walkSpeed?: number;
  /** Called when the movement direction changes. */
  onFacingChange?: (right: boolean) => void;
}

/**
 * Screen-space movement controller.
 *
 * Owned by the CompanionWindow component; tied to a CharacterStateMachine.
 */
export class MovementController {
  private pos: Position;
  private target: Position | null = null;
  private speed = 0;
  private rafId: number | null = null;
  private lastTime = 0;
  private bounds: MovementBounds;
  private readonly onFacingChange: (right: boolean) => void;
  readonly spriteWidth: number;
  readonly spriteHeight: number;

  constructor(
    private readonly sm: CharacterStateMachine,
    private onPositionChange: (pos: Position) => void,
    initialPos: Position = { x: 100, y: 100 },
    opts: MovementOptions = {}
  ) {
    this.pos = { ...initialPos };
    this.spriteWidth = opts.spriteWidth ?? 128;
    this.spriteHeight = opts.spriteHeight ?? 128;
    this.speed = opts.runSpeed ?? 120; // px/s
    this.onFacingChange = opts.onFacingChange ?? (() => undefined);
    this.bounds = {
      minX: 0,
      maxX: Math.max(0, window.screen.width - this.spriteWidth),
      minY: 0,
      maxY: Math.max(0, window.screen.height - this.spriteHeight),
    };
  }

  /** Current position. */
  get position(): Position {
    return { ...this.pos };
  }

  /** Replace fallback browser bounds with native virtual-desktop bounds. */
  setBounds(bounds: MovementBounds): void {
    this.bounds = bounds;
    this.pos.x = clamp(this.pos.x, bounds.minX, bounds.maxX);
    this.pos.y = clamp(this.pos.y, bounds.minY, bounds.maxY);
  }

  /** Pick an X coordinate anywhere on the virtual desktop. */
  randomX(): number {
    return this.bounds.minX + Math.random() * (this.bounds.maxX - this.bounds.minX);
  }

  /**
   * Walk the character to a target X position using the Walk state.
   *
   * @param targetX - Target x-coordinate in screen space.
   * @param onArrival - Called when the character reaches the target.
   */
  walkTo(targetX: number, onArrival?: () => void): void {
    const clampedX = clamp(targetX, this.bounds.minX, this.bounds.maxX);
    this.target = { x: clampedX, y: this.pos.y };
    this.speed = 80; // walk speed
    this.sm.play("Walk");
    this.startMovement(onArrival);
  }

  /**
   * Run the character to a target X position using the Run state.
   *
   * @param targetX - Target x-coordinate in screen space.
   * @param onArrival - Called when the character reaches the target.
   */
  runTo(targetX: number, onArrival?: () => void): void {
    const clampedX = clamp(targetX, this.bounds.minX, this.bounds.maxX);
    this.target = { x: clampedX, y: this.pos.y };
    this.speed = 160; // run speed
    this.sm.play("Run");
    this.startMovement(onArrival);
  }

  /**
   * Trigger a jump animation at the current position.
   *
   * Plays Jump (one-shot) then returns to Idle.
   */
  jump(): void {
    this.stop();
    this.sm.play("Jump", () => this.sm.play("Idle"));
  }

  /** Stop all movement immediately and return to Idle. */
  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.target = null;
    this.sm.play("Idle");
  }

  /** Destroy and clean up. */
  destroy(): void {
    this.stop();
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private startMovement(onArrival?: () => void): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
    this.lastTime = performance.now();

    const tick = (timestamp: number) => {
      if (!this.target) return;

      const dt = (timestamp - this.lastTime) / 1000; // seconds
      this.lastTime = timestamp;

      const dx = this.target.x - this.pos.x;
      const dist = Math.abs(dx);

      if (dist < 2) {
        // Arrived
        this.pos.x = this.target.x;
        this.target = null;
        this.onPositionChange({ ...this.pos });
        this.sm.play("Idle");
        onArrival?.();
        this.rafId = null;
        return;
      }

      const step = Math.min(this.speed * dt, dist);
      this.onFacingChange(dx > 0);
      this.pos.x += dx > 0 ? step : -step;
      this.onPositionChange({ ...this.pos });
      this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }
}

// ---------------------------------------------------------------------------
// Unit-test helpers (exported for tests/animation/movement.test.ts)
// ---------------------------------------------------------------------------

/** Clamp a value within [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Compute the next X position one tick from `current` toward `target`
 * at `speed` px/s over `dt` seconds. Useful for movement unit tests.
 */
export function stepToward(
  current: number,
  target: number,
  speed: number,
  dt: number
): number {
  const dx = target - current;
  const dist = Math.abs(dx);
  const step = Math.min(speed * dt, dist);
  return current + (dx > 0 ? step : -step);
}
