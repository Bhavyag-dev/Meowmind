# Architecture

## Overview

Meowmind is a native desktop application built with **Tauri v2** (Rust backend) and a
**React + TypeScript** frontend. It runs as two Tauri windows:

1. **Companion window** (`label: "companion"`)  
   Frameless, transparent, always-on-top, 320×520px. Contains the animated character and
   the slide-up chat panel. Click-through is enabled when the panel is closed.

2. **Settings window** (`label: "settings"`)  
   Normal decorated window, hidden at startup, opened from the system tray or chat panel header.

## Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│  macOS / Windows OS                                      │
│  ┌──────────────────┐   ┌────────────────────────────┐  │
│  │  System Tray     │   │  Companion Window          │  │
│  │  (tray.rs)       │   │  (transparent, AOT)        │  │
│  └────────┬─────────┘   │  ┌──────────────────────┐  │  │
│           │ show/hide   │  │  CharacterSprite      │  │  │
│           │             │  │  (canvas + SM + MC)   │  │  │
│           ▼             │  └──────────────────────┘  │  │
│  ┌──────────────────┐   │  ┌──────────────────────┐  │  │
│  │  Settings Window │   │  │  ChatPanel (tabbed)   │  │  │
│  │  (SettingsWindow)│   │  │  · Chat · Timer       │  │  │
│  └──────────────────┘   │  │  · Reminders          │  │  │
│                          │  └──────────────────────┘  │  │
│                          └────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘

Rust (src-tauri/src/)                 TypeScript (src/)
┌──────────────────────┐              ┌──────────────────────────┐
│  commands/ai.rs      │◄────invoke───│  bridge/ai.ts            │
│  commands/reminders  │              │  bridge/reminders.ts     │
│  commands/settings   │              │  bridge/settings.ts      │
│  commands/notes      │              │  bridge/notes.ts         │
│  commands/windows    │              └──────────────────────────┘
│                      │                           │
│  secure_store.rs     │───OS Keychain             │
│  (keyring crate)     │                   shared/types.ts
│                      │                   shared/schemas.ts (Zod)
│  tauri-plugin-sql    │────SQLite                 │
│  tauri-plugin-store  │────settings.json      store/*.ts (Zustand)
└──────────────────────┘
```

## Data Flow: AI Message

1. User types and presses Enter → `ChatPanel.tsx`
2. `streamMessage()` in `bridge/ai.ts` is called (Zod validates params)
3. `listen()` subscriptions created for `ai://chunk/{id}`, `ai://done/{id}`, `ai://error/{id}`
4. `invoke("stream_chat_message")` fires — Rust receives params
5. Rust fetches API key from keyring, calls provider via HTTP SSE
6. Each token emits `ai://chunk/{id}` → `appendStreamChunk()` in chat store
7. `ai://done/{id}` → `finalizeStream()` saves assistant message, triggers character reaction
8. Character plays Combo1 animation (one-shot) → returns to Idle

## Security Model

- API keys **never** touch the renderer. Rust fetches them from the OS keychain.
- The renderer receives only a masked preview string (first 4 + last 4 chars).
- No telemetry. No analytics. No external calls except to the chosen AI provider.
- CSP: `null` in dev (permissive); tighten before production release.
