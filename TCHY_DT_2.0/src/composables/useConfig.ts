// src/composables/useConfig.ts
import { ref, computed } from 'vue';
import { invoke } from '@tauri-apps/api/core';

// 1. 定义数据结构（这就是你的 settings.json 的样子）
export interface AppSettings {
  vaults: {
    id: string;
    name: string;
    path: string;
    cacheDir?: string;
  }[];
  activeVaultPath: string;
  plugins: Record<string, boolean>;
  theme: 'light' | 'dark';
  autoSave: boolean;
}

// 2. 默认配置（第一次启动时用）
const defaultSettings: AppSettings = {
  vaults: [],
  activeVaultPath: '',
  plugins: {},
  theme: 'light',
  autoSave: true,
};

// 3. 全局状态（整个应用共享）
const settings = ref<AppSettings>({ ...defaultSettings });

export function useConfig() {
  // 4. 从硬盘读取配置
  async function loadConfigDir() {
    try {
      const json = await invoke<string>('get_settings');
      const data = JSON.parse(json);
      // 合并数据，防止缺少字段
      settings.value = { ...defaultSettings, ...data };
      console.log('✅ 配置加载成功', settings.value);
    } catch (error) {
      console.warn('⚠️ 读取配置失败，使用默认配置', error);
      settings.value = { ...defaultSettings };
    }
    return settings.value;
  }

  // 5. 保存配置到硬盘
  async function saveSettings() {
    try {
      await invoke('save_settings', { settingsJson: JSON.stringify(settings.value) });
      console.log('✅ 配置已保存');
    } catch (error) {
      console.error('❌ 保存配置失败', error);
      throw error;
    }
  }

  // 6. 获取配置文件存放目录（其实就是 exe 所在目录/config）
  async function getConfigDir() {
    const appDir = await invoke<string>('get_app_dir');
    return `${appDir}/config`;
  }

  // 7. 仓库管理（新增仓库）
  function addVault(path: string, name?: string) {
    const id = `vault_${Date.now()}`;
    settings.value.vaults.push({
      id,
      name: name || path.split(/[\\/]/).pop() || '未命名',
      path,
    });
    return id;
  }

  // 8. 仓库管理（移除仓库）
  function removeVault(id: string) {
    const index = settings.value.vaults.findIndex(v => v.id === id);
    if (index !== -1) {
      // 如果移除的是当前激活的仓库，清空激活状态
      if (settings.value.vaults[index].path === settings.value.activeVaultPath) {
        settings.value.activeVaultPath = '';
      }
      settings.value.vaults.splice(index, 1);
    }
  }

  // 9. 仓库管理（激活仓库）
  function setActiveVault(id: string) {
    const vault = settings.value.vaults.find(v => v.id === id);
    if (vault) {
      settings.value.activeVaultPath = vault.path;
    }
  }

  // 10. 计算属性：当前激活的仓库 ID（给前端模板用的）
  const activeVaultId = computed(() => {
    const vault = settings.value.vaults.find(v => v.path === settings.value.activeVaultPath);
    return vault?.id || null;
  });

  // 11. 返回所有功能
  return {
    settings,          // 整个配置对象
    activeVaultId,     // 当前激活的仓库 ID
    loadConfigDir,     // 加载（保留这个名字，兼容 Settings.vue）
    saveSettings,
    getConfigDir,
    addVault,
    removeVault,
    setActiveVault,
  };
}