<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { availablePlugins, loadPluginStates, setConfigDir } from '@/plugins';
import Settings from '@/views/Settings.vue';
import { invoke } from '@tauri-apps/api/core';

const currentView = ref('website');

const enabledPlugins = computed(() => 
  availablePlugins.filter(p => p.enabled)
);

const selectPlugin = (pluginId: string) => {
  currentView.value = pluginId;
};

const currentComponent = computed(() => {
  if (currentView.value === 'settings') {
    return Settings;
  }
  const plugin = availablePlugins.find(p => p.id === currentView.value);
  return plugin?.component;
});

onMounted(async () => {
  // 1. 从 localStorage 恢复配置目录
  const saved = localStorage.getItem('config-dir');
  if (saved) {
    setConfigDir(saved);
  } else {
    // 如果没有保存过，获取程序所在目录作为默认
    const dir = await invoke<string>('get_app_dir');
    setConfigDir(dir);
    localStorage.setItem('config-dir', dir);
  }
  
  // 2. 从配置文件加载插件状态
  await loadPluginStates();
});
</script>

<template>
  <div class="shell">
    <!-- 左侧：极简文字菜单 -->
    <nav class="sidebar">
      <div class="logo">太初</div>
      
      <div class="menu">
        <div 
          v-for="plugin in enabledPlugins" 
          :key="plugin.id"
          class="menu-item"
          :class="{ active: currentView === plugin.id }"
          @click="selectPlugin(plugin.id)"
        >
          {{ plugin.name }}
        </div>
      </div>

      <div class="menu-bottom">
        <div 
          class="menu-item"
          :class="{ active: currentView === 'settings' }"
          @click="currentView = 'settings'"
        >
          设置
        </div>
      </div>
    </nav>

    <!-- 右侧：留白内容区 -->
    <main class="content">
      <component :is="currentComponent" v-if="currentComponent" />
    </main>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: #ffffff;
  color: #1a1a1a;
  font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

::-webkit-scrollbar {
  width: 0;
  background: transparent;
}
</style>

<style scoped>
.shell {
  display: flex;
  height: 100vh;
  width: 100vw;
  background: #ffffff;
  -webkit-app-region: drag;
}

.sidebar {
  width: 120px;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 0 24px 0;
  flex-shrink: 0;
  -webkit-app-region: drag;
  border-right: 1px solid #f0f0f0;
}

.logo {
  font-size: 16px;
  font-weight: 300;
  letter-spacing: 6px;
  color: #1a1a1a;
  margin-bottom: 32px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
  writing-mode: horizontal-tb;
}

.menu {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  width: 100%;
  -webkit-app-region: no-drag;
  align-items: center;
}

.menu-item {
  padding: 8px 0;
  cursor: pointer;
  font-size: 14px;
  font-weight: 300;
  color: #b0b0b0;
  letter-spacing: 2px;
  writing-mode: horizontal-tb;
  transition: color 0.2s ease;
  user-select: none;
  width: 100%;
  text-align: center;
}

.menu-item:hover {
  color: #666;
}

.menu-item.active {
  color: #1a1a1a;
  font-weight: 400;
}

.menu-bottom {
  -webkit-app-region: no-drag;
  border-top: 1px solid #f0f0f0;
  padding-top: 16px;
  width: 100%;
  display: flex;
  justify-content: center;
}

.content {
  position: relative;
  flex: 1;
  background: #ffffff;
  padding: 48px 56px;
  overflow-y: auto;
  -webkit-app-region: drag;
}
</style>