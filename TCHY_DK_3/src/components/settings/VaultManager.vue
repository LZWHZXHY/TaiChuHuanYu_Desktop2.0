<template>
  <div class="card">
    <div class="header">
      <h3 class="card-title">本地笔记仓库</h3>
      <button class="btn-add" @click="addNewVault">+ 添加仓库</button>
    </div>

    <div v-if="vaults.length === 0" class="empty">
      还没有仓库，点击上方按钮添加。
    </div>

    <div v-else>
      <div v-for="vault in vaults" :key="vault.id" class="vault-item">
        <div class="vault-info">
          <span class="vault-name">{{ vault.name }}</span>
          <span class="vault-path">{{ vault.path }}</span>
          <span v-if="activeId === vault.path" class="badge">当前</span>
        </div>
        <div class="vault-actions">
          <button class="btn-action" @click="setActive(vault.id)">激活</button>
          <button class="btn-action remove" @click="removeVault(vault.id)">移除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSettingsStore } from '@/composables/useSettingsStore'
import { open } from '@tauri-apps/plugin-dialog'

const { vaults, activeId, addVault, removeVault, setActive } = useSettingsStore()

async function addNewVault() {
  const selected = await open({
    directory: true,
    multiple: false,
    title: '选择笔记文件夹',
  })
  if (selected && typeof selected === 'string') {
    const name = selected.split(/[\\/]/).pop() || '未命名'
    await addVault(name, selected)
  }
}
</script>

<style scoped>
/* 样式与之前保持一致，这里是极简版本，如果你需要可以复制之前的样式，或者直接使用全局样式 */
.card {
  padding: 20px 0;
  border-bottom: 1px solid #f0f0f0;
}
.card:last-child {
  border-bottom: none;
}
.card-title {
  font-size: 13px;
  font-weight: 400;
  color: #999;
  letter-spacing: 0.3px;
  margin: 0 0 12px 0;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.btn-add {
  background: transparent;
  border: none;
  color: #bbb;
  font-size: 14px;
  cursor: pointer;
  transition: color 0.2s ease;
  padding: 0;
}
.btn-add:hover {
  color: #1a1a1a;
}
.empty {
  color: #ddd;
  font-size: 14px;
  padding: 12px 0;
}
.vault-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f5f5f5;
}
.vault-item:last-child {
  border-bottom: none;
}
.vault-info {
  display: flex;
  align-items: center;
  gap: 12px;
}
.vault-name {
  font-size: 14px;
  color: #1a1a1a;
}
.vault-path {
  font-size: 13px;
  color: #bbb;
}
.badge {
  font-size: 11px;
  color: #1a1a1a;
  border: 1px solid #1a1a1a;
  padding: 0 6px;
  border-radius: 10px;
}
.vault-actions {
  display: flex;
  gap: 12px;
}
.btn-action {
  background: transparent;
  border: none;
  color: #bbb;
  cursor: pointer;
  font-size: 13px;
  transition: color 0.2s ease;
  padding: 0;
}
.btn-action:hover {
  color: #1a1a1a;
}
.btn-action.remove:hover {
  color: #e74c3c;
}
</style>