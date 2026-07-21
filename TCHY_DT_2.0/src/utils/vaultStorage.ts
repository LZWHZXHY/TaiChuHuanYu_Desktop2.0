// src/utils/vaultStorage.ts
import { readTextFile, writeTextFile, mkdir, exists } from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';
import { useConfig } from '@/composables/useConfig';

const VAULTS_FILE = 'vaults.json';

async function getVaultsFilePath(): Promise<string> {
  const { configDir } = useConfig();
  // 确保配置目录存在
  const dir = configDir.value || await getDefaultConfigDir();
  await ensureDir(dir);
  return await join(dir, VAULTS_FILE);
}

async function getDefaultConfigDir(): Promise<string> {
  // 默认配置目录：~/.tchy 或 AppData 等，这里简单返回用户目录下的 .tchy
  const home = await import('@tauri-apps/api/path').then(m => m.homeDir());
  return await join(home, '.tchy');
}

async function ensureDir(dir: string) {
  if (!(await exists(dir))) {
    await mkdir(dir, { recursive: true });
  }
}

export async function loadVaults(): Promise<{ vaults: any[]; activeId: string | null }> {
  try {
    const filePath = await getVaultsFilePath();
    if (!(await exists(filePath))) {
      return { vaults: [], activeId: null };
    }
    const content = await readTextFile(filePath);
    return JSON.parse(content);
  } catch {
    return { vaults: [], activeId: null };
  }
}

export async function saveVaults(data: { vaults: any[]; activeId: string | null }) {
  const filePath = await getVaultsFilePath();
  await ensureDir(await getDefaultConfigDir()); // 确保父目录存在
  await writeTextFile(filePath, JSON.stringify(data, null, 2));
}