<!-- src/components/FileTreeItem.vue -->
<script setup lang="ts">
import { ref } from 'vue';
import { readDir } from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';

interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
  isSymlink: boolean;
}

const props = defineProps<{
  entry: FileEntry;
  depth: number;
}>();

// 增加 contextMenu 事件
const emit = defineEmits<{
  (e: 'fileClick', path: string): void;
  (e: 'contextMenu', path: string, isFolder: boolean, x: number, y: number): void;
}>();

const isFolder = ref(props.entry.isDirectory);
const isExpanded = ref(false);
const children = ref<FileEntry[]>([]);

async function toggleExpand() {
  if (!isFolder.value) {
    emit('fileClick', props.entry.path);
    return;
  }
  if (isExpanded.value) {
    isExpanded.value = false;
    return;
  }
  try {
    const entries = await readDir(props.entry.path);
    const mapped = await Promise.all(entries.map(async (entry) => ({
      name: entry.name || '未命名',
      path: await join(props.entry.path, entry.name),
      isDirectory: entry.isDirectory || false,
      isFile: entry.isFile || false,
      isSymlink: entry.isSymlink || false,
    })));
    children.value = mapped;
    isExpanded.value = true;
  } catch (e) {
    console.error('读取子目录失败', e);
  }
}

// 右键菜单处理
function handleContextMenu(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
  // 传递路径、是否为文件夹、鼠标坐标
  emit('contextMenu', props.entry.path, isFolder.value, e.clientX, e.clientY);
}
</script>

<template>
  <div>
    <div 
      class="tree-item" 
      :style="{ paddingLeft: (depth * 16 + 16) + 'px' }"
      @click="toggleExpand"
      @contextmenu="handleContextMenu"
    >
      <span class="icon">{{ isFolder ? (isExpanded ? '▾' : '▸') : '·' }}</span>
      <span class="name">{{ entry.name }}</span>
    </div>
    <div v-if="isFolder && isExpanded" class="children">
      <FileTreeItem
        v-for="child in children"
        :key="child.path"
        :entry="child"
        :depth="depth + 1"
        @file-click="(path) => emit('fileClick', path)"
        @context-menu="(path, isFolder, x, y) => emit('contextMenu', path, isFolder, x, y)"
      />
    </div>
  </div>
</template>

<style scoped>
.tree-item {
  display: flex;
  align-items: center;
  padding: 4px 0;
  cursor: pointer;
  border-radius: 3px;
  user-select: none;
  transition: background 0.1s;
  color: #333;
}
.tree-item:hover {
  background: #f0f0f0;
}
.tree-item:active {
  background: #e8e8e8;
}

.icon {
  font-size: 13px;
  color: #aaa;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
  margin-right: 2px;
  transition: transform 0.15s;
}

.name {
  font-size: 14px;
  font-weight: 300;
  letter-spacing: 0.3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 如果是文件夹，图标颜色稍深 */
.tree-item:has(.icon) .icon {
  color: #888;
}

/* 子项不额外缩进，由 padding-left 控制 */
.children {
  /* 无需额外样式 */
}
</style>