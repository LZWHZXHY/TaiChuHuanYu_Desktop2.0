<!-- src/components/settings/VaultManager.vue -->
<template>
  <div class="card">
    <div class="header">
      <h3 class="card-title">本地笔记仓库</h3>
      <button class="btn-add" @click="openAddDialog">＋ 添加仓库</button>
    </div>

    <div v-if="vaults.length === 0" class="empty">
      还没有仓库，点击上方按钮添加。
    </div>

    <div v-else>
      <div v-for="vault in vaults" :key="vault.id" class="vault-item">
        <div class="vault-info">
          <span class="vault-name">{{ vault.name }}</span>
          <span class="vault-path">{{ vault.path }}</span>
          <span v-if="activeId === vault.id" class="badge">当前</span>
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

const { vaults, activeId, addVault, removeVault, setActive } = useSettingsStore()

// 模拟添加对话框（后续替换为真实文件夹选择）
function openAddDialog() {
  // 临时模拟：弹出输入框让用户输入路径和名称
  const name = prompt('请输入仓库名称：')
  if (!name) return
  const path = prompt('请输入仓库路径（文件夹地址）：')
  if (!path) return
  addVault(name, path)
}
</script>

<style scoped>
.card {
  background: #fafafa;
  padding: 16px 20px;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.card-title {
  margin: 0;
  font-weight: 400;
  font-size: 14px;
  color: #888;
}
.btn-add {
  padding: 4px 16px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
}
.empty {
  color: #bbb;
  padding: 20px 0;
  text-align: center;
  font-size: 14px;
}
.vault-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #eee;
}
.vault-item:last-child {
  border-bottom: none;
}
.vault-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.vault-name {
  font-weight: 500;
}
.vault-path {
  color: #999;
  font-size: 13px;
}
.badge {
  background: #42b883;
  color: white;
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 10px;
}
.vault-actions {
  display: flex;
  gap: 8px;
}
.btn-action {
  border: none;
  background: none;
  cursor: pointer;
  font-size: 13px;
  color: #42b883;
}
.btn-action.remove {
  color: #e74c3c;
}
</style>