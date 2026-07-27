<script setup lang="ts">
import { onMounted } from 'vue'
import { useSettingsStore } from '@/composables/useSettingsStore'
import ConfigDirCard from './settings/ConfigDirCard.vue'
import VaultManager from './settings/VaultManager.vue'
import PluginPanel from './settings/PluginPanel.vue'

const { loadSettings, getConfigDir, configDir } = useSettingsStore()

onMounted(async () => {
  await loadSettings()   // 🆕 加载配置
  await getConfigDir()   // 获取配置目录（用于显示）
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

    <!-- 提示条保留 -->
    <div style="margin-top: 24px; padding: 12px; background: #fff3cd; border-radius: 4px; font-size: 13px; color: #856404;">
      ✅ 数据来自硬盘上的 settings.json
    </div>
  </div>
</template>