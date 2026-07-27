<!-- src/components/settings/WindowSettings.vue -->
<template>
  <div class="card">
    <h3 class="card-title">窗口设置</h3>
    <div class="setting-row">
      <label for="winWidth">宽度 (px)</label>
      <input id="winWidth" type="number" v-model.number="width" min="400" max="3840" />
    </div>
    <div class="setting-row">
      <label for="winHeight">高度 (px)</label>
      <input id="winHeight" type="number" v-model.number="height" min="300" max="2160" />
    </div>
    <div class="hint" v-if="saveStatus">
      {{ saveStatus }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useSettingsStore } from '@/composables/useSettingsStore'

const { settings, saveSettings } = useSettingsStore()
const width = ref(1280)
const height = ref(720)
const saveStatus = ref('')

// 从 settings 更新输入框
function updateFromSettings() {
  if (settings.value) {
    width.value = settings.value.window_width ?? 1280
    height.value = settings.value.window_height ?? 720
  }
}

// 组件挂载时尝试更新（如果已经加载完成）
onMounted(() => {
  updateFromSettings()
})

// 监听 settings 变化（异步加载完成后会触发）
watch(settings, () => {
  updateFromSettings()
}, { deep: false })

// 保存函数
async function saveWindowSize() {
  if (!settings.value) return

  settings.value.window_width = width.value
  settings.value.window_height = height.value

  try {
    await saveSettings()
    saveStatus.value = '✅ 已保存'
    setTimeout(() => { saveStatus.value = '' }, 2000)
  } catch {
    saveStatus.value = '❌ 保存失败'
  }
}

// 防抖自动保存
let saveTimer: ReturnType<typeof setTimeout> | null = null
watch([width, height], () => {
  if (saveTimer) {
    clearTimeout(saveTimer)
  }
  saveTimer = setTimeout(() => {
    saveWindowSize()
    saveTimer = null
  }, 500)
})
</script>

<style scoped>
/* 样式保持不变 */
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
.setting-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}
.setting-row label {
  width: 80px;
  font-size: 14px;
  color: #333;
}
.setting-row input {
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  width: 80px;
  font-size: 14px;
}
.hint {
  margin-top: 12px;
  color: #888;
  font-size: 13px;
}
</style>