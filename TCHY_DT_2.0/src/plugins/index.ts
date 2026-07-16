import { reactive, defineAsyncComponent, markRaw } from 'vue';  // 从 shallowReactive 改为 reactive
import type { Plugin } from '@/types/plugin';

export const availablePlugins = reactive<Plugin[]>([  // reactive 会深度追踪对象属性变化
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