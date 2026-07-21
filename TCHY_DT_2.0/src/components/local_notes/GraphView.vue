<template>
  <div class="graph-container" :class="{ standalone: standalone, 'is-dragging-node': isDraggingNode }">
    <!-- 工具栏 -->
    <div v-if="standalone" class="graph-toolbar">
      <div class="toolbar-left">
        <span class="graph-title">
          <span class="title-icon">🕸</span> 关系图谱
        </span>
        <span class="graph-stats">{{ visibleNodeCount }} 节点 · {{ visibleEdgeCount }} 链接</span>
      </div>
      <div class="toolbar-right">
        <button class="toolbar-btn" :class="{ active: showFilters }" @click="showFilters = !showFilters">
          ⚙ 设置
        </button>
        <button class="toolbar-btn" @click="fitView">⊡ 重置</button>
        <button class="toolbar-btn" @click="exportImage">⬇ 导出</button>
        <button class="toolbar-btn" @click="reLayout">↻ 重排</button>
      </div>
    </div>

    <!-- 设置面板 -->
    <div v-if="showFilters && standalone" class="graph-settings-panel" @click.stop>
      <div class="settings-section">
        <h4>🎨 显示</h4>
        <div class="setting-row">
          <label>显示箭头</label>
          <input type="checkbox" v-model="settings.showArrows" @change="updateSettings" />
        </div>
        <div class="setting-row">
          <label>节点大小</label>
          <input type="range" min="6" max="28" v-model.number="settings.nodeSize" @change="updateSettings" />
          <span>{{ settings.nodeSize }}</span>
        </div>
        <div class="setting-row">
          <label>连线粗细</label>
          <input type="range" min="0.5" max="4" step="0.5" v-model.number="settings.linkWidth" @change="updateSettings" />
          <span>{{ settings.linkWidth.toFixed(1) }}</span>
        </div>
        <div class="setting-row">
          <label>标签缩放阈值</label>
          <input type="range" min="0.15" max="1.2" step="0.05" v-model.number="settings.textFadeThreshold" @change="updateSettings" />
          <span>{{ settings.textFadeThreshold.toFixed(2) }}</span>
        </div>
      </div>

      <div class="settings-section">
        <h4>⚡ 力导向</h4>
        <div class="setting-row">
          <label>中心引力</label>
          <input type="range" min="0.001" max="0.08" step="0.002" v-model.number="settings.centerForce" @change="updatePhysics" />
          <span>{{ settings.centerForce.toFixed(3) }}</span>
        </div>
        <div class="setting-row">
          <label>排斥力</label>
          <input type="range" min="-80" max="-8" step="2" v-model.number="settings.repelForce" @change="updatePhysics" />
          <span>{{ Math.abs(settings.repelForce) }}</span>
        </div>
        <div class="setting-row">
          <label>弹簧强度</label>
          <input type="range" min="0.01" max="0.18" step="0.01" v-model.number="settings.springConstant" @change="updatePhysics" />
          <span>{{ settings.springConstant.toFixed(2) }}</span>
        </div>
        <div class="setting-row">
          <label>弹簧长度</label>
          <input type="range" min="50" max="220" step="10" v-model.number="settings.springLength" @change="updatePhysics" />
          <span>{{ settings.springLength }}</span>
        </div>
      </div>

      <div class="settings-section">
        <h4>🔍 过滤</h4>
        <div class="setting-row" style="flex-direction: column; align-items: stretch;">
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="搜索笔记标题或路径..." 
            class="search-input"
            @input="handleSearch"
          />
        </div>
        <div class="setting-row">
          <label>显示孤立节点</label>
          <input type="checkbox" v-model="settings.showOrphans" @change="updateFilters" />
        </div>
      </div>
    </div>

    <!-- 图谱容器 -->
    <div class="graph-canvas-wrapper">
      <div class="graph-canvas" ref="canvasRef"></div>

      <!-- 右键菜单 -->
      <div v-if="contextMenu.show" class="context-menu" :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }" @click.stop>
        <div class="context-menu-item" @click="handleContextMenuAction('open')">
          📄 打开笔记
        </div>
        <div class="context-menu-item" @click="handleContextMenuAction('focus')">
          🔍 聚焦此节点
        </div>
        <div class="context-menu-item" @click="handleContextMenuAction('highlight')">
          ✨ 高亮连接
        </div>
        <div class="context-menu-divider"></div>
        <div class="context-menu-item" @click="handleContextMenuAction('hide')">
          👁️ 隐藏此节点
        </div>
      </div>
    </div>

    <!-- 图例 -->
    <div v-if="standalone" class="graph-legend">
      <div class="legend-item">
        <span class="legend-dot" style="background: #f59e0b; border-color: #d97706;"></span>
        <span>当前笔记</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot" style="background: #7c3aed; border-color: #6d28d9;"></span>
        <span>悬停高亮</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot" style="background: #10b981; border-color: #059669;"></span>
        <span>邻居节点</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot" style="background: #c4b5fd; border-color: #a78bfa;"></span>
        <span>普通节点</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue'
