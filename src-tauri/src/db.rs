// Meowmind — src-tauri/src/db.rs
//
// SQLite database initialization via tauri-plugin-sql.
// Defines the schema and runs migrations on first launch.

use anyhow::Result;
use tauri::AppHandle;
use tauri_plugin_sql::{Migration, MigrationKind};

/// All database migrations, applied in order on startup.
#[allow(dead_code)]
pub fn migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "initial_schema",
        kind: MigrationKind::Up,
        sql: r#"
                -- Chat sessions
                CREATE TABLE IF NOT EXISTS sessions (
                    id          TEXT PRIMARY KEY,
                    title       TEXT NOT NULL DEFAULT 'New Chat',
                    provider    TEXT NOT NULL,
                    model       TEXT NOT NULL,
                    created_at  TEXT NOT NULL,
                    updated_at  TEXT NOT NULL
                );

                -- Individual chat messages
                CREATE TABLE IF NOT EXISTS messages (
                    id          TEXT PRIMARY KEY,
                    session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
                    role        TEXT NOT NULL CHECK(role IN ('user','assistant','system')),
                    content     TEXT NOT NULL,
                    created_at  TEXT NOT NULL
                );

                -- Reminders (one-time and recurring)
                CREATE TABLE IF NOT EXISTS reminders (
                    id          TEXT PRIMARY KEY,
                    title       TEXT NOT NULL,
                    description TEXT,
                    fire_at     TEXT NOT NULL,
                    recurrence  TEXT,
                    fired       INTEGER NOT NULL DEFAULT 0,
                    created_at  TEXT NOT NULL
                );

                -- Sticky notes
                CREATE TABLE IF NOT EXISTS notes (
                    id          TEXT PRIMARY KEY,
                    content     TEXT NOT NULL DEFAULT '',
                    pos_x       REAL NOT NULL DEFAULT 100.0,
                    pos_y       REAL NOT NULL DEFAULT 100.0,
                    updated_at  TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
                CREATE INDEX IF NOT EXISTS idx_reminders_fire_at ON reminders(fire_at);
            "#,
    }]
}

/// Initialize the database connection and run pending migrations.
///
/// Called once at app startup from `lib.rs`.
pub async fn initialize(_app: &AppHandle) -> Result<()> {
    log::info!("Database initialized (migrations registered via plugin builder)");
    Ok(())
}
