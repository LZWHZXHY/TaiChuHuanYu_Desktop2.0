// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
fn ensure_config_dir() {
    // 获取当前运行的 exe 文件路径
    if let Ok(exe_path) = std::env::current_exe() {
        // 获取 exe 所在的文件夹路径
        if let Some(exe_dir) = exe_path.parent() {
            // 拼接 config 文件夹路径
            let config_dir = exe_dir.join("config");
            // 创建该目录（如果已存在则忽略）
            let _ = std::fs::create_dir_all(&config_dir);
        }
    }
}



//启动注册
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {

    ensure_config_dir();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