import { Network } from 'vis-network'
import { DataSet } from 'vis-data'

const props = defineProps<{
  nodes?: Array<{ id: string; label: string; path?: string; isCurrent?: boolean; degree?: number }>
  edges?: Array<{ source: string; target: string }>
  currentFile?: string
  standalone?: boolean
}>()

const emit = defineEmits<{
  (e: 'node-click', path: string): void
}>()

const canvasRef = ref<HTMLElement | null>(null)
const showFilters = ref(false)
const isDraggingNode = ref(false)

const settings = ref({
  showArrows: true,
  nodeSize: 11,
  linkWidth: 1.2,
  textFadeThreshold: 0.45,
  centerForce: 0.012,
  repelForce: -38,
  springConstant: 0.055,
  springLength: 95,
  showOrphans: true,
})

const searchQuery = ref('')
const contextMenu = ref({ show: false, x: 0, y: 0, nodeId: '' as string | null })
const hiddenNodes = ref<Set<string>>(new Set())

// 拖拽状态（使用普通对象，避免响应式开销）
const dragState = {
  active: false,
  nodeId: null as string | null,
  startPosition: null as { x: number; y: number } | null,
  neighborInitialPositions: new Map<string, { x: number; y: number }>(),
  neighborInfluences: new Map<string, number>(),
}

// 计算节点连接度
const nodeDegrees = computed(() => {
  const degrees = new Map<string, number>()
  const edgesData = (props.edges || []).filter(e => e.source && e.target)
  props.nodes?.forEach(n => degrees.set(n.id, 0))
  edgesData.forEach(e => {
    degrees.set(e.source, (degrees.get(e.source) || 0) + 1)
    degrees.set(e.target, (degrees.get(e.target) || 0) + 1)
  })
  return degrees
})

// 可见节点
const visibleNodes = computed(() => {
  let nodes = props.nodes || []
  nodes = nodes.filter(n => !hiddenNodes.value.has(n.id))
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    nodes = nodes.filter(n => 
      (n.label || n.id).toLowerCase().includes(query) ||
      (n.path || '').toLowerCase().includes(query)
    )
  }
  if (!settings.value.showOrphans) {
    const degrees = nodeDegrees.value
    nodes = nodes.filter(n => (degrees.get(n.id) || 0) > 0)
  }
  return nodes
})

// 可见边
const visibleEdges = computed(() => {
  const visibleIds = new Set(visibleNodes.value.map(n => n.id))
  return (props.edges || []).filter(
    e => e.source && e.target && visibleIds.has(e.source) && visibleIds.has(e.target)
  )
})

const visibleNodeCount = computed(() => visibleNodes.value.length)
const visibleEdgeCount = computed(() => visibleEdges.value.length)

// 网络实例
let networkInstance: Network | null = null
let nodesDataset: DataSet<any> | null = null
let edgesDataset: DataSet<any> | null = null

// ===== 工具函数：获取直接邻居 =====
function getDirectNeighbors(nodeId: string): Set<string> {
  const neighbors = new Set<string>()
  visibleEdges.value.forEach(e => {
    if (e.source === nodeId && visibleNodes.value.some(n => n.id === e.target)) neighbors.add(e.target)
    if (e.target === nodeId && visibleNodes.value.some(n => n.id === e.source)) neighbors.add(e.source)
  })
  return neighbors
}

