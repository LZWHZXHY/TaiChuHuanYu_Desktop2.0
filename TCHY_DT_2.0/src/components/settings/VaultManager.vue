<!-- src/components/settings/VaultManager.vue -->
<script setup lang="ts">
import { useVaults } from '@/composables/useVaults';
import { open } from '@tauri-apps/plugin-dialog';

const { vaults, activeVaultId, addVault, setActiveVault, removeVault, updateVault } = useVaults();

// 选择缓存目录
async function selectCacheDir(vaultId: string) {
  const selected = await open({
    directory: true,
    multiple: false,
    title: '选择此仓库的图谱缓存目录',
  });
  if (selected && typeof selected === 'string') {
    await updateVault(vaultId, { cacheDir: selected });
    // 提示成功
    alert(`✅ 缓存目录已更新为：${selected}`);
  }
}

// 添加仓库
async function addNewVault() {
  await addVault();
}
</script>

<template>
  <div class="settings-card vaults-card">
    <div class="vaults-header">
      <h2 class="card-title" style="margin-bottom:0;">本地笔记仓库</h2>
      <button class="config-btn" @click="addNewVault">添加仓库</button>
    </div>
    <div v-if="vaults.length === 0" class="vault-empty">
      暂无仓库，请点击“添加仓库”选择笔记文件夹。
    </div>
    <div v-else class="vault-list">
      <div
        v-for="vault in vaults"
        :key="vault.id"
        class="vault-item"
        :class="{ active: activeVaultId === vault.id }"
        @click="setActiveVault(vault.id)"
      >
        <div class="vault-info">
          <span class="vault-name">{{ vault.name }}</span>
          <span class="vault-path">{{ vault.path }}</span>
          <span v-if="vault.cacheDir" class="vault-cache-path">
            🗂️ 缓存目录：{{ vault.cacheDir }}
          </span>
          <span v-else class="vault-cache-path" style="color: #bbb;">
            🗂️ 缓存目录：默认（.tchy）
          </span>
        </div>
        <div class="vault-actions">
          <button class="vault-btn" @click.stop="selectCacheDir(vault.id)">设置缓存</button>
          <button class="vault-btn" @click.stop="setActiveVault(vault.id)">激活</button>
          <button class="vault-btn remove" @click.stop="removeVault(vault.id)">移除</button>
        </div>
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
.vaults-card {
  flex: 1 1 100%;
  margin-top: 24px;
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
.vaults-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.vault-empty {
  color: #bbb;
  font-size: 14px;
  padding: 16px 0;
  text-align: center;
}
.vault-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.vault-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #fff;
  border-radius: 6px;
  border: 1px solid #eee;
  cursor: pointer;
  transition: background 0.15s;
}
.vault-item:hover {
  background: #f5f5f5;
}
.vault-item.active {
  border-color: #1a1a1a;
  background: #f5f5f5;
}
.vault-item.active .vault-name {
  font-weight: 500;
}
.vault-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}
.vault-name {
  font-size: 15px;
  color: #1a1a1a;
}
.vault-path {
  font-size: 13px;
  color: #999;
  word-break: break-all;
}
.vault-cache-path {
  font-size: 12px;
  color: #888;
  margin-top: 2px;
}
.vault-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
  margin-left: 12px;
}
.vault-btn {
  padding: 2px 10px;
  border: 1px solid #ddd;
  background: #fff;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  color: #333;
}
.vault-btn:hover {
  background: #f0f0f0;
}
.vault-btn.remove {
  color: #c0392b;
  border-color: #e6c5c0;
}
.vault-btn.remove:hover {
  background: #fde8e5;
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
</style>