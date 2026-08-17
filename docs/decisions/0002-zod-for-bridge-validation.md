# ADR 0002 — Zod for Bridge Validation

**Date:** 2026-08-17  
**Status:** Accepted

## Context

The Tauri bridge layer passes data between the Rust process and the React renderer.
TypeScript's static types are erased at runtime, so a bug or untrusted input could
cause unexpected behaviour in either direction.

## Decision

Use **Zod** to validate all inputs at bridge entry points (`src/bridge/*.ts`).

## Rationale

- Runtime safety: catches shape mismatches that TypeScript can't
- Single schema definition used for both TS type inference and runtime validation
- Ergonomic: `FrameMapSchema.parse(raw)` throws a readable `ZodError`
- Small bundle impact vs. the alternative (manual validation)

## Consequences

- Every bridge function adds one `Schema.parse()` call — negligible runtime cost
- Schemas in `src/shared/schemas.ts` must be kept in sync with Rust structs
- `ZodError` messages surface in the UI as error states (already handled in bridge)