// ===== Obsidian 风格颜色映射 =====
function getNodeColor(node: { id: string; label?: string; path?: string; isCurrent?: boolean }) {
  if (node.isCurrent) {
    return {
      background: '#f59e0b',
      border: '#d97706',
      highlight: { background: '#fbbf24', border: '#f59e0b' },
      hover: { background: '#fbbf24', border: '#f59e0b' },
    }
  }
  const path = (node.path || node.id || '').toLowerCase()
  if (/\.(png|jpg|jpeg|gif|svg|webp|ico)/i.test(path)) {
    return { background: '#34d399', border: '#10b981', highlight: { background: '#6ee7b7', border: '#34d399' }, hover: { background: '#6ee7b7', border: '#34d399' } }
  }
  if (/\.(pdf|doc|docx|xls|xlsx|ppt|pptx)/i.test(path)) {
    return { background: '#f87171', border: '#ef4444', highlight: { background: '#fca5a5', border: '#f87171' }, hover: { background: '#fca5a5', border: '#f87171' } }
  }
  if (/\.(mp3|wav|ogg|flac|aac)/i.test(path)) {
    return { background: '#fbbf24', border: '#f59e0b', highlight: { background: '#fcd34d', border: '#fbbf24' }, hover: { background: '#fcd34d', border: '#fbbf24' } }
  }
  if (/(tech|code|dev|编程|技术)/i.test(path)) {
    return { background: '#a78bfa', border: '#8b5cf6', highlight: { background: '#c4b5fd', border: '#a78bfa' }, hover: { background: '#c4b5fd', border: '#a78bfa' } }
  }
  if (/(work|工作|会议)/i.test(path)) {
    return { background: '#67e8f9', border: '#06b6d4', highlight: { background: '#a5f3fc', border: '#67e8f9' }, hover: { background: '#a5f3fc', border: '#67e8f9' } }
  }
  if (/(personal|个人|生活)/i.test(path)) {
    return { background: '#f9a8d4', border: '#ec4899', highlight: { background: '#fbcfe8', border: '#f9a8d4' }, hover: { background: '#fbcfe8', border: '#f9a8d4' } }
  }
  // 默认柔紫色
  return { background: '#c4b5fd', border: '#a78bfa', highlight: { background: '#ddd6fe', border: '#c4b5fd' }, hover: { background: '#ddd6fe', border: '#c4b5fd' } }
}

// ===== 重置所有节点和边的视觉效果 =====
function resetAllVisuals() {
  if (!nodesDataset || !edgesDataset) return
  const nodesData = visibleNodes.value
  const nodeMap = new Map(nodesData.map(n => [n.id, n]))
  const allNodeIds = nodesDataset.getIds() as string[]
  const allEdgeIds = edgesDataset.getIds() as string[]

  const nodeUpdates = allNodeIds.map(id => {
    const n = nodeMap.get(id)
    const color = getNodeColor(n || { id, label: id, path: id, isCurrent: false })
    const baseSize = settings.value.nodeSize
    const degree = (n && nodeDegrees.value.get(id)) || 0
    const maxDegree = Math.max(...nodeDegrees.value.values(), 1)
    const logScale = Math.log(1 + degree) / Math.log(1 + maxDegree)
    const size = (n && n.isCurrent) ? baseSize * 1.55 : baseSize + logScale * baseSize * 1.1
    
    return {
      id,
      opacity: 1,
      borderWidth: (n && n.isCurrent) ? 3 : 1.8,
      color,
      size: Math.round(size * 10) / 10,
      shadow: {
        enabled: true,
        color: (n && n.isCurrent) ? 'rgba(245,158,11,0.35)' : 'rgba(0,0,0,0.08)',
        size: (n && n.isCurrent) ? 8 : 4,
        x: 0,
        y: (n && n.isCurrent) ? 3 : 1.5,
      },
      font: {
        color: '#374151',
        size: 11,
        face: 'system-ui',
        strokeWidth: 3,
        strokeColor: 'rgba(255,255,255,0.85)',
      },
    }
  })

  const edgeUpdates = allEdgeIds.map(id => ({
    id,
    color: { color: '#d1d5db', highlight: '#7c3aed', hover: '#8b5cf6' },
    width: settings.value.linkWidth,
    opacity: 1,
  }))

  nodesDataset.update(nodeUpdates)
  edgesDataset.update(edgeUpdates)
}

