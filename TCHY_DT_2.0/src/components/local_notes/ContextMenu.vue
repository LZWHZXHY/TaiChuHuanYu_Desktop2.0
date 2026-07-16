<!-- src/components/ContextMenu.vue -->
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

// ===== 修改类型定义：使用联合类型 =====
export type MenuItem = 
  | { label: string; action: () => void; divider?: false }
  | { divider: true; label?: never; action?: never };

const props = defineProps<{
  items: MenuItem[];
  x: number;
  y: number;
}>();

const emit = defineEmits<{ (e: 'close'): void }>();

const style = ref({ left: '0px', top: '0px' });

// 确保菜单不超出屏幕
onMounted(() => {
  const el = document.getElementById('context-menu');
  if (el) {
    const rect = el.getBoundingClientRect();
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;
    let left = props.x;
    let top = props.y;
    if (left + rect.width > winWidth) left = winWidth - rect.width - 8;
    if (top + rect.height > winHeight) top = winHeight - rect.height - 8;
    if (left < 8) left = 8;
    if (top < 8) top = 8;
    style.value = { left: left + 'px', top: top + 'px' };
  }
});

// 点击外部关闭
function handleClickOutside(e: MouseEvent) {
  const el = document.getElementById('context-menu');
  if (el && !el.contains(e.target as Node)) {
    emit('close');
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <div id="context-menu" class="context-menu" :style="style">
    <template v-for="(item, index) in items" :key="index">
      <!-- 判断是否为分隔线 -->
      <div v-if="item.divider" class="divider"></div>
      <div v-else class="menu-item" @click="() => { item.action(); emit('close'); }">
        {{ item.label }}
      </div>
    </template>
  </div>
</template>

<style scoped>
.context-menu {
  position: fixed;
  min-width: 160px;
  background: #ffffff;
  border-radius: 8px;
  padding: 6px 4px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  border: 1px solid #f0f0f0;
  z-index: 1000;
  font-size: 14px;
  animation: fadeIn 0.1s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}

.menu-item {
  padding: 8px 18px;
  border-radius: 4px;
  cursor: pointer;
  color: #1a1a1a;
  font-weight: 300;
  letter-spacing: 0.3px;
  transition: background 0.1s;
}
.menu-item:hover {
  background: #f0f0f0;
}

.divider {
  height: 1px;
  background: #f0f0f0;
  margin: 4px 8px;
}
</style>