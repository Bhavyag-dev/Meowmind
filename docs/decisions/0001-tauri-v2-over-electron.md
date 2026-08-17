# ADR 0001 — Tauri v2 over Electron

**Date:** 2026-08-17  
**Status:** Accepted

## Context

We needed a desktop application framework that supports macOS and Windows, allows
transparent/frameless windows, provides access to OS-native APIs (keychain, notifications),
and produces small installers.

## Decision

Use **Tauri v2** with a Rust backend.

## Rationale

| Factor | Tauri v2 | Electron |
|---|---|---|
| Binary size | ~5–15 MB | ~80–150 MB |
| Memory usage | Lower (uses OS WebView) | Higher (Chromium bundled) |
| OS keychain access | `keyring` crate — native | Requires native addon |
| Transparent windows | First-class support | Supported but more complex |
| Rust type safety | End-to-end with TS bridge | Node.js only |
| Cold-start time | Faster | Slower |

## Consequences

- Rust knowledge required for native layer changes
- The renderer uses the OS WebView (WebKit on macOS, WebView2 on Windows) —
  CSS rendering may differ slightly between platforms
- Cannot use Node.js APIs in the main process (Rust only)
