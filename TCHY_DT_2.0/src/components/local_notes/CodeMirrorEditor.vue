<!-- src/components/local_notes/CodeMirrorEditor.vue -->
<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted, nextTick } from 'vue';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';

const myHighlightStyle = HighlightStyle.define([
  { tag: tags.heading1, fontSize: '1.8em', fontWeight: 'bold', color: '#1a1a1a' },
  { tag: tags.heading2, fontSize: '1.5em', fontWeight: 'bold', color: '#1a1a1a' },
  { tag: tags.heading3, fontSize: '1.3em', fontWeight: 'bold', color: '#1a1a1a' },
  { tag: tags.heading4, fontSize: '1.1em', fontWeight: 'bold', color: '#1a1a1a' },
  { tag: tags.heading5, fontSize: '1.0em', fontWeight: 'bold', color: '#1a1a1a' },
  { tag: tags.heading6, fontSize: '0.9em', fontWeight: 'bold', color: '#1a1a1a' },
  { tag: tags.strong, fontWeight: 'bold', color: '#1a1a1a' },
  { tag: tags.emphasis, fontStyle: 'italic', color: '#1a1a1a' },
  { tag: tags.monospace, fontFamily: 'monospace', backgroundColor: '#f0f0f0', padding: '0 4px', borderRadius: '3px' },
  { tag: tags.keyword, color: '#0077aa' },
  { tag: tags.string, color: '#aa4411' },
  { tag: tags.comment, color: '#888888' },
  { tag: tags.link, color: '#0077aa', textDecoration: 'underline' },
  { tag: tags.quote, color: '#666666', fontStyle: 'italic' },
  { tag: tags.list, color: '#888888' },
]);

const props = defineProps<{
  modelValue: string;
  readonly?: boolean;
  allMarkdownPaths?: string[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'save'): void;
  (e: 'navigate-to-file', filePath: string): void;
}>();

const editorRef = ref<HTMLElement | null>(null);
let view: EditorView | null = null;

// ===== 补全弹窗 =====
const showPopup = ref(false);
const popupItems = ref<string[]>([]);
const popupFilter = ref('');
const popupSelectedIndex = ref(0);
const popupPosition = ref({ top: 0, left: 0 });
const popupInputRef = ref<HTMLInputElement | null>(null);
let isInserting = false;

// ===== 获取所有文件名 =====
function getAllNoteNames(): string[] {
  const paths = props.allMarkdownPaths || [];
  if (paths.length === 0) return [];
  return paths
    .map(p => {
      const name = p.split(/[\\/]/).pop() || '';
      return name.replace(/\.md$/i, '');
    })
    .filter(name => name.length > 0);
}

function searchNotes(query: string): string[] {
  const all = getAllNoteNames();
  if (!query || !query.trim()) return all.slice(0, 30);
  const q = query.toLowerCase().trim();
  return all.filter(name => name.toLowerCase().includes(q)).slice(0, 50);
}

// ===== 从文件名查找路径 =====
function findNotePathByName(noteName: string): string | null {
  const paths = props.allMarkdownPaths || [];
  // 精确匹配
  const exact = paths.find(p => {
    const name = p.split(/[\\/]/).pop()?.replace(/\.md$/i, '') || '';
    return name === noteName;
  });
  if (exact) return exact;
  // 忽略大小写匹配
  const lowerName = noteName.toLowerCase();
  return paths.find(p => {
    const name = p.split(/[\\/]/).pop()?.replace(/\.md$/i, '')?.toLowerCase() || '';
    return name === lowerName;
  }) || null;
}

// ===== 触发检测 =====
function checkWikiTrigger(editorView: EditorView): boolean {
  const pos = editorView.state.selection.main.head;
  if (pos < 2) return false;
  const text = editorView.state.doc.toString();
  return text.substring(pos - 2, pos) === '[[' && !showPopup.value;
}

// ===== 获取光标位置 =====
function getCursorPosition(editorView: EditorView): { top: number; left: number } | null {
  const pos = editorView.state.selection.main.head;
  const coords = editorView.coordsAtPos(pos);
  if (!coords) return null;
  // coords 已经是相对于视口的坐标，直接用 bottom 和 left
  return {
    top: coords.bottom + 4,  // 光标下方 4px
    left: coords.left,
  };
}

