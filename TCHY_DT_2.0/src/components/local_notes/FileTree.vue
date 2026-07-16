<!-- src/components/local_notes/FileTree.vue -->
<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { readDir } from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';
import FileTreeItem from './FileTreeItem.vue';
import ContextMenu from './ContextMenu.vue';
import PromptDialog from './PromptDialog.vue';
import type { MenuItem } from './ContextMenu.vue';
import { useFileSearch } from '@/composables/useFileSearch';
import { useFileOperations } from '@/composables/useFileOperations';
import { useRecentFiles } from '@/composables/useRecentFiles';

interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
  isSymlink: boolean;
}

const props = defineProps<{ rootPath: string }>();
const emit = defineEmits<{ (e: 'fileClick', path: string): void }>();

// ===== 状态 =====
const treeData = ref<FileEntry[]>([]);
const isLoading = ref(false);

// ===== 搜索 =====
const { searchQuery, isSearching, searchResults, onSearchInput, clearSearch, clearCache } = useFileSearch();

// ===== 最近打开 =====
const { recentFiles, clearRecentFiles } = useRecentFiles();
const showRecent = ref(true);

// ===== Prompt 对话框 =====
const promptVisible = ref(false);
const promptTitle = ref('');
const promptPlaceholder = ref('');
const promptValue = ref('');
let promptResolve: ((value: string | null) => void) | null = null;

function showPrompt(title: string, placeholder?: string, defaultValue?: string): Promise<string | null> {
  return new Promise((resolve) => {
    promptTitle.value = title;
    promptPlaceholder.value = placeholder || '请输入...';
    promptValue.value = defaultValue || '';
    promptResolve = resolve;
    promptVisible.value = true;
  });
}

function handlePromptConfirm(value: string) {
  promptVisible.value = false;
  if (promptResolve) {
    promptResolve(value);
    promptResolve = null;
  }
}

function handlePromptCancel() {
  promptVisible.value = false;
  if (promptResolve) {
    promptResolve(null);
    promptResolve = null;
  }
}

// ===== 文件操作 =====
const { createItem, renameItem, deleteItem } = useFileOperations(loadTree);

// ===== 加载树 =====
async function loadTree() {
  if (!props.rootPath) return;
  isLoading.value = true;
  try {
    const entries = await readDir(props.rootPath);
    const mapped = await Promise.all(entries.map(async (entry) => ({
      name: entry.name || '未命名',
      path: await join(props.rootPath, entry.name),
      isDirectory: entry.isDirectory || false,
      isFile: entry.isFile || false,
      isSymlink: entry.isSymlink || false,
    })));
    treeData.value = mapped;
    clearCache();
  } catch (e) {
    console.error('加载文件树失败', e);
  }
  isLoading.value = false;
}

// ===== 右键菜单 =====
const menuVisible = ref(false);
const menuX = ref(0);
const menuY = ref(0);
const menuItems = ref<MenuItem[]>([]);

function buildMenu(path: string, isFolder: boolean): MenuItem[] {
  return [
    {
      label: '新建笔记',
      action: () => { createItem(path, false, showPrompt); }
    },
    {
      label: '新建文件夹',
      action: () => { createItem(path, true, showPrompt); }
    },
    { divider: true },
    {
      label: '重命名',
      action: () => { renameItem(path, showPrompt); }
    },
    {
      label: '删除',
      action: () => { deleteItem(path); }
    },
  ];
}

function showContextMenu(path: string, isFolder: boolean, x: number, y: number) {
  menuItems.value = buildMenu(path, isFolder);
  menuX.value = x;
  menuY.value = y;
  menuVisible.value = true;
}

function showEmptyContextMenu(e: MouseEvent) {
  e.preventDefault();
  if (!props.rootPath) return;
  menuItems.value = [
    {
      label: '新建笔记',
      action: () => { createItem(props.rootPath, false, showPrompt); }
    },
    {
      label: '新建文件夹',
      action: () => { createItem(props.rootPath, true, showPrompt); }
    },
  ];
  menuX.value = e.clientX;
  menuY.value = e.clientY;
  menuVisible.value = true;
}

