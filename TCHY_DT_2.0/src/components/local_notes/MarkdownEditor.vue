<!-- src/components/local_notes/MarkdownEditor.vue -->
<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import CodeMirrorEditor from './CodeMirrorEditor.vue';
import { marked } from 'marked';
import { renderBiLinks, findNoteByName } from '@/utils/biLink';

const props = defineProps<{
  filePath: string;
  content: string;
  isLoading?: boolean;
  allMarkdownPaths?: string[];
  backlinks?: string[]; // 反向链接文件路径列表
}>();

const emit = defineEmits<{
  (e: 'save', content: string): void;
  (e: 'navigate-to-file', filePath: string): void;
  (e: 'switch-to-graph'): void; // 新增：切换到图谱视图
}>();

const localContent = ref(props.content);
const viewMode = ref<'edit' | 'preview' | 'split'>('edit');

watch(() => props.content, (newVal) => {
  localContent.value = newVal;
});

function handleSave() {
  emit('save', localContent.value);
}

const isMarkdown = (path: string) => {
  return path.endsWith('.md') || path.endsWith('.markdown');
};

// ===== 双链渲染 =====
const renderer = new marked.Renderer();

renderer.paragraph = (token: any) => {
  const text = token.text || '';
  const allPaths = props.allMarkdownPaths || [];
  const getNotePath = (name: string) => findNoteByName(name, allPaths);
  const rendered = renderBiLinks(text, getNotePath);
  return `<p>${rendered}</p>`;
};

renderer.text = (token: any) => {
  const text = token.text || '';
  const allPaths = props.allMarkdownPaths || [];
  const getNotePath = (name: string) => findNoteByName(name, allPaths);
  return renderBiLinks(text, getNotePath);
};

marked.use({ renderer });

const renderedHtml = computed(() => {
  if (!localContent.value) return '';
  return marked(localContent.value, {
    breaks: true,
    gfm: true,
  });
});

// ===== 预览模式点击双链跳转 =====
function handleBiLinkClick(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (target.classList.contains('bi-link') || target.classList.contains('bi-link-broken')) {
    event.preventDefault();
    const noteName = target.dataset.note;
    if (!noteName) return;
    const allPaths = props.allMarkdownPaths || [];
    const path = findNoteByName(noteName, allPaths);
    if (path) {
      emit('navigate-to-file', path);
    } else {
      console.warn(`笔记「${noteName}」不存在`);
    }
  }
}

// ===== 点击反向链接跳转 =====
function handleBacklinkClick(filePath: string) {
  emit('navigate-to-file', filePath);
}

// ===== 获取文件名（不含扩展名）=====
function getFileName(filePath: string): string {
  const name = filePath.split(/[\\/]/).pop() || filePath;
  return name.replace(/\.md$/i, '');
}

function setViewMode(mode: 'edit' | 'preview' | 'split') {
  viewMode.value = mode;
}
</script>

<template>
  <div class="editor">
    <div v-if="!filePath" class="placeholder">
      <div class="placeholder-icon">📄</div>
      <p>从左侧文件树选择笔记</p>
    </div>

    <div v-else class="editor-wrapper">
      <div class="toolbar">
        <span class="filename">{{ filePath.split(/[\\/]/).pop() }}</span>
        <div class="toolbar-actions">
          <div class="view-toggle">
            <button class="view-btn" :class="{ active: viewMode === 'edit' }" @click="setViewMode('edit')">编辑</button>
            <button class="view-btn" :class="{ active: viewMode === 'preview' }" @click="setViewMode('preview')">预览</button>
            <button class="view-btn" :class="{ active: viewMode === 'split' }" @click="setViewMode('split')">分屏</button>
            <!-- 图谱切换按钮 -->
            <button class="view-btn graph-btn" @click="$emit('switch-to-graph')" title="关系图谱">🕸</button>
          </div>
          <span v-if="!isMarkdown(filePath)" class="non-md-badge">只读</span>
          <button class="save-btn" @click="handleSave" :disabled="isLoading">
            {{ isLoading ? '保存中…' : '保存' }}
          </button>
        </div>
      </div>

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
            :all-markdown-paths="props.allMarkdownPaths || []"
            @save="handleSave"
            @navigate-to-file="(path) => emit('navigate-to-file', path)"
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
          <div class="preview-content" v-html="renderedHtml" @click="handleBiLinkClick"></div>
          
          <!-- 反向链接区域 -->
          <div v-if="backlinks && backlinks.length > 0" class="backlinks-section">
            <div class="backlinks-header">
              <span class="backlinks-title">↩ 反向链接</span>
              <span class="backlinks-count">{{ backlinks.length }}</span>
            </div>
            <ul class="backlinks-list">
              <li v-for="(linkPath, idx) in backlinks" :key="idx" class="backlinks-item">
                <a href="#" @click.prevent="handleBacklinkClick(linkPath)" class="backlinks-link">
                  {{ getFileName(linkPath) }}
                </a>
              </li>
            </ul>
          </div>
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
.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
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
.graph-btn {
  font-size: 16px;
  padding: 4px 10px;
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
.preview-pane .preview-content {
  flex: 1;
  overflow-y: auto;
  padding: 32px 40px;
  font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 16px;
  line-height: 1.8;
  color: #1a1a1a;
  border-bottom: 1px solid #f0f0f0;
}
.preview-content :deep(.bi-link) {
  color: #0066cc;
  text-decoration: none;
  background: rgba(0,102,204,0.08);
  padding: 0 4px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background .15s;
}
.preview-content :deep(.bi-link:hover) {
  background: rgba(0,102,204,0.18);
  text-decoration: underline;
}
.preview-content :deep(.bi-link-broken) {
  color: #cc3333;
  background: rgba(204,51,51,0.08);
  padding: 0 4px;
  border-radius: 4px;
  cursor: default;
  text-decoration: line-through;
  opacity: .7;
}
/* 预览其他样式（标题、段落等） */
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
.preview-content ul,
.preview-content ol {
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
.preview-content th,
.preview-content td {
  border: 1px solid #e0e0e0;
  padding: 6px 12px;
  text-align: left;
}
.preview-content th {
  background: #f5f5f5;
}

/* 反向链接样式 */
.backlinks-section {
  flex-shrink: 0;
  padding: 16px 40px 24px 40px;
  background: #ffffff;
  border-top: 1px solid #f0f0f0;
}
.backlinks-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.backlinks-title {
  font-size: 13px;
  font-weight: 400;
  color: #888;
  letter-spacing: 0.5px;
}
.backlinks-count {
  font-size: 12px;
  color: #bbb;
  background: #f0f0f0;
  padding: 0 8px;
  border-radius: 10px;
}
.backlinks-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.backlinks-item {
  padding: 4px 0;
}
.backlinks-link {
  color: #0066cc;
  text-decoration: none;
  font-size: 14px;
  font-weight: 400;
  cursor: pointer;
  transition: color 0.15s;
}
.backlinks-link:hover {
  text-decoration: underline;
  color: #004499;
}

/* 滚动条 */
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

/* 非 Markdown 预览 */
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