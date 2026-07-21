// src/utils/graphCache.ts
import { readTextFile, writeTextFile, mkdir, exists, stat, readDir } from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';
import { extractBiLinks } from './biLink';

// ===== 类型定义 =====
export interface GraphCache {
  version: number;
  timestamp: number;
  files: Record<string, { mtime: number; links: string[] }>;
  nodes: Array<{ id: string; label: string; path: string }>;
  edges: Array<{ source: string; target: string }>;
}

export interface FileChange {
  added: string[];
  removed: string[];
  modified: string[];
}

const CACHE_VERSION = 1;
const DEFAULT_CACHE_DIR = '.tchy';
const CACHE_FILE = 'graph-cache.json';

// ===== 获取缓存目录（修正路径拼接） =====
export async function getCacheDir(vaultPath: string, customDir?: string): Promise<string> {
  if (customDir) {
    // 判断是否为绝对路径（Windows 或 Unix）
    const isAbsolute = /^[A-Za-z]:[\\/]/.test(customDir) || /^[\\/]/.test(customDir);
    const dirPath = isAbsolute ? customDir : await join(vaultPath, customDir);
    await ensureDir(dirPath);
    return dirPath;
  }
  const defaultPath = await join(vaultPath, DEFAULT_CACHE_DIR);
  await ensureDir(defaultPath);
  return defaultPath;
}

async function ensureDir(dir: string): Promise<void> {
  if (!(await exists(dir))) {
    await mkdir(dir, { recursive: true });
  }
}

export async function readGraphCache(vaultPath: string, cacheDir?: string): Promise<GraphCache | null> {
  try {
    const dir = await getCacheDir(vaultPath, cacheDir);
    const filePath = await join(dir, CACHE_FILE);
    if (!(await exists(filePath))) return null;
    const content = await readTextFile(filePath);
    const data = JSON.parse(content);
    if (data.version !== CACHE_VERSION) return null;
    return data;
  } catch {
    return null;
  }
}

export async function writeGraphCache(vaultPath: string, cache: GraphCache, cacheDir?: string): Promise<void> {
  const dir = await getCacheDir(vaultPath, cacheDir);
  const filePath = await join(dir, CACHE_FILE);
  await writeTextFile(filePath, JSON.stringify(cache, null, 2));
}

async function scanAllMarkdownFiles(dirPath: string): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  try {
    const entries = await readDir(dirPath);
    for (const entry of entries) {
      const fullPath = await join(dirPath, entry.name);
      if (entry.isFile && entry.name.endsWith('.md')) {
        try {
          const fileStat = await stat(fullPath);
          result[fullPath] = fileStat.mtime?.getTime() || 0;
        } catch {
          result[fullPath] = 0;
        }
      } else if (entry.isDirectory) {
        const subResult = await scanAllMarkdownFiles(fullPath);
        Object.assign(result, subResult);
      }
    }
  } catch (e) {
    console.warn('扫描目录失败:', dirPath, e);
  }
  return result;
}

export function detectFileChanges(
  currentFiles: Record<string, number>,
  cachedFiles: Record<string, { mtime: number; links: string[] }>
): FileChange {
  const added: string[] = [];
  const removed: string[] = [];
  const modified: string[] = [];

  const cachedPaths = new Set(Object.keys(cachedFiles));
  const currentPaths = new Set(Object.keys(currentFiles));

  for (const path of currentPaths) {
    if (!cachedPaths.has(path)) added.push(path);
  }
  for (const path of cachedPaths) {
    if (!currentPaths.has(path)) removed.push(path);
  }
  for (const path of currentPaths) {
    if (cachedPaths.has(path)) {
      const currentMtime = currentFiles[path];
      const cachedMtime = cachedFiles[path].mtime;
      if (currentMtime !== cachedMtime) modified.push(path);
    }
  }
  return { added, removed, modified };
}

async function extractLinksFromFile(filePath: string): Promise<string[]> {
  try {
    const content = await readTextFile(filePath);
    return extractBiLinks(content);
  } catch {
    return [];
  }
}

function findPathByNoteName(noteName: string, paths: string[]): string | null {
  const lowerName = noteName.toLowerCase();
  for (const p of paths) {
    const base = p.split(/[\\/]/).pop()?.replace(/\.md$/i, '') || '';
    if (base === noteName || base.toLowerCase() === lowerName) return p;
  }
  return null;
}

// ===== 构建图谱数据（参数改为可选） =====
export function buildGraphDataFromCache(
  cache: GraphCache,
  currentFilePath?: string
): {
  nodes: Array<{ id: string; label: string; path: string; isCurrent: boolean }>;
  edges: Array<{ source: string; target: string }>;
} {
  const nodes = cache.nodes.map(n => ({
    ...n,
    isCurrent: currentFilePath ? n.path === currentFilePath : false,
  }));
  return { nodes, edges: cache.edges };
}

