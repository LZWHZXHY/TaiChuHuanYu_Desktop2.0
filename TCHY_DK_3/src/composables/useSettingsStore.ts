import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'

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
  window_width: number
  window_height: number
  plugins: {
    local_editor: boolean
    web_viewer: boolean
    asset_manager: boolean
  }
}

const defaultSettings: Settings = {
  vaults: [],
  active_vault_path: '',
  theme: 'light',
  auto_save: true,
  window_width: 1280,
  window_height: 720,
  plugins: {
    local_editor: true,
    web_viewer: false,
    asset_manager: false,
  },
}

const settings = ref<Settings>({ ...defaultSettings })
const vaults = ref<Vault[]>([])
const activeId = ref<string>('')
const configDir = ref('加载中...')

export function useSettingsStore() {
  // ---------- 加载配置 ----------
  async function loadSettings() {
    try {
      const json = await invoke<string>('get_settings')
      const data = JSON.parse(json) as Settings
      settings.value = data
      vaults.value = data.vaults || []
      activeId.value = data.active_vault_path || ''
      console.log('✅ 配置已加载', settings.value)
    } catch (error) {
      console.warn('⚠️ 加载配置失败，使用默认配置', error)
      settings.value = { ...defaultSettings }
      vaults.value = []
      activeId.value = ''
    }
    return settings.value
  }

  // ---------- 保存配置 ----------
  async function saveSettings() {
    if (!settings.value) return
    try {
      const json = JSON.stringify(settings.value, null, 2)
      await invoke('save_settings', { settingsJson: json })
      console.log('✅ 配置已保存')
    } catch (error) {
      console.error('❌ 保存配置失败:', error)
      throw error
    }
  }

  // ---------- 获取配置目录 ----------
  async function getConfigDir() {
    try {
      const appDir = await invoke<string>('get_app_dir')
      configDir.value = `${appDir}/config`
    } catch {
      configDir.value = '未知'
    }
    return configDir.value
  }

  // ---------- 仓库管理：增 ----------
  async function addVault(name: string, path: string) {
    const newId = `vault_${Date.now()}`
    vaults.value.push({ id: newId, name, path })
    if (!activeId.value) {
      activeId.value = path
    }
    // 同步更新 settings.value
    if (settings.value) {
      settings.value.vaults = vaults.value
      settings.value.active_vault_path = activeId.value
    }
    await saveSettings()
  }

  // ---------- 仓库管理：删 ----------
  async function removeVault(id: string) {
    if (vaults.value.length <= 1) {
      alert('至少保留一个仓库')
      return
    }
    const index = vaults.value.findIndex(v => v.id === id)
    if (index !== -1) {
      if (vaults.value[index].path === activeId.value) {
        activeId.value = ''
      }
      vaults.value.splice(index, 1)
      if (settings.value) {
        settings.value.vaults = vaults.value
        settings.value.active_vault_path = activeId.value
      }
      await saveSettings()
    }
  }

  // ---------- 仓库管理：激活 ----------
  async function setActive(id: string) {
    const vault = vaults.value.find(v => v.id === id)
    if (vault) {
      activeId.value = vault.path
      if (settings.value) {
        settings.value.active_vault_path = activeId.value
      }
      await saveSettings()
    }
  }

  return {
    settings,
    vaults,
    activeId,
    configDir,
    loadSettings,
    saveSettings,
    getConfigDir,
    addVault,
    removeVault,
    setActive,
  }
}