<template>
  <div class="note-editor">
    <NoteList
      :tree="tree"
      :vaultPath="vaultPath"
      :currentFileName="currentFileName"
      @open="handleOpenNote"
      @create="handleCreateNote"
      @create-folder="handleCreateFolder"
      @delete="handleDeleteNote"
      @move="handleMoveNote"
    />

    <NoteEditorPane
      ref="editorPaneRef"
      @open="handleOpenNote"
      @rename="handleRenameNote"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useSettingsStore } from '@/composables/useSettingsStore'
import { useNotes, type FileNode } from './composables/useNotes'
import NoteList from './components/NoteList.vue'
import NoteEditorPane from './components/NoteEditorPane.vue'

const { loadSettings, vaults, activeId } = useSettingsStore()
const { listNotesTree, readNote, createNote, deleteNote, createFolder, moveNote, saveNote } = useNotes()

const tree = ref<FileNode[]>([])
const vaultPath = ref('')
const currentFileName = ref('')
const editorPaneRef = ref<InstanceType<typeof NoteEditorPane> | null>(null)

function updateVaultPath() {
  const activeVault = vaults.value.find(v => v.path === activeId.value)
  vaultPath.value = activeVault?.path || ''
}

async function loadTree() {
  if (!vaultPath.value) {
    tree.value = []
    return
  }
  const result = await listNotesTree()
  tree.value = result
}

async function handleOpenNote(relativePath: string) {
  if (!vaultPath.value) return
  try {
    const content = await readNote(relativePath)
    currentFileName.value = relativePath
    if (editorPaneRef.value) {
      editorPaneRef.value.openTab(relativePath, content)
    }
  } catch (error) {
    console.error('打开笔记失败:', error)
    alert('打开笔记失败: ' + error)
  }
}

async function handleCreateNote() {
  if (!vaultPath.value) {
    alert('请先在设置中添加并激活一个仓库')
    return
  }
  // 收集根目录下所有文件名（不包含子文件夹中的）
  const rootFiles = tree.value.filter(n => !n.is_folder).map(n => n.name)
  const baseName = `笔记-${new Date().toISOString().slice(0,10)}`
  let fileName = `${baseName}.md`
  let counter = 1
  while (rootFiles.includes(fileName)) {
    fileName = `${baseName}-${counter}.md`
    counter++
  }
  try {
    await createNote(fileName, '')
    await loadTree()
    handleOpenNote(fileName)
  } catch (error) {
    console.error('创建笔记失败:', error)
    alert('创建笔记失败: ' + error)
  }
}

async function handleCreateFolder() {
  if (!vaultPath.value) {
    alert('请先在设置中添加并激活一个仓库')
    return
  }
  const folderName = prompt('请输入文件夹名称（可含路径，如 "工作/周报"）：')
  if (!folderName || folderName.trim() === '') return
  const cleanName = folderName.trim().replace(/\\/g, '/')
  if (/[<>:"|?*]/.test(cleanName)) {
    alert('包含非法字符')
    return
  }
  try {
    await createFolder(cleanName)
    await loadTree()
  } catch (error) {
    console.error('创建文件夹失败:', error)
    alert('创建文件夹失败: ' + error)
  }
}

async function handleDeleteNote(relativePath: string) {
  if (!confirm(`确定要删除 "${relativePath}" 吗？`)) return
  try {
    await deleteNote(relativePath)
    await loadTree()
    if (currentFileName.value === relativePath) {
      currentFileName.value = ''
      // 编辑器中的对应 Tab 关闭由子组件处理，但我们可以通过 ref 清空
      // 由于没有暴露关闭特定 Tab 的方法，暂时忽略
    }
  } catch (error) {
    console.error('删除失败:', error)
    alert('删除失败: ' + error)
  }
}

async function handleMoveNote(sourcePath: string, targetFolderPath: string) {
  // 目标文件夹路径是相对路径，如 "folder/sub"
  // 新的完整路径 = targetFolderPath + '/' + 文件名
  const fileName = sourcePath.split('/').pop() || ''
  const targetPath = targetFolderPath ? `${targetFolderPath}/${fileName}` : fileName
  if (sourcePath === targetPath) return
  try {
    await moveNote(sourcePath, targetPath)
    await loadTree()
    // 如果移动的是当前打开的文件，更新 currentFileName
    if (currentFileName.value === sourcePath) {
      currentFileName.value = targetPath
      // 同时更新编辑器中的 Tab？这里不处理，用户可重新打开
    }
  } catch (error) {
    console.error('移动失败:', error)
    alert('移动失败: ' + error)
  }
}

async function handleRenameNote(oldPath: string, newPath: string) {
  // 重命名其实就是移动
  await handleMoveNote(oldPath, newPath)
}

// 监听仓库切换
watch(activeId, async () => {
  updateVaultPath()
  await loadTree()
  currentFileName.value = ''
})

onMounted(async () => {
  await loadSettings()
  updateVaultPath()
  await loadTree()
})
</script>

<style scoped>
.note-editor {
  display: flex;
  height: 100%;
  gap: 48px;
}
</style>