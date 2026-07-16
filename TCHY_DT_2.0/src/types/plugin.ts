import type { Component } from 'vue';

export interface Plugin {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  component: Component; // 改为 Component 类型
  permissions?: string[];
}