// src/composables/useFileSearch.ts
import { ref } from 'vue';
import { readDir } from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';

export interface SearchResult {
  name: string;
  path: string;
  isDirectory: boolean;
}

export function useFileSearch() {
  const searchQuery = ref('');
  const isSearching = ref(false);
  const searchResults = ref<SearchResult[]>([]);
  const allFilesCache = ref<SearchResult[]>([]);
  let searchTimer: ReturnType<typeof setTimeout> | null = null;

  async function scanDirectory(dirPath: string): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    try {
      const entries = await readDir(dirPath);
      for (const entry of entries) {
        const fullPath = await join(dirPath, entry.name);
        const isDir = entry.isDirectory || false;
        results.push({
          name: entry.name || '未命名',
          path: fullPath,
          isDirectory: isDir,
        });
        if (isDir) {
          const subResults = await scanDirectory(fullPath);
          results.push(...subResults);
        }
      }
    } catch (e) {
      console.error('扫描目录失败:', e);
    }
    return results;
  }

  async function performSearch(query: string, rootPath: string) {
    if (!rootPath || !query || query.trim() === '') {
      searchResults.value = [];
      isSearching.value = false;
      return;
    }

    isSearching.value = true;
    const q = query.toLowerCase().trim();

    if (allFilesCache.value.length > 0) {
      const filtered = allFilesCache.value.filter(item =>
        item.name.toLowerCase().includes(q)
      );
      searchResults.value = filtered;
      isSearching.value = false;
      return;
    }

    try {
      const allFiles = await scanDirectory(rootPath);
      allFilesCache.value = allFiles;
      const filtered = allFiles.filter(item =>
        item.name.toLowerCase().includes(q)
      );
      searchResults.value = filtered;
    } catch (e) {
      console.error('搜索失败:', e);
      searchResults.value = [];
    }
    isSearching.value = false;
  }

  function onSearchInput(query: string, rootPath: string) {
    searchQuery.value = query;
    if (searchTimer) {
      clearTimeout(searchTimer);
    }
    searchTimer = setTimeout(() => {
      performSearch(query, rootPath);
    }, 300);
  }

  function clearSearch() {
    searchQuery.value = '';
    searchResults.value = [];
    isSearching.value = false;
    if (searchTimer) {
      clearTimeout(searchTimer);
      searchTimer = null;
    }
  }

  // 清除缓存（在文件增删改后调用）
  function clearCache() {
    allFilesCache.value = [];
  }

  return {
    searchQuery,
    isSearching,
    searchResults,
    onSearchInput,
    clearSearch,
    clearCache,
  };
}