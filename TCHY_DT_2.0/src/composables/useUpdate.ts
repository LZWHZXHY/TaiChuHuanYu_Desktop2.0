// src/composables/useUpdate.ts
import { ref } from 'vue';
import packageJson from '../../package.json';

export function useUpdate() {
  const currentVersion = packageJson.version;
  const latestVersion = ref('');
  const checking = ref(false);

  async function checkUpdate() {
    checking.value = true;
    try {
      // ✅ 唯一正确的地址：api.github.com + latest
      const res = await fetch('https://api.github.com/repos/LZWHZXHY/TaiChuHuanYu_Desktop2.0/releases/latest');
      
      if (res.ok) {
        const data = await res.json();
        // data.tag_name 是 "v2.1.0"，去掉 v 后变成 "2.1.0"
        latestVersion.value = data.tag_name.replace(/^v/, '');
      } else {
        latestVersion.value = '获取失败，请稍后重试';
      }
    } catch (e) {
      latestVersion.value = '网络错误，请检查连接';
    }
    checking.value = false;
  }

  return {
    currentVersion,
    latestVersion,
    checking,
    checkUpdate,
  };
}