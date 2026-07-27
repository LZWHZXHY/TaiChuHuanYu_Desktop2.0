<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useConfig } from '@/composables/useConfig';

const { getConfigDir } = useConfig();
const configDir = ref('加载中...');

onMounted(async () => {
  configDir.value = await getConfigDir();
});
</script>

<template>
  <div class="settings-card config-card">
    <h2 class="card-title">[配置文件]</h2>
    <div class="config-row">
      <span class="config-label">存储目录</span>
      <span class="config-path">{{ configDir }}</span>
      <!-- 删除“更改”按钮，因为路径是固定的 -->
    </div>
  </div>
</template>

<style scoped>
/* 样式保持不变（或者适当调整间距） */
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
</style>