// ===== 渲染图谱 =====
const renderGraph = () => {
  if (!canvasRef.value) return

  const nodesData = visibleNodes.value
  const edgesData = visibleEdges.value

  if (nodesData.length === 0) {
    if (networkInstance) {
      networkInstance.destroy()
      networkInstance = null
    }
    return
  }

  const degrees = nodeDegrees.value
  const maxDegree = Math.max(...degrees.values(), 1)
  const baseSize = settings.value.nodeSize

  const nodes = new DataSet(
    nodesData.map((n) => {
      const degree = degrees.get(n.id) || 0
      const logScale = Math.log(1 + degree) / Math.log(1 + maxDegree)
      const size = n.isCurrent ? baseSize * 1.55 : baseSize + logScale * baseSize * 1.1
      const color = getNodeColor(n)

      return {
        id: n.id,
        label: n.label || n.id,
        shape: 'dot',
        size: Math.round(size * 10) / 10,
        color,
        font: {
          color: '#374151',
          size: 11,
          face: 'system-ui',
          strokeWidth: 3,
          strokeColor: 'rgba(255,255,255,0.85)',
          bold: n.isCurrent ? { color: '#1a1a1a', size: 12, face: 'system-ui', strokeWidth: 4 } : undefined,
        },
        borderWidth: n.isCurrent ? 3 : 1.8,
        borderWidthSelected: 3.5,
        shadow: {
          enabled: true,
          color: n.isCurrent ? 'rgba(245,158,11,0.35)' : 'rgba(0,0,0,0.08)',
          size: n.isCurrent ? 8 : 4,
          x: 0,
          y: n.isCurrent ? 3 : 1.5,
        },
        path: n.path || n.id,
        isCurrent: n.isCurrent || false,
        degree,
      }
    })
  )

  const edges = new DataSet(
    edgesData.map((e) => ({
      id: `${e.source}→${e.target}`,
      from: e.source,
      to: e.target,
      width: settings.value.linkWidth,
      color: { color: '#d1d5db', highlight: '#7c3aed', hover: '#8b5cf6' },
      arrows: {
        to: {
          enabled: settings.value.showArrows,
          scaleFactor: 0.45,
          type: 'arrow',
        },
      },
      smooth: { enabled: true, type: 'continuous', roundness: 0.55 },
      selectionWidth: 1.5,
      hoverWidth: 1.8,
    }))
  )

  nodesDataset = nodes
  edgesDataset = edges

  const data = { nodes, edges }
  const options = {
    interaction: {
      hover: true,
      hoverConnectedEdges: false,
      tooltipDelay: 80,
      zoomView: true,
      dragView: true,
      dragNodes: true,
      multiselect: true,
      navigationButtons: false,
      keyboard: { enabled: true, speed: { x: 8, y: 8, zoom: 0.015 } },
      selectConnectedEdges: false,
    },
    physics: {
      enabled: true,
      solver: 'forceAtlas2Based',
      forceAtlas2Based: {
        gravitationalConstant: settings.value.repelForce,
        centralGravity: settings.value.centerForce,
        springConstant: settings.value.springConstant,
        springLength: settings.value.springLength,
        damping: 0.45,
        avoidOverlap: 0.6,
      },
      stabilization: {
        enabled: true,
        iterations: 800,
        updateInterval: 40,
        onlyDynamicEdges: false,
        fit: true,
      },
      adaptiveTimestep: true,
      wind: { x: 0, y: 0 },
    },
    layout: { improvedLayout: true, randomSeed: 42 },
    nodes: {
      borderWidth: 1.8,
      borderWidthSelected: 3.5,
      shadow: { enabled: true, color: 'rgba(0,0,0,0.06)', size: 4, x: 0, y: 1.5 },
    },
    edges: {
      smooth: { enabled: true, type: 'continuous', roundness: 0.55 },
      selectionWidth: 1.5,
      hoverWidth: 1.8,
    },
  }

  if (networkInstance) {
    networkInstance.destroy()
  }

  networkInstance = new Network(canvasRef.value, data, options)

  // ----- 拖拽事件（Obsidian 核心邻居跟随） -----
  networkInstance.on('dragStart', (params: any) => {
    if (!networkInstance || !nodesDataset) return
    const nodeId = params.nodes?.[0]
    if (!nodeId) return

    isDraggingNode.value = true
    dragState.active = true
    dragState.nodeId = nodeId

    // 暂停物理引擎
    networkInstance.setOptions({ physics: { enabled: false } })

    const allPositions = networkInstance.getPositions()
    dragState.startPosition = {
      x: allPositions[nodeId]?.x || 0,
      y: allPositions[nodeId]?.y || 0,
    }

    const neighbors = getDirectNeighbors(nodeId)
    const degrees = nodeDegrees.value
    const maxDeg = Math.max(...degrees.values(), 1)

    dragState.neighborInitialPositions.clear()
    dragState.neighborInfluences.clear()

    neighbors.forEach(nid => {
      if (allPositions[nid]) {
        const pos = allPositions[nid]
        dragState.neighborInitialPositions.set(nid, { x: pos.x, y: pos.y })

        const dist = Math.sqrt(
          Math.pow(pos.x - dragState.startPosition!.x, 2) +
          Math.pow(pos.y - dragState.startPosition!.y, 2)
        )
        const refDist = settings.value.springLength
        const distFactor = 1 / (1 + Math.pow(dist / refDist, 2.2))
        const neighborDeg = degrees.get(nid) || 1
        const degreeFactor = 1 / (1 + (neighborDeg / Math.max(maxDeg, 1)) * 1.5)
        const influence = Math.max(0.08, Math.min(0.88, distFactor * degreeFactor * 0.82))
        dragState.neighborInfluences.set(nid, influence)
      }
    })
  })

  networkInstance.on('dragging', (params: any) => {
    if (!dragState.active || !networkInstance || !nodesDataset || !dragState.nodeId) return

    const currentPositions = networkInstance.getPositions()
    const draggedPos = currentPositions[dragState.nodeId]
    if (!draggedPos || !dragState.startPosition) return

    const dx = draggedPos.x - dragState.startPosition.x
    const dy = draggedPos.y - dragState.startPosition.y

    const updates: Array<{ id: string; x: number; y: number }> = []
    dragState.neighborInitialPositions.forEach((initPos, nid) => {
      const influence = dragState.neighborInfluences.get(nid) || 0.3
      updates.push({ id: nid, x: initPos.x + dx * influence, y: initPos.y + dy * influence })
    })

    if (updates.length > 0) {
      nodesDataset.update(updates)
    }
  })

  networkInstance.on('dragEnd', () => {
    if (!networkInstance) return
    isDraggingNode.value = false
    dragState.active = false
    dragState.nodeId = null
    dragState.startPosition = null
    dragState.neighborInitialPositions.clear()
    dragState.neighborInfluences.clear()

    networkInstance.setOptions({ physics: { enabled: true } })
    networkInstance.once('stabilized', () => {
      networkInstance?.fit({ animation: { duration: 400, easingFunction: 'easeInOutQuad' } })
    })
  })

  // ----- 悬停高亮 -----
  networkInstance.on('hoverNode', (params: any) => {
    if (!networkInstance || !nodesDataset || !edgesDataset || dragState.active) return
    const nodeId = params.node
    if (!nodeId) return

    const connectedNodes = networkInstance.getConnectedNodes(nodeId) as string[]
    const connectedEdges = networkInstance.getConnectedEdges(nodeId) as string[]
    const allNodeIds = nodesDataset.getIds() as string[]
    const allEdgeIds = edgesDataset.getIds() as string[]

    const nodeUpdates = allNodeIds.map(id => {
      const isConnected = id === nodeId || connectedNodes.includes(id)
      return {
        id,
        opacity: isConnected ? 1 : 0.22,
        borderWidth: id === nodeId ? 3.5 : (isConnected ? 2.5 : 0.8),
        shadow: {
          enabled: true,
          color: id === nodeId ? 'rgba(124,58,237,0.45)' : 'rgba(0,0,0,0.04)',
          size: id === nodeId ? 10 : 3,
          x: 0,
          y: id === nodeId ? 4 : 1,
        },
      }
    })

    const edgeUpdates = allEdgeIds.map(id => ({
      id,
      color: connectedEdges.includes(id)
        ? { color: '#7c3aed', highlight: '#7c3aed', hover: '#8b5cf6' }
        : { color: '#e5e7eb', highlight: '#e5e7eb', hover: '#e5e7eb' },
      width: connectedEdges.includes(id) ? settings.value.linkWidth * 1.7 : 0.3,
      opacity: connectedEdges.includes(id) ? 1 : 0.12,
    }))

    nodesDataset.update(nodeUpdates)
    edgesDataset.update(edgeUpdates)
  })

  networkInstance.on('blurNode', () => {
    if (!nodesDataset || !edgesDataset || dragState.active) return
    resetAllVisuals()
  })

  // ----- 点击节点跳转 -----
  networkInstance.on('click', (params: any) => {
    if (params.nodes && params.nodes.length > 0) {
      const nodeId = params.nodes[0]
      const node = nodesDataset?.get(nodeId) as any
      if (node && node.path) {
        emit('node-click', node.path)
      }
    }
    contextMenu.value.show = false
  })

  // ----- 双击聚焦 -----
  networkInstance.on('doubleClick', (params: any) => {
    if (params.nodes && params.nodes.length > 0 && networkInstance) {
      const nodeId = params.nodes[0]
      networkInstance.focus(nodeId, {
        scale: 1.6,
        animation: { duration: 500, easingFunction: 'easeInOutQuad' },
      })
    }
  })

  // ----- 右键菜单 -----
  networkInstance.on('oncontext', (params: any) => {
    params.event.preventDefault()
    const nodeId = networkInstance?.getNodeAt(params.pointer.DOM)
    if (nodeId) {
      contextMenu.value = {
        show: true,
        x: params.pointer.DOM.x,
        y: params.pointer.DOM.y,
        nodeId: nodeId as string,
      }
    } else {
      contextMenu.value.show = false
      contextMenu.value.nodeId = null
    }
  })

  // ----- 缩放标签淡入淡出 -----
  networkInstance.on('zoom', (params: any) => {
    if (!nodesDataset || dragState.active) return
    const scale = params.scale
    const threshold = settings.value.textFadeThreshold
    const opacity = Math.min(1, Math.max(0.06, (scale - 0.08) / Math.max(threshold, 0.1)))
    const allNodeIds = nodesDataset.getIds() as string[]
    const updates = allNodeIds.map(id => ({
      id,
      font: {
        color: `rgba(55,65,81,${opacity.toFixed(3)})`,
        size: 11,
        face: 'system-ui',
        strokeWidth: 3,
        strokeColor: `rgba(255,255,255,${(opacity * 0.85).toFixed(3)})`,
      },
    }))
    nodesDataset.update(updates)
  })

  // 首次稳定后居中
  networkInstance.once('stabilized', () => {
    networkInstance?.fit({ animation: { duration: 300, easingFunction: 'easeInOutQuad' } })
  })
}

