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
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
iframe {
  width: 100%;
  height: 100%;
  border: none;
}
</style>