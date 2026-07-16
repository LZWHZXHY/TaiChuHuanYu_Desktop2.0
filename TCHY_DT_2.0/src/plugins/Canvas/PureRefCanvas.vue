<template>
  <!-- 在容器上阻止默认右键菜单 -->
  <div class="canvas-container" ref="containerRef" @contextmenu.prevent>
    <div class="toolbar">
      <button @click="() => addImage()" title="添加图片">📷</button>
      <button @click="() => addText()" title="添加文字">📝</button>
      <button @click="() => zoomIn()" title="放大">➕</button>
      <button @click="() => zoomOut()" title="缩小">➖</button>
      <button @click="() => fitToScreen()" title="适应画布">⊡</button>
      <button @click="() => saveProject()" title="保存项目">💾</button>
      <button @click="() => exportAsImage()" title="导出为 PNG">⬇</button>
      <span class="project-name">{{ projectName }}</span>
      <span style="margin-left:12px;font-size:12px;color:#999;">🖱 中键拖拽平移</span>
    </div>

    <canvas ref="canvasEl"></canvas>

    <ContextMenu
      v-if="contextMenuVisible"
      :x="contextMenuX"
      :y="contextMenuY"
      :items="contextMenuItems"
      @close="contextMenuVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import * as fabric from 'fabric';
import { invoke } from '@tauri-apps/api/core';
import { writeTextFile, readTextFile, mkdir } from '@tauri-apps/plugin-fs';
import { open, save } from '@tauri-apps/plugin-dialog';
import { join, appConfigDir } from '@tauri-apps/api/path';
import ContextMenu from '@/components/local_notes/ContextMenu.vue';

const canvas = ref<any>(null);

const containerRef = ref<HTMLDivElement>();
const canvasEl = ref<HTMLCanvasElement>();
const currentProjectPath = ref<string>('');
const projectName = ref<string>('未命名画布');

const contextMenuVisible = ref(false);
const contextMenuX = ref(0);
const contextMenuY = ref(0);
const contextMenuItems = ref<Array<{ label: string; action: () => void }>>([]);

// 平移状态
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let panStartVpt: number[] = [1, 0, 0, 1, 0, 0];

// ---- 层级辅助函数 ----
function moveObjectToTop(obj: any) {
  if (!canvas.value) return;
  const objects = canvas.value._objects;
  const idx = objects.indexOf(obj);
  if (idx === -1 || idx === objects.length - 1) return;
  objects.splice(idx, 1);
  objects.push(obj);
  canvas.value.renderAll();
}

function moveObjectToBottom(obj: any) {
  if (!canvas.value) return;
  const objects = canvas.value._objects;
  const idx = objects.indexOf(obj);
  if (idx === -1 || idx === 0) return;
  objects.splice(idx, 1);
  objects.unshift(obj);
  canvas.value.renderAll();
}