// ===== 设置/物理更新 =====
function updateSettings() {
  if (!networkInstance || !nodesDataset || !edgesDataset) return
  const nodesData = visibleNodes.value
  const degrees = nodeDegrees.value
  const maxDegree = Math.max(...degrees.values(), 1)
  const baseSize = settings.value.nodeSize

  const nodeUpdates = nodesData.map(n => {
    const degree = degrees.get(n.id) || 0
    const logScale = Math.log(1 + degree) / Math.log(1 + maxDegree)
    const size = n.isCurrent ? baseSize * 1.55 : baseSize + logScale * baseSize * 1.1
    return { id: n.id, size: Math.round(size * 10) / 10 }
  })

  const edgeUpdates = visibleEdges.value.map(e => ({
    id: `${e.source}→${e.target}`,
    width: settings.value.linkWidth,
    arrows: { to: { enabled: settings.value.showArrows, scaleFactor: 0.45, type: 'arrow' } },
  }))

  nodesDataset.update(nodeUpdates)
  edgesDataset.update(edgeUpdates)
  resetAllVisuals()
}

function updatePhysics() {
  if (!networkInstance) return
  networkInstance.setOptions({
    physics: {
      forceAtlas2Based: {
        gravitationalConstant: settings.value.repelForce,
        centralGravity: settings.value.centerForce,
        springConstant: settings.value.springConstant,
        springLength: settings.value.springLength,
      },
    },
  })
  networkInstance.startSimulation()
  networkInstance.once('stabilized', () => {
    networkInstance?.fit({ animation: { duration: 400, easingFunction: 'easeInOutQuad' } })
  })
}

