// Meowmind — src-tauri/src/commands/mod.rs
//
// Re-exports all Tauri command modules so they can be registered
// in a single `tauri::generate_handler![]` call in lib.rs.

pub mod ai;
pub mod notes;
pub mod reminders;
pub mod settings;
pub mod windows;
