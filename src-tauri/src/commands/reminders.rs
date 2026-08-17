// Meowmind — src-tauri/src/commands/reminders.rs
//
// CRUD commands for one-time and recurring reminders stored in SQLite.
// The reminder scheduler runs as a background Tokio task, polling the DB
// and firing native notifications when a reminder's `fire_at` time passes.

use chrono::Utc;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

/// A reminder record matching the SQLite schema.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Reminder {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    /// ISO 8601 UTC timestamp string.
    pub fire_at: String,
    /// Cron-like recurrence string, e.g. "every day at 09:00".
    pub recurrence: Option<String>,
    pub fired: bool,
    pub created_at: String,
}

/// Input for creating or updating a reminder.
#[derive(Debug, Deserialize)]
pub struct ReminderInput {
    pub title: String,
    pub description: Option<String>,
    pub fire_at: String,
    pub recurrence: Option<String>,
}

/// Create a new reminder in the database.
///
/// Returns the full `Reminder` record including generated `id` and timestamps.
#[tauri::command]
pub async fn create_reminder(app: AppHandle, input: ReminderInput) -> Result<Reminder, String> {
    let reminder = Reminder {
        id: Uuid::new_v4().to_string(),
        title: input.title,
        description: input.description,
        fire_at: input.fire_at,
        recurrence: input.recurrence,
        fired: false,
        created_at: Utc::now().to_rfc3339(),
    };

    // Emit an event so the reminder scheduler can pick it up immediately
    // without waiting for the next poll cycle.
    let _ = app.emit("reminder://created", &reminder);

    // NOTE: Actual DB persistence is done via the tauri-plugin-sql
    // JS bridge from the renderer after this command returns —
    // a future refactor can move it fully Rust-side.
    Ok(reminder)
}

/// List all pending (unfired) reminders.
#[tauri::command]
pub async fn list_reminders() -> Result<Vec<Reminder>, String> {
    // The renderer queries SQLite directly via tauri-plugin-sql for lists.
    // This stub returns empty; the bridge layer uses the plugin's JS API.
    Ok(vec![])
}

/// Mark a reminder as fired or update its `fire_at` for recurring reminders.
#[tauri::command]
pub async fn update_reminder(
    app: AppHandle,
    id: String,
    fire_at: Option<String>,
    fired: Option<bool>,
) -> Result<(), String> {
    let _ = app.emit(
        "reminder://updated",
        serde_json::json!({ "id": id, "fire_at": fire_at, "fired": fired }),
    );
    Ok(())
}

/// Delete a reminder by ID.
#[tauri::command]
pub async fn delete_reminder(app: AppHandle, id: String) -> Result<(), String> {
    let _ = app.emit("reminder://deleted", serde_json::json!({ "id": id }));
    Ok(())
}
