<template>
  <aside class="note-list">
    <div class="list-header">
      <span>笔记</span>
      <div class="header-actions">
        <button @click="emit('create-folder')" class="btn-add-folder" title="新建文件夹">📁</button>
        <button @click="emit('create')" class="btn-add" title="新建笔记">+</button>
      </div>
    </div>
    <div v-if="!vaultPath" class="empty">请先在设置中添加并激活一个仓库</div>
    <ul v-else-if="tree.length === 0" class="empty">还没有内容，点击 + 创建</ul>
    <ul v-else class="tree-container">
      <TreeNode
        v-for="node in tree"
        :key="node.path"
        :node="node"
        :level="0"
        :currentFileName="currentFileName"
        @open="emit('open', $event)"
        @delete="emit('delete', $event)"
        @move="(source, target) => emit('move', source, target)"
      />
    </ul>
    <div class="list-footer" v-if="vaultPath">
      <span>{{ countFiles }} 篇 · {{ countFolders }} 个文件夹</span>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FileNode } from '../composables/useNotes'
import TreeNode from './TreeNode.vue'

const props = defineProps<{
  tree: FileNode[]
  vaultPath: string
  currentFileName?: string
}>()

const emit = defineEmits<{
  (e: 'open', path: string): void
  (e: 'create'): void
  (e: 'create-folder'): void
  (e: 'delete', path: string): void
  (e: 'move', sourcePath: string, targetPath: string): void
}>()

const countFiles = computed(() => {
  const count = (nodes: FileNode[]): number => {
    let c = 0
    for (const n of nodes) {
      if (!n.is_folder) c++
      else c += count(n.children)
    }
    return c
  }
  return count(props.tree)
})

const countFolders = computed(() => {
  const count = (nodes: FileNode[]): number => {
    let c = 0
    for (const n of nodes) {
      if (n.is_folder) {
        c += 1 + count(n.children)
      }
    }
    return c
  }
  return count(props.tree)
})
</script>

<style scoped>
.note-list {
  width: 220px;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  padding-right: 20px;
  border-right: 1px solid #f0f0f0;
  height: 100%;
  overflow: hidden;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-size: 13px;
  color: #999;
}

.header-actions {
  display: flex;
  gap: 6px;
  align-items: center;
}

.btn-add,
.btn-add-folder {
  background: transparent;
  border: none;
  color: #bbb;
  font-size: 16px;
  cursor: pointer;
  transition: color 0.2s ease, transform 0.2s ease;
  padding: 0;
  line-height: 1;
}

.btn-add:hover {
  color: #1a1a1a;
  transform: rotate(90deg);
}

.btn-add-folder:hover {
  color: #1a1a1a;
  transform: scale(1.1);
}

.tree-container {
  list-style: none;
  padding: 0;
  margin: 0;
  flex: 1;
  overflow-y: auto;
}

.empty {
  color: #ddd;
  font-size: 14px;
  padding: 8px 0;
}

.list-footer {
  margin-top: 12px;
  font-size: 12px;
  color: #ddd;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}
</style>