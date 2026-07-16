<!-- src/plugins/local_notes/LocalEditorView.vue -->
<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import FileTree from '@/components/local_notes/FileTree.vue';
import MarkdownEditor from '@/components/local_notes/MarkdownEditor.vue';
import GraphView from '@/components/local_notes/GraphView.vue';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { useRecentFiles } from '@/composables/useRecentFiles';
import { extractBiLinks } from '@/utils/biLink';

const vaultPath = ref('');
const currentFile = ref('');
const fileContent = ref('');
const isLoading = ref(false);
const fileTreeRef = ref<InstanceType<typeof FileTree> | null>(null);
const allMarkdownPaths = ref<string[]>([]);
const { addRecentFile } = useRecentFiles();

// ===== 视图模式 =====
type ViewMode = 'editor' | 'graph';
const viewMode = ref<ViewMode>('editor');

// ===== 反向链接索引 =====
// key: 被引用的文件路径, value: 引用它的文件路径列表
const backlinksIndex = ref<Map<string, string[]>>(new Map());

// ===== 当前文件的反向链接列表（文件路径数组） =====
const currentBacklinks = computed(() => {
  return backlinksIndex.value.get(currentFile.value) || [];
});

// ===== 图谱数据 =====
const graphNodes = ref<Array<{ id: string; label: string; path: string; isCurrent: boolean }>>([]);
const graphEdges = ref<Array<{ source: string; target: string }>>([]);

// ===== 构建反向链接索引 =====
async function buildBacklinksIndex(filePaths: string[]) {
  const newIndex = new Map<string, string[]>();
  // 只处理 .md 文件
  const mdPaths = filePaths.filter(p => p.endsWith('.md'));
  if (mdPaths.length === 0) return;

  // 并发读取所有文件内容
  const readPromises = mdPaths.map(async (filePath) => {
    try {
      const content = await readTextFile(filePath);
      return { filePath, content };
    } catch (e) {
      console.warn('读取文件失败，跳过:', filePath, e);
      return null;
    }
  });

  const results = await Promise.all(readPromises);
  for (const result of results) {
    if (!result) continue;
    const { filePath, content } = result;
    const links = extractBiLinks(content);
    for (const noteName of links) {
      // 需要将笔记名解析为文件路径
      // 先用 allMarkdownPaths 查找（注意：这里 we may need a helper）
      const targetPath = findPathByNoteName(noteName, filePaths);
      if (!targetPath) continue;
      if (!newIndex.has(targetPath)) {
        newIndex.set(targetPath, []);
      }
      // 避免重复（同一个文件多次引用同一个目标）
      const list = newIndex.get(targetPath)!;
      if (!list.includes(filePath)) {
        list.push(filePath);
      }
    }
  }
  backlinksIndex.value = newIndex;
  console.log('[反向链接] 索引构建完成，共', newIndex.size, '个被引用文件');
}

// ===== 构建图谱数据 =====
function buildGraphData() {
  const paths = allMarkdownPaths.value;
  graphNodes.value = paths.map(path => ({
    id: path,
    label: path.split(/[\\/]/).pop()?.replace(/\.md$/, '') || '未命名',
    path: path,
    isCurrent: path === currentFile.value,
  }));
  
  const edges: Array<{ source: string; target: string }> = [];
  for (const [target, sources] of backlinksIndex.value) {
    for (const source of sources) {
      if (source !== target) {
        edges.push({ source, target });
      }
    }
  }
  graphEdges.value = edges;
  console.log('[图谱] 构建完成:', graphNodes.value.length, '个节点,', graphEdges.value.length, '条边');
}

// ===== 通过笔记名查找文件路径（复用 findNoteByName） =====
function findPathByNoteName(noteName: string, paths: string[]): string | null {
  const lowerName = noteName.toLowerCase();
  // 先精确匹配
  for (const p of paths) {
    const base = p.split(/[\\/]/).pop()?.replace(/\.md$/i, '') || '';
    if (base === noteName) return p;
  }
  // 再忽略大小写
  for (const p of paths) {
    const base = p.split(/[\\/]/).pop()?.replace(/\.md$/i, '')?.toLowerCase() || '';
    if (base === lowerName) return p;
  }
  return null;
}

// ===== 刷新所有 .md 路径及反向索引 =====
async function refreshAllPaths() {
  if (!fileTreeRef.value) {
    console.warn('[双链] FileTree 引用尚未就绪，等待...');
    setTimeout(refreshAllPaths, 500);
    return;
  }
  try {
    console.log('[双链] 开始扫描 .md 文件...');
    await fileTreeRef.value.refreshMarkdownCache();
    const paths = fileTreeRef.value.getAllMarkdownPaths();
    allMarkdownPaths.value = paths;
    console.log('[双链] 扫描完成，找到', paths.length, '个 .md 文件');
    // 构建反向索引
    await buildBacklinksIndex(paths);
    // 构建图谱数据
    buildGraphData();
  } catch (e) {
    console.error('[双链] 扫描失败:', e);
  }
}

