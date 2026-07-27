<script setup lang="ts">
import { onMounted } from 'vue'
import { useSettingsStore } from '@/composables/useSettingsStore'
import ConfigDirCard from './settings/ConfigDirCard.vue'
import VaultManager from './settings/VaultManager.vue'
import PluginPanel from './settings/PluginPanel.vue'
import WindowSettings from './settings/WindowSettings.vue'   // ← 新增

const { loadSettings, getConfigDir } = useSettingsStore()

onMounted(async () => {
  await loadSettings()
  await getConfigDir()
})
</script>

<template>
  <div>
    <h1 style="font-weight: 300; letter-spacing: 4px; border-bottom: 1px solid #eee; padding-bottom: 16px;">
      ⚙️ 设置
    </h1>

    <ConfigDirCard />
    <VaultManager />
    <PluginPanel />
    <WindowSettings />   <!-- ← 新增 -->

    <div style="margin-top: 24px; padding: 12px; background: #e8f5e9; border-radius: 4px; font-size: 13px; color: #2e7d32;">
      ✅ 窗口尺寸已同步到内存，等待保存功能
    </div>
  </div>
</template>