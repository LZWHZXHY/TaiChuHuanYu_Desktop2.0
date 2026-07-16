<!-- src/components/FileTree.vue -->
<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { readDir } from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';
import FileTreeItem from './FileTreeItem.vue';

interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
  isSymlink: boolean;
}

const props = defineProps<{ rootPath: string }>();
const emit = defineEmits<{ (e: 'fileClick', path: string): void }>();

const treeData = ref<FileEntry[]>([]);
const isLoading = ref(false);

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
  } catch (e) {
    console.error('加载文件树失败', e);
  }
  isLoading.value = false;
}

defineExpose({ loadTree });

watch(() => props.rootPath, loadTree, { immediate: true });
onMounted(loadTree);
</script>

<template>
  <div class="file-tree">
    <!-- 头部：仓库名 + 刷新 -->
    <div class="tree-header">
      <span class="vault-name">{{ rootPath.split(/[\\/]/).pop() || '仓库' }}</span>
      <button class="refresh-btn" @click="loadTree" aria-label="刷新">↻</button>
    </div>

    <!-- 内容 -->
    <div v-if="isLoading" class="status-text">加载中…</div>
    <div v-else-if="treeData.length === 0" class="status-text">空仓库</div>
    <div v-else class="tree-body">
      <FileTreeItem
        v-for="entry in treeData"
        :key="entry.path"
        :entry="entry"
        :depth="0"
        @file-click="(path) => emit('fileClick', path)"
      />
    </div>
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

.tree-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0 20px 0;
}

.status-text {
  padding: 40px 20px;
  text-align: center;
  color: #bbb;
  font-size: 14px;
  font-weight: 300;
  letter-spacing: 0.5px;
}

/* 滚动条极简 */
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