<!-- src/components/settings/PluginManager.vue -->
<script setup lang="ts">
import { availablePlugins, savePluginStates } from '@/plugins';

async function togglePlugin(pluginId: string) {
  const p = availablePlugins.find(p => p.id === pluginId);
  if (p) {
    p.enabled = !p.enabled;
    await savePluginStates();
  }
}
</script>

<template>
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
</template>

<style scoped>
.settings-card {
  background: #fafafa;
  border-radius: 8px;
  padding: 20px 24px;
  border: 1px solid #f0f0f0;
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