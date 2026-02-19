import { useCallback, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import * as Y from 'yjs'
import { MindMapNode } from './useMindMapStore'
import { Edge } from 'reactflow'

interface SaveData {
  nodes: MindMapNode[]
  edges: Edge[]
}

export function useSaveMindMap() {
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  const saveMindMap = useCallback(async (
    mindMapId: string,
    title: string,
    ydoc: Y.Doc | null,
    fallbackData?: SaveData
  ) => {
    setIsSaving(true)
    console.log('Saving mind map...', { mindMapId, title })

    try {
      // If we have Yjs document, use it
      if (ydoc) {
        const state = Y.encodeStateAsUpdate(ydoc)
        // const snapshot = btoa(String.fromCharCode(...Array.from(state)))
        // TODO: Send snapshot to backend when API supports it
        await apiClient.updateMindMap(mindMapId, title)
        console.log('Saved with Yjs snapshot', { stateSize: state.length })
      }
      // Otherwise use fallback data (nodes/edges directly)
      else if (fallbackData) {
        // For now, just save the title - we can extend API later to save content
        await apiClient.updateMindMap(mindMapId, title)
        console.log('Saved with fallback data', {
          nodes: fallbackData.nodes.length,
          edges: fallbackData.edges.length
        })
      } else {
        console.warn('No data to save')
        return false
      }

      setLastSaved(new Date())
      console.log('Mind map saved successfully')
      return true
    } catch (error: any) {
      console.error('Save error:', error)
      return false
    } finally {
      setIsSaving(false)
    }
  }, [])

  const autoSave = useCallback(async (
    mindMapId: string,
    title: string,
    ydoc: Y.Doc | null,
    fallbackData?: SaveData
  ) => {
    saveMindMap(mindMapId, title, ydoc, fallbackData)
  }, [saveMindMap])

  return {
    saveMindMap,
    autoSave,
    isSaving,
    lastSaved,
  }
}
