<template>
  <div class="website-container">
    <iframe :src="websiteUrl" frameborder="0" />
  </div>
</template>

<script setup>
const websiteUrl = 'https://bianyuzhou.com';
</script>

<style scoped>
.website-container {
  flex: 1;               /* 撑满父容器剩余空间 */
  width: 100%;
  overflow: hidden;      /* 避免容器产生滚动条 */
  display: flex;
  flex-direction: column;
}
iframe {
  flex: 1;
  width: 100%;
  border: none;
  /* 注意：iframe 自带滚动能力，无需额外设置 overflow */
}
</style>