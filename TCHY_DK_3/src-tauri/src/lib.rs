// src-tauri/src/lib.rs
mod config;
use config::{
    ensure_config_dir,
    ensure_default_config,
    get_settings,
    save_settings,
    get_app_dir,
    read_window_size_from_config,
};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    ensure_config_dir();
    ensure_default_config();

    let (win_width, win_height) = read_window_size_from_config();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_settings,
            save_settings,
            get_app_dir,
        ])
        .setup(move |app| {   // ← 加上 move
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_size(tauri::PhysicalSize {
                    width: win_width,
                    height: win_height,
                });
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}