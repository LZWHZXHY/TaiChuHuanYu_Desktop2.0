<!-- src/components/local_notes/GraphView.vue -->
<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, shallowRef, computed } from 'vue';
import cytoscape from 'cytoscape';
// @ts-ignore
import coseBilkent from 'cytoscape-cose-bilkent';
import { readDir, readTextFile } from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';
import { useVaults } from '@/composables/useVaults';
import { extractBiLinks } from '@/utils/biLink';

cytoscape.use(coseBilkent);

// ===== Props =====
const props = defineProps<{
  nodes?: Array<{ id: string; label: string; path: string; isCurrent: boolean }>;
  edges?: Array<{ source: string; target: string }>;
  currentNodePath?: string;
  standalone?: boolean; // true=独立页面模式，false=嵌入模式
}>();

const emit = defineEmits<{
  (e: 'node-click', path: string): void;
  (e: 'ready', cy: any): void;
}>();

// ===== 状态 =====
const containerRef = ref<HTMLDivElement | null>(null);
const cy = shallowRef<any>(null);
const isReady = ref(false);
const isLoading = ref(false);

// ===== 独立模式：自己加载数据 =====
const { vaults, activeVaultId } = useVaults();
const vaultPath = computed(() => {
  const active = vaults.value.find(v => v.id === activeVaultId.value);
  return active?.path || '';
});

const localNodes = ref<any[]>([]);
const localEdges = ref<any[]>([]);
const localCurrentPath = ref('');

// ===== 最终使用的数据 =====
const finalNodes = computed(() => {
  if (props.standalone || !props.nodes) {
    return localNodes.value;
  }
  return props.nodes;
});

const finalEdges = computed(() => {
  if (props.standalone || !props.edges) {
    return localEdges.value;
  }
  return props.edges;
});

const finalCurrentPath = computed(() => {
  if (props.standalone || !props.currentNodePath) {
    return localCurrentPath.value;
  }
  return props.currentNodePath;
});

// ===== 共享布局配置（优化版） =====
const layoutConfig = {
  name: 'cose-bilkent',
  animate: true,
  animationDuration: 1000,        // 动画时长1秒
  idealEdgeLength: 100,           // 边理想长度
  nodeRepulsion: 4500,            // 节点斥力
  edgeElasticity: 100,
  nestingFactor: 5,
  gravity: 200,                   // 重力（使图居中）
  numIter: 2000,                  // 增加迭代次数，更稳定
  initialTemp: 200,
  coolingFactor: 0.98,            // 冷却更慢，运动更平滑
  minTemp: 0.5,
};

// ===== 独立模式：扫描和构建索引 =====
async function scanAllMarkdown(dirPath: string): Promise<string[]> {
  const results: string[] = [];
  try {
    const entries = await readDir(dirPath);
    for (const entry of entries) {
      const fullPath = await join(dirPath, entry.name);
      if (entry.isFile && entry.name.endsWith('.md')) {
        results.push(fullPath);
      } else if (entry.isDirectory) {
        const subResults = await scanAllMarkdown(fullPath);
        results.push(...subResults);
      }
    }
  } catch (e) {
    console.warn('扫描目录失败:', dirPath, e);
  }
  return results;
}

function findPathByNoteName(noteName: string, paths: string[]): string | null {
  const lowerName = noteName.toLowerCase();
  for (const p of paths) {
    const base = p.split(/[\\/]/).pop()?.replace(/\.md$/i, '') || '';
    if (base === noteName || base.toLowerCase() === lowerName) {
      return p;
    }
  }
  return null;
}

async function buildIndex(filePaths: string[]): Promise<Map<string, string[]>> {
  const newIndex = new Map<string, string[]>();
  const mdPaths = filePaths.filter(p => p.endsWith('.md'));
  if (mdPaths.length === 0) return newIndex;

  const readPromises = mdPaths.map(async (filePath) => {
    try {
      const content = await readTextFile(filePath);
      return { filePath, content };
    } catch {
      return null;
    }
  });
  const results = await Promise.all(readPromises);
  for (const result of results) {
    if (!result) continue;
    const { filePath, content } = result;
    const links = extractBiLinks(content);
    for (const noteName of links) {
      const targetPath = findPathByNoteName(noteName, filePaths);
      if (!targetPath) continue;
      if (!newIndex.has(targetPath)) {
        newIndex.set(targetPath, []);
      }
      const list = newIndex.get(targetPath)!;
      if (!list.includes(filePath)) {
        list.push(filePath);
      }
    }
  }
  return newIndex;
}

