<!-- src/components/MarkdownEditor.vue -->
<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  filePath: string;
  content: string;
  isLoading?: boolean;
}>();
const emit = defineEmits<{
  (e: 'save', content: string): void;
}>();

const localContent = ref(props.content);

watch(() => props.content, (newVal) => {
  localContent.value = newVal;
});

function handleKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    emit('save', localContent.value);
  }
}
</script>

<template>
  <div class="editor">
    <!-- 空状态 -->
    <div v-if="!filePath" class="placeholder">
      <div class="placeholder-icon">📄</div>
      <p>从左侧文件树选择笔记</p>
    </div>

    <!-- 编辑器 -->
    <div v-else class="editor-wrapper">
      <!-- 极简工具栏：文件名 + 保存按钮 -->
      <div class="toolbar">
        <span class="filename">{{ filePath.split(/[\\/]/).pop() }}</span>
        <button class="save-btn" @click="emit('save', localContent)" :disabled="isLoading">
          {{ isLoading ? '保存中…' : '保存' }}
        </button>
      </div>

      <!-- 文本编辑区 -->
      <textarea 
        v-model="localContent" 
        @keydown="handleKeydown"
        class="textarea"
        spellcheck="false"
        :disabled="isLoading"
        placeholder="在此编辑 Markdown…"
      ></textarea>

      <!-- 如果是非 md 文件，显示提示 -->
      <div v-if="!filePath.endsWith('.md') && !filePath.endsWith('.markdown')" class="non-md-hint">
        <span>⚠️ 预览模式（非 Markdown）</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  height: 100%;
  overflow: hidden;
}

/* === 空状态 === */
.placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #ccc;
  font-weight: 300;
  letter-spacing: 1px;
}
.placeholder-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.4;
}
.placeholder p {
  margin: 0;
  font-size: 15px;
}

/* === 编辑器主体 === */
.editor-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 24px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
  background: #fafafa;
}

.filename {
  font-size: 14px;
  font-weight: 400;
  color: #1a1a1a;
  letter-spacing: 0.5px;
}

.save-btn {
  padding: 6px 18px;
  background: #1a1a1a;
  color: #fff;
  border: none;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 400;
  cursor: pointer;
  transition: opacity 0.2s, background 0.2s;
  letter-spacing: 0.5px;
}
.save-btn:hover:not(:disabled) {
  background: #333;
}
.save-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.textarea {
  flex: 1;
  width: 100%;
  padding: 32px 40px;
  border: none;
  outline: none;
  font-size: 16px;
  font-family: 'SF Mono', 'Menlo', 'Consolas', 'Monaco', 'Liberation Mono', monospace;
  line-height: 1.8;
  color: #1a1a1a;
  background: #ffffff;
  resize: none;
  tab-size: 2;
  min-height: 200px;
}
.textarea:disabled {
  background: #f8f8f8;
  color: #888;
}
.textarea::placeholder {
  color: #ddd;
}

.non-md-hint {
  padding: 6px 24px;
  background: #fafafa;
  border-top: 1px solid #f0f0f0;
  color: #999;
  font-size: 13px;
  flex-shrink: 0;
  letter-spacing: 0.3px;
}

/* 滚动条极简 */
.textarea::-webkit-scrollbar {
  width: 4px;
}
.textarea::-webkit-scrollbar-track {
  background: transparent;
}
.textarea::-webkit-scrollbar-thumb {
  background: #e0e0e0;
  border-radius: 4px;
}
.textarea::-webkit-scrollbar-thumb:hover {
  background: #ccc;
}
</style>