// ===== 高亮匹配关键词 =====
function highlightMatch(text: string, query: string) {
  if (!query || !text) return text;
  const q = query.toLowerCase().trim();
  const index = text.toLowerCase().indexOf(q);
  if (index === -1) return text;
  const before = text.substring(0, index);
  const matched = text.substring(index, index + q.length);
  const after = text.substring(index + q.length);
  return `${before}<span class="highlight">${matched}</span>${after}`;
}

// ===== 搜索点击 =====
function onSearchResultClick(result: { path: string; isDirectory: boolean }) {
  if (result.isDirectory) {
    clearSearch();
    return;
  }
  emit('fileClick', result.path);
  clearSearch();
}

// ===== 最近打开点击 =====
function onRecentClick(path: string) {
  emit('fileClick', path);
}

defineExpose({ loadTree });

watch(() => props.rootPath, loadTree, { immediate: true });
onMounted(loadTree);
</script>

<template>
  <div class="file-tree">
    <!-- 头部 -->
    <div class="tree-header">
      <span class="vault-name">{{ rootPath.split(/[\\/]/).pop() || '仓库' }}</span>
      <button class="refresh-btn" @click="loadTree" aria-label="刷新">↻</button>
    </div>

    <!-- 搜索框 -->
    <div class="search-container">
      <input
        type="text"
        class="search-input"
        placeholder="搜索文件…"
        :value="searchQuery"
        @input="(e) => onSearchInput((e.target as HTMLInputElement).value, props.rootPath)"
      />
      <button v-if="searchQuery" class="search-clear" @click="clearSearch">×</button>
    </div>

    <!-- 最近打开 -->
    <div v-if="!searchQuery && recentFiles.length > 0" class="recent-section">
      <div class="recent-header">
        <span class="recent-title">最近打开</span>
        <button class="recent-clear" @click="clearRecentFiles" title="清空最近打开">清空</button>
      </div>
      <div class="recent-list">
        <div
          v-for="file in recentFiles"
          :key="file.path"
          class="recent-item"
          @click="onRecentClick(file.path)"
        >
          <span class="recent-icon">📄</span>
          <span class="recent-name">{{ file.name }}</span>
        </div>
      </div>
    </div>

    <!-- 搜索结果 -->
    <div v-if="isSearching" class="search-status">搜索中…</div>
    <div v-else-if="searchQuery && searchResults.length === 0" class="search-status">未找到匹配的文件</div>
    <div v-else-if="searchQuery && searchResults.length > 0" class="search-results">
      <div
        v-for="result in searchResults"
        :key="result.path"
        class="search-item"
        @click="onSearchResultClick(result)"
      >
        <span class="search-icon">{{ result.isDirectory ? '📁' : '📄' }}</span>
        <span class="search-name" v-html="highlightMatch(result.name, searchQuery)"></span>
      </div>
    </div>

    <!-- 文件树 -->
    <div v-if="!searchQuery" class="tree-body" @contextmenu="showEmptyContextMenu">
      <div v-if="isLoading" class="status-text">加载中…</div>
      <div v-else-if="treeData.length === 0" class="status-text empty-state">
        <span>空仓库</span>
        <span class="hint">右键此处创建</span>
      </div>
      <div v-else class="tree-list">
        <FileTreeItem
          v-for="entry in treeData"
          :key="entry.path"
          :entry="entry"
          :depth="0"
          @file-click="(path) => emit('fileClick', path)"
          @context-menu="showContextMenu"
        />
      </div>
    </div>

    <!-- 右键菜单 -->
    <ContextMenu
      v-if="menuVisible"
      :items="menuItems"
      :x="menuX"
      :y="menuY"
      @close="menuVisible = false"
    />

    <!-- Prompt 对话框 -->
    <PromptDialog
      :visible="promptVisible"
      :title="promptTitle"
      :placeholder="promptPlaceholder"
      :value="promptValue"
      @confirm="handlePromptConfirm"
      @cancel="handlePromptCancel"
    />
  </div>
