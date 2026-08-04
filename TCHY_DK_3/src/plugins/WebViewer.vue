<template>
  <div class="website-container">
    <iframe :src="finalWebsiteUrl" frameborder="0" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useSettingsStore } from '@/composables/useSettingsStore'

const { settings } = useSettingsStore()

// 拼接用户登录 Token 到 URL 中
const finalWebsiteUrl = computed(() => {
  const baseUrl = 'https://bianyuzhou.com'
  const token = settings.value?.token // 假设你的字段叫 token
  
  if (token) {
    return `${baseUrl}?token=${encodeURIComponent(token)}`
  }
  
  return baseUrl
})
</script>

<style scoped>
.website-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}
iframe {
  width: 100%;
  height: 100%;
  border: none;
}
</style>