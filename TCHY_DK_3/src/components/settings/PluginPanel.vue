<!-- src/components/settings/PluginPanel.vue -->
<template>
  <div class="card">
    <h3 class="card-title">插件管理</h3>
    <div class="plugin-placeholder">
      <p>🔌 插件系统开发中</p>
      <p class="hint">未来将在这里启用/禁用各种功能插件</p>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: #fafafa;
  padding: 16px 20px;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
  margin-top: 24px;
}
.card-title {
  margin: 0 0 12px 0;
  font-weight: 400;
  font-size: 14px;
  color: #888;
}
.plugin-placeholder {
  color: #bbb;
  text-align: center;
  padding: 20px 0;
}
.plugin-placeholder p {
  margin: 4px 0;
}
.hint {
  font-size: 13px;
  color: #d0d0d0;
}
</style>