async function loadGlobalData() {
  if (!vaultPath.value) {
    console.warn('没有激活的仓库');
    return;
  }
  isLoading.value = true;
  try {
    const paths = await scanAllMarkdown(vaultPath.value);
    const index = await buildIndex(paths);
    
    localNodes.value = paths.map(path => ({
      id: path,
      label: path.split(/[\\/]/).pop()?.replace(/\.md$/, '') || '未命名',
      path: path,
      isCurrent: path === localCurrentPath.value,
    }));
    
    const edges: any[] = [];
    for (const [target, sources] of index) {
      for (const source of sources) {
        if (source !== target) {
          edges.push({ source, target });
        }
      }
    }
    localEdges.value = edges;
    
    console.log(`图谱加载完成：${paths.length} 个文件，${edges.length} 条链接`);
  } catch (e) {
    console.error('加载图谱失败', e);
  } finally {
    isLoading.value = false;
  }
}

// ===== 样式配置（美观优化版） =====
function getStyles(): any[] {
  return [
    // ---------- 节点 ----------
    {
      selector: 'node',
      style: {
        'label': 'data(label)',
        'text-valign': 'center',
        'text-halign': 'center',
        'font-family': '-apple-system, "PingFang SC", sans-serif',
        'font-size': 13,
        'font-weight': 500,
        'color': '#333',
        'text-background-color': 'rgba(255,255,255,0.8)',
        'text-background-opacity': 0.8,
        'text-background-padding': '4px',
        'text-border-radius': '4px',
        'text-outline-width': 0,
        'width': 48,
        'height': 48,
        'background-color': '#e8e8e8',
        'background-gradient': 'radial',
        'background-gradient-stop-colors': '#f5f5f5 #e0e0e0',
        'border-width': 2,
        'border-color': '#d0d0d0',
        'border-opacity': 0.8,
        'shadow-blur': 8,
        'shadow-color': 'rgba(0,0,0,0.1)',
        'shadow-offset-x': 0,
        'shadow-offset-y': 2,
        'opacity': 1,
        'cursor': 'pointer',
        'transition-property': 'width, height, background-color, border-color, shadow-blur',
        'transition-duration': 200,
      },
    },
    // ---------- 当前节点 ----------
    {
      selector: 'node.current',
      style: {
        'background-color': '#0066cc',
        'background-gradient': 'radial',
        'background-gradient-stop-colors': '#4a90d9 #0066cc',
        'border-color': '#004499',
        'border-width': 3,
        'width': 64,
        'height': 64,
        'color': '#ffffff',
        'font-weight': 600,
        'font-size': 14,
        'shadow-blur': 16,
        'shadow-color': 'rgba(0,102,204,0.4)',
        'text-background-color': 'rgba(0,102,204,0.2)',
        'text-background-opacity': 0,
      },
    },
    // ---------- 被引用的节点（有入度） ----------
    {
      selector: 'node.has-incoming',
      style: {
        'border-color': '#0066cc',
        'border-width': 2.5,
        'border-opacity': 0.6,
      },
    },
    // ---------- 引用别人的节点（有出度） ----------
    {
      selector: 'node.has-outgoing',
      style: {
        'background-gradient-stop-colors': '#f0f4ff #e0e8ff',
      },
    },
    // ---------- 边 ----------
    {
      selector: 'edge',
      style: {
        'width': 2,
        'line-color': '#d0d0d0',
        'target-arrow-color': '#d0d0d0',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'opacity': 0.7,
        'arrow-scale': 1.2,
        'transition-property': 'line-color, width, opacity',
        'transition-duration': 150,
      },
    },
    // ---------- 高亮边 ----------
    {
      selector: 'edge.highlighted',
      style: {
        'line-color': '#0066cc',
        'width': 3,
        'opacity': 1,
        'target-arrow-color': '#0066cc',
      },
    },
    // ---------- 当前节点的关联边 ----------
    {
      selector: 'edge.current-adjacent',
      style: {
        'line-color': '#4a90d9',
        'width': 2.5,
        'opacity': 0.9,
      },
    },
  ];
}