// --- 初始化 ---
onMounted(async () => {
  await nextTick();
  const container = containerRef.value;
  if (!container) return;

  const width = container.clientWidth;
  const height = container.clientHeight;

  canvas.value = new fabric.Canvas(canvasEl.value, {
    width,
    height,
    backgroundColor: '#f8f8f8',
    selection: true,
    selectionColor: 'rgba(100,100,255,0.1)',
    selectionBorderColor: '#007aff',
    enableRetinaScaling: true,
  });

  drawGrid();

  // 滚轮缩放
  canvas.value.on('mouse:wheel', (opt: any) => {
    const e = opt.e as WheelEvent;
    let zoom = canvas.value.getZoom();
    zoom *= 0.999 ** e.deltaY;
    if (zoom > 20) zoom = 20;
    if (zoom < 0.01) zoom = 0.01;
    canvas.value.setZoom(zoom);
    e.preventDefault();
  });

  // ---- 鼠标事件：中键平移 + 右键菜单（手动计算坐标） ----
  canvas.value.on('mouse:down', (opt: any) => {
    const e = opt.e as MouseEvent;
    if (e.button === 1) {
      isPanning = true;
      panStartX = e.clientX;
      panStartY = e.clientY;
      panStartVpt = canvas.value.viewportTransform.slice();
      canvas.value.selection = false;
      canvas.value.defaultCursor = 'grab';
      e.preventDefault();
    } else if (e.button === 2) {
      // 右键菜单：手动计算画布坐标
      const canvasEl = canvas.value.upperCanvasEl;
      const rect = canvasEl.getBoundingClientRect();
      const zoom = canvas.value.getZoom();
      const vpt = canvas.value.viewportTransform;
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const x = (px - vpt[4]) / zoom;
      const y = (py - vpt[5]) / zoom;
      showContextMenu(x, y, opt.target);
      e.preventDefault();
    }
  });

  canvas.value.on('mouse:move', (opt: any) => {
    const e = opt.e as MouseEvent;
    if (isPanning) {
      const dx = e.clientX - panStartX;
      const dy = e.clientY - panStartY;
      const vpt = panStartVpt.slice();
      vpt[4] = panStartVpt[4] + dx;
      vpt[5] = panStartVpt[5] + dy;
      canvas.value.setViewportTransform(vpt);
      canvas.value.renderAll();
      e.preventDefault();
    }
  });

  canvas.value.on('mouse:up', (opt: any) => {
    const e = opt.e as MouseEvent;
    if (isPanning) {
      isPanning = false;
      canvas.value.selection = true;
      canvas.value.defaultCursor = 'default';
      e.preventDefault();
    }
  });

  // 阻止 canvas 上默认右键菜单（但容器已全局阻止，此步可选）
  canvas.value.upperCanvasEl.addEventListener('contextmenu', (e: Event) => {
    e.preventDefault();
  });

  // 其他事件
  canvas.value.on('object:modified', () => {});
  canvas.value.on('selection:created', () => {});
  canvas.value.on('selection:updated', () => {});
  canvas.value.on('selection:cleared', () => {});

  window.addEventListener('resize', handleResize);
  container.addEventListener('dragover', (e) => e.preventDefault());
  container.addEventListener('drop', onDrop);

  await loadDefaultProject();
});

// --- 网格 ---
const drawGrid = () => {
  if (!canvas.value) return;
  const size = 30;
  const w = canvas.value.getWidth();
  const h = canvas.value.getHeight();
  const lines: fabric.Line[] = [];
  for (let i = 0; i <= w; i += size) {
    lines.push(new fabric.Line([i, 0, i, h], { stroke: '#e8e8e8', selectable: false, evented: false, strokeWidth: 0.5 }));
  }
  for (let i = 0; i <= h; i += size) {
    lines.push(new fabric.Line([0, i, w, i], { stroke: '#e8e8e8', selectable: false, evented: false, strokeWidth: 0.5 }));
  }
  const group = new fabric.Group(lines, { selectable: false, evented: false });
  canvas.value.add(group);
  moveObjectToBottom(group);
  canvas.value.renderAll();
};

// --- 工具栏函数 ---
const zoomIn = () => {
  if (!canvas.value) return;
  canvas.value.setZoom(canvas.value.getZoom() * 1.2);
};
const zoomOut = () => {
  if (!canvas.value) return;
  canvas.value.setZoom(canvas.value.getZoom() / 1.2);
};
const fitToScreen = () => {
  if (!canvas.value) return;
  const objects = canvas.value.getObjects();
  if (objects.length === 0) {
    canvas.value.setViewportTransform([1, 0, 0, 1, 0, 0]);
    canvas.value.setZoom(1);
    return;
  }
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  objects.forEach((o: any) => {
    const r = o.getBoundingRect();
    if (r.left < left) left = r.left;
    if (r.top < top) top = r.top;
    if (r.left + r.width > right) right = r.left + r.width;
    if (r.top + r.height > bottom) bottom = r.top + r.height;
  });
  const w = right - left, h = bottom - top;
  if (w === 0 || h === 0) return;
  const cw = canvas.value.getWidth(), ch = canvas.value.getHeight();
  const scale = Math.min(cw / w, ch / h) * 0.9;
  const cx = left + w / 2, cy = top + h / 2;
  canvas.value.setViewportTransform([1, 0, 0, 1, 0, 0]);
  canvas.value.setZoom(scale);
  canvas.value.absolutePan(new fabric.Point(cw / 2 - cx * scale, ch / 2 - cy * scale));
  canvas.value.renderAll();
};

