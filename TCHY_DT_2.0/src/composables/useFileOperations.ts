// src/composables/useFileOperations.ts
import { join } from '@tauri-apps/api/path';
import { writeTextFile, mkdir, remove, rename } from '@tauri-apps/plugin-fs';

export function useFileOperations(loadTree: () => Promise<void>) {
  async function createItem(parentPath: string, isFolder: boolean, showPrompt: (title: string, placeholder?: string, defaultValue?: string) => Promise<string | null>) {
    const label = isFolder ? '输入文件夹名称：' : '输入笔记名称：';
    const placeholder = isFolder ? '我的文件夹' : '我的笔记';
    const name = await showPrompt(label, placeholder);
    if (!name || name.trim() === '') return;
    
    let fileName = name.trim();
    if (!isFolder && !fileName.includes('.')) {
      fileName = fileName + '.md';
    }
    
    const fullPath = await join(parentPath, fileName);
    try {
      if (isFolder) {
        await mkdir(fullPath);
      } else {
        await writeTextFile(fullPath, '');
      }
      await loadTree();
    } catch (e) {
      console.error('创建失败:', e);
      alert(`创建失败: ${e}`);
    }
  }

  async function renameItem(path: string, showPrompt: (title: string, placeholder?: string, defaultValue?: string) => Promise<string | null>) {
    const oldName = path.split(/[\\/]/).pop() || '';
    
    // 提取扩展名（如果有）
    const lastDotIndex = oldName.lastIndexOf('.');
    const extension = lastDotIndex > 0 ? oldName.substring(lastDotIndex) : '';
    const nameWithoutExt = lastDotIndex > 0 ? oldName.substring(0, lastDotIndex) : oldName;
    
    const newName = await showPrompt('重命名为：', '输入新名称', nameWithoutExt);
    if (!newName || newName.trim() === '' || newName === nameWithoutExt) return;
    
    // 如果用户输入的名称没有扩展名，且原文件有扩展名，自动补上
    let finalName = newName.trim();
    if (extension && !finalName.includes('.')) {
        finalName = finalName + extension;
    }
    
    const parentPath = path.substring(0, path.lastIndexOf('/') > 0 ? path.lastIndexOf('/') : path.lastIndexOf('\\'));
    const newPath = await join(parentPath, finalName);
    try {
      await rename(path, newPath);
      await loadTree();
    } catch (e) {
      console.error('重命名失败:', e);
      alert(`重命名失败: ${e}`);
    }
}

  async function deleteItem(path: string) {
    const name = path.split(/[\\/]/).pop() || '此项目';
    if (!confirm(`确定要删除 "${name}" 吗？\n\n此操作不可撤销！`)) return;
    try {
      await remove(path, { recursive: true });
      await loadTree();
    } catch (e) {
      console.error('删除失败:', e);
      alert(`删除失败: ${e}`);
    }
  }

  return {
    createItem,
    renameItem,
    deleteItem,
  };
}