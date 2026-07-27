<template>
  <li class="tree-node" :style="{ paddingLeft: level * 16 + 'px' }">
    <!-- 文件夹 -->
    <div
      v-if="node.is_folder"
      class="folder-wrapper"
      :data-path="node.path"
      draggable="true"
      @dragstart="onDragStart"
      @dragover.prevent="onDragOver"
      @dragenter.prevent="onDragOver"
      @drop.stop="onDropFolder"
    >
      <span class="folder-toggle" @click.stop="toggle">
        {{ expanded ? '▾' : '▸' }}
      </span>
      <span class="folder-name">📁 {{ node.name }}</span>
      <button class="btn-delete-folder" @click.stop="emit('delete', node.path)">✕</button>
    </div>

    <!-- 文件 -->
    <div
      v-else
      class="file-wrapper"
      draggable="true"
      @dragstart="onDragStart"
      @dragover.prevent="onDragOver"
      @dragenter.prevent="onDragOver"
      @drop.stop="onDropFile"
      @click="emit('open', node.path)"
    >
      <span class="file-name" :class="{ active: currentFileName === node.path }">
        {{ node.name.replace(/\.md$/, '') }}
      </span>
      <button class="btn-delete" @click.stop="emit('delete', node.path)">✕</button>
    </div>

    <!-- 子节点 -->
    <ul v-if="node.is_folder && expanded && node.children.length > 0" class="children">
      <TreeNode
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :level="level + 1"
        :currentFileName="currentFileName"
        @open="emit('open', $event)"
        @delete="emit('delete', $event)"
        @move="(source, target) => emit('move', source, target)"
      />
    </ul>
  </li>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { FileNode } from '../composables/useNotes'

const props = defineProps<{
  node: FileNode
  level: number
  currentFileName?: string
}>()

const emit = defineEmits<{
  (e: 'open', path: string): void
  (e: 'delete', path: string): void
  (e: 'move', source: string, target: string): void
}>()

const expanded = ref(true)

function toggle() {
  if (props.node.is_folder) expanded.value = !expanded.value
}

function onDragStart(e: DragEvent) {
  if (!e.dataTransfer) return
  e.dataTransfer.setData('text/plain', props.node.path)
  e.dataTransfer.effectAllowed = 'move'
  console.log('📤 拖拽开始:', props.node.path)
}

// 消除经过自身时的禁止符号
function onDragOver(e: DragEvent) {
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }
}

// 拖拽到文件夹上：目标路径就是该文件夹
function onDropFolder(e: DragEvent) {
  e.preventDefault()
  if (!e.dataTransfer) return
  const sourcePath = e.dataTransfer.getData('text/plain')
  if (!sourcePath) return
  
  const targetPath = props.node.path
  if (targetPath === sourcePath) return
  if (sourcePath.startsWith(targetPath + '/')) {
    console.warn('⚠️ 不能拖入自己的子文件夹')
    return
  }
  
  console.log('📥 拖拽到文件夹:', sourcePath, '目标:', targetPath)
  emit('move', sourcePath, targetPath)
}

// 拖拽到文件上：目标路径是该文件所在的目录（父级）
function onDropFile(e: DragEvent) {
  e.preventDefault()
  if (!e.dataTransfer) return
  const sourcePath = e.dataTransfer.getData('text/plain')
  if (!sourcePath) return
  
  // 提取父级目录
  const lastSlashIndex = props.node.path.lastIndexOf('/')
  const targetPath = lastSlashIndex !== -1 ? props.node.path.substring(0, lastSlashIndex) : ''

  if (targetPath === sourcePath || sourcePath === props.node.path) return
  
  console.log('📥 拖拽到文件同级，目标目录:', targetPath || '根目录')
  emit('move', sourcePath, targetPath)
}
</script>

<style scoped>
/* 原样式不变 */
.tree-node { list-style: none; margin: 0; padding: 0; }
.folder-wrapper, .file-wrapper { display: flex; align-items: center; padding: 4px 4px 4px 0; border-radius: 4px; cursor: pointer; transition: background 0.15s; }
.folder-wrapper:hover, .file-wrapper:hover { background: rgba(0, 0, 0, 0.03); }
.folder-toggle { cursor: pointer; color: #bbb; font-size: 12px; margin-right: 4px; user-select: none; }
.folder-name, .file-name { flex: 1; color: #bbb; font-size: 14px; padding: 2px 0; }
.folder-name { font-weight: 500; }
.file-name.active { color: #1a1a1a; font-weight: 500; border-left: 3px solid #1a1a1a; padding-left: 6px; }
.btn-delete, .btn-delete-folder { background: none; border: none; color: #ddd; cursor: pointer; font-size: 12px; padding: 0 4px; transition: color 0.15s; }
.btn-delete:hover, .btn-delete-folder:hover { color: #999; }
.children { list-style: none; padding: 0; margin: 0; }
</style>