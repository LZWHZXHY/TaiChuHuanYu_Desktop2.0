<!-- src/components/Settings.vue -->
<template>
  <div>
    <h1 style="font-weight: 300; letter-spacing: 4px; border-bottom: 1px solid #eee; padding-bottom: 16px;">
      ⚙️ 设置
    </h1>

    <ConfigDirCard />
    <VaultManager />
    <PluginPanel />

    <!-- 提示条保留 -->
    <div style="margin-top: 24px; padding: 12px; background: #fff3cd; border-radius: 4px; font-size: 13px; color: #856404;">
      ⚠️ 目前是演示模式，数据只存在内存中，刷新页面会重置。
    </div>
  </div>
</template>

<script setup lang="ts">
import ConfigDirCard from './settings/ConfigDirCard.vue'
import VaultManager from './settings/VaultManager.vue'
import PluginPanel from './settings/PluginPanel.vue'
</script>