// ===== 初始化图谱 =====
function initGraph() {
  if (!containerRef.value) return;
  const nodes = finalNodes.value;
  if (nodes.length === 0) {
    // 空状态由模板处理
    return;
  }

  const nodeData = nodes.map(node => ({
    data: {
      id: node.id,
      label: node.label,
      path: node.path,
      isCurrent: node.isCurrent,
    },
    classes: node.isCurrent ? 'current' : 'default',
  }));

  cy.value = cytoscape({
    container: containerRef.value,
    style: getStyles() as any,
    layout: layoutConfig,
    elements: {
      nodes: nodeData,
      edges: finalEdges.value.map(edge => ({
        data: {
          id: `${edge.source}->${edge.target}`,
          source: edge.source,
          target: edge.target,
        },
      })),
    },
    wheelSensitivity: 0.2,
    minZoom: 0.1,
    maxZoom: 3,
  });

  // ===== 点击节点 =====
  cy.value.on('tap', 'node', (evt: any) => {
    const node = evt.target;
    const path = node.data('path');
    if (path) {
      emit('node-click', path);
    }
  });

  // ===== 悬停高亮 =====
  cy.value.on('mouseover', 'node', (evt: any) => {
    const node = evt.target;
    const isCurrent = node.data('isCurrent');
    node.style('width', isCurrent ? 72 : 56);
    node.style('height', isCurrent ? 72 : 56);
    node.style('shadow-blur', isCurrent ? 24 : 16);
    // 高亮关联边
    const edges = node.connectedEdges();
    edges.addClass('highlighted');
  });

  cy.value.on('mouseout', 'node', (evt: any) => {
    const node = evt.target;
    const isCurrent = node.data('isCurrent');
    node.style('width', isCurrent ? 64 : 48);
    node.style('height', isCurrent ? 64 : 48);
    node.style('shadow-blur', isCurrent ? 16 : 8);
    const edges = node.connectedEdges();
    edges.removeClass('highlighted');
  });

  // 当前节点周围边高亮（加载完成后）
  cy.value.on('layoutstop', () => {
    // 高亮当前节点的相邻边
    const currentId = finalCurrentPath.value;
    if (currentId) {
      const node = cy.value?.getElementById(currentId);
      if (node && node.length > 0) {
        const edges = node.connectedEdges();
        edges.addClass('current-adjacent');
        // 也高亮邻居节点
        node.neighborhood('node').addClass('highlighted');
      }
    }
  });

  isReady.value = true;
  emit('ready', cy.value);
}

// ===== 重新布局 =====
function reLayout() {
  if (cy.value) {
    cy.value.layout(layoutConfig).run();
  }
}

// ===== 操作函数 =====
function focusNode(path: string, zoomLevel: number = 1.2) {
  if (!cy.value) return;
  const node = cy.value.getElementById(path);
  if (node && node.length > 0) {
    cy.value.animate({
      zoom: zoomLevel,
      center: { eles: node },
      duration: 500,
    });
  }
}

function resetView() {
  if (!cy.value) return;
  cy.value.animate({
    zoom: 1,
    pan: { x: 0, y: 0 },
    duration: 500,
  });
}

function exportImage(): string {
  if (!cy.value) return '';
  return cy.value.png({
    bg: '#ffffff',
    scale: 2,
    full: true,
  });
}

// ===== 暴露方法 =====
defineExpose({
  cy,
  focusNode,
  resetView,
  exportImage,
  reLayout,
  loadGlobalData,
});

