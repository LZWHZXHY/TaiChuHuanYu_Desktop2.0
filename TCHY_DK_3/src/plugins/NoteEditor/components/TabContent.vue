<template>
  <div v-if="tab" class="tab-content">
    <div class="editor-header">
      <input
        v-model="localTitle"
        placeholder="标题"
        class="title-input"
        @blur="updateTitle"
        @keydown.ctrl.s.prevent="$emit('save')"
        @keydown.meta.s.prevent="$emit('save')"
      />
    </div>
    <div class="editor-body">
      <textarea
        v-model="localContent"
        placeholder="写点什么..."
        class="content-textarea"
        @input="emitUpdate"
        @keydown.ctrl.s.prevent="$emit('save')"
        @keydown.meta.s.prevent="$emit('save')"
      ></textarea>
      <div class="preview">
        <span class="preview-label">预览</span>
        <div class="preview-content">{{ localContent || '空' }}</div>
      </div>
    </div>
  </div>
  <div v-else class="empty-state">
    <p>选择或新建一篇笔记</p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Tab } from '../types'

const props = defineProps<{
  tab: Tab | null
}>()

const emit = defineEmits<{
  (e: 'update', content: string, title: string): void
  (e: 'save'): void
}>()

const localTitle = ref('')
const localContent = ref('')

watch(() => props.tab, (newTab) => {
  if (newTab) {
    localTitle.value = newTab.title
    localContent.value = newTab.content
  }
}, { immediate: true })

function emitUpdate() {
  emit('update', localContent.value, localTitle.value)
}

function updateTitle() {
  emit('update', localContent.value, localTitle.value)
}
</script>

<style scoped>
/* 样式不变 */
.tab-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.editor-header {
  margin-bottom: 16px;
}
.title-input {
  width: 100%;
  font-size: 20px;
  font-weight: 500;
  border: none;
  border-bottom: 1px solid #f0f0f0;
  outline: none;
  padding: 4px 0;
  background: transparent;
  transition: border-color 0.3s ease;
  color: #1a1a1a;
}
.title-input:focus {
  border-bottom-color: #1a1a1a;
}
.editor-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.content-textarea {
  flex: 2;
  resize: none;
  border: none;
  padding: 0;
  font-size: 14px;
  line-height: 1.8;
  outline: none;
  background: transparent;
  min-height: 180px;
  color: #1a1a1a;
}
.content-textarea::placeholder {
  color: #ddd;
}
.preview {
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}
.preview-label {
  font-size: 12px;
  color: #ddd;
  letter-spacing: 0.3px;
}
.preview-content {
  margin-top: 4px;
  font-size: 14px;
  color: #999;
  white-space: pre-wrap;
  line-height: 1.8;
}
.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ddd;
  font-size: 14px;
}
</style>