// src/plugins/NoteEditor/composables/useTabs.ts
import { ref, computed } from 'vue'
import type { Tab } from '../types'

export function useTabs() {
  const tabs = ref<Tab[]>([])
  const activeId = ref<string>('')

  const activeTab = computed<Tab | null>(() => {
    if (!activeId.value) return null
    const found = tabs.value.find((tab: Tab) => tab.id === activeId.value)
    return found || null
  })

  function openTab(fileName: string, content: string): void {
    const existing = tabs.value.find((tab: Tab) => tab.fileName === fileName)
    if (existing) {
      activeId.value = existing.id
      return
    }
    const newTab: Tab = {
      id: `tab_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      fileName,
      title: fileName.replace(/\.md$/, ''),
      content,
      isModified: false,
    }
    tabs.value.push(newTab)
    activeId.value = newTab.id
  }

  function closeTab(id: string): void {
    const index = tabs.value.findIndex((tab: Tab) => tab.id === id)
    if (index === -1) return
    const tab = tabs.value[index]
    if (tab.isModified) {
      if (!window.confirm(`有未保存的修改，确定关闭 "${tab.title}" 吗？`)) return
    }
    tabs.value.splice(index, 1)
    if (activeId.value === id) {
      activeId.value = tabs.value[index]?.id || tabs.value[0]?.id || ''
    }
  }

  function updateContent(id: string, content: string): void {
    const tab = tabs.value.find((tab: Tab) => tab.id === id)
    if (tab) {
      tab.content = content
      tab.isModified = true
    }
  }

  function saveTab(id: string): void {
    const tab = tabs.value.find((tab: Tab) => tab.id === id)
    if (tab) {
      tab.isModified = false
    }
  }

  function closeAllTabs(): void {
    const unsaved = tabs.value.some((tab: Tab) => tab.isModified)
    if (unsaved && !window.confirm('有未保存的修改，确定全部关闭吗？')) return
    tabs.value = []
    activeId.value = ''
  }

  function getTabByFileName(fileName: string): Tab | null {
    return tabs.value.find((tab: Tab) => tab.fileName === fileName) || null
  }

  return {
    tabs,
    activeId,
    activeTab,
    openTab,
    closeTab,
    updateContent,
    saveTab,
    closeAllTabs,
    getTabByFileName,
  }
}