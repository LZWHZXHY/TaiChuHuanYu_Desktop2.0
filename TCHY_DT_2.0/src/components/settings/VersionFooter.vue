<!-- src/components/settings/VersionFooter.vue -->
<script setup lang="ts">
import { useUpdate } from '@/composables/useUpdate';

const { currentVersion, latestVersion, checking, checkUpdate } = useUpdate();
</script>

<template>
  <div class="version-info">
    <span>当前版本：v{{ currentVersion }}</span>
    <span v-if="latestVersion" style="margin-left: 16px;">
      最新版本：v{{ latestVersion }}
      <span v-if="latestVersion !== currentVersion && latestVersion !== '获取失败，请稍后重试' && latestVersion !== '网络错误，请检查连接'" style="color: #e74c3c; margin-left: 8px;">
        （有更新！）
      </span>
    </span>
    <button class="config-btn" @click="checkUpdate" :disabled="checking">
      {{ checking ? '检查中...' : '检查更新' }}
    </button>
  </div>
</template>

<style scoped>
.version-info {
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 14px;
  color: #888;
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
}
.config-btn:hover {
  background: #f5f5f5;
}
.config-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>