// src-tauri/src/lib.rs

// 声明 config 模块（告诉 Rust：有个叫 config.rs 的文件）
mod config;

// 从 config 模块里导入需要用到的函数
use config::{ensure_config_dir, ensure_default_config, get_settings, get_app_dir};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    ensure_config_dir();
    ensure_default_config();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_settings,
            get_app_dir,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}