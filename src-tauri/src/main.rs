// Meowmind — src-tauri/src/main.rs
// Entry point for the desktop app binary.
// All substantive logic lives in lib.rs to keep this file minimal
// (required for mobile targets and testing).

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    meowmind_lib::run();
}
