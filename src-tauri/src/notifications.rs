// Meowmind — src-tauri/src/notifications.rs
//
// Native OS notification helpers.
// Wraps tauri-plugin-notification so Rust command handlers can
// fire notifications without touching the renderer.

use anyhow::Result;
use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;

/// Send a native OS notification with a title and optional body.
///
/// Used by the reminder scheduler and pomodoro timer.
#[allow(dead_code)]
pub fn send(app: &AppHandle, title: &str, body: Option<&str>) -> Result<()> {
    let mut builder = app.notification().builder().title(title);
    if let Some(b) = body {
        builder = builder.body(b);
    }
    builder
        .show()
        .map_err(|e| anyhow::anyhow!("Notification error: {e}"))?;
    Ok(())
}
