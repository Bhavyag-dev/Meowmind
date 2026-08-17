// Meowmind — src-tauri/src/commands/windows.rs
//
// Window management commands exposed to the renderer via the bridge layer.

use serde::Serialize;
use tauri::{AppHandle, Manager, PhysicalPosition, WebviewWindow};

/// The companion's current position and the usable virtual-desktop range.
/// Coordinates are physical pixels because Tauri window positioning uses
/// physical coordinates; this keeps movement correct on mixed-DPI monitors.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompanionMovementState {
    pub x: i32,
    pub y: i32,
    pub min_x: i32,
    pub max_x: i32,
    pub min_y: i32,
    pub max_y: i32,
}

/// Open (or focus) the Settings window.
///
/// The settings window is created hidden in tauri.conf.json and
/// made visible here on demand.
#[tauri::command]
pub fn open_settings_window(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("settings") {
        win.show().map_err(|e| e.to_string())?;
        win.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Start native OS window drag (macOS / Windows).
#[tauri::command]
pub fn start_window_drag(window: WebviewWindow) -> Result<(), String> {
    window.start_dragging().map_err(|e| e.to_string())
}

/// Toggle whether the companion window ignores cursor events (click-through).
///
/// Pass `ignore = true` when the chat panel is closed so clicks pass through
/// to the desktop. Pass `ignore = false` when the panel is open or the user
/// is hovering over the character.
#[tauri::command]
pub fn toggle_click_through(window: WebviewWindow, ignore: bool) -> Result<(), String> {
    window
        .set_ignore_cursor_events(ignore)
        .map_err(|e| e.to_string())
}

/// Read the virtual desktop bounds instead of only the current monitor.
/// This lets the companion deliberately travel across displays, including
/// displays placed to the left or above the primary display (negative coords).
#[tauri::command]
pub fn get_companion_movement_state(
    window: WebviewWindow,
) -> Result<CompanionMovementState, String> {
    let position = window.outer_position().map_err(|e| e.to_string())?;
    let window_size = window.outer_size().map_err(|e| e.to_string())?;
    let monitors = window.available_monitors().map_err(|e| e.to_string())?;

    if monitors.is_empty() {
        return Err("No displays are available".to_string());
    }

    let min_x = monitors.iter().map(|m| m.position().x).min().unwrap_or(0);
    let min_y = monitors.iter().map(|m| m.position().y).min().unwrap_or(0);
    let max_right = monitors
        .iter()
        .map(|m| m.position().x.saturating_add(m.size().width as i32))
        .max()
        .unwrap_or(position.x);
    let max_bottom = monitors
        .iter()
        .map(|m| m.position().y.saturating_add(m.size().height as i32))
        .max()
        .unwrap_or(position.y);

    Ok(CompanionMovementState {
        x: position.x,
        y: position.y,
        min_x,
        max_x: max_right.saturating_sub(window_size.width as i32),
        min_y,
        max_y: max_bottom.saturating_sub(window_size.height as i32),
    })
}

/// Move the native companion window. Keeping this native is essential: CSS
/// and Zustand coordinates cannot move a Tauri window between monitors.
#[tauri::command]
pub fn set_companion_position(window: WebviewWindow, x: i32, y: i32) -> Result<(), String> {
    window
        .set_position(PhysicalPosition::new(x, y))
        .map_err(|e| e.to_string())
}
