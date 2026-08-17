// Meowmind — src-tauri/src/commands/settings.rs
//
// Application settings commands. Settings are stored via tauri-plugin-store
// in a JSON file inside the app's data directory (not exposed to the renderer
// as raw paths). API keys are NOT stored here — they use secure_store.rs.

use serde::{Deserialize, Serialize};

/// All user-configurable application settings.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    /// Active AI provider identifier.
    pub provider: String,
    /// Active model name for the selected provider.
    pub model: String,
    /// Custom base URL for the "custom" provider.
    pub custom_url: Option<String>,
    /// Whether the character moves autonomously on the desktop.
    pub autonomous_movement: bool,
    /// Whether reaction animations are enabled (Happy, Surprised, etc.).
    pub reactions_enabled: bool,
    /// Duration of a Pomodoro focus block in minutes.
    pub pomodoro_focus_minutes: u32,
    /// Duration of a Pomodoro short break in minutes.
    pub pomodoro_break_minutes: u32,
    /// UI theme: "dark" | "light" | "system"
    pub theme: String,
    /// Character color skin / palette
    #[serde(default = "default_skin")]
    pub character_skin: String,
}

fn default_skin() -> String {
    "default".to_string()
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            provider: "openai".to_string(),
            model: "gpt-4o".to_string(),
            custom_url: None,
            autonomous_movement: true,
            reactions_enabled: true,
            pomodoro_focus_minutes: 25,
            pomodoro_break_minutes: 5,
            theme: "dark".to_string(),
            character_skin: "default".to_string(),
        }
    }
}

/// Return the current application settings.
///
/// Settings are persisted via the tauri-plugin-store JS API from the renderer.
/// This command returns defaults; the renderer merges them with stored values.
#[tauri::command]
pub fn get_settings() -> Result<Settings, String> {
    Ok(Settings::default())
}

/// Validate and acknowledge settings changes.
///
/// Actual persistence is done via tauri-plugin-store in the renderer.
/// This command is a hook for any Rust-side side effects (e.g. updating
/// the reminder scheduler's poll interval).
#[tauri::command]
pub fn save_settings(_settings: Settings) -> Result<(), String> {
    Ok(())
}
