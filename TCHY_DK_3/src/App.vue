<template>
  <div class="app-container">
    <nav class="sidebar">
      <div class="logo">我的应用</div>
      <ul class="nav-list">
        <li
          v-for="plugin in enabledPlugins"
          :key="plugin.id"
          @click="currentPage = plugin.id"
          :class="{ active: currentPage === plugin.id }"
        >
          {{ plugin.name }}
        </li>
      </ul>
      <div class="settings-entry">
        <li
          @click="currentPage = 'settings'"
          :class="{ active: currentPage === 'settings' }"
        >
          设置
        </li>
      </div>
    </nav>

    <main class="content">
      <component :is="currentComponent" v-if="currentComponent" />
      <div v-else class="page">
        <p style="color: #ccc;">加载中...</p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, defineAsyncComponent } from 'vue'
import { useSettingsStore } from '@/composables/useSettingsStore'
import Settings from './components/Settings.vue'

const pluginRegistry: Record<string, { name: string; component: any }> = {
  local_editor: {
    name: '笔记',
    component: defineAsyncComponent(() => import('./plugins/NoteEditor/index.vue')),
  },
  web_viewer: {
    name: '网站',
    component: defineAsyncComponent(() => import('./plugins/WebViewer.vue')),
  },
  asset_manager: {
    name: '资产管理',
    component: defineAsyncComponent(() => import('./plugins/AssetManager.vue')),
  },
}

const { loadSettings, settings } = useSettingsStore()
const currentPage = ref<string>('settings')

const enabledPlugins = computed(() => {
  if (!settings.value) return []
  const pluginStatus = settings.value.plugins as Record<string, boolean>
  return Object.keys(pluginRegistry)
    .filter((id) => pluginStatus[id] !== false)
    .map((id) => ({
      id,
      name: pluginRegistry[id].name,
    }))
})

const currentComponent = computed(() => {
  if (currentPage.value === 'settings') return Settings
  if (pluginRegistry[currentPage.value]) {
    return pluginRegistry[currentPage.value].component
  }
  return null
})

onMounted(async () => {
  await loadSettings()
  if (enabledPlugins.value.length > 0) {
    currentPage.value = enabledPlugins.value[0].id
  } else {
    currentPage.value = 'settings'
  }
})
</script>

<style>
/* ---------- 全局 ---------- */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body,
#app {
  width: 100%;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background: #ffffff;
  color: #1a1a1a;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

::-webkit-scrollbar {
  width: 0;
  height: 0;
}
* {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

/* ---------- 容器 ---------- */
.app-container {
  display: flex;
  height: 100vh;
  background: #ffffff;
}

/* ---------- 侧边栏 ---------- */
.sidebar {
  width: 160px;
  padding: 32px 20px;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  border-right: 1px solid #f0f0f0;
}

.logo {
  font-size: 15px;
  font-weight: 500;
  color: #1a1a1a;
  margin-bottom: 32px;
  letter-spacing: 0.2px;
}

.nav-list {
  list-style: none;
  padding: 0;
  margin: 0;
  flex: 1;
}

.nav-list li,
.settings-entry li {
  padding: 8px 0 8px 12px;
  cursor: pointer;
  font-size: 14px;
  letter-spacing: 0.2px;
  border-left: 3px solid transparent;
  color: #bbb;
  transition: color 0.25s ease, border-color 0.25s ease, padding-left 0.25s ease, background 0.2s ease;
  border-radius: 0 4px 4px 0;
}

.nav-list li:hover,
.settings-entry li:hover {
  color: #555;
  background: rgba(0, 0, 0, 0.03);
  padding-left: 16px;
}

.nav-list li.active,
.settings-entry li.active {
  color: #1a1a1a;
  border-left-color: #1a1a1a;
  background: rgba(0, 0, 0, 0.02);
  padding-left: 16px;
}

.settings-entry {
  border-top: 1px solid #f0f0f0;
  padding-top: 16px;
  list-style: none;
}


/* ---------- 内容区 ---------- */
.content {
  flex: 1;
  /* 移除全局 padding: 32px 40px; 改由内部组件自行控制内边距 */
  padding: 0; 
  overflow: hidden; /* 防止外层出现多余滚动条 */
  background: #ffffff;
  display: flex;       /* 新增：开启 flex 布局 */
  flex-direction: column; /* 新增：纵向排列 */
}

.page {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 40px; /* 如果有普通 .page 页面，把内边距加在这里 */
}

/* ---------- 卡片 ---------- */
.card {
  padding: 20px 0;
  border-bottom: 1px solid #f0f0f0;
}

.card:last-child {
  border-bottom: none;
}

.card-title {
  font-size: 13px;
  font-weight: 400;
  color: #999;
  letter-spacing: 0.3px;
  margin: 0 0 12px 0;
}

/* ---------- 按钮 ---------- */
button,
.config-btn,
.btn-add,
.btn-action,
.vault-btn {
  background: transparent;
  border: none;
  padding: 4px 0;
  font-size: 13px;
  color: #999;
  cursor: pointer;
  transition: color 0.2s ease, transform 0.15s ease;
  font-family: inherit;
}

button:hover,
.config-btn:hover,
.btn-add:hover,
.btn-action:hover,
.vault-btn:hover {
  color: #1a1a1a;
  transform: translateX(2px);
}

/* ---------- 输入框 ---------- */
input[type="text"],
input[type="number"],
textarea {
  border: none;
  border-bottom: 1px solid #e8e8e8;
  padding: 6px 0;
  font-size: 14px;
  background: transparent;
  transition: border-color 0.25s ease, opacity 0.2s ease;
  outline: none;
  font-family: inherit;
  color: #1a1a1a;
}

input:focus,
textarea:focus {
  border-bottom-color: #1a1a1a;
}

/* ---------- 标签 ---------- */
.badge {
  color: #999;
  font-size: 12px;
}
</style>