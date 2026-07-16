import { reactive, defineAsyncComponent, markRaw } from 'vue';
import { writeTextFile, readTextFile, mkdir, BaseDirectory } from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';
import type { Plugin } from '@/types/plugin';

export const availablePlugins: Plugin[] = reactive([
  {
    id: 'website',
    name: '网站',
    description: '加载原有线上网站',
    enabled: true,
    component: markRaw(defineAsyncComponent(() => import('./Website/WebsiteView.vue'))),
  },
  {
    id: 'local-editor',
    name: '本地笔记',
    description: '本地文件编辑',
    enabled: false,
    component: markRaw(defineAsyncComponent(() => import('./Local_Editor/LocalEditorView.vue'))),
    permissions: ['fs'],
  },
]);

let currentConfigDir: string | null = null;

export function setConfigDir(dir: string) {
  currentConfigDir = dir;
}

async function getConfigPath(): Promise<string> {
  if (currentConfigDir) {
    return await join(currentConfigDir, 'plugins.json');
  } else {
    return await join('app_config', 'plugins.json');
  }
}

async function ensureConfigDirExists() {
  if (currentConfigDir) {
    try {
      // 自定义目录，使用绝对路径创建（递归）
      await mkdir(currentConfigDir, { recursive: true });
    } catch (_) {}
  } else {
    try {
      // 默认目录，基于 BaseDirectory.Config
      await mkdir('app_config', { baseDir: BaseDirectory.Config, recursive: true });
    } catch (_) {}
  }
}

export async function savePluginStates() {
  await ensureConfigDirExists();
  const states = availablePlugins.map(p => ({ id: p.id, enabled: p.enabled }));
  const content = JSON.stringify(states, null, 2);
  const path = await getConfigPath();

  try {
    if (currentConfigDir) {
      await writeTextFile(path, content);
    } else {
      await writeTextFile(path, content, { baseDir: BaseDirectory.Config });
    }
    console.log('插件状态已保存到:', path);
  } catch (e) {
    console.error('保存插件状态失败:', e);
  }
}

export async function loadPluginStates() {
  const path = await getConfigPath();

  try {
    let content: string;
    if (currentConfigDir) {
      content = await readTextFile(path);
    } else {
      content = await readTextFile(path, { baseDir: BaseDirectory.Config });
    }

    const states = JSON.parse(content);
    states.forEach((state: any) => {
      const plugin = availablePlugins.find(p => p.id === state.id);
      if (plugin) {
        plugin.enabled = state.enabled;
      }
    });
    console.log('插件状态从文件加载成功:', path);
  } catch (_) {
    console.warn('未找到插件状态文件，使用默认配置');
  }
}