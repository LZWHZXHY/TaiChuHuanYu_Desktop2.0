// src-tauri/src/notes.rs

use std::fs;
use std::path::{Path, PathBuf};
use serde::Serialize;

// ---------- 数据结构 ----------
#[derive(Debug, Clone, Serialize)]
pub struct FileNode {
    pub name: String,
    pub path: String,        // 相对于仓库根目录的路径，如 "folder/sub.md"
    pub is_folder: bool,
    pub children: Vec<FileNode>, // 仅当 is_folder 为 true 时有效
}

// ---------- 辅助函数 ----------
fn get_active_vault_path() -> Result<PathBuf, String> {
    let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
    let exe_dir = exe_path.parent().ok_or("无法获取程序目录".to_string())?;
    let config_file = exe_dir.join("config").join("settings.json");
    let content = fs::read_to_string(&config_file)
        .map_err(|e| format!("读取配置文件失败: {}", e))?;
    let json: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("解析配置失败: {}", e))?;
    let vault_path = json
        .get("active_vault_path")
        .and_then(|v| v.as_str())
        .ok_or("未设置激活的仓库")?;
    if vault_path.is_empty() {
        return Err("未设置激活的仓库".to_string());
    }
    Ok(PathBuf::from(vault_path))
}

/// 递归构建文件树
fn build_tree(current_path: &Path, relative_path: &Path) -> Vec<FileNode> {
    let mut nodes = Vec::new();
    if let Ok(entries) = fs::read_dir(current_path) {
        for entry in entries.flatten() {
            let path = entry.path();
            let name = path.file_name().and_then(|s| s.to_str()).unwrap_or("").to_string();
            // 跳过隐藏文件
            if name.starts_with('.') {
                continue;
            }
            let relative = relative_path.join(&name);
            let relative_str = relative.to_string_lossy().replace('\\', "/");

            if path.is_dir() {
                let children = build_tree(&path, &relative);
                nodes.push(FileNode {
                    name,
                    path: relative_str,
                    is_folder: true,
                    children,
                });
            } else if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("md") {
                nodes.push(FileNode {
                    name,
                    path: relative_str,
                    is_folder: false,
                    children: vec![],
                });
            }
        }
    }
    // 排序：文件夹在前，文件在后
    nodes.sort_by(|a, b| {
        if a.is_folder && !b.is_folder {
            std::cmp::Ordering::Less
        } else if !a.is_folder && b.is_folder {
            std::cmp::Ordering::Greater
        } else {
            a.name.cmp(&b.name)
        }
    });
    nodes
}

// ---------- 命令 ----------
#[tauri::command]
pub fn list_notes_tree() -> Result<Vec<FileNode>, String> {
    let vault_path = get_active_vault_path()?;
    if !vault_path.exists() {
        return Ok(vec![]);
    }
    let root = PathBuf::from("");
    Ok(build_tree(&vault_path, &root))
}

#[tauri::command]
pub fn read_note(relative_path: String) -> Result<String, String> {
    let vault_path = get_active_vault_path()?;
    let full_path = vault_path.join(&relative_path);
    if !full_path.starts_with(&vault_path) {
        return Err("非法路径".to_string());
    }
    if !full_path.exists() {
        return Err("文件不存在".to_string());
    }
    let content = fs::read_to_string(&full_path)
        .map_err(|e| format!("读取文件失败: {}", e))?;
    Ok(content)
}

#[tauri::command]
pub fn save_note(relative_path: String, content: String) -> Result<(), String> {
    let vault_path = get_active_vault_path()?;
    let full_path = vault_path.join(&relative_path);
    if !full_path.starts_with(&vault_path) {
        return Err("非法路径".to_string());
    }
    // 确保父目录存在
    if let Some(parent) = full_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("创建目录失败: {}", e))?;
    }
    fs::write(&full_path, content).map_err(|e| format!("保存失败: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn create_note(relative_path: String, content: Option<String>) -> Result<(), String> {
    let vault_path = get_active_vault_path()?;
    let full_path = vault_path.join(&relative_path);
    if !full_path.starts_with(&vault_path) {
        return Err("非法路径".to_string());
    }
    if full_path.exists() {
        return Err("文件已存在".to_string());
    }
    if let Some(parent) = full_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("创建目录失败: {}", e))?;
    }
    let default_content = content.unwrap_or_else(|| "".to_string());
    fs::write(&full_path, default_content).map_err(|e| format!("创建文件失败: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn delete_note(relative_path: String) -> Result<(), String> {
    let vault_path = get_active_vault_path()?;
    let full_path = vault_path.join(&relative_path);
    if !full_path.starts_with(&vault_path) {
        return Err("非法路径".to_string());
    }
    if !full_path.exists() {
        return Err("文件不存在".to_string());
    }
    if full_path.is_dir() {
        fs::remove_dir_all(&full_path).map_err(|e| format!("删除文件夹失败: {}", e))?;
    } else {
        fs::remove_file(&full_path).map_err(|e| format!("删除文件失败: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub fn create_folder(relative_path: String) -> Result<(), String> {
    let vault_path = get_active_vault_path()?;
    let full_path = vault_path.join(&relative_path);
    if !full_path.starts_with(&vault_path) {
        return Err("非法路径".to_string());
    }
    if full_path.exists() {
        return Err("文件夹已存在".to_string());
    }
    fs::create_dir_all(&full_path).map_err(|e| format!("创建文件夹失败: {}", e))?;
    Ok(())
}

/// 移动/重命名文件或文件夹
#[tauri::command]
pub fn move_note(source_path: String, target_path: String) -> Result<(), String> {
    let vault_path = get_active_vault_path()?;
    let src_full = vault_path.join(&source_path);
    let tgt_full = vault_path.join(&target_path);
    if !src_full.starts_with(&vault_path) || !tgt_full.starts_with(&vault_path) {
        return Err("非法路径".to_string());
    }
    if !src_full.exists() {
        return Err("源文件不存在".to_string());
    }
    if tgt_full.exists() {
        return Err("目标路径已存在".to_string());
    }
    // 确保目标父目录存在
    if let Some(parent) = tgt_full.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("创建目标目录失败: {}", e))?;
    }
    fs::rename(&src_full, &tgt_full).map_err(|e| format!("移动失败: {}", e))?;
    Ok(())
}