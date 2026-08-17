/**
 * @fileoverview Typed bridge wrappers for settings and window commands.
 */

import { invoke } from "@tauri-apps/api/core";
import { type AppSettings, type CompanionMovementState } from "../shared/types";
import { AppSettingsSchema, CompanionMovementStateSchema } from "../shared/schemas";

import { getCurrentWindow } from "@tauri-apps/api/window";

/** Fetch default settings from Rust (merged with stored values by the caller). */
export async function getSettings(): Promise<AppSettings> {
  return invoke<AppSettings>("get_settings");
}

/** Persist settings changes (Rust-side side effects, actual storage via plugin-store). */
export async function saveSettings(settings: AppSettings): Promise<void> {
  AppSettingsSchema.parse(settings);
  return invoke<void>("save_settings", { settings });
}

/** Open the Settings window. */
export async function openSettingsWindow(): Promise<void> {
  return invoke<void>("open_settings_window");
}

/** Toggle click-through on the companion window. */
export async function toggleClickThrough(ignore: boolean): Promise<void> {
  return invoke<void>("toggle_click_through", { ignore });
}

/** Initiate native OS window drag (macOS & Windows). */
export async function startWindowDrag(): Promise<void> {
  try {
    await invoke<void>("start_window_drag");
  } catch (err) {
    console.warn("start_window_drag invoke failed, falling back to window API", err);
    try {
      const win = getCurrentWindow();
      await win.startDragging();
    } catch (e) {
      console.warn("startDragging fallback failed", e);
    }
  }
}

/** Get native coordinates and the complete virtual desktop movement range. */
export async function getCompanionMovementState(): Promise<CompanionMovementState> {
  const state = await invoke<CompanionMovementState>("get_companion_movement_state");
  return CompanionMovementStateSchema.parse(state);
}

/** Move the companion's native window to physical desktop coordinates. */
export async function setCompanionPosition(x: number, y: number): Promise<void> {
  if (!Number.isInteger(x) || !Number.isInteger(y)) {
    throw new Error("Companion coordinates must be integers");
  }
  return invoke<void>("set_companion_position", { x, y });
}

/** List available models for a provider (thin wrapper duplicated here for settings UI). */
export async function listModels(provider: string): Promise<string[]> {
  return invoke<string[]>("list_models", { provider });
}