function updateFilters() {
  nextTick(() => renderGraph())
}

function handleSearch() {
  nextTick(() => renderGraph())
}

// ===== 工具栏操作 =====
function fitView(): void {
  if (networkInstance) {
    networkInstance.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } })
  }
}

function reLayout(): void {
  if (networkInstance) {
    networkInstance.setOptions({ physics: { enabled: true } })
    // 轻微随机扰动节点位置以触发重新布局
    const positions = networkInstance.getPositions()
    const nodeIds = Object.keys(positions)
    const updates = nodeIds.map(id => ({
      id,
      x: positions[id].x + (Math.random() - 0.5) * 30,
      y: positions[id].y + (Math.random() - 0.5) * 30,
    }))
    if (nodesDataset && updates.length > 0) {
      nodesDataset.update(updates)
    }
    networkInstance.startSimulation()
    networkInstance.once('stabilized', () => {
      networkInstance?.fit({ animation: { duration: 400, easingFunction: 'easeInOutQuad' } })
    })
  }
}

function exportImage(): string {
  if (!networkInstance) return ''
  const canvas = canvasRef.value?.querySelector('canvas')
  if (canvas) {
    const dataURL = canvas.toDataURL('image/png')
    // 触发下载
    const link = document.createElement('a')
    link.download = `关系图谱_${new Date().toISOString().slice(0, 10)}.png`
    link.href = dataURL
    link.click()
    return dataURL
  }
  return ''
}

