<template>
  <div style="padding: 20px; max-width: 900px; margin: 0 auto;">
    <Settings />
  </div>
</template>

<script setup lang="ts">
import Settings from './components/Settings.vue'
</script>

<style>
/* 整个页面隐藏滚动条，但内容依然可以滚动 */
::-webkit-scrollbar {
  width: 0 !important;
  height: 0 !important;
}

/* 兼容 Firefox 和 IE */
* {
  scrollbar-width: none !important; /* Firefox */
  -ms-overflow-style: none !important; /* IE/Edge */
}
</style>