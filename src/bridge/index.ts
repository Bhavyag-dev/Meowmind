/**
 * @fileoverview Bridge layer public re-export.
 *
 * The UI imports exclusively from this file — never from individual bridge
 * modules or from `@tauri-apps/api` directly.
 */

export * as ai from "./ai";
export * as reminders from "./reminders";
export * as settings from "./settings";
export * as notes from "./notes";
export * as cli from "./cli";