</template>

<style scoped>
.file-tree {
  width: 260px;
  min-width: 200px;
  max-width: 360px;
  border-right: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  background: #fafafa;
  height: 100%;
  overflow: hidden;
}

.tree-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px 12px 20px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.vault-name {
  font-size: 15px;
  font-weight: 400;
  color: #1a1a1a;
  letter-spacing: 0.5px;
}

.refresh-btn {
  background: none;
  border: none;
  font-size: 18px;
  color: #bbb;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.15s;
  line-height: 1;
}
.refresh-btn:hover {
  color: #555;
  background: #f0f0f0;
}

/* === 搜索框 === */
.search-container {
  position: relative;
  padding: 8px 16px 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.search-input {
  width: 100%;
  padding: 6px 32px 6px 12px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  background: #ffffff;
  font-size: 13px;
  color: #1a1a1a;
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}
.search-input:focus {
  border-color: #1a1a1a;
}
.search-input::placeholder {
  color: #bbb;
}

.search-clear {
  position: absolute;
  right: 24px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 18px;
  color: #bbb;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}
.search-clear:hover {
  color: #555;
}

/* === 最近打开 === */
.recent-section {
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
  padding: 8px 12px 12px 12px;
}

.recent-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.recent-title {
  font-size: 11px;
  font-weight: 400;
  color: #bbb;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.recent-clear {
  font-size: 11px;
  color: #bbb;
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 3px;
  transition: all 0.15s;
}
.recent-clear:hover {
  color: #666;
  background: #f0f0f0;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.recent-item {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.1s;
  gap: 8px;
}
.recent-item:hover {
  background: #f0f0f0;
}

.recent-icon {
  font-size: 13px;
  opacity: 0.5;
}
.recent-name {
  font-size: 13px;
  font-weight: 300;
  color: #555;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* === 搜索状态 === */
.search-status {
  padding: 40px 20px;
  text-align: center;
  color: #bbb;
  font-size: 13px;
  font-weight: 300;
  letter-spacing: 0.5px;
}

/* === 搜索结果列表 === */
.search-results {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px 20px 12px;
}

.search-item {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.1s;
  gap: 10px;
}
.search-item:hover {
  background: #f0f0f0;
}

.search-icon {
  font-size: 14px;
  flex-shrink: 0;
  opacity: 0.6;
}

.search-name {
  font-size: 14px;
  font-weight: 300;
  color: #1a1a1a;
  letter-spacing: 0.3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-name .highlight {
  font-weight: 500;
  color: #1a1a1a;
  background: #e8e8e8;
  padding: 0 2px;
  border-radius: 2px;
}

.search-results::-webkit-scrollbar {
  width: 3px;
}
.search-results::-webkit-scrollbar-track {
  background: transparent;
}
.search-results::-webkit-scrollbar-thumb {
  background: #e0e0e0;
  border-radius: 3px;
}
.search-results::-webkit-scrollbar-thumb:hover {
  background: #ccc;
}

/* === 文件树 === */
.tree-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0 20px 0;
}

.tree-list {
  /* 包裹文件树条目 */
}

.status-text {
  padding: 40px 20px;
  text-align: center;
  color: #bbb;
  font-size: 14px;
  font-weight: 300;
  letter-spacing: 0.5px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.empty-state .hint {
  font-size: 12px;
  color: #ccc;
  letter-spacing: 0.3px;
}

.tree-body::-webkit-scrollbar {
  width: 3px;
}
.tree-body::-webkit-scrollbar-track {
  background: transparent;
}
.tree-body::-webkit-scrollbar-thumb {
  background: #e0e0e0;
  border-radius: 3px;
}
.tree-body::-webkit-scrollbar-thumb:hover {
  background: #ccc;
}
</style>