// ===== 打开文件 =====
async function openFile(path: string) {
  if (!path.endsWith('.md') && !path.endsWith('.markdown')) {
    fileContent.value = '暂不支持预览此文件类型';
    currentFile.value = path;
    return;
  }
  currentFile.value = path;
  addRecentFile(path);
  // 切换到编辑器视图
  viewMode.value = 'editor';
  try {
    isLoading.value = true;
    fileContent.value = await readTextFile(path);
  } catch (e) {
    fileContent.value = '读取文件失败';
    console.error(e);
  } finally {
    isLoading.value = false;
  }
}

// ===== 保存文件 =====
async function saveFile(content: string) {
  if (!currentFile.value) return;
  try {
    isLoading.value = true;
    await writeTextFile(currentFile.value, content);
    alert('保存成功');
    // 保存后重新构建索引（因为内容变了）
    await buildBacklinksIndex(allMarkdownPaths.value);
    // 重新构建图谱数据
    buildGraphData();
  } catch (e) {
    alert('保存失败');
    console.error(e);
  } finally {
    isLoading.value = false;
  }
}

// ===== 双链跳转 =====
function onNavigateToFile(filePath: string) {
  openFile(filePath);
}

// ===== 切换视图 =====
function switchToGraph() {
  viewMode.value = 'graph';
  buildGraphData();
}

function switchToEditor() {
  viewMode.value = 'editor';
}

// ===== 图谱节点点击 =====
function onGraphNodeClick(path: string) {
  openFile(path);
}

// ===== 初始化 =====
onMounted(() => {
  const saved = localStorage.getItem('active-vault-path');
  if (saved) {
    vaultPath.value = saved;
    setTimeout(() => refreshAllPaths(), 500);
  }
});

watch(vaultPath, () => {
  if (vaultPath.value) {
    refreshAllPaths();
  }
});
</script>

<template>
  <div class="local-editor">
    <!-- 文件树（始终显示） -->
    <FileTree 
      ref="fileTreeRef"
      :root-path="vaultPath" 
      @file-click="openFile"
      @navigate-to-file="onNavigateToFile"
    />
    
    <!-- ===== 编辑器视图 ===== -->
    <MarkdownEditor 
      v-if="viewMode === 'editor'"
      :file-path="currentFile" 
      :content="fileContent"
      :is-loading="isLoading"
      :all-markdown-paths="allMarkdownPaths"
      :backlinks="currentBacklinks"
      @save="saveFile"
      @navigate-to-file="onNavigateToFile"
      @switch-to-graph="switchToGraph"
    />
    
    <!-- ===== 图谱视图 ===== -->
    <div v-else class="graph-view-wrapper">
      <div class="graph-toolbar">
        <button class="back-btn" @click="switchToEditor">← 返回编辑器</button>
        <span class="graph-title">🕸 关系图谱</span>
        <span class="graph-stats">{{ graphNodes.length }} 个节点 · {{ graphEdges.length }} 条链接</span>
        <button class="refresh-btn" @click="buildGraphData" title="刷新图谱">⟳</button>
      </div>
      <div class="graph-container">
        <GraphView
          :nodes="graphNodes"
          :edges="graphEdges"
          :current-node-path="currentFile"
          @node-click="onGraphNodeClick"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.local-editor {
  display: flex;
  height: 100%;
  width: 100%;
  background: #ffffff;
}

/* ===== 图谱视图 ===== */
.graph-view-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  height: 100%;
  overflow: hidden;
}

.graph-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 20px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
  background: #fafafa;
}

.back-btn {
  padding: 4px 14px;
  background: transparent;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #555;
  transition: all 0.15s;
  font-family: inherit;
}
.back-btn:hover {
  background: #f0f0f0;
}

.graph-title {
  font-size: 15px;
  font-weight: 500;
  color: #1a1a1a;
}

.graph-stats {
  font-size: 13px;
  color: #999;
}

.refresh-btn {
  padding: 4px 10px;
  background: transparent;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  color: #999;
  transition: all 0.15s;
  margin-left: auto;
  font-family: inherit;
}
.refresh-btn:hover {
  background: #f0f0f0;
}

.graph-container {
  flex: 1;
  min-height: 0;
  padding: 12px 16px 16px 16px;
}
</style>