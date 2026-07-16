<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { availablePlugins, setConfigDir, savePluginStates } from '@/plugins';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';

const configDir = ref('');

async function loadConfigDir() {
  const saved = localStorage.getItem('config-dir');
  if (saved) {
    configDir.value = saved;
  } else {
    const dir = await invoke<string>('get_app_dir');
    configDir.value = dir;
    localStorage.setItem('config-dir', dir);
  }
  setConfigDir(configDir.value);
}

async function changeConfigDir() {
  const selected = await open({
    directory: true,
    multiple: false,
    title: '选择配置文件存放目录',
  });
  if (selected && typeof selected === 'string') {
    configDir.value = selected;
    localStorage.setItem('config-dir', selected);
    setConfigDir(selected);
    await savePluginStates();
  }
}

const togglePlugin = async (pluginId: string) => {
  const p = availablePlugins.find(p => p.id === pluginId);
  if (p) {
    p.enabled = !p.enabled;
    await savePluginStates();
  }
};

onMounted(() => {
  loadConfigDir();
});
</script>

<template>
  <div class="settings">
    <!-- 页面标题 -->
    <div class="settings-header">
      <h1>设置</h1>
    </div>

    <!-- 两栏容器 -->
    <div class="settings-grid">
      <!-- 左栏：配置文件 -->
      <div class="settings-card config-card">
        <h2 class="card-title">配置文件</h2>
        <div class="config-row">
          <span class="config-label">存储目录</span>
          <span class="config-path">{{ configDir }}</span>
          <button class="config-btn" @click="changeConfigDir">更改</button>
        </div>
        <!-- 可添加更多配置项 -->
      </div>

      <!-- 右栏：插件管理 -->
      <div class="settings-card plugins-card">
        <h2 class="card-title">插件管理</h2>
        <div class="plugin-list">
          <div v-for="plugin in availablePlugins" :key="plugin.id" class="plugin-row">
            <div class="plugin-info">
              <span class="plugin-name">{{ plugin.name }}</span>
              <span class="plugin-desc">{{ plugin.description }}</span>
              <span v-if="plugin.permissions?.length" class="plugin-perm">
                {{ plugin.permissions.join('、') }}
              </span>
            </div>
            <label class="switch">
              <input type="checkbox" :checked="plugin.enabled" @change="togglePlugin(plugin.id)" />
              <span class="slider"></span>
            </label>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings {
  max-width: 900px;
  margin: 0 auto;
  padding-top: 8px;
}

.settings-header {
  margin-bottom: 32px;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 20px;
}

.settings-header h1 {
  font-size: 20px;
  font-weight: 300;
  letter-spacing: 8px;
  color: #1a1a1a;
}

/* 两栏网格 */
.settings-grid {
  display: flex;
  gap: 24px;
  align-items: stretch;
}

/* 卡片通用样式 */
.settings-card {
  background: #fafafa;
  border-radius: 8px;
  padding: 20px 24px;
  border: 1px solid #f0f0f0;
  flex: 1;
}

/* 左栏固定宽度，右栏弹性 */
.config-card {
  flex: 0 0 260px; /* 固定宽度 */
}

.plugins-card {
  flex: 1;
}

.card-title {
  font-size: 14px;
  font-weight: 400;
  color: #1a1a1a;
  letter-spacing: 4px;
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #e8e8e8;
}

/* 配置文件行 */
.config-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}
.config-label {
  font-size: 14px;
  color: #1a1a1a;
  font-weight: 300;
  letter-spacing: 1px;
}
.config-path {
  font-size: 13px;
  color: #888;
  font-weight: 300;
  word-break: break-all;
}
.config-btn {
  padding: 4px 12px;
  border: 1px solid #ddd;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
  border-radius: 3px;
  color: #333;
  letter-spacing: 1px;
  margin-top: 4px;
}
.config-btn:hover {
  background: #f5f5f5;
}

/* 插件列表 */
.plugin-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.plugin-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.plugin-row:last-child {
  border-bottom: none;
}

.plugin-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.plugin-name {
  font-size: 15px;
  font-weight: 400;
  color: #1a1a1a;
  letter-spacing: 2px;
}

.plugin-desc {
  font-size: 13px;
  color: #c0c0c0;
  font-weight: 300;
}

.plugin-perm {
  font-size: 11px;
  color: #d0d0d0;
  margin-top: 4px;
}

/* 开关 */
.switch {
  position: relative;
  width: 36px;
  height: 20px;
  flex-shrink: 0;
  cursor: pointer;
}
.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.slider {
  position: absolute;
  inset: 0;
  background: #e8e8e8;
  border-radius: 20px;
  transition: 0.25s ease;
}
.slider::before {
  content: '';
  position: absolute;
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background: #ffffff;
  border-radius: 50%;
  transition: 0.25s ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.switch input:checked + .slider {
  background: #1a1a1a;
}
.switch input:checked + .slider::before {
  transform: translateX(16px);
}
</style>