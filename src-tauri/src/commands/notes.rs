// Meowmind — src-tauri/src/commands/notes.rs
//
// Sticky note commands. Notes are stored in SQLite via tauri-plugin-sql
// from the renderer. These commands emit events so multiple windows
// stay in sync.

use chrono::Utc;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

/// A sticky note record.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Note {
    pub id: String,
    pub content: String,
    pub pos_x: f64,
    pub pos_y: f64,
    pub updated_at: String,
}

/// Input for creating or updating a note.
#[derive(Debug, Deserialize)]
pub struct NoteInput {
    pub id: Option<String>,
    pub content: String,
    pub pos_x: Option<f64>,
    pub pos_y: Option<f64>,
}

/// List all sticky notes (delegated to renderer's tauri-plugin-sql query).
#[tauri::command]
pub async fn get_notes() -> Result<Vec<Note>, String> {
    Ok(vec![])
}

/// Create or update a sticky note, emitting a sync event to all windows.
#[tauri::command]
pub async fn save_note(app: AppHandle, input: NoteInput) -> Result<Note, String> {
    let note = Note {
        id: input.id.unwrap_or_else(|| Uuid::new_v4().to_string()),
        content: input.content,
        pos_x: input.pos_x.unwrap_or(100.0),
        pos_y: input.pos_y.unwrap_or(100.0),
        updated_at: Utc::now().to_rfc3339(),
    };
    let _ = app.emit("note://saved", &note);
    Ok(note)
}

/// Delete a sticky note by ID.
#[tauri::command]
pub async fn delete_note(app: AppHandle, id: String) -> Result<(), String> {
    let _ = app.emit("note://deleted", serde_json::json!({ "id": id }));
    Ok(())
}
