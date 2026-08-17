// Meowmind — src-tauri/src/lib.rs
//
// Top-level Tauri application setup. Registers all plugins, commands,
// the system tray, and window event handlers.

mod commands;
mod db;
mod notifications;
mod process_monitor;
mod secure_store;
mod tray;

// Tauri entry point setup

/// Application entry point called from `main.rs`.
///
/// Sets up all Tauri plugins and command handlers, then runs the event loop.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Initialize the database schema
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = db::initialize(&app_handle).await {
                    log::error!("Failed to initialize database: {e}");
                }
            });

            // Start background CLI / process activity monitor
            process_monitor::start_monitor(app.handle().clone());

            // Build the system tray
            tray::setup_tray(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // AI commands
            commands::ai::list_models,
            commands::ai::save_api_key,
            commands::ai::get_api_key,
            commands::ai::delete_api_key,
            commands::ai::stream_chat_message,
            // Reminder commands
            commands::reminders::create_reminder,
            commands::reminders::list_reminders,
            commands::reminders::update_reminder,
            commands::reminders::delete_reminder,
            // Settings commands
            commands::settings::get_settings,
            commands::settings::save_settings,
            // Notes commands
            commands::notes::get_notes,
            commands::notes::save_note,
            commands::notes::delete_note,
            // Window commands
            commands::windows::open_settings_window,
            commands::windows::start_window_drag,
            commands::windows::toggle_click_through,
            commands::windows::get_companion_movement_state,
            commands::windows::set_companion_position,
        ])
        .run(tauri::generate_context!())
        .expect("error while running meowmind");
}
