<template>
  <div class="tab-bar">
    <div
      v-for="tab in tabs"
      :key="tab.id"
      class="tab"
      :class="{ active: activeId === tab.id, modified: tab.isModified }"
      @click="emit('switch', tab.id)"
    >
      <span class="tab-title">{{ tab.title }}</span>
      <button class="tab-close" @click.stop="emit('close', tab.id)">✕</button>
    </div>
    <button class="tab-close-all" @click="emit('close-all')" v-if="tabs.length > 1">
      关闭所有
    </button>
  </div>
</template>

<script setup lang="ts">
import type { Tab } from '../types'

defineProps<{
  tabs: Tab[]
  activeId: string
}>()

const emit = defineEmits<{
  (e: 'switch', id: string): void
  (e: 'close', id: string): void
  (e: 'close-all'): void
}>()
</script>

<style scoped>
.tab-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 16px;
}
.tab {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px 4px 12px;
  border-radius: 4px 4px 0 0;
  cursor: pointer;
  background: transparent;
  color: #bbb;
  font-size: 14px;
  transition: background 0.15s, color 0.15s;
  border: 1px solid transparent;
  border-bottom: none;
  position: relative;
}
.tab:hover {
  background: #f5f5f5;
  color: #555;
}
.tab.active {
  background: #ffffff;
  color: #1a1a1a;
  border-color: #f0f0f0;
  border-bottom-color: #ffffff;
}
.tab.modified .tab-title::after {
  content: ' ●';
  color: #e74c3c;
  font-size: 10px;
}
.tab-close {
  background: transparent;
  border: none;
  color: #ddd;
  cursor: pointer;
  font-size: 12px;
  padding: 0 2px;
  transition: color 0.15s;
}
.tab-close:hover {
  color: #e74c3c;
}
.tab-close-all {
  background: transparent;
  border: none;
  color: #bbb;
  cursor: pointer;
  font-size: 12px;
  padding: 4px 8px;
  margin-left: auto;
}
.tab-close-all:hover {
  color: #1a1a1a;
}
</style>