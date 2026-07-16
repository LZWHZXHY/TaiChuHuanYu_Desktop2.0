// src/composables/useVaults.ts
import { ref } from 'vue';
import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile, mkdir } from '@tauri-apps/plugin-fs';
import { BaseDirectory } from '@tauri-apps/api/path';

export interface Vault {
  id: string;
  name: string;
  path: string;
}

const vaults = ref<Vault[]>([]);
const activeVaultId = ref<string | null>(null);

// 获取 vaults.json 的完整路径
function getVaultsFilePath(): string {
  const configDir = localStorage.getItem('config-dir') || '';
  // 如果 configDir 为空，回退到应用数据目录（但理论上不会发生）
  return configDir ? `${configDir}/vaults.json` : 'vaults.json';
}

// 加载仓库数据（从磁盘文件读取）
export async function loadVaults() {
  try {
    const filePath = getVaultsFilePath();
    // 尝试读取文件
    const content = await readTextFile(filePath);
    const data = JSON.parse(content);
    vaults.value = data.vaults || [];
    activeVaultId.value = data.activeVaultId || null;
    
    // 如果成功读取，更新激活路径缓存
    if (activeVaultId.value) {
      const active = vaults.value.find(v => v.id === activeVaultId.value);
      localStorage.setItem('active-vault-path', active?.path || '');
    }
    return;
  } catch (error) {
    // 文件不存在或读取失败，尝试从 localStorage 迁移旧数据
    console.log('vaults.json 不存在，尝试从 localStorage 迁移...');
    try {
      const stored = localStorage.getItem('vaults');
      if (stored) {
        const data = JSON.parse(stored);
        vaults.value = data.vaults || [];
        activeVaultId.value = data.activeVaultId || null;
        // 迁移成功后立即保存到磁盘
        await saveVaults();
        // 清除 localStorage 中的旧数据（可选）
        localStorage.removeItem('vaults');
        console.log('✅ 仓库数据已从 localStorage 迁移到 vaults.json');
        return;
      }
    } catch (e) {
      console.error('迁移失败', e);
    }
    // 如果都没有，初始化为空
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
    // 确保目录存在（如果目录不存在，writeTextFile 会报错）
    // 先尝试写入，如果失败再创建目录重试
    try {
      await writeTextFile(filePath, JSON.stringify(data, null, 2));
    } catch (writeError: any) {
      // 如果是因为目录不存在，创建目录后重试
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
        id: Date.now().toString(),
        name,
        path: selected,
      };
      vaults.value.push(newVault);
      if (!activeVaultId.value) {
        activeVaultId.value = newVault.id;
      }
      await saveVaults();
      // 保存激活路径到 localStorage，供其他组件使用
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

  // 获取当前激活仓库路径
  function getActiveVaultPath(): string | null {
    if (!activeVaultId.value) return null;
    const vault = vaults.value.find(v => v.id === activeVaultId.value);
    return vault ? vault.path : null;
  }

  return {
    vaults,
    activeVaultId,
    addVault,
    setActiveVault,
    removeVault,
    getActiveVaultPath,
    loadVaults,
    saveVaults,
  };
}