// ===== 更新缓存（参数 currentFilePath 改为可选） =====
export async function updateGraphCache(
  vaultPath: string,
  currentFilePath?: string,
  cacheDir?: string,
  onProgress?: (msg: string) => void
): Promise<{
  cache: GraphCache;
  nodes: Array<{ id: string; label: string; path: string; isCurrent: boolean }>;
  edges: Array<{ source: string; target: string }>;
}> {
  onProgress?.('正在扫描 .md 文件...');
  
  const currentFiles = await scanAllMarkdownFiles(vaultPath);
  let cache = await readGraphCache(vaultPath, cacheDir);

  if (cache) {
    const changes = detectFileChanges(currentFiles, cache.files);
    const totalChanges = changes.added.length + changes.removed.length + changes.modified.length;

    if (totalChanges === 0) {
      onProgress?.('无变化，使用缓存数据');
      return {
        cache,
        ...buildGraphDataFromCache(cache, currentFilePath),
      };
    }

    onProgress?.(`检测到 ${totalChanges} 个文件变化，正在更新...`);

    for (const path of changes.removed) {
      delete cache.files[path];
    }

    const filesToProcess = [...changes.added, ...changes.modified];
    for (const path of filesToProcess) {
      const links = await extractLinksFromFile(path);
      cache.files[path] = { mtime: currentFiles[path] || 0, links };
    }

    const allPaths = Object.keys(currentFiles);
    const nodes = allPaths.map(path => ({
      id: path,
      label: path.split(/[\\/]/).pop()?.replace(/\.md$/, '') || '未命名',
      path,
    }));

    const edges: Array<{ source: string; target: string }> = [];
    for (const [sourcePath, fileData] of Object.entries(cache.files)) {
      for (const noteName of fileData.links) {
        const targetPath = findPathByNoteName(noteName, allPaths);
        if (targetPath && sourcePath !== targetPath) {
          edges.push({ source: sourcePath, target: targetPath });
        }
      }
    }

    cache.nodes = nodes;
    cache.edges = edges;
    cache.timestamp = Date.now();

    await writeGraphCache(vaultPath, cache, cacheDir);
    onProgress?.('缓存已更新');

    return {
      cache,
      nodes: nodes.map(n => ({ ...n, isCurrent: n.path === currentFilePath })),
      edges,
    };
  } else {
    onProgress?.('首次构建，正在扫描所有文件...');
    const allPaths = Object.keys(currentFiles);
    const fileLinks: Record<string, string[]> = {};

    for (const path of allPaths) {
      const links = await extractLinksFromFile(path);
      fileLinks[path] = links;
    }

    const nodes = allPaths.map(path => ({
      id: path,
      label: path.split(/[\\/]/).pop()?.replace(/\.md$/, '') || '未命名',
      path,
    }));

    const edges: Array<{ source: string; target: string }> = [];
    for (const [sourcePath, links] of Object.entries(fileLinks)) {
      for (const noteName of links) {
        const targetPath = findPathByNoteName(noteName, allPaths);
        if (targetPath && sourcePath !== targetPath) {
          edges.push({ source: sourcePath, target: targetPath });
        }
      }
    }

    const files: Record<string, { mtime: number; links: string[] }> = {};
    for (const path of allPaths) {
      files[path] = { mtime: currentFiles[path] || 0, links: fileLinks[path] || [] };
    }

    cache = {
      version: CACHE_VERSION,
      timestamp: Date.now(),
      files,
      nodes,
      edges,
    };

    await writeGraphCache(vaultPath, cache, cacheDir);
    onProgress?.('缓存已创建');

    return {
      cache,
      nodes: nodes.map(n => ({ ...n, isCurrent: n.path === currentFilePath })),
      edges,
    };
  }
}

// ===== 增量更新单个文件的链接 =====
export async function updateFileLinksInCache(
  vaultPath: string,
  filePath: string,
  cacheDir?: string
): Promise<void> {
  const cache = await readGraphCache(vaultPath, cacheDir);
  if (!cache) return;

  const links = await extractLinksFromFile(filePath);
  const mtime = (await stat(filePath)).mtime?.getTime() || 0;

  cache.files[filePath] = { mtime, links };

  const allPaths = Object.keys(cache.files);
  const nodes = allPaths.map(path => ({
    id: path,
    label: path.split(/[\\/]/).pop()?.replace(/\.md$/, '') || '未命名',
    path,
  }));

  const edges: Array<{ source: string; target: string }> = [];
  for (const [sourcePath, fileData] of Object.entries(cache.files)) {
    for (const noteName of fileData.links) {
      const targetPath = findPathByNoteName(noteName, allPaths);
      if (targetPath && sourcePath !== targetPath) {
        edges.push({ source: sourcePath, target: targetPath });
      }
    }
  }

  cache.nodes = nodes;
  cache.edges = edges;
  cache.timestamp = Date.now();

  await writeGraphCache(vaultPath, cache, cacheDir);
}