# ADR 0003 — Zustand for State Management

**Date:** 2026-08-17  
**Status:** Accepted

## Context

The app has several isolated state domains (chat, character animation, settings) that
need to share state across components without prop drilling.

## Decision

Use **Zustand** for global state management.

## Rationale

- Minimal boilerplate vs. Redux Toolkit
- Works seamlessly with Tauri's renderer environment (no special setup)
- Selective re-renders via selector pattern
- Easy to hydrate from tauri-plugin-store
- TypeScript support is first-class

## Consequences

- Three stores: `chat.ts`, `character.ts`, `settings.ts`
- Settings store has a `hydrated` flag — guard renders on this to avoid flickering defaults
- Chat history in Zustand is in-memory only; persistence is SQLite via tauri-plugin-sql