// ===== 监听数据变化（嵌入模式） =====
watch(
  () => [finalNodes.value, finalEdges.value],
  () => {
    if (!props.standalone && cy.value) {
      // 更新图谱
      cy.value.elements().remove();
      const nodeData = finalNodes.value.map(node => ({
        data: {
          id: node.id,
          label: node.label,
          path: node.path,
          isCurrent: node.isCurrent,
        },
        classes: node.isCurrent ? 'current' : 'default',
      }));
      cy.value.add({
        nodes: nodeData,
        edges: finalEdges.value.map(edge => ({
          data: {
            id: `${edge.source}->${edge.target}`,
            source: edge.source,
            target: edge.target,
          },
        })),
      });
      reLayout();
    } else if (!props.standalone && finalNodes.value.length > 0 && !cy.value) {
      initGraph();
    }
  },
  { deep: true }
);

// ===== 独立模式：监听仓库变化 =====
if (props.standalone !== false) {
  watch(vaultPath, () => {
    loadGlobalData();
  });
}

// ===== 窗口自适应 =====
function handleResize() {
  if (cy.value && containerRef.value) {
    cy.value.resize();
  }
}

// ===== 生命周期 =====
onMounted(() => {
  nextTick(() => {
    if (props.standalone !== false) {
      loadGlobalData();
    }
    
    const unwatch = watch(
      () => finalNodes.value,
      (nodes) => {
        if (nodes.length > 0) {
          initGraph();
          unwatch();
        }
      },
      { immediate: true }
    );
    
    if (finalNodes.value.length > 0) {
      initGraph();
    }
    window.addEventListener('resize', handleResize);
  });
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  if (cy.value) {
    cy.value.destroy();
    cy.value = null;
  }
});
</script>

<template>
  <!-- ===== 独立页面模式 ===== -->
  <div v-if="standalone !== false" class="graph-page">
    <div class="graph-toolbar">
      <div class="toolbar-left">
        <span class="graph-title">🕸 关系图谱</span>
        <span class="graph-stats">{{ finalNodes.length }} 个节点 · {{ finalEdges.length }} 条链接</span>
      </div>
      <div class="toolbar-right">
        <button class="toolbar-btn" @click="resetView">⊡ 重置</button>
        <button class="toolbar-btn" @click="exportImage">⬇ 导出</button>
        <button class="toolbar-btn" @click="loadGlobalData">⟳ 刷新</button>
        <button class="toolbar-btn" @click="reLayout">↻ 重排</button>
      </div>
    </div>
    <div class="graph-wrapper" ref="containerRef">
      <div v-if="isLoading" class="graph-loading">加载中...</div>
      <div v-else-if="finalNodes.length === 0" class="graph-empty">
        <span class="empty-icon">🕸</span>
        <p>没有找到笔记</p>
        <p class="empty-hint">请在仓库中创建 .md 文件</p>
      </div>
    </div>
  </div>

  <!-- ===== 嵌入模式（组件模式） ===== -->
  <div v-else ref="containerRef" class="graph-container">
    <div v-if="isLoading" class="graph-loading">加载中...</div>
    <div v-else-if="finalNodes.length === 0" class="graph-empty">
      <span class="empty-icon">📄</span>
      <p>没有笔记</p>
    </div>
  </div>
</template>

<style scoped>
/* ===== 独立页面模式 ===== */
.graph-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: #ffffff;
  overflow: hidden;
}

.graph-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 28px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
  background: #fafafa;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.graph-title {
  font-size: 16px;
  font-weight: 500;
  color: #1a1a1a;
  letter-spacing: 0.3px;
}

.graph-stats {
  font-size: 13px;
  color: #999;
  letter-spacing: 0.3px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-btn {
  padding: 6px 16px;
  background: transparent;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #555;
  transition: all 0.15s;
  font-family: inherit;
}
.toolbar-btn:hover {
  background: #f0f0f0;
  border-color: #ccc;
}

.graph-wrapper {
  flex: 1;
  min-height: 0;
  padding: 16px 24px 24px 24px;
  position: relative;
}

/* ===== 嵌入模式 ===== */
.graph-container {
  width: 100%;
  height: 100%;
  min-height: 300px;
  background: #ffffff;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.graph-container :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}

/* ===== 加载/空状态 ===== */
.graph-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 300px;
  color: #bbb;
  font-size: 14px;
}

.graph-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 300px;
  color: #ccc;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.4;
}

.graph-empty p {
  margin: 4px 0;
  font-size: 15px;
}

.graph-empty .empty-hint {
  font-size: 13px;
  color: #ddd;
}
</style>