// ===== 打开弹窗 =====
function openPopup(editorView: EditorView) {
  const pos = getCursorPosition(editorView);
  if (!pos) return;
  const allNames = getAllNoteNames();
  if (allNames.length === 0) return;
  popupFilter.value = '';
  popupItems.value = allNames.slice(0, 30);
  popupSelectedIndex.value = 0;
  popupPosition.value = pos;
  showPopup.value = true;
  nextTick(() => {
    if (popupInputRef.value) {
      popupInputRef.value.focus();
      popupInputRef.value.select();
    }
  });
}

// ===== 关闭弹窗 =====
function closePopup() {
  showPopup.value = false;
  popupItems.value = [];
  popupFilter.value = '';
}

// ===== 插入双链 =====
function insertWikiLink(fileName: string) {
  if (!view || isInserting) return;
  isInserting = true;
  
  try {
    const pos = view.state.selection.main.head;
    const text = view.state.doc.toString();
    
    let start = -1;
    for (let i = pos - 1; i >= 0; i--) {
      if (text[i] === '[' && text[i - 1] === '[') {
        start = i - 1;
        break;
      }
    }
    
    const insertText = `[[${fileName}]]`;
    
    if (start >= 0) {
      view.dispatch({
        changes: { from: start, to: pos, insert: insertText },
        selection: { anchor: start + insertText.length },
      });
    } else {
      view.dispatch({
        changes: { from: pos, to: pos, insert: insertText },
        selection: { anchor: pos + insertText.length },
      });
    }
  } catch (err) {
    console.error('[双链] 插入失败:', err);
  } finally {
    isInserting = false;
    closePopup();
    nextTick(() => {
      if (view) view.focus();
    });
  }
}

// ===== 选择补全项 =====
function selectItem(fileName: string) {
  insertWikiLink(fileName);
}

// ===== 键盘事件 =====
function onPopupKeydown(e: KeyboardEvent) {
  if (!showPopup.value) return;
  
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    popupSelectedIndex.value = Math.min(popupSelectedIndex.value + 1, popupItems.value.length - 1);
    scrollToSelected();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    popupSelectedIndex.value = Math.max(popupSelectedIndex.value - 1, 0);
    scrollToSelected();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const item = popupItems.value[popupSelectedIndex.value];
    if (item) selectItem(item);
  } else if (e.key === 'Escape') {
    e.preventDefault();
    closePopup();
    if (view) view.focus();
  } else if (e.key === 'Tab') {
    e.preventDefault();
    const item = popupItems.value[popupSelectedIndex.value];
    if (item) selectItem(item);
  }
}

function scrollToSelected() {
  nextTick(() => {
    const items = document.querySelectorAll('.popup-item');
    const active = items[popupSelectedIndex.value] as HTMLElement;
    if (active) active.scrollIntoView({ block: 'nearest' });
  });
}

function onPopupSearch(e: Event) {
  const val = (e.target as HTMLInputElement).value;
  popupFilter.value = val;
  popupItems.value = searchNotes(val);
  popupSelectedIndex.value = 0;
}

// ===== 编辑模式下点击双链跳转（Ctrl+点击 或 Cmd+点击）=====
function handleEditorClick(e: MouseEvent) {
  // 检测是否按下了 Ctrl (Windows) 或 Cmd (Mac)
  const isModifierPressed = e.ctrlKey || e.metaKey;
  if (!isModifierPressed) return;
  
  if (!view) return;
  
  // 获取点击位置对应的文档位置
  const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
  if (pos === null) return;
  
  const text = view.state.doc.toString();
  
  // 从点击位置向前查找 "[[" 和对应的 "]]"
  let start = -1;
  let end = -1;
  
  // 查找 "[["
  for (let i = pos; i >= 0; i--) {
    if (text[i] === '[' && text[i + 1] === '[') {
      start = i;
      break;
    }
  }
  if (start === -1) return;
  
  // 查找 "]]"
  for (let i = pos; i < text.length; i++) {
    if (text[i] === ']' && text[i + 1] === ']') {
      end = i + 1;
      break;
    }
  }
  if (end === -1) return;
  
  // 提取笔记名
  const noteName = text.substring(start + 2, end - 1).trim();
  if (!noteName) return;
  
  // 查找笔记路径
  const path = findNotePathByName(noteName);
  if (path) {
    e.preventDefault();
    console.log('[双链] 编辑模式跳转:', noteName, '→', path);
    emit('navigate-to-file', path);
  } else {
    console.warn('[双链] 笔记不存在:', noteName);
  }
}

// ===== 创建编辑器 =====
function createEditor() {
  if (!editorRef.value) return;

  const extensions: any[] = [
    lineNumbers(),
    history(),
    markdown(),
    syntaxHighlighting(myHighlightStyle),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    keymap.of([
      {
        key: 'Mod-s',
        run: () => {
          emit('save');
          return true;
        },
        preventDefault: true,
      },
    ]),
    EditorView.updateListener.of((update: any) => {
      if (update.docChanged && view && !isInserting && !showPopup.value) {
        setTimeout(() => {
          if (view && !showPopup.value && checkWikiTrigger(view)) {
            openPopup(view);
          }
        }, 5);
      }
      if (update.docChanged) {
        const content = update.state.doc.toString();
        emit('update:modelValue', content);
      }
    }),
  ];

  if (props.readonly) {
    extensions.push(EditorState.readOnly.of(true));
  }

  const state = EditorState.create({
    doc: props.modelValue,
    extensions,
  });

  view = new EditorView({
    state,
    parent: editorRef.value,
  });

  // 监听编辑器点击（支持 Ctrl+点击跳转）
  view.dom.addEventListener('click', handleEditorClick);

  view.dom.addEventListener('keydown', (e: KeyboardEvent) => {
    if (showPopup.value) return;
    if (e.key === '[') {
      setTimeout(() => {
        if (view && !showPopup.value && checkWikiTrigger(view)) {
          openPopup(view);
        }
      }, 10);
    }
  });

  // 显示提示：按住 Ctrl/Cmd + 点击双链可跳转
  const statusBar = document.createElement('div');
  statusBar.className = 'wiki-status-hint';
  statusBar.textContent = '💡 按住 Ctrl/Cmd + 点击 [[双链]] 可跳转';
  statusBar.style.cssText = `
    position: absolute;
    bottom: 8px;
    right: 16px;
    font-size: 12px;
    color: #bbb;
    pointer-events: none;
    z-index: 5;
    font-family: -apple-system, 'PingFang SC', sans-serif;
    letter-spacing: 0.3px;
    background: rgba(255,255,255,0.8);
    padding: 2px 10px;
    border-radius: 12px;
    backdrop-filter: blur(4px);
  `;
  editorRef.value?.appendChild(statusBar);

  nextTick(() => {
    if (view) view.focus();
  });
}

// ===== 点击外部关闭 =====
function handleClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement;
  const popup = document.getElementById('wiki-popup');
  if (popup && !popup.contains(target)) {
    const editor = editorRef.value;
    if (editor && editor.contains(target)) {
      return;
    }
    closePopup();
  }
}

// ===== 生命周期 =====
onMounted(() => {
  createEditor();
  document.addEventListener('mousedown', handleClickOutside);
});

watch(() => props.modelValue, (newVal) => {
  if (view) {
    const current = view.state.doc.toString();
    if (newVal !== current) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: newVal },
      });
    }
  }
});

watch(() => props.readonly, () => {
  if (view) {
    view.destroy();
    view = null;
  }
  nextTick(() => {
    createEditor();
  });
});

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside);
  if (view) {
    view.dom.removeEventListener('click', handleEditorClick);
    view.destroy();
    view = null;
  }
});

defineExpose({
  insertWikiLink,
  closePopup,
});
</script>

<template>
  <div style="position: relative; width: 100%; height: 100%;">
    <div ref="editorRef" class="codemirror-editor"></div>
    
    <!-- 补全弹窗 -->
    <div 
      v-if="showPopup"
      id="wiki-popup"
      class="wiki-popup"
      :style="{ top: popupPosition.top + 'px', left: popupPosition.left + 'px' }"
    >
      <div class="popup-search">
        <input 
          ref="popupInputRef"
          type="text"
          class="popup-input"
          :value="popupFilter"
          @input="onPopupSearch"
          @keydown="onPopupKeydown"
          placeholder="搜索笔记..."
        />
      </div>
      <div class="popup-list">
        <div
          v-for="(item, index) in popupItems"
          :key="item"
          class="popup-item"
          :class="{ active: index === popupSelectedIndex }"
          @click="selectItem(item)"
          @mouseenter="popupSelectedIndex = index"
        >
          <span class="popup-icon">📄</span>
          <span class="popup-name">{{ item }}</span>
        </div>
        <div v-if="popupItems.length === 0" class="popup-empty">
          <span>没有找到匹配的笔记</span>
          <span class="popup-hint">输入文件名搜索</span>
        </div>
      </div>
      <div class="popup-footer">
        <span>Enter 选择</span>
        <span>Esc 关闭</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.codemirror-editor {
  flex: 1;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #ffffff;
  position: relative;
}

:deep(.cm-editor) {
  height: 100%;
  font-size: 15px;
  font-family: 'SF Mono', 'Menlo', 'Consolas', 'Monaco', monospace;
  line-height: 1.8;
}

:deep(.cm-content) {
  padding: 24px 28px 48px 28px;
  caret-color: #1a1a1a;
}

:deep(.cm-line) {
  padding: 0;
}

:deep(.cm-focused) {
  outline: none;
}

:deep(.cm-gutters) {
  background-color: #fafafa;
  border-right: 1px solid #f0f0f0;
  color: #bbb;
}

:deep(.cm-activeLineGutter) {
  background-color: #f0f0f0;
}

:deep(.cm-editor.cm-focused .cm-selectionBackground) {
  background-color: #d0d0d0;
}

:deep(.cm-content .cm-codeblock) {
  background-color: #f8f8f8;
  padding: 4px 8px;
  border-radius: 4px;
}

/* 编辑模式下双链高亮（提示可点击） */
:deep(.cm-content .cm-wiki-link) {
  color: #0066cc;
  background: rgba(0, 102, 204, 0.06);
  border-radius: 3px;
  padding: 0 2px;
  cursor: default;
  font-weight: 500;
}

:deep(.cm-content .cm-wiki-link:hover) {
  background: rgba(0, 102, 204, 0.14);
}

.wiki-popup {
  position: fixed;
  z-index: 99999;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  border: 1px solid #e8e8e8;
  min-width: 280px;
  max-width: 420px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.popup-search {
  padding: 8px 12px;
  border-bottom: 1px solid #f0f0f0;
}

.popup-input {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 13px;
  outline: none;
  background: #fafafa;
  color: #1a1a1a;
  box-sizing: border-box;
}
.popup-input:focus {
  border-color: #1a1a1a;
  background: #ffffff;
}

.popup-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
  max-height: 240px;
}

.popup-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 14px;
  cursor: pointer;
  transition: background 0.1s;
}
.popup-item:hover,
.popup-item.active {
  background: #f0f0f0;
}

.popup-icon {
  font-size: 13px;
  opacity: 0.5;
  flex-shrink: 0;
}

.popup-name {
  font-size: 14px;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.popup-empty {
  padding: 24px 16px;
  text-align: center;
  color: #bbb;
  font-size: 13px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.popup-hint {
  font-size: 12px;
  color: #ccc;
}

.popup-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 6px 14px;
  border-top: 1px solid #f0f0f0;
  font-size: 11px;
  color: #bbb;
}

.popup-list::-webkit-scrollbar {
  width: 3px;
}
.popup-list::-webkit-scrollbar-track {
  background: transparent;
}
.popup-list::-webkit-scrollbar-thumb {
  background: #e0e0e0;
  border-radius: 3px;
}
</style>