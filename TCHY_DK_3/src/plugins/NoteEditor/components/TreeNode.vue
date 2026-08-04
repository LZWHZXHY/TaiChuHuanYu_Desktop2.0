<template>
  <li class="tree-node" :style="{ paddingLeft: level * 16 + 'px' }">
    <!-- 文件夹 -->
    <div
      v-if="node.is_folder"
      class="folder-wrapper"
      :data-path="node.path"
      @mousedown="onMouseDown($event, node.path, true)"
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
      :data-path="node.path"
      @mousedown="onMouseDown($event, node.path, false)"
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
import { ref, onBeforeUnmount } from 'vue'
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
const isDragging = ref(false)
let dragData = { source: '', isFolder: false }

function toggle() {
  if (props.node.is_folder) expanded.value = !expanded.value
}

// ---------- 鼠标模拟拖拽 ----------
function onMouseDown(e: MouseEvent, path: string, isFolder: boolean) {
  if (e.button !== 0) return
  if (isFolder) {
    // 文件夹只能作为拖拽目标，不能作为源拖出
    // 但我们要允许从文件夹拖出，所以这里不拦截
  }
  // 只有非文件夹才能被拖拽，但为了完整，文件夹也可以拖（实际场景不需要）
  // 我们允许拖拽文件
  if (isFolder) return // 文件夹不可拖拽
  dragData.source = path
  dragData.isFolder = isFolder
  isDragging.value = true

  // 创建跟随鼠标的幽灵元素
  const ghost = document.createElement('div')
  ghost.id = 'drag-ghost'
  ghost.textContent = path.split('/').pop() || path
  ghost.style.cssText = `
    position: fixed;
    padding: 4px 12px;
    background: #1a1a1a;
    color: white;
    border-radius: 4px;
    font-size: 13px;
    pointer-events: none;
    z-index: 9999;
    opacity: 0.85;
    transform: translate(-50%, -50%);
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  `
  document.body.appendChild(ghost)
  ghost.style.left = e.clientX + 'px'
  ghost.style.top = e.clientY + 'px'

  // 添加全局监听
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)

  // 阻止文本选择
  document.body.style.userSelect = 'none'
}

function onMouseMove(e: MouseEvent) {
  if (!isDragging.value) return
  const ghost = document.getElementById('drag-ghost')
  if (ghost) {
    ghost.style.left = e.clientX + 'px'
    ghost.style.top = e.clientY + 'px'
  }

  // 检测鼠标下方的元素
  const target = document.elementFromPoint(e.clientX, e.clientY)
  if (target) {
    const folderEl = target.closest('.folder-wrapper')
    // 高亮文件夹
    document.querySelectorAll('.folder-wrapper.drag-over').forEach(el => {
      el.classList.remove('drag-over')
    })
    if (folderEl) {
      folderEl.classList.add('drag-over')
    }
  }
}

function onMouseUp(e: MouseEvent) {
  if (!isDragging.value) return
  isDragging.value = false

  // 移除幽灵元素
  const ghost = document.getElementById('drag-ghost')
  if (ghost) ghost.remove()

  // 移除所有高亮
  document.querySelectorAll('.folder-wrapper.drag-over').forEach(el => {
    el.classList.remove('drag-over')
  })

  // 检测鼠标下方的元素
  const target = document.elementFromPoint(e.clientX, e.clientY)
  if (target) {
    const folderEl = target.closest('.folder-wrapper')
    if (folderEl) {
      const targetPath = folderEl.getAttribute('data-path')
      if (targetPath && targetPath !== dragData.source) {
        // 防止拖入自己的子文件夹
        if (!dragData.source.startsWith(targetPath + '/')) {
          emit('move', dragData.source, targetPath)
        }
      }
    }
  }

  // 移除全局监听
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
  document.body.style.userSelect = ''

  dragData = { source: '', isFolder: false }
}

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
})
</script>

<style scoped>
.tree-node {
  list-style: none;
  margin: 0;
  padding: 0;
}

.folder-wrapper,
.file-wrapper {
  display: flex;
  align-items: center;
  padding: 4px 4px 4px 0;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.folder-wrapper:hover,
.file-wrapper:hover {
  background: rgba(0, 0, 0, 0.03);
}

.folder-wrapper.drag-over {
  background: rgba(0, 0, 0, 0.08);
  border: 2px dashed #1a1a1a;
  border-radius: 4px;
}

.folder-toggle {
  cursor: pointer;
  color: #bbb;
  font-size: 12px;
  margin-right: 4px;
  user-select: none;
}

.folder-name,
.file-name {
  flex: 1;
  color: #bbb;
  font-size: 14px;
  padding: 2px 0;
}

.folder-name {
  font-weight: 500;
}

.file-name.active {
  color: #1a1a1a;
  font-weight: 500;
  border-left: 3px solid #1a1a1a;
  padding-left: 6px;
}

.btn-delete,
.btn-delete-folder {
  background: none;
  border: none;
  color: #ddd;
  cursor: pointer;
  font-size: 12px;
  padding: 0 4px;
  transition: color 0.15s;
}

.btn-delete:hover,
.btn-delete-folder:hover {
  color: #999;
}

.children {
  list-style: none;
  padding: 0;
  margin: 0;
}
</style>