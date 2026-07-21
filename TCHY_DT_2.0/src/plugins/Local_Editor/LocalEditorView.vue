<!-- src/plugins/local_notes/LocalEditorView.vue -->
<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import FileTree from '@/components/local_notes/FileTree.vue'
import MarkdownEditor from '@/components/local_notes/MarkdownEditor.vue'
import GraphView from '@/components/local_notes/GraphView.vue'
import { readTextFile, writeTextFile, remove, exists } from '@tauri-apps/plugin-fs'
import { join } from '@tauri-apps/api/path'
import { useRecentFiles } from '@/composables/useRecentFiles'
import { useVaults } from '@/composables/useVaults'
import { extractBiLinks } from '@/utils/biLink'
import {
  updateGraphCache,
  updateFileLinksInCache,
  readGraphCache,
} from '@/utils/graphCache'

const { vaults, activeVaultId } = useVaults()

// ----- 辅助：标准化路径（统一正斜杠，去除尾部斜杠） -----
function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/\/+$/, '')
}

// ----- 通过 vaultPath 匹配仓库（忽略大小写） -----
const matchedVault = computed(() => {
  const normalized = normalizePath(vaultPath.value)
  return vaults.value.find(v => 
    normalizePath(v.path).toLowerCase() === normalized.toLowerCase()
  )
})

// 缓存目录：从匹配的仓库获取，若无则默认 '.tchy'
const cacheDir = computed(() => matchedVault.value?.cacheDir || '.tchy')

// ===== 状态 =====
const vaultPath = ref('')
const currentFile = ref('')
const fileContent = ref('')
const isLoading = ref(false)
const fileTreeRef = ref<InstanceType<typeof FileTree> | null>(null)
const allMarkdownPaths = ref<string[]>([])
const { addRecentFile } = useRecentFiles()

// ===== 视图模式 =====
type ViewMode = 'editor' | 'graph'
const viewMode = ref<ViewMode>('editor')

// ===== 反向链接索引 =====
const backlinksIndex = ref<Map<string, string[]>>(new Map())
const currentBacklinks = computed(() =>
  backlinksIndex.value.get(currentFile.value) || []
)

// ===== 图谱数据 =====
const graphNodes = ref<Array<{ id: string; label: string; path: string; isCurrent: boolean }>>([])
const graphEdges = ref<Array<{ source: string; target: string }>>([])

// ===== 构建反向链接索引 =====
async function buildBacklinksIndexFromCacheOrScan(filePaths: string[]) {
  if (vaultPath.value) {
    const cache = await readGraphCache(vaultPath.value, cacheDir.value)
    if (cache) {
      const index = new Map<string, string[]>()
      for (const edge of cache.edges) {
        if (!index.has(edge.target)) index.set(edge.target, [])
        index.get(edge.target)!.push(edge.source)
      }
      backlinksIndex.value = index
      return
    }
  }
  await buildBacklinksIndex(filePaths)
}

async function buildBacklinksIndex(filePaths: string[]) {
  const newIndex = new Map<string, string[]>()
  const mdPaths = filePaths.filter(p => p.endsWith('.md'))
  if (mdPaths.length === 0) return

  const readPromises = mdPaths.map(async (filePath) => {
    try {
      const content = await readTextFile(filePath)
      return { filePath, content }
    } catch {
      return null
    }
  })

  const results = await Promise.all(readPromises)
  for (const result of results) {
    if (!result) continue
    const { filePath, content } = result
    const links = extractBiLinks(content)
    for (const noteName of links) {
      const targetPath = findPathByNoteName(noteName, filePaths)
      if (!targetPath) continue
      if (!newIndex.has(targetPath)) {
        newIndex.set(targetPath, [])
      }
      const list = newIndex.get(targetPath)!
      if (!list.includes(filePath)) {
        list.push(filePath)
      }
    }
  }
  backlinksIndex.value = newIndex
}

function findPathByNoteName(noteName: string, paths: string[]): string | null {
  const lowerName = noteName.toLowerCase()
  for (const p of paths) {
    const base = p.split(/[\\/]/).pop()?.replace(/\.md$/i, '') || ''
    if (base === noteName) return p
  }
  for (const p of paths) {
    const base = p.split(/[\\/]/).pop()?.replace(/\.md$/i, '')?.toLowerCase() || ''
    if (base === lowerName) return p
  }
  return null
}

