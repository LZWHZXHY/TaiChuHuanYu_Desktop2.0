// src-tauri/src/lib.rs
mod config;
mod notes;

use config::{
    ensure_config_dir,
    ensure_default_config,
    get_settings,
    save_settings,
    get_app_dir,
    read_window_size_from_config,
};
use tauri::Manager;

// 导入 notes 模块的所有命令
use notes::{
    list_notes_tree,   // ← 改这里
    read_note,
    save_note,
    delete_note,
    create_note,
    create_folder,
    move_note,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    ensure_config_dir();
    ensure_default_config();

    let (win_width, win_height) = read_window_size_from_config();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            // config 模块命令
            get_settings,
            save_settings,
            get_app_dir,
            // notes 模块命令
            list_notes_tree,   // ← 改这里
            read_note,
            save_note,
            delete_note,
            create_note,
            create_folder,
            move_note,
        ])
        .setup(move |app| {
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