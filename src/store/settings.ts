/**
 * @fileoverview Zustand store for application settings.
 *
 * Persisted via tauri-plugin-store. Hydrated from the store on first mount.
 */

import { create } from "zustand";
import { type AppSettings, DEFAULT_SETTINGS } from "../shared/types";

interface SettingsState {
  settings: AppSettings;
  hydrated: boolean;

  // Actions
  updateSettings: (partial: Partial<AppSettings>) => void;
  hydrate: (stored: Partial<AppSettings>) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: { ...DEFAULT_SETTINGS },
  hydrated: false,

  updateSettings: (partial) =>
    set((s) => ({ settings: { ...s.settings, ...partial } })),

  hydrate: (stored) =>
    set((s) => ({
      settings: { ...s.settings, ...stored },
      hydrated: true,
    })),
}));
