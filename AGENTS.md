# Meowmind — AGENTS.md

> **For any AI agent starting a new session:** Read this file first, then
> check [`/memory`](./memory/) for durable facts and [`/skills`](./skills/)
> for repeatable procedures before making any changes.

---

## What This Project Is

**Meowmind** is a native desktop AI companion app (Tauri v2 + React + TypeScript + Rust).
A floating always-on-top window shows an animated hero character alongside a chat panel,
pomodoro timer, and reminder system. All AI calls are proxied through Rust (keys in OS
keychain, never in renderer memory).

**Stack:** Tauri v2 · Rust 1.97+ · React 18 · TypeScript (strict) · Vite · Zustand · Zod

---

## Architecture at a Glance

```
src-tauri/src/
  main.rs            — binary entry point (1 line)
  lib.rs             — Tauri setup, plugin registration, invoke_handler
  tray.rs            — system tray icon + menu
  notifications.rs   — native OS notification helper
  secure_store.rs    — keyring crate wrapper (Keychain / Credential Manager)
  db.rs              — SQLite schema + migration definitions
  commands/
    ai.rs            — streaming AI proxy (all providers), key management
    reminders.rs     — reminder CRUD + event emission
    settings.rs      — settings struct + Rust-side save hook
    notes.rs         — sticky note CRUD + sync events
    windows.rs       — open settings window, toggle click-through

src/
  animation/         — sprite state machine, movement, autonomous behavior
  bridge/            — typed Tauri invoke() wrappers (UI imports ONLY from here)
  shared/            — types.ts + schemas.ts (Zod) — source of truth
  store/             — Zustand: chat.ts, character.ts, settings.ts
  components/        — CharacterSprite, ChatMessage, PomodoroTimer, ReminderList
  windows/
    companion/       — CompanionWindow + ChatPanel (the floating window)
    settings/        — SettingsWindow (separate Tauri window)
  App.tsx            — path-based routing: "/" → Companion, "/settings" → Settings
  main.tsx           — React 18 root

assets/character/    — sprite sheets + frame-map.json
tests/               — Vitest unit tests (animation, movement, time parser)
.github/workflows/   — CI: Ubuntu tests, macOS universal, Windows x64
```

---

## Key Conventions

### Naming
- React components: PascalCase files (`CharacterSprite.tsx`)
- Stores: `use*Store` (Zustand)
- Bridge functions: camelCase, grouped by domain
- Rust commands: snake_case, registered in `lib.rs`

### State Management
- **Zustand** for all shared UI state (never useState for cross-component data)
- Settings persisted via `tauri-plugin-store` (hydrated in `App.tsx`)
- Chat messages persisted via `tauri-plugin-sql` (SQLite)
- **API keys** ONLY in `secure_store.rs` — never in Zustand, never in files

### Bridge Layer Rule
- UI code imports from `src/bridge/` only — never directly from `@tauri-apps/api`
- Every bridge function validates inputs with Zod before calling `invoke()`
- All types shared between Rust and TS are defined in `src/shared/types.ts`
  and must match the Rust struct field names exactly (camelCase in TS, snake_case in Rust)

### Animation Engine
- One PNG strip per animation state in `assets/character/sheets/`
- `frame-map.json` is the single source of truth for frame counts/fps
- `CharacterStateMachine` is owned by `CharacterSprite` component
- One-shot states (Jump, Fall, Combo*) call `onComplete` then auto-return to Idle

---

## Decisions Made

| Decision | Why | ADR |
|---|---|---|
| Tauri v2 over Electron | Native performance, smaller binary, OS keychain | `docs/decisions/0001-*` |
| Zod for bridge validation | Runtime safety at the JS/Rust boundary | `docs/decisions/0002-*` |
| Zustand over Redux | Minimal boilerplate, works well with Tauri | `docs/decisions/0003-*` |
| Separate PNGs per animation state | Ozzbit Games pack ships individual files; simpler to load | in `memory/animation-engine.md` |
| Path-based window routing | Tauri opens two windows at different URLs; simplest routing | in `memory/animation-engine.md` |

---

## Known Gotchas

See `memory/known-issues.md` for current list. Short version:

1. `tauri-plugin-store` hydration is async — always guard on `settings.hydrated`
2. `set_ignore_cursor_events` must be called from the Rust `toggle_click_through` command,
   not from JS directly (requires the `WebviewWindow` handle on the Rust side)
3. The `--force` flag on `create-tauri-app` will wipe the project directory —
   never run it again in this repo
4. macOS Keychain prompts on first `save_key` call — expected behaviour

---

## How to Run Locally

```bash
npm install
npm run tauri:dev
```

## How to Run Tests

```bash
npm run test          # Vitest unit tests
npm run type-check    # tsc --noEmit
cd src-tauri && cargo test
```
