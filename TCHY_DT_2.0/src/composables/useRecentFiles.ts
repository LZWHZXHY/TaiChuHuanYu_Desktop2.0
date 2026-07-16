// src/composables/useRecentFiles.ts
import { ref } from 'vue';

export interface RecentFile {
  path: string;
  name: string;
  timestamp: number;
}

const STORAGE_KEY = 'recent-files';
const MAX_RECENT = 20;

// 从 localStorage 加载
function loadRecentFiles(): RecentFile[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('加载最近文件失败:', e);
  }
  return [];
}

// 保存到 localStorage
function saveRecentFiles(files: RecentFile[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
  } catch (e) {
    console.error('保存最近文件失败:', e);
  }
}

export function useRecentFiles() {
  const recentFiles = ref<RecentFile[]>(loadRecentFiles());

  // 添加一个文件到最近列表
  function addRecentFile(path: string) {
    const name = path.split(/[\\/]/).pop() || '未命名';
    
    // 去重：移除已存在的相同路径
    const filtered = recentFiles.value.filter(f => f.path !== path);
    
    // 插入到最前面
    const newFile: RecentFile = {
      path,
      name,
      timestamp: Date.now(),
    };
    
    recentFiles.value = [newFile, ...filtered];
    
    // 限制数量
    if (recentFiles.value.length > MAX_RECENT) {
      recentFiles.value = recentFiles.value.slice(0, MAX_RECENT);
    }
    
    saveRecentFiles(recentFiles.value);
  }

  // 移除一个文件
  function removeRecentFile(path: string) {
    recentFiles.value = recentFiles.value.filter(f => f.path !== path);
    saveRecentFiles(recentFiles.value);
  }

  // 清空所有最近文件
  function clearRecentFiles() {
    recentFiles.value = [];
    saveRecentFiles(recentFiles.value);
  }

  // 监听变化（用于跨组件同步）
  function syncFromStorage() {
    recentFiles.value = loadRecentFiles();
  }

  return {
    recentFiles,
    addRecentFile,
    removeRecentFile,
    clearRecentFiles,
    syncFromStorage,
  };
}