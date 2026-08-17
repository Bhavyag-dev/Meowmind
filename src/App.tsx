/**
 * @fileoverview App root — handles routing between the companion window
 * and the settings window based on URL path.
 *
 * Tauri opens:
 *   - devUrl "/"          → CompanionWindow
 *   - devUrl "/settings"  → SettingsWindow
 */

import React, { useEffect } from "react";
import CompanionWindow from "./windows/companion/CompanionWindow";
import SettingsWindow from "./windows/settings/SettingsWindow";
import { useSettingsStore } from "./store/settings";

const App: React.FC = () => {
  const { hydrate } = useSettingsStore();
  const path = window.location.pathname;

  // Hydrate settings from tauri-plugin-store on mount
  useEffect(() => {
    // Try loading persisted settings from the store plugin
    // On first launch this returns the defaults written in Rust
    import("@tauri-apps/plugin-store").then(({ load }) => {
      load("settings.json").then((store) => {
        store.entries().then((entries) => {
          const stored = Object.fromEntries(entries);
          if (Object.keys(stored).length > 0) {
            hydrate(stored as Parameters<typeof hydrate>[0]);
          } else {
            // Mark as hydrated with defaults
            hydrate({});
          }
        }).catch(() => hydrate({}));
      }).catch(() => hydrate({}));
    }).catch(() => hydrate({}));
  }, [hydrate]);

  if (path === "/settings") {
    return <SettingsWindow />;
  }

  return <CompanionWindow />;
};

export default App;