function handleContextMenuAction(action: string) {
  const nodeId = contextMenu.value.nodeId
  if (!nodeId) return

  switch (action) {
    case 'open':
      const node = nodesDataset?.get(nodeId) as any
      if (node?.path) {
        emit('node-click', node.path)
      }
      break
    case 'focus':
      if (networkInstance) {
        networkInstance.focus(nodeId, {
          scale: 1.5,
          animation: { duration: 500, easingFunction: 'easeInOutQuad' },
        })
      }
      break
    case 'highlight':
      if (networkInstance) {
        networkInstance.selectNodes([nodeId])
      }
      break
    case 'hide':
      hiddenNodes.value = new Set([...hiddenNodes.value, nodeId])
      contextMenu.value.show = false
      nextTick(() => renderGraph())
      return
  }
  contextMenu.value.show = false
}

// ===== 键盘快捷键 =====
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    contextMenu.value.show = false
    showFilters.value = false
    if (networkInstance) {
      networkInstance.unselectAll()
      resetAllVisuals()
    }
  }
  if (event.key === 'f' && event.ctrlKey && !event.metaKey) {
    event.preventDefault()
    showFilters.value = true
    nextTick(() => {
      const input = document.querySelector('.search-input') as HTMLInputElement
      if (input) input.focus()
    })
  }
  if (event.key === '0' && event.ctrlKey) {
    event.preventDefault()
    fitView()
  }
}

// ===== 点击外部关闭菜单 =====
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.context-menu') && !target.closest('.graph-settings-panel')) {
    contextMenu.value.show = false
  }
}

// ===== 窗口自适应 =====
function handleResize(): void {
  if (networkInstance) networkInstance.fit()
}

// ===== 暴露方法 =====
defineExpose({ fitView, exportImage, reLayout })

// ===== 监听数据变化 =====
watch(() => [props.nodes, props.edges], () => {
  hiddenNodes.value.clear()
  nextTick(renderGraph)
}, { deep: true })

