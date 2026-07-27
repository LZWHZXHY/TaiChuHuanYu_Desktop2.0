<template>
  <div class="note-editor">
    <aside class="note-list">
      <div class="list-header">
        <span>笔记</span>
        <button @click="addNote" class="btn-add">+</button>
      </div>
      <ul>
        <li
          v-for="note in notes"
          :key="note.id"
          @click="selectNote(note.id)"
          :class="{ active: currentNoteId === note.id }"
        >
          <span class="note-title">{{ note.title || '无标题' }}</span>
          <button @click.stop="deleteNote(note.id)" class="btn-delete">✕</button>
        </li>
      </ul>
      <div class="list-footer">
        <span>共 {{ notes.length }} 篇</span>
      </div>
    </aside>

    <section class="editor-area">
      <div v-if="currentNote" class="editor-header">
        <input v-model="currentNote.title" placeholder="标题" class="title-input" />
      </div>
      <div v-if="currentNote" class="editor-body">
        <textarea
          v-model="currentNote.content"
          placeholder="写点什么..."
          class="content-textarea"
        ></textarea>
        <div class="preview">
          <span class="preview-label">预览</span>
          <div class="preview-content">{{ currentNote.content || '空' }}</div>
        </div>
      </div>
      <div v-else class="empty-state">
        <p>选择或新建一篇笔记</p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

interface Note {
  id: string
  title: string
  content: string
}

const notes = ref<Note[]>([])
const currentNoteId = ref<string | null>(null)
const currentNote = ref<Note | null>(null)

const STORAGE_KEY = 'note-editor-data'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw) as Note[]
      notes.value = data
      if (notes.value.length > 0) {
        currentNoteId.value = notes.value[0].id
      }
    } else {
      notes.value = [{ id: '1', title: '欢迎', content: '开始写笔记...' }]
      currentNoteId.value = '1'
    }
    updateCurrentNote()
  } catch {
    notes.value = [{ id: '1', title: '欢迎', content: '开始写笔记...' }]
    currentNoteId.value = '1'
    updateCurrentNote()
  }
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes.value))
}

function updateCurrentNote() {
  if (currentNoteId.value) {
    const found = notes.value.find(n => n.id === currentNoteId.value)
    currentNote.value = found || null
    if (!found && notes.value.length > 0) {
      currentNoteId.value = notes.value[0].id
      currentNote.value = notes.value[0]
    }
  } else if (notes.value.length > 0) {
    currentNoteId.value = notes.value[0].id
    currentNote.value = notes.value[0]
  } else {
    currentNote.value = null
  }
}

function selectNote(id: string) {
  currentNoteId.value = id
  updateCurrentNote()
}

function addNote() {
  const newNote: Note = {
    id: Date.now().toString(),
    title: '新笔记',
    content: '',
  }
  notes.value.push(newNote)
  currentNoteId.value = newNote.id
  updateCurrentNote()
  saveToStorage()
}

function deleteNote(id: string) {
  if (notes.value.length <= 1) {
    alert('至少保留一篇笔记')
    return
  }
  notes.value = notes.value.filter(n => n.id !== id)
  if (currentNoteId.value === id) {
    currentNoteId.value = notes.value[0]?.id || null
    updateCurrentNote()
  }
  saveToStorage()
}

watch(
  () => [currentNote.value?.title, currentNote.value?.content],
  () => {
    if (currentNote.value) {
      saveToStorage()
    }
  },
  { deep: true }
)

watch(notes, () => {
  saveToStorage()
}, { deep: true })

onMounted(() => {
  loadFromStorage()
})
</script>

<style scoped>
/* ---------- 容器 ---------- */
.note-editor {
  display: flex;
  height: 100%;
  gap: 48px;
}

/* ---------- 左侧列表 ---------- */
.note-list {
  width: 180px;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  padding-right: 20px;
  border-right: 1px solid #f0f0f0;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-size: 13px;
  color: #999;
}

.btn-add {
  background: transparent;
  border: none;
  color: #bbb;
  font-size: 16px;
  cursor: pointer;
  transition: color 0.2s ease, transform 0.2s ease;
  padding: 0;
}
.btn-add:hover {
  color: #1a1a1a;
  transform: rotate(90deg);
}

.note-list ul {
  list-style: none;
  padding: 0;
  margin: 0;
  flex: 1;
  overflow-y: auto;
}

.note-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0 6px 10px;
  cursor: pointer;
  font-size: 14px;
  color: #bbb;
  border-left: 3px solid transparent;
  transition: color 0.25s ease, border-color 0.25s ease, padding-left 0.25s ease, background 0.2s ease;
  border-radius: 0 4px 4px 0;
}

.note-list li:hover {
  color: #555;
  background: rgba(0, 0, 0, 0.03);
  padding-left: 14px;
}

.note-list li.active {
  color: #1a1a1a;
  border-left-color: #1a1a1a;
  background: rgba(0, 0, 0, 0.02);
  padding-left: 14px;
}

.btn-delete {
  background: none;
  border: none;
  color: #ddd;
  cursor: pointer;
  font-size: 12px;
  transition: color 0.2s ease, transform 0.2s ease;
}
.btn-delete:hover {
  color: #999;
  transform: scale(1.2);
}

.list-footer {
  margin-top: 12px;
  font-size: 12px;
  color: #ddd;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

/* ---------- 右侧编辑器 ---------- */
.editor-area {
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
  transition: border-color 0.3s ease, opacity 0.2s ease;
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
  transition: opacity 0.2s ease;
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
  transition: color 0.25s ease;
}
.preview:hover .preview-label {
  color: #999;
}

.preview-content {
  margin-top: 4px;
  font-size: 14px;
  color: #999;
  white-space: pre-wrap;
  line-height: 1.8;
  transition: color 0.25s ease;
}
.preview:hover .preview-content {
  color: #666;
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