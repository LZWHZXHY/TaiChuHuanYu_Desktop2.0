// src/plugins/NoteEditor/composables/useNotes.ts
import { invoke } from '@tauri-apps/api/core'

export interface FileNode {
  name: string
  path: string
  is_folder: boolean
  children: FileNode[]
}

export function useNotes() {
  async function listNotesTree(): Promise<FileNode[]> {
    try {
      const result = await invoke<FileNode[]>('list_notes_tree')
      return result || []
    } catch (error) {
      console.error('加载目录树失败:', error)
      return []
    }
  }

  async function readNote(relativePath: string) {
    return await invoke<string>('read_note', { relativePath })
  }

  async function saveNote(relativePath: string, content: string) {
    await invoke('save_note', { relativePath, content })
  }

  async function createNote(relativePath: string, content?: string) {
    await invoke('create_note', { relativePath, content: content || '' })
  }

  async function deleteNote(relativePath: string) {
    await invoke('delete_note', { relativePath })
  }

  async function createFolder(relativePath: string) {
    await invoke('create_folder', { relativePath })
  }

  async function moveNote(sourcePath: string, targetPath: string) {
    await invoke('move_note', { sourcePath, targetPath })
  }

  return {
    listNotesTree,
    readNote,
    saveNote,
    createNote,
    deleteNote,
    createFolder,
    moveNote,
  }
}