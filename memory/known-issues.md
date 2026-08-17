# Known Issues — Memory

**Last updated:** 2026-08-17

## Active Issues

### 1. tauri-plugin-store hydration race
**Symptom:** Settings loaded from the store appear as defaults on very fast machines.
**Cause:** `App.tsx` hydrates asynchronously; components may render before hydration completes.
**Mitigation:** Guard all settings-dependent renders on `settings.hydrated` from the Zustand store.
**Status:** By design for now; proper fix is to await store load before mounting App.

### 2. click-through state on window focus
**Symptom:** On macOS, `set_ignore_cursor_events(true)` persists if the companion window
  is focused and then loses focus without the panel being opened.
**Mitigation:** `toggle_click_through(false)` is called on any click that opens the panel.
**Status:** Acceptable for v0.1; proper fix requires a window focus/blur event listener.

### 3. Model list is static
**Symptom:** New models from providers don't appear without an app update.
**Fix plan:** Add live fetching with 5-min TTL in `commands/ai.rs` + cache in plugin-store.
**Status:** Backlog.

### 4. Anthropic streaming rate-limit headers
**Symptom:** Anthropic returns `retry-after` on 429 — currently not handled.
**Fix plan:** Add exponential backoff in `do_stream()` for 429 responses.
**Status:** Backlog.

## Non-Issues (Appeared as Issues)

- **"create-tauri-app --force wiped the repo"** — this happened during setup because the
  `--force` flag removes all files. The sprites were recovered from git. Never run
  `create-tauri-app` again in this repo.

- **macOS Keychain dialog on first key save** — expected OS behaviour, not a bug.
