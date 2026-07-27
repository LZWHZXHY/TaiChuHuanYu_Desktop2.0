use tauri_plugin_dialog;  // 使用系统弹窗(dialog)和文件读写(fs)这两个工具包
use tauri_plugin_fs;

// ==== 第1部分：新增辅助函数（获取配置目录）====
// 这个函数专门用来获取 "exe 所在目录/config/" 的路径
fn get_config_dir() -> Result<std::path::PathBuf, String> {
    // 1. 获取当前 exe 的完整路径
    let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
    // 2. 获取 exe 所在的文件夹路径（去掉 exe 文件名）
    let exe_dir = exe_path.parent().ok_or("无法获取 exe 所在目录".to_string())?;
    // 3. 拼接出 config 文件夹的路径
    let config_dir = exe_dir.join("config");
    // 4. 如果 config 文件夹不存在，自动创建它
    std::fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;
    Ok(config_dir)
}

// ==== 第2部分：新增读取设置（从 config/settings.json 读）====
// 读取设置（如果文件不存在，自动创建默认配置）
#[tauri::command]
fn get_settings() -> Result<String, String> {
    // 1. 获取 config 文件夹路径（如果文件夹不存在，这里会顺便创建它）
    let config_dir = get_config_dir()?;
    let config_path = config_dir.join("settings.json");
    
    // 2. 检查文件是否存在
    if !config_path.exists() {
        // 🔥 关键新逻辑：文件不存在，我们就自己创建一个！
        // 定义默认配置内容（和之前手写的一模一样）
        let default_settings = r#"{"vaults":[],"activeVaultPath":"","plugins":{"webViewer":true,"calendar":true,"kanban":true},"theme":"light","autoSave":true}"#;
        
        // 把这个默认配置写入文件
        std::fs::write(&config_path, default_settings).map_err(|e| e.to_string())?;
        
        // 写入成功后，直接把这份默认配置返回给前端
        return Ok(default_settings.to_string());
    }
    
    // 3. 如果文件已经存在，就正常读取并返回
    std::fs::read_to_string(config_path).map_err(|e| e.to_string())
}

// ==== 第3部分：新增保存设置（覆盖写入 config/settings.json）====
#[tauri::command]
fn save_settings(settings_json: String) -> Result<(), String> {
    let config_dir = get_config_dir()?;
    let config_path = config_dir.join("settings.json");
    // 直接覆盖写入
    std::fs::write(config_path, settings_json).map_err(|e| e.to_string())
}


// ==== 原有的打招呼命令（保留，暂时不删）====
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// ==== 原有的读取 .md 文件命令（保留，之前你写的）====
#[tauri::command]
fn read_notes_folder(folder_path: String) -> Result<Vec<String>, String> {
    use std::fs;
    //use std::path::Path;  // 这行已经删掉了，因为没用
    
    let entries = fs::read_dir(&folder_path).map_err(|e| e.to_string())?;
    let mut contents = Vec::new();
    
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) == Some("md") {
            let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
            contents.push(content);
        }
    }
    Ok(contents)
}

// ==== 原有的获取程序目录命令（这个可以删掉，因为 get_config_dir 更精准）====
// 为了保险，先保留，但以后你可能用不上它了
#[tauri::command]
fn get_app_dir() -> String {
    std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_string_lossy().to_string()))
        .unwrap_or_else(|| ".".to_string())
}


// ==== 启动引擎（这部分是最关键的修改：注册新命令）====
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        // ⚠️ 关键修改：把 get_settings 和 save_settings 加到这个列表里
        .invoke_handler(tauri::generate_handler![
            greet, 
            get_app_dir, 
            read_notes_folder,
            get_settings,    // ← 新增
            save_settings    // ← 新增
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}