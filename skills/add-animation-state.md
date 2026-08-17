# Skill: Add a New Animation State

> Use this when the full (paid) Ozzbit Games pack is purchased and new states
> become available, or when a custom state is added.

## Steps

### 1. Inspect the new PNG

Measure pixel dimensions:
```bash
sips -g pixelWidth -g pixelHeight path/to/new-state.png
```
Frame count = `pixelWidth / 128`. Height should be 128.

### 2. Copy the PNG to assets

```bash
cp path/to/new-state.png assets/character/sheets/<StateName>.png
```

Use PascalCase matching the `CharacterState` type, lowercased with underscores for the filename.

### 3. Add the state to `frame-map.json`

```json
"NewState": {
  "sheet": "sheets/new_state.png",
  "frameCount": 6,
  "fps": 10,
  "loop": true,
  "oneShot": false
}
```

Set `oneShot: true` and `loop: false` for attack/reaction states.

### 4. Add to the TypeScript enum

In `src/shared/types.ts`:
```typescript
export type CharacterState =
  | ...existing...
  | "NewState";
```

If it's one-shot, add to `ONE_SHOT_STATES`:
```typescript
export const ONE_SHOT_STATES: CharacterState[] = [..., "NewState"];
```

### 5. Update memory/animation-engine.md

Add a row to the state table with the new state's details.

### 6. Run tests

```bash
npm run test
npm run type-check
```

No code changes to the state machine are needed — it reads the frame map dynamically.
