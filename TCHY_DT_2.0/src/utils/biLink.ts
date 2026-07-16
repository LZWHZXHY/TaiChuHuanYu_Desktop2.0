// src/utils/biLink.ts

/**
 * 解析文本中的双链 [[笔记名]]
 * 返回所有匹配的笔记名数组
 */
export function parseBiLinks(text: string): string[] {
  const regex = /\[\[([^\]]+)\]\]/g;
  const matches = text.matchAll(regex);
  return Array.from(matches, (m) => m[1].trim());
}

/**
 * 将双链渲染为 HTML
 * @param text 原始文本
 * @param getNotePath 根据笔记名获取文件路径的函数
 * @returns 渲染后的 HTML 字符串
 */
export function renderBiLinks(
  text: string,
  getNotePath: (noteName: string) => string | null
): string {
  // 先转义 HTML 特殊字符（防止 XSS）
  let html = text.replace(/&/g, '&amp;')
                 .replace(/</g, '&lt;')
                 .replace(/>/g, '&gt;');

  // 匹配双链 [[笔记名]]
  const regex = /\[\[([^\]]+)\]\]/g;
  html = html.replace(regex, (_match, noteName) => {
    const trimmed = noteName.trim();
    const path = getNotePath(trimmed);
    const exists = path !== null;
    const className = exists ? 'bi-link' : 'bi-link-broken';
    const title = exists ? `跳转到「${trimmed}」` : `笔记「${trimmed}」不存在`;
    return `<a href="#" class="${className}" data-note="${trimmed}" title="${title}">${trimmed}</a>`;
  });

  return html;
}

/**
 * 从笔记名查找文件路径
 * @param noteName 笔记名（不含 .md）
 * @param fileTree 文件树数据（所有 .md 文件的路径列表）
 * @returns 完整路径或 null
 */
export function findNoteByName(
  noteName: string,
  fileTree: string[]
): string | null {
  // 精确匹配
  const exact = fileTree.find(
    (path) => path.endsWith(`/${noteName}.md`) || path.endsWith(`\\${noteName}.md`)
  );
  if (exact) return exact;

  // 模糊匹配（忽略大小写）
  const lowerName = noteName.toLowerCase();
  const fuzzy = fileTree.find((path) => {
    const base = path.split(/[\\/]/).pop()?.replace(/\.md$/, '')?.toLowerCase();
    return base === lowerName;
  });
  return fuzzy || null;
}

export function extractBiLinks(text: string): string[] {
  const regex = /\[\[([^\]]+)\]\]/g;
  const matches = text.matchAll(regex);
  return Array.from(matches, (m) => m[1].trim());
}