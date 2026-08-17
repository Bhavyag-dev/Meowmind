# Animation Engine — Memory

**Last updated:** 2026-08-17

## Sprite Pack

- **Asset:** Fantasy Character Animation Action Platformer (Free Version)
- **Author:** Ozzbit Games (`ozzbit-games.itch.io`)
- **License:** Personal/non-commercial use. Credit required. No resale.
- **Frame size:** 128×128 px (uniform across all sheets)
- **Format:** Individual PNG strips, one per animation state (not a unified atlas)

## Animation States (from actual files)

| State key   | File                    | Frames | FPS | Loop   | One-shot |
|-------------|-------------------------|--------|-----|--------|----------|
| `Idle`      | sheets/idle.png         | 10     | 10  | ✅     | ❌       |
| `Run`       | sheets/run.png          | 10     | 12  | ✅     | ❌       |
| `Walk`      | sheets/walk.png         | 10     | 8   | ✅     | ❌       |
| `Jump`      | sheets/jump.png         | 6      | 10  | ❌     | ✅       |
| `Fall`      | sheets/fall.png         | 4      | 10  | ❌     | ✅       |
| `FallLoop`  | sheets/fall_loop.png    | 3      | 10  | ✅     | ❌       |
| `Combo1`    | sheets/combo_1.png      | 3      | 12  | ❌     | ✅       |
| `Combo1End` | sheets/combo_1_end.png  | 4      | 10  | ❌     | ✅       |

## Engine Architecture

- `CharacterStateMachine` (`src/animation/stateMachine.ts`): canvas-based, RAF loop
- `MovementController` (`src/animation/movement.ts`): screen-space position, walkTo/runTo/jump
- `AutonomousBehaviorScheduler` (`src/animation/autonomousBehavior.ts`): 30s–3min random events
- `loadFrameMap()` (`src/animation/frameMap.ts`): fetches + Zod-validates frame-map.json

## Key Design Choices

- **Individual sheets** over a unified atlas: the pack ships individual files; this also means
  each state's PNG is only loaded when first played (browser caches it after that).
- **Canvas rendering** over CSS background-position: cleaner to handle variable canvas sizes
  and `imageRendering: pixelated` without fighting CSS specificity.
- **One-shot states auto-return to Idle** if no `onComplete` callback is provided.

## Asset Path Convention

All sheets live at: `/assets/character/sheets/<stateName>.png`
Frame map at: `/assets/character/frame-map.json`
