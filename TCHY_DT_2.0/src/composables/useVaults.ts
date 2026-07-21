// src/composables/useVaults.ts
import { ref } from 'vue';
import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile, mkdir } from '@tauri-apps/plugin-fs';

export interface Vault {
  id: string;
  name: string;
  path: string;
  cacheDir?: string; // 可选：自定义图谱缓存目录
}

const vaults = ref<Vault[]>([]);
const activeVaultId = ref<string | null>(null);

// 获取 vaults.json 的完整路径
function getVaultsFilePath(): string {
  const configDir = localStorage.getItem('config-dir') || '';
  return configDir ? `${configDir}/vaults.json` : 'vaults.json';
}

// 加载仓库数据（从磁盘文件读取）
export async function loadVaults() {
  try {
    const filePath = getVaultsFilePath();
    const content = await readTextFile(filePath);
    const data = JSON.parse(content);
    vaults.value = data.vaults || [];
    activeVaultId.value = data.activeVaultId || null;
    
    if (activeVaultId.value) {
      const active = vaults.value.find(v => v.id === activeVaultId.value);
      localStorage.setItem('active-vault-path', active?.path || '');
    }
    return;
  } catch (error) {
    console.log('vaults.json 不存在，尝试从 localStorage 迁移...');
    try {
      const stored = localStorage.getItem('vaults');
      if (stored) {
        const data = JSON.parse(stored);
        vaults.value = data.vaults || [];
        activeVaultId.value = data.activeVaultId || null;
        await saveVaults();
        localStorage.removeItem('vaults');
        console.log('✅ 仓库数据已从 localStorage 迁移到 vaults.json');
        return;
      }
    } catch (e) {
      console.error('迁移失败', e);
    }
    vaults.value = [];
    activeVaultId.value = null;
  }
}

// 保存仓库数据到磁盘文件
export async function saveVaults() {
  try {
    const filePath = getVaultsFilePath();
    const data = {
      vaults: vaults.value,
      activeVaultId: activeVaultId.value,
    };
    try {
      await writeTextFile(filePath, JSON.stringify(data, null, 2));
    } catch (writeError: any) {
      if (writeError.message?.includes('No such file or directory')) {
        const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
        await mkdir(dirPath, { recursive: true });
        await writeTextFile(filePath, JSON.stringify(data, null, 2));
      } else {
        throw writeError;
      }
    }
  } catch (error) {
    console.error('保存仓库数据失败:', error);
    throw error;
  }
}

export function useVaults() {
  async function addVault() {
    const selected = await open({
      directory: true,
      multiple: false,
      title: '选择笔记仓库文件夹',
    });
    if (selected && typeof selected === 'string') {
      if (vaults.value.some(v => v.path === selected)) {
        alert('该文件夹已添加为仓库');
        return;
      }
      const name = selected.split(/[\\/]/).pop() || '未命名仓库';
      const newVault: Vault = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        name,
        path: selected,
      };
      vaults.value.push(newVault);
      if (!activeVaultId.value) {
        activeVaultId.value = newVault.id;
      }
      await saveVaults();
      const active = vaults.value.find(v => v.id === activeVaultId.value);
      localStorage.setItem('active-vault-path', active?.path || '');
    }
  }

  function setActiveVault(id: string) {
    activeVaultId.value = id;
    saveVaults();
    const active = vaults.value.find(v => v.id === id);
    localStorage.setItem('active-vault-path', active?.path || '');
  }

  async function removeVault(id: string) {
    // 使用 confirm（浏览器原生，不需要 Tauri 权限）
    if (confirm('确定要移除该仓库吗？（不会删除磁盘文件）')) {
      vaults.value = vaults.value.filter(v => v.id !== id);
      if (activeVaultId.value === id) {
        activeVaultId.value = vaults.value.length > 0 ? vaults.value[0].id : null;
      }
      await saveVaults();
      const active = vaults.value.find(v => v.id === activeVaultId.value);
      localStorage.setItem('active-vault-path', active?.path || '');
    }
  }

  function getActiveVaultPath(): string | null {
    if (!activeVaultId.value) return null;
    const vault = vaults.value.find(v => v.id === activeVaultId.value);
    return vault ? vault.path : null;
  }

  // 获取当前激活的仓库对象
  function getActiveVault(): Vault | null {
    if (!activeVaultId.value) return null;
    return vaults.value.find(v => v.id === activeVaultId.value) || null;
  }

  // 更新仓库信息（包括 cacheDir）
  async function updateVault(id: string, updates: Partial<Vault>) {
    const index = vaults.value.findIndex(v => v.id === id);
    if (index === -1) {
      console.error('仓库不存在:', id);
      return;
    }
    vaults.value[index] = { ...vaults.value[index], ...updates };
    await saveVaults();
    if (activeVaultId.value === id) {
      const active = vaults.value.find(v => v.id === id);
      localStorage.setItem('active-vault-path', active?.path || '');
    }
  }

  return {
    vaults,
    activeVaultId,
    addVault,
    setActiveVault,
    removeVault,
    getActiveVaultPath,
    getActiveVault,
    loadVaults,
    saveVaults,
    updateVault,
  };
}