// ===== 生命周期 =====
onMounted(() => {
  nextTick(() => {
    renderGraph()
    window.addEventListener('resize', handleResize)
    document.addEventListener('click', handleClickOutside)
    document.addEventListener('keydown', handleKeydown)
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeydown)
  if (networkInstance) {
    networkInstance.destroy()
    networkInstance = null
  }
})
</script>

<style scoped>
/* 复用原有样式，并增加 Obsidian 风格微调 */
.graph-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: #ffffff;
  overflow: hidden;
  position: relative;
  --accent: #7c3aed;
  --border: #e8e8ed;
  --shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 10px rgba(0, 0, 0, 0.06);
}

.graph-container.standalone .graph-canvas-wrapper {
  flex: 1;
  min-height: 0;
  padding: 0;
}

.graph-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  background: #fafafa;
  flex-wrap: wrap;
  gap: 8px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.title-icon {
  font-size: 16px;
}

.graph-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  letter-spacing: -0.01em;
}

.graph-stats {
  font-size: 11px;
  color: #999;
  background: #f3f4f6;
  padding: 3px 10px;
  border-radius: 20px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.toolbar-btn {
  padding: 6px 13px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  color: #555;
  transition: all 0.18s;
  font-family: inherit;
  font-weight: 500;
}

.toolbar-btn:hover {
  background: #f0f0f0;
  border-color: #ccc;
}

.toolbar-btn.active {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}

/* 设置面板 */
.graph-settings-panel {
  position: absolute;
  top: 56px;
  right: 16px;
  width: 290px;
  max-height: calc(100% - 100px);
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.97);
  backdrop-filter: blur(16px);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 18px;
  z-index: 100;
  box-shadow: var(--shadow-lg);
  animation: panelIn 0.2s ease-out;
}

@keyframes panelIn {
  from { opacity: 0; transform: translateY(-8px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.settings-section {
  margin-bottom: 18px;
}

.settings-section:last-child {
  margin-bottom: 0;
}

.settings-section h4 {
  margin: 0 0 10px 0;
  font-size: 11px;
  font-weight: 700;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 9px;
  gap: 8px;
}

.setting-row label {
  font-size: 12px;
  color: #555;
  flex: 1;
  font-weight: 500;
}

.setting-row input[type="range"] {
  flex: 1.2;
  min-width: 70px;
  accent-color: var(--accent);
  height: 4px;
}

.setting-row input[type="checkbox"] {
  width: 17px;
  height: 17px;
  accent-color: var(--accent);
}

.setting-row span {
  font-size: 11px;
  color: #999;
  min-width: 28px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.search-input {
  width: 100%;
  padding: 7px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 12px;
  outline: none;
  transition: border-color 0.18s;
  font-family: inherit;
  background: #fafafa;
}

.search-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.08);
  background: #fff;
}

/* 画布 */
.graph-canvas-wrapper {
  flex: 1;
  width: 100%;
  position: relative;
  background: radial-gradient(circle, #fafafa 0%, #f5f5f5 100%);
  cursor: grab;
}

.graph-canvas-wrapper:active {
  cursor: grabbing;
}

.graph-canvas {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

/* 右键菜单 */
.context-menu {
  position: absolute;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 0;
  min-width: 180px;
  box-shadow: var(--shadow-lg);
  z-index: 200;
  animation: menuIn 0.14s ease-out;
}

@keyframes menuIn {
  from { opacity: 0; transform: scale(0.92); }
  to { opacity: 1; transform: scale(1); }
}

.context-menu-item {
  padding: 9px 18px;
  font-size: 12.5px;
  color: #333;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}

.context-menu-item:hover {
  background: #f5f3ff;
  color: var(--accent);
}

.context-menu-divider {
  height: 1px;
  background: var(--border);
  margin: 5px 0;
}

/* 图例 */
.graph-legend {
  position: absolute;
  bottom: 18px;
  left: 18px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(10px);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 15px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  z-index: 50;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  pointer-events: none;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 11px;
  color: #666;
  font-weight: 500;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid;
  flex-shrink: 0;
}
</style>