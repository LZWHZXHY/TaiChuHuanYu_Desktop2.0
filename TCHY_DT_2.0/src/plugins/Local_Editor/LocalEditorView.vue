<!-- src/plugins/LocalEditorView.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import FileTree from '@/components/FileTree.vue';
import MarkdownEditor from '@/components/MarkdownEditor.vue';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';

const vaultPath = ref('');
const currentFile = ref('');
const fileContent = ref('');
const isLoading = ref(false);

onMounted(() => {
  const saved = localStorage.getItem('active-vault-path');
  if (saved) vaultPath.value = saved;
});

async function openFile(path: string) {
  if (!path.endsWith('.md') && !path.endsWith('.markdown')) {
    fileContent.value = '暂不支持预览此文件类型';
    currentFile.value = path;
    return;
  }
  currentFile.value = path;
  try {
    isLoading.value = true;
    fileContent.value = await readTextFile(path);
  } catch (e) {
    fileContent.value = '读取文件失败';
  }
  isLoading.value = false;
}

async function saveFile(content: string) {
  if (!currentFile.value) return;
  try {
    isLoading.value = true;
    await writeTextFile(currentFile.value, content);
    alert('保存成功');
  } catch (e) {
    alert('保存失败');
  }
  isLoading.value = false;
}
</script>

<template>
  <div class="local-editor">
    <FileTree 
      :root-path="vaultPath" 
      @file-click="openFile" 
    />
    <MarkdownEditor 
      :file-path="currentFile" 
      :content="fileContent"
      :is-loading="isLoading"
      @save="saveFile"
    />
  </div>
</template>

<style scoped>
.local-editor {
  display: flex;
  height: 100%;
  width: 100%;
  background: #ffffff;
}
</style>