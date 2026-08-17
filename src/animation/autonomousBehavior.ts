/**
 * @fileoverview Autonomous idle behavior scheduler.
 *
 * When the user isn't interacting, this scheduler fires random events at
 * randomised intervals so the character feels alive. Each event maps to
 * a movement or animation state change.
 *
 * Respects the `autonomousMovement` and `reactionsEnabled` settings.
 */

import { MovementController } from "./movement";
import { CharacterStateMachine } from "./stateMachine";


/** A single autonomous event definition. */
interface AutonomousEvent {
  /** Human-readable label for debugging. */
  name: string;
  /** Relative weight — higher = more frequent. */
  weight: number;
  /** Whether this event requires autonomousMovement to be enabled. */
  requiresMovement: boolean;
  /** Execute the event. Returns a Promise that resolves when done. */
  execute: (
    sm: CharacterStateMachine,
    mc: MovementController
  ) => Promise<void>;
}

const EVENTS: AutonomousEvent[] = [
  {
    name: "short_walk",
    weight: 4,
    requiresMovement: true,
    execute: async (_, mc) => {
      const currentX = mc.position.x;
      const offset = (Math.random() * 200 + 50) * (Math.random() > 0.5 ? 1 : -1);
      return new Promise((resolve) => mc.walkTo(currentX + offset, resolve));
    },
  },
  {
    name: "short_run",
    weight: 2,
    requiresMovement: true,
    execute: async (_, mc) => {
      const currentX = mc.position.x;
      const offset = (Math.random() * 400 + 100) * (Math.random() > 0.5 ? 1 : -1);
      return new Promise((resolve) => mc.runTo(currentX + offset, resolve));
    },
  },
  {
    name: "cross_desktop_run",
    weight: 1,
    requiresMovement: true,
    execute: async (_, mc) => {
      // A destination across the virtual desktop gives multi-monitor users a
      // deliberate, visible monitor-crossing behavior.
      return new Promise((resolve) => mc.runTo(mc.randomX(), resolve));
    },
  },
  {
    name: "jump",
    weight: 2,
    requiresMovement: true,
    execute: async (_, mc) => {
      mc.jump();
      return new Promise((resolve) => setTimeout(resolve, 1000));
    },
  },
  {
    name: "idle_long",
    weight: 6,
    requiresMovement: false,
    execute: async (sm) => {
      sm.play("Idle");
      return new Promise((resolve) =>
        setTimeout(resolve, 3000 + Math.random() * 5000)
      );
    },
  },
  {
    name: "combo_attack",
    weight: 1,
    requiresMovement: false,
    execute: async (sm) => {
      return new Promise((resolve) => {
        sm.play("Combo1", () => {
          sm.play("Combo1End", () => {
            sm.play("Idle");
            resolve();
          });
        });
      });
    },
  },
];

/**
 * Schedules and runs autonomous idle events.
 *
 * @example
 * ```ts
 * const sched = new AutonomousBehaviorScheduler(sm, mc, { movementEnabled: true });
 * sched.start();
 * // later:
 * sched.stop();
 * ```
 */
export class AutonomousBehaviorScheduler {
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private running = false;

  constructor(
    private readonly sm: CharacterStateMachine,
    private readonly mc: MovementController,
    private options: { movementEnabled: boolean; reactionsEnabled: boolean }
  ) {}

  /** Start the autonomous behavior loop. */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.scheduleNext();
  }

  /** Stop the autonomous behavior loop. */
  stop(): void {
    this.running = false;
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /** Update options at runtime (e.g. when settings change). */
  updateOptions(opts: Partial<{ movementEnabled: boolean; reactionsEnabled: boolean }>): void {
    this.options = { ...this.options, ...opts };
  }



  private scheduleNext(): void {
    if (!this.running) return;
    // Lively interval: 3.5s - 7.5s between autonomous animations
    const delay = 3500 + Math.random() * 4000;
    this.timeoutId = setTimeout(async () => {
      await this.runEvent();
      this.scheduleNext();
    }, delay);
  }

  private async runEvent(): Promise<void> {
    const available = EVENTS.filter(
      (e) =>
        !e.requiresMovement ||
        this.options.movementEnabled
    );
    if (available.length === 0) return;

    const event = weightedRandom(available);
    try {
      await event.execute(this.sm, this.mc);
    } catch (err) {
      console.warn("[AutonomousBehavior] Event error:", err);
    }
  }
}

/** Pick a random item from a weighted array. */
function weightedRandom<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((sum, i) => sum + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}
