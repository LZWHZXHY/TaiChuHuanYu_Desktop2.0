// src/composables/useConfig.ts
import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { setConfigDir as setPluginConfigDir, savePluginStates } from '@/plugins';

const configDir = ref('');

export function useConfig() {
  async function loadConfigDir() {
    const saved = localStorage.getItem('config-dir');
    if (saved) {
      configDir.value = saved;
    } else {
      const dir = await invoke<string>('get_app_dir');
      configDir.value = dir;
      localStorage.setItem('config-dir', dir);
    }
    setPluginConfigDir(configDir.value);
    return configDir.value;
  }

  async function changeConfigDir(newDir: string) {
    configDir.value = newDir;
    localStorage.setItem('config-dir', newDir);
    setPluginConfigDir(newDir);
    await savePluginStates();
  }

  return {
    configDir, // 只读，但可修改
    loadConfigDir,
    changeConfigDir,
  };
}