<!-- src/components/settings/PluginPanel.vue -->
<template>
  <div class="card">
    <h3 class="card-title">插件管理</h3>
    
    <!-- 如果有插件数据 -->
    <div v-if="settings && settings.plugins" class="plugin-list">
      <div v-for="(enabled, key) in settings.plugins" :key="key" class="plugin-item">
        <span class="plugin-name">{{ getPluginLabel(key) }}</span>
        <span class="plugin-status" :class="{ active: enabled }">
          {{ enabled ? '✅ 已启用' : '⬜ 已禁用' }}
        </span>
      </div>
    </div>
    
    <!-- 如果还没有加载 -->
    <div v-else class="plugin-placeholder">
      <p>🔌 正在加载插件状态...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSettingsStore } from '@/composables/useSettingsStore'

const { settings } = useSettingsStore()

// 把插件 key 转换成可读的名称
function getPluginLabel(key: string): string {
  const map: Record<string, string> = {
    local_editor: '本地文件编辑',
    web_viewer: '网站内容显示',
  }
  return map[key] || key
}
</script>

<style scoped>
.card {
  background: #fafafa;
  padding: 16px 20px;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
  margin-top: 24px;
}
.card-title {
  margin: 0 0 12px 0;
  font-weight: 400;
  font-size: 14px;
  color: #888;
}
.plugin-placeholder {
  color: #bbb;
  text-align: center;
  padding: 20px 0;
}
.plugin-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.plugin-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}
.plugin-item:last-child {
  border-bottom: none;
}
.plugin-name {
  font-size: 14px;
  color: #333;
}
.plugin-status {
  font-size: 13px;
  color: #999;
}
.plugin-status.active {
  color: #42b883;
}
</style>