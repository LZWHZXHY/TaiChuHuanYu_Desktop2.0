<!-- src/views/Settings.vue -->
<script setup lang="ts">
import { onMounted } from 'vue';
import { useConfig } from '@/composables/useConfig';
import { useVaults, loadVaults } from '@/composables/useVaults';

import ConfigDirCard from '@/components/settings/ConfigDirCard.vue';
import PluginManager from '@/components/settings/PluginManager.vue';
import VaultManager from '@/components/settings/VaultManager.vue';
import VersionFooter from '@/components/settings/VersionFooter.vue';

const { loadConfigDir } = useConfig();
const { loadVaults: loadVaultsFromStore } = useVaults();

onMounted(async () => {
  await loadConfigDir();
  // 使用独立的 loadVaults 函数（因为 useVaults 里的 loadVaults 可能被其他逻辑覆盖）
  await loadVaults();
});
</script>

<template>
  <div class="settings">
    <div class="settings-header">
      <h1>设置</h1>
    </div>

    <div class="settings-grid">
      <ConfigDirCard />
      <PluginManager />
    </div>

    <VaultManager />

    <VersionFooter />
  </div>
</template>

<style scoped>
.settings {
  max-width: 900px;
  margin: 0 auto;
  padding-top: 8px;
  padding-bottom: 40px;
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
.settings-grid {
  display: flex;
  gap: 24px;
  align-items: stretch;
}
</style>