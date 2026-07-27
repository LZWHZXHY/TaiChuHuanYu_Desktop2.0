<!-- src/components/settings/ConfigDirCard.vue -->
<template>
  <div class="card">
    <h3 class="card-title">配置文件目录</h3>
    <p class="card-path">{{ configDir }}</p>
  </div>
</template>

<script setup lang="ts">
import { useSettingsStore } from '@/composables/useSettingsStore'

const { configDir } = useSettingsStore()
</script>

<style scoped>
.card {
  background: #fafafa;
  padding: 16px 20px;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
  margin-bottom: 24px;
}
.card-title {
  margin: 0 0 8px 0;
  font-weight: 400;
  font-size: 14px;
  color: #888;
}
.card-path {
  margin: 0;
  font-size: 14px;
  color: #333;
  word-break: break-all;
}
</style>