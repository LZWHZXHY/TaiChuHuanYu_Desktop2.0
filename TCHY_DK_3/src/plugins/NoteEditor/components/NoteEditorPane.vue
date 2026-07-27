<template>
  <section class="editor-pane">
    <!-- Tab 栏 -->
    <TabBar
      :tabs="tabs"
      :activeId="activeId"
      @switch="switchTab"
      @close="closeTab"
      @close-all="closeAllTabs"
    />

    <!-- Tab 内容 -->
    <TabContent
      :tab="activeTab"
      @update="onUpdate"
      @save="onManualSave"
      @keydown-save="onManualSave"
    />
  </section>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import { useTabs } from '../composables/useTabs'
import { useNotes } from '../composables/useNotes'
import TabBar from './TabBar.vue'
import TabContent from './TabContent.vue'

const { tabs, activeId, activeTab, openTab, closeTab, closeAllTabs, updateContent, saveTab, getTabByFileName } = useTabs()
const { saveNote } = useNotes()

const emit = defineEmits<{
  (e: 'rename', oldName: string, newName: string): void
}>()

// ---------- 保存相关 ----------
let saveTimer: ReturnType<typeof setTimeout> | null = null
const SAVE_DELAY = 500 // 防抖延迟（毫秒）

async function performSave(fileName: string, content: string): Promise<boolean> {
  try {
    await saveNote(fileName, content)
    // 更新 Tab 状态
    const tab = getTabByFileName(fileName)
    if (tab) {
      saveTab(tab.id)
    }
    console.log(`✅ 笔记已保存: ${fileName}`)
    return true
  } catch (error) {
    console.error('❌ 保存失败:', error)
    return false
  }
}

// ---------- 自动保存（防抖） ----------
function triggerAutoSave(fileName: string, content: string) {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  saveTimer = setTimeout(() => {
    performSave(fileName, content)
    saveTimer = null
  }, SAVE_DELAY)
}

// ---------- 手动保存（立即执行） ----------
async function onManualSave() {
  if (!activeTab.value) return
  const { fileName, content } = activeTab.value
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  await performSave(fileName, content)
}

// ---------- 事件处理 ----------
function switchTab(id: string) {
  // 切换前，如果有未保存的内容，先保存当前 Tab
  if (activeTab.value && activeTab.value.isModified) {
    const { fileName, content } = activeTab.value
    performSave(fileName, content)
  }
  activeId.value = id
}

function onUpdate(content: string, title: string) {
  if (!activeTab.value) return

  // 更新内容
  updateContent(activeTab.value.id, content)

  // 如果标题变化，触发重命名（由父组件处理）
  const newFileName = title + '.md'
  if (activeTab.value.fileName !== newFileName) {
    emit('rename', activeTab.value.fileName, newFileName)
    return // 重命名由父组件处理，不触发自动保存
  }

  // 触发自动保存
  triggerAutoSave(activeTab.value.fileName, content)
}

// ---------- 键盘快捷键（Ctrl+S） ----------
function handleKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    onManualSave()
  }
}

// ---------- 生命周期 ----------
onBeforeUnmount(() => {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
})

// 监听全局键盘事件
document.addEventListener('keydown', handleKeydown)

// 暴露方法给父组件
defineExpose({
  openTab,
  closeTab,
  closeAllTabs,
  tabs,
  activeId,
  activeTab,
  getTabByFileName,
  onManualSave, // 允许父组件调用手动保存
})
</script>

<style scoped>
.editor-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
}
</style>