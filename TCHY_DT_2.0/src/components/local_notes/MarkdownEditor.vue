<!-- src/components/local_notes/MarkdownEditor.vue -->
<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import CodeMirrorEditor from './CodeMirrorEditor.vue';
import { marked } from 'marked';

const props = defineProps<{
  filePath: string;
  content: string;
  isLoading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'save', content: string): void;
}>();

const localContent = ref(props.content);
const viewMode = ref<'edit' | 'preview' | 'split'>('edit');

// 同步外部内容变化
watch(() => props.content, (newVal) => {
  localContent.value = newVal;
});

// 保存
function handleSave() {
  emit('save', localContent.value);
}

// 判断是否为 Markdown 文件
const isMarkdown = (path: string) => {
  return path.endsWith('.md') || path.endsWith('.markdown');
};

// 渲染 HTML
const renderedHtml = computed(() => {
  if (!localContent.value) return '';
  return marked(localContent.value, {
    breaks: true,
    gfm: true,
  });
});

// 切换视图模式
function setViewMode(mode: 'edit' | 'preview' | 'split') {
  viewMode.value = mode;
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
      <!-- 工具栏 -->
      <div class="toolbar">
        <span class="filename">{{ filePath.split(/[\\/]/).pop() }}</span>
        <div class="toolbar-actions">
          <!-- 视图切换：纯文字按钮 -->
          <div class="view-toggle">
            <button 
              class="view-btn" 
              :class="{ active: viewMode === 'edit' }"
              @click="setViewMode('edit')"
            >
              编辑
            </button>
            <button 
              class="view-btn" 
              :class="{ active: viewMode === 'preview' }"
              @click="setViewMode('preview')"
            >
              预览
            </button>
            <button 
              class="view-btn" 
              :class="{ active: viewMode === 'split' }"
              @click="setViewMode('split')"
            >
              分屏
            </button>
          </div>

          <span v-if="!isMarkdown(filePath)" class="non-md-badge">只读</span>
          <button class="save-btn" @click="handleSave" :disabled="isLoading">
            {{ isLoading ? '保存中…' : '保存' }}
          </button>
        </div>
      </div>

      <!-- 内容区域 -->
      <div class="content-area">
        <!-- 编辑器面板 -->
        <div 
          class="editor-pane" 
          :style="{ 
            width: viewMode === 'preview' ? '0%' : (viewMode === 'split' ? '50%' : '100%'),
            display: viewMode === 'preview' ? 'none' : 'flex'
          }"
        >
          <CodeMirrorEditor
            v-if="isMarkdown(filePath)"
            v-model="localContent"
            @save="handleSave"
            :readonly="isLoading"
          />
          <div v-else class="non-md-preview">
            <div class="preview-content">
              <span class="preview-icon">📄</span>
              <p>当前文件不是 Markdown 格式</p>
              <p class="preview-hint">仅支持编辑 .md 和 .markdown 文件</p>
            </div>
            <div class="raw-content">
              <pre>{{ localContent }}</pre>
            </div>
          </div>
        </div>

        <!-- 预览面板 -->
        <div 
          v-if="isMarkdown(filePath) && (viewMode === 'preview' || viewMode === 'split')"
          class="preview-pane"
          :style="{ 
            width: viewMode === 'split' ? '50%' : '100%',
            borderLeft: viewMode === 'split' ? '1px solid #f0f0f0' : 'none'
          }"
        >
          <div class="preview-content" v-html="renderedHtml"></div>
        </div>
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

/* === 工具栏 === */
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

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* === 视图切换按钮（纯文字） === */
.view-toggle {
  display: flex;
  gap: 2px;
  background: #f0f0f0;
  border-radius: 6px;
  padding: 3px;
}

.view-btn {
  padding: 4px 14px;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  font-weight: 400;
  color: #888;
  letter-spacing: 0.5px;
  transition: all 0.15s;
}
.view-btn:hover {
  color: #555;
}
.view-btn.active {
  background: #ffffff;
  color: #1a1a1a;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

.non-md-badge {
  font-size: 12px;
  color: #999;
  background: #f0f0f0;
  padding: 2px 12px;
  border-radius: 12px;
  letter-spacing: 0.3px;
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

/* === 内容区域（双列） === */
.content-area {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

.editor-pane {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
  transition: width 0.2s ease;
}

.preview-pane {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
  background: #fafafa;
  transition: width 0.2s ease;
}

/* === 预览内容 === */
.preview-pane .preview-content {
  flex: 1;
  overflow-y: auto;
  padding: 32px 40px;
  font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 16px;
  line-height: 1.8;
  color: #1a1a1a;
}

/* 预览样式（极简） */
.preview-content h1 {
  font-size: 2.2em;
  font-weight: 400;
  margin: 0.8em 0 0.4em;
  letter-spacing: 0.5px;
}
.preview-content h2 {
  font-size: 1.6em;
  font-weight: 400;
  margin: 0.8em 0 0.4em;
  letter-spacing: 0.5px;
}
.preview-content h3 {
  font-size: 1.3em;
  font-weight: 400;
  margin: 0.6em 0 0.3em;
}
.preview-content h4 {
  font-size: 1.1em;
  font-weight: 400;
  margin: 0.6em 0 0.3em;
}
.preview-content p {
  margin: 0.6em 0;
}
.preview-content strong {
  font-weight: 600;
}
.preview-content em {
  font-style: italic;
}
.preview-content code {
  font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
  background: #f0f0f0;
  padding: 0.1em 0.4em;
  border-radius: 3px;
  font-size: 0.9em;
}
.preview-content pre {
  background: #f8f8f8;
  padding: 16px 20px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 0.8em 0;
}
.preview-content pre code {
  background: transparent;
  padding: 0;
  font-size: 14px;
}
.preview-content ul, .preview-content ol {
  padding-left: 24px;
  margin: 0.4em 0;
}
.preview-content blockquote {
  margin: 0.8em 0;
  padding-left: 20px;
  border-left: 3px solid #ddd;
  color: #888;
}
.preview-content a {
  color: #1a1a1a;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.preview-content img {
  max-width: 100%;
  border-radius: 6px;
}
.preview-content hr {
  border: none;
  border-top: 1px solid #f0f0f0;
  margin: 1.6em 0;
}
.preview-content table {
  border-collapse: collapse;
  width: 100%;
  margin: 0.8em 0;
}
.preview-content th, .preview-content td {
  border: 1px solid #e0e0e0;
  padding: 6px 12px;
  text-align: left;
}
.preview-content th {
  background: #f5f5f5;
}

.preview-content::-webkit-scrollbar {
  width: 4px;
}
.preview-content::-webkit-scrollbar-track {
  background: transparent;
}
.preview-content::-webkit-scrollbar-thumb {
  background: #ddd;
  border-radius: 3px;
}
.preview-content::-webkit-scrollbar-thumb:hover {
  background: #ccc;
}

/* === 非 Markdown 文件预览 === */
.non-md-preview {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fafafa;
  overflow: hidden;
}
.non-md-preview .preview-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 40px;
  color: #999;
  border-bottom: 1px solid #f0f0f0;
}
.non-md-preview .preview-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.3;
}
.non-md-preview .preview-content p {
  margin: 4px 0;
  font-size: 15px;
  font-weight: 300;
}
.non-md-preview .preview-hint {
  font-size: 13px;
  color: #bbb;
}
.raw-content {
  flex: 1;
  overflow: auto;
  padding: 20px 24px;
  background: #ffffff;
}
.raw-content pre {
  margin: 0;
  font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
  font-size: 14px;
  line-height: 1.8;
  color: #666;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>