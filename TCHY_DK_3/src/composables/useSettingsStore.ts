// src/composables/useSettingsStore.ts
import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'   // ← 改这一行

export interface Vault {
  id: string
  name: string
  path: string
}


export interface Settings {
  vaults: Vault[]
  active_vault_path: string
  theme: string
  auto_save: boolean
  window_width: number      // ← 新增
  window_height: number     // ← 新增
  plugins: {
    local_editor: boolean
    web_viewer: boolean
    asset_manager: boolean
  }
}

// 全局状态
const vaults = ref<Vault[]>([])
const activeId = ref<string>('')
const configDir = ref('加载中...')
const settings = ref<Settings | null>(null)

export function useSettingsStore() {
  // 🆕 从硬盘加载配置
  async function loadSettings() {
    try {
      const json = await invoke<string>('get_settings')
      const data = JSON.parse(json) as Settings
      
      settings.value = data
      vaults.value = data.vaults || []
      activeId.value = data.active_vault_path || ''
      
      console.log('✅ 配置已加载：', data)
    } catch (error) {
      console.error('❌ 加载配置失败：', error)
      // 如果加载失败，使用空数据
      vaults.value = []
      activeId.value = ''
      settings.value = null
    }
  }
  async function saveSettings() {
    if (!settings.value) {
      console.warn('⚠️ 没有配置可保存')
      return
    }

    try {
      const json = JSON.stringify(settings.value, null, 2)
      await invoke('save_settings', { settingsJson: json })
      console.log('✅ 配置已保存到硬盘')
    } catch (error) {
      console.error('❌ 保存配置失败:', error)
      throw error
    }
  }
  // 获取配置文件目录（用于显示）
  async function getConfigDir() {
    try {
      const appDir = await invoke<string>('get_app_dir')
      configDir.value = `${appDir}/config`
    } catch {
      configDir.value = '未知'
    }
    return configDir.value
  }

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
    settings,
    loadSettings,    // 🆕 导出加载函数
    saveSettings,
    getConfigDir,
    addVault,
    removeVault,
    setActive,
  }
}