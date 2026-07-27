// src/composables/useSettingsStore.ts
import { ref } from 'vue'

export interface Vault {
  id: string
  name: string
  path: string
}

// 全局单例状态（整个应用共享）
const vaults = ref<Vault[]>([
  { id: 'vault_1', name: '工作笔记', path: 'C:/Users/Admin/Documents/Work' },
  { id: 'vault_2', name: '个人笔记', path: 'D:/MyNotes/Personal' },
])
const activeId = ref('vault_1')
const configDir = ref('D:/我的软件/config (演示路径)')

export function useSettingsStore() {
  function addVault(name: string, path: string) {
    const newId = `vault_${Date.now()}`
    vaults.value.push({ id: newId, name, path })
    if (!activeId.value) {
      activeId.value = newId
    }
  }

  function removeVault(id: string) {
    if (vaults.value.length <= 1) {
      alert('至少保留一个仓库')
      return
    }
    vaults.value = vaults.value.filter(v => v.id !== id)
    if (activeId.value === id) {
      activeId.value = vaults.value[0]?.id || ''
    }
  }

  function setActive(id: string) {
    activeId.value = id
  }

  return {
    vaults,
    activeId,
    configDir,
    addVault,
    removeVault,
    setActive,
  }
}