// ===== 刷新图谱 =====
async function refreshAllPaths(showProgress: boolean = true) {
  if (!fileTreeRef.value) {
    setTimeout(() => refreshAllPaths(showProgress), 500)
    return
  }

  try {
    if (showProgress) console.log('[图谱] 开始刷新...')
    console.log('[🔍 缓存目录]', cacheDir.value)

    await fileTreeRef.value.refreshMarkdownCache()
    const paths = fileTreeRef.value.getAllMarkdownPaths()
    allMarkdownPaths.value = paths

    if (!vaultPath.value) return

    const result = await updateGraphCache(
      vaultPath.value,
      currentFile.value,
      cacheDir.value,
      (msg: string) => {
        if (showProgress) console.log('[图谱]', msg)
      }
    )

    graphNodes.value = result.nodes
    graphEdges.value = result.edges
    await buildBacklinksIndexFromCacheOrScan(paths)

    console.log(
      '[图谱] 加载完成:',
      graphNodes.value.length,
      '个节点,',
      graphEdges.value.length,
      '条边'
    )

    if (vaultPath.value && cacheDir.value !== '.tchy') {
      const defaultCachePath = await join(vaultPath.value, '.tchy', 'graph-cache.json')
      if (await exists(defaultCachePath)) {
        await remove(defaultCachePath)
        console.log('[图谱] ✅ 已删除默认缓存文件（自定义目录已启用）')
      }
    }
  } catch (e) {
    console.error('[图谱] 刷新失败:', e)
  }
}

// ===== 打开文件 =====
async function openFile(path: string) {
  if (!path.endsWith('.md') && !path.endsWith('.markdown')) {
    fileContent.value = '暂不支持预览此文件类型'
    currentFile.value = path
    return
  }
  currentFile.value = path
  addRecentFile(path)
  viewMode.value = 'editor'
  try {
    isLoading.value = true
    fileContent.value = await readTextFile(path)
  } catch (e) {
    fileContent.value = '读取文件失败'
    console.error(e)
  } finally {
    isLoading.value = false
  }
}

// ===== 保存文件 =====
async function saveFile(content: string) {
  if (!currentFile.value) return
  try {
    isLoading.value = true
    await writeTextFile(currentFile.value, content)
    alert('保存成功')

    if (vaultPath.value) {
      await updateFileLinksInCache(
        vaultPath.value,
        currentFile.value,
        cacheDir.value
      )
      await refreshAllPaths(false)
    }
  } catch (e) {
    alert('保存失败')
    console.error(e)
  } finally {
    isLoading.value = false
  }
}

// ===== 双链跳转 =====
function onNavigateToFile(filePath: string) {
  openFile(filePath)
}

// ===== 切换视图 =====
function switchToGraph() {
  viewMode.value = 'graph'
  refreshAllPaths(false)
}

function switchToEditor() {
  viewMode.value = 'editor'
}

// ===== 图谱节点点击 =====
function onGraphNodeClick(path: string) {
  openFile(path)
}

// ===== 文件树变更时刷新 =====
function onFileTreeChanged() {
  setTimeout(() => refreshAllPaths(false), 300)
}

// ===== 手动刷新图谱 =====
function manualRefreshGraph() {
  refreshAllPaths(true)
}

// ===== 初始化 =====
onMounted(() => {
  const saved = localStorage.getItem('active-vault-path')
  if (saved) {
    vaultPath.value = saved
    // 尝试匹配并设置 activeVaultId（可选）
    if (!activeVaultId.value) {
      const matched = vaults.value.find(v => v.path === saved)
      if (matched) {
        activeVaultId.value = matched.id
      }
    }
  }
})

// 如果 vaults 后续加载，再尝试匹配 activeVaultId
watch(vaults, () => {
  if (vaults.value.length > 0 && !activeVaultId.value && vaultPath.value) {
    const matched = vaults.value.find(v => v.path === vaultPath.value)
    if (matched) {
      activeVaultId.value = matched.id
    }
  }
}, { immediate: true })

// 监听路径变化刷新图谱
watch(
  vaultPath,
  () => {
    if (vaultPath.value) {
      refreshAllPaths(true)
    }
  },
  { immediate: true }
)
</script>

<template>
  <!-- 模板保持不变 -->
  <div class="local-editor">
    <FileTree
      ref="fileTreeRef"
      :root-path="vaultPath"
      @file-click="openFile"
      @navigate-to-file="onNavigateToFile"
      @file-changed="onFileTreeChanged"
    />

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

    <div v-else class="graph-view-wrapper">
      <div class="graph-toolbar">
        <button class="back-btn" @click="switchToEditor">← 返回编辑器</button>
        <span class="graph-title">🕸 关系图谱</span>
        <span class="graph-stats"
          >{{ graphNodes.length }} 个节点 · {{ graphEdges.length }} 条链接</span
        >
        <button class="refresh-btn" @click="manualRefreshGraph" title="刷新图谱">
          ⟳
        </button>
      </div>
      <div class="graph-container">
        <GraphView
          :nodes="graphNodes"
          :edges="graphEdges"
          :currentFile="currentFile"
          :standalone="true"
          @node-click="openFile"
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