// --- 添加图片 ---
const addImage = async (x?: number, y?: number) => {
  const selected = await open({
    multiple: false,
    filters: [{ name: 'Image', extensions: ['png','jpg','jpeg','gif','svg','webp'] }],
  });
  if (!selected || typeof selected !== 'string') return;
  try {
    const data = await invoke<string>('read_file_as_base64', { path: selected });
    (fabric.Image.fromURL as any)(
      data,
      (img: any) => {
        img.scaleToWidth(200);
        let posX = 100, posY = 100;
        if (x !== undefined && y !== undefined && !isNaN(x) && !isNaN(y)) {
          posX = x;
          posY = y;
        } else {
          const center = canvas.value.getCenter();
          posX = center.left - 100 + Math.random() * 40;
          posY = center.top - 100 + Math.random() * 40;
        }
        img.set({ left: posX, top: posY });
        canvas.value.add(img);
        canvas.value.setActiveObject(img);
        canvas.value.renderAll();
      },
      { crossOrigin: 'anonymous' }
    );
  } catch (err) { console.error(err); }
};

// --- 添加文字 ---
const addText = (x?: number, y?: number) => {
  let posX = 100, posY = 100;
  if (x !== undefined && y !== undefined && !isNaN(x) && !isNaN(y)) {
    posX = x;
    posY = y;
  }
  const text = new fabric.IText('双击编辑', {
    left: posX,
    top: posY,
    fontSize: 24,
    fontFamily: 'PingFang SC, sans-serif',
    fill: '#333',
  });
  canvas.value.add(text);
  canvas.value.setActiveObject(text);
  canvas.value.renderAll();
};

// --- 保存项目 ---
const saveProject = async () => {
  if (!canvas.value) return;
  const json = canvas.value.toJSON(['customData']);
  const content = JSON.stringify(json, null, 2);
  let path = currentProjectPath.value;
  if (!path) {
    const configDir = await appConfigDir();
    const canvasDir = await join(configDir, 'canvas');
    try { await mkdir(canvasDir, { recursive: true }); } catch (_) {}
    const defaultPath = await join(canvasDir, '未命名.tchy-canvas');
    const filePath = await save({
      filters: [{ name: 'Canvas Project', extensions: ['tchy-canvas'] }],
      defaultPath,
    });
    if (!filePath) return;
    path = filePath;
    currentProjectPath.value = path;
    projectName.value = path.split(/[\\/]/).pop()?.replace(/\.tchy-canvas$/, '') || '未命名';
  }
  const dir = path.substring(0, path.lastIndexOf('/') !== -1 ? path.lastIndexOf('/') : path.lastIndexOf('\\'));
  try { await mkdir(dir, { recursive: true }); } catch (_) {}
  await writeTextFile(path, content);
};

// --- 加载项目 ---
const loadProject = async (filePath: string) => {
  if (!canvas.value) return;
  try {
    const content = await readTextFile(filePath);
    const json = JSON.parse(content);
    canvas.value.loadFromJSON(json, () => {
      canvas.value.renderAll();
      currentProjectPath.value = filePath;
      projectName.value = filePath.split(/[\\/]/).pop()?.replace(/\.tchy-canvas$/, '') || '未命名';
    });
  } catch (err) { throw err; }
};

const loadDefaultProject = async () => {
  const configDir = await appConfigDir();
  const canvasDir = await join(configDir, 'canvas');
  try { await mkdir(canvasDir, { recursive: true }); } catch (_) {}
  const defaultPath = await join(canvasDir, 'default.tchy-canvas');
  try {
    await readTextFile(defaultPath);
    await loadProject(defaultPath);
  } catch (_) {
    console.log('未找到默认项目，新建空白画布');
  }
};

// --- 导出 PNG ---
const exportAsImage = () => {
  if (!canvas.value) return;
  const dataURL = canvas.value.toDataURL({ format: 'png', quality: 1 });
  const link = document.createElement('a');
  link.download = `${projectName.value}.png`;
  link.href = dataURL;
  link.click();
};

// --- 右键菜单 ---
const showContextMenu = (x: number, y: number, target: any) => {
  contextMenuX.value = x;
  contextMenuY.value = y;
  const items = [];
  if (target) {
    items.push(
      { label: '删除', action: () => { canvas.value.remove(target); canvas.value.renderAll(); } },
      { label: '复制', action: () => { cloneObject(target); } },
      { label: '移到顶层', action: () => { moveObjectToTop(target); } },
      { label: '移到底层', action: () => { moveObjectToBottom(target); } },
    );
  } else {
    items.push(
      { label: '添加图片', action: () => addImage(x, y) },
      { label: '添加文字', action: () => addText(x, y) },
    );
  }
  contextMenuItems.value = items;
  contextMenuVisible.value = true;
};

const cloneObject = (obj: any) => {
  obj.clone((clone: any) => {
    clone.set({ left: (obj.left || 0) + 20, top: (obj.top || 0) + 20 });
    canvas.value.add(clone);
    canvas.value.setActiveObject(clone);
    canvas.value.renderAll();
  });
};

// --- 窗口自适应 ---
const handleResize = () => {
  if (!canvas.value || !containerRef.value) return;
  const c = containerRef.value;
  try {
    canvas.value.setWidth(c.clientWidth);
    canvas.value.setHeight(c.clientHeight);
    canvas.value.renderAll();
  } catch (_) {}
};

// --- 拖拽文件 ---
const onDrop = async (e: DragEvent) => {
  e.preventDefault();
  const data = e.dataTransfer?.getData('text/plain');
  if (!data) return;
  try {
    const imageData = await invoke<string>('read_file_as_base64', { path: data });
    const rect = canvasEl.value?.getBoundingClientRect();
    const canvasX = e.clientX - (rect?.left || 0);
    const canvasY = e.clientY - (rect?.top || 0);
    (fabric.Image.fromURL as any)(
      imageData,
      (img: any) => {
        img.scaleToWidth(200);
        img.set({ left: canvasX - 100, top: canvasY - 100 });
        canvas.value.add(img);
        canvas.value.renderAll();
      },
      { crossOrigin: 'anonymous' }
    );
  } catch (err) { console.error(err); }
};

// --- 清理 ---
onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  canvas.value?.dispose();
  const container = containerRef.value;
  if (container) {
    container.removeEventListener('dragover', (e) => e.preventDefault());
    container.removeEventListener('drop', onDrop);
  }
});
</script>

<style scoped>
.canvas-container {
  width: 100%;
  height: 100%;
  position: relative;
  background: #f0f0f0;
  overflow: hidden;
}
.canvas-container canvas {
  display: block;
  cursor: default;
}
.toolbar {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255,255,255,0.92);
  padding: 6px 12px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.08);
  backdrop-filter: blur(4px);
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
  font-size: 14px;
}
.toolbar button {
  background: none;
  border: none;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 18px;
  border-radius: 4px;
  line-height: 1;
  transition: background 0.15s;
}
.toolbar button:hover {
  background: #e8e8e8;
}
.toolbar .project-name {
  margin-left: 12px;
  font-size: 13px;
  color: #555;
  border-left: 1px solid #ddd;
  padding-left: 12px;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>