<!-- src/components/settings/ConfigDirCard.vue -->
<script setup lang="ts">
import { useConfig } from '@/composables/useConfig';
import { open } from '@tauri-apps/plugin-dialog';

const { configDir, changeConfigDir } = useConfig();

async function selectDir() {
  const selected = await open({
    directory: true,
    multiple: false,
    title: '选择配置文件存放目录',
  });
  if (selected && typeof selected === 'string') {
    await changeConfigDir(selected);
  }
}
</script>

<template>
  <div class="settings-card config-card">
    <h2 class="card-title">[配置文件]</h2>
    <div class="config-row">
      <span class="config-label">存储目录</span>
      <span class="config-path">{{ configDir }}</span>
      <button class="config-btn" @click="selectDir">更改</button>
    </div>
  </div>
</template>

<style scoped>
/* 复制原有样式 */
.settings-card {
  background: #fafafa;
  border-radius: 8px;
  padding: 20px 24px;
  border: 1px solid #f0f0f0;
}
.config-card {
  flex: 0 0 260px;
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
</style>