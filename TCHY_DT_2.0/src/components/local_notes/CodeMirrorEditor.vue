<!-- src/components/CodeMirrorEditor.vue -->
<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted, nextTick } from 'vue';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';

// ===== 自定义高亮样式 =====
const myHighlightStyle = HighlightStyle.define([
  // 标题
  { tag: tags.heading1, fontSize: '1.8em', fontWeight: 'bold', color: '#1a1a1a' },
  { tag: tags.heading2, fontSize: '1.5em', fontWeight: 'bold', color: '#1a1a1a' },
  { tag: tags.heading3, fontSize: '1.3em', fontWeight: 'bold', color: '#1a1a1a' },
  { tag: tags.heading4, fontSize: '1.1em', fontWeight: 'bold', color: '#1a1a1a' },
  { tag: tags.heading5, fontSize: '1.0em', fontWeight: 'bold', color: '#1a1a1a' },
  { tag: tags.heading6, fontSize: '0.9em', fontWeight: 'bold', color: '#1a1a1a' },
  
  // 粗体、斜体
  { tag: tags.strong, fontWeight: 'bold', color: '#1a1a1a' },
  { tag: tags.emphasis, fontStyle: 'italic', color: '#1a1a1a' },
  
  // 行内代码
  { tag: tags.monospace, fontFamily: 'monospace', backgroundColor: '#f0f0f0', padding: '0 4px', borderRadius: '3px' },
  
  // 代码块（由 markdown 扩展提供语言标签）
  { tag: tags.keyword, color: '#0077aa' },
  { tag: tags.string, color: '#aa4411' },
  { tag: tags.comment, color: '#888888' },
  
  // 链接
  { tag: tags.link, color: '#0077aa', textDecoration: 'underline' },
  
  // 引用
  { tag: tags.quote, color: '#666666', fontStyle: 'italic' },
  
  // 列表标记（– 等）
  { tag: tags.list, color: '#888888' },
]);

const props = defineProps<{
  modelValue: string;
  readonly?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'save'): void;
}>();

const editorRef = ref<HTMLElement | null>(null);
let view: EditorView | null = null;

const saveKeymap = keymap.of([
  {
    key: 'Mod-s',
    run: () => {
      emit('save');
      return true;
    },
    preventDefault: true,
  },
]);

function createEditor() {
  if (!editorRef.value) return;

  const extensions: any[] = [
    lineNumbers(),
    history(),
    markdown(),
    // 使用自定义高亮
    syntaxHighlighting(myHighlightStyle),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    saveKeymap,
    EditorView.updateListener.of((update: any) => {
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

  nextTick(() => {
    if (view) {
      view.focus();
    }
  });
}

onMounted(createEditor);

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
  if (view) {
    view.destroy();
    view = null;
  }
});
</script>

<template>
  <div ref="editorRef" class="codemirror-editor"></div>
</template>

<style scoped>
.codemirror-editor {
  flex: 1;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #ffffff;
}

:deep(.cm-editor) {
  height: 100%;
  font-size: 15px;
  font-family: 'SF Mono', 'Menlo', 'Consolas', 'Monaco', monospace;
  line-height: 1.8;
}

:deep(.cm-content) {
  padding: 24px 28px;
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

/* 代码块背景色 */
:deep(.cm-content .cm-codeblock) {
  background-color: #f8f8f8;
  padding: 4px 8px;
  border-radius: 4px;
}
</style>