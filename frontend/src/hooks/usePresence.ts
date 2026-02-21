import { useEffect, useState, useCallback } from 'react'
import { HocuspocusProvider } from '@hocuspocus/provider'

export interface UserPresence {
  clientId: number
  user: {
    name: string
    color: string
  }
  cursor?: {
    x: number
    y: number
  }
  selectedNode?: string
}

// 사용자별 고유 색상 생성
const USER_COLORS = [
  '#ef4444', // red
  '#f59e0b', // amber
  '#10b981', // green
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
]

function getUserColor(clientId: number): string {
  return USER_COLORS[clientId % USER_COLORS.length]
}

export function usePresence(provider: HocuspocusProvider | null, userName?: string) {
  const [collaborators, setCollaborators] = useState<Map<number, UserPresence>>(new Map())

  useEffect(() => {
    if (!provider?.awareness) return

    const awareness = provider.awareness
    const clientId = awareness.clientID

    // 내 정보 설정
    awareness.setLocalStateField('user', {
      name: userName || `사용자 ${clientId}`,
      color: getUserColor(clientId),
    })

    // 다른 사용자 정보 감지
    const updateCollaborators = () => {
      const states = awareness.getStates()
      const collaboratorsMap = new Map<number, UserPresence>()

      states.forEach((state, id) => {
        if (id !== clientId && state.user) {
          collaboratorsMap.set(id, {
            clientId: id,
            user: state.user,
            cursor: state.cursor,
            selectedNode: state.selectedNode,
          })
        }
      })

      setCollaborators(collaboratorsMap)
    }

    awareness.on('change', updateCollaborators)
    updateCollaborators()

    return () => {
      awareness.off('change', updateCollaborators)
    }
  }, [provider, userName])

  // 커서 위치 업데이트
  const updateCursor = useCallback((x: number, y: number) => {
    if (!provider?.awareness) return
    provider.awareness.setLocalStateField('cursor', { x, y })
  }, [provider])

  // 선택된 노드 업데이트
  const updateSelectedNode = useCallback((nodeId?: string) => {
    if (!provider?.awareness) return
    provider.awareness.setLocalStateField('selectedNode', nodeId)
  }, [provider])

  return {
    collaborators,
    updateCursor,
    updateSelectedNode,
  }
}
