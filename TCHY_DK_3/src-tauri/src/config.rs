// src-tauri/src/config.rs

#[tauri::command]
pub fn get_app_dir() -> String {
    std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_string_lossy().to_string()))
        .unwrap_or_else(|| ".".to_string())
}



pub fn ensure_config_dir() {
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let config_dir = exe_dir.join("config");
            let _ = std::fs::create_dir_all(&config_dir);
        }
    }
}

pub fn ensure_default_config() {
    let exe_path = match std::env::current_exe() {
        Ok(path) => path,
        Err(_) => return,
    };
    let exe_dir = match exe_path.parent() {
        Some(dir) => dir,
        None => return,
    };
    let config_dir = exe_dir.join("config");
    let config_file = config_dir.join("settings.json");

    if config_file.exists() {
        return;
    }

    let default_settings = r#"{
        "vaults": [],
        "active_vault_path": "",
        "theme": "light",
        "auto_save": true,
        "plugins": {
            "local_editor": true,
            "web_viewer": true
        }
    }"#;

    let _ = std::fs::write(&config_file, default_settings);
}

#[tauri::command]
pub fn get_settings() -> Result<String, String> {
    let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
    let exe_dir = exe_path.parent().ok_or("无法获取程序目录".to_string())?;
    let config_file = exe_dir.join("config").join("settings.json");

    let content = std::fs::read_to_string(&config_file)
        .map_err(|e| format!("读取配置文件失败: {}", e))?;

    Ok(content)
}