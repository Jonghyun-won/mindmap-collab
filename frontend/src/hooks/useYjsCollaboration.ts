import { useEffect, useState, useCallback, useRef } from 'react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { MindMapNode } from '@/hooks/useMindMapStore'
import { Edge } from 'reactflow'
import { yMapToNodes, yMapToEdges, syncNodesToYjs, syncEdgesToYjs } from '@/lib/mindmap-sync'

interface UseYjsCollaborationProps {
  documentId: string
  onNodesChange: (nodes: MindMapNode[]) => void
  onEdgesChange: (edges: Edge[]) => void
  initialNodes: MindMapNode[]
  initialEdges: Edge[]
}

export function useYjsCollaboration({
  documentId,
  onNodesChange,
  onEdgesChange,
  initialNodes,
  initialEdges,
}: UseYjsCollaborationProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState(0)

  const ydocRef = useRef<Y.Doc | null>(null)
  const providerRef = useRef<WebsocketProvider | null>(null)
  const isLocalChangeRef = useRef(false)

  useEffect(() => {
    // Create Yjs document
    const ydoc = new Y.Doc()
    ydocRef.current = ydoc

    const yNodes = ydoc.getMap('nodes')
    const yEdges = ydoc.getMap('edges')

    // WebSocket URL - use VITE_WS_URL environment variable
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000'

    console.log('🔗 Connecting to WebSocket:', wsUrl, 'Document:', documentId)

    // Create WebSocket provider with retry
    const provider = new WebsocketProvider(
      wsUrl,
      documentId,
      ydoc,
      {
        connect: true,
        params: {},
        WebSocketPolyfill: undefined,
        resyncInterval: 5000,
      }
    )
    providerRef.current = provider

    let syncTimeout: number

    // Connection status
    provider.on('status', (event: any) => {
      console.log('📡 Connection status:', event.status)
      setIsConnected(event.status === 'connected')

      // Initialize data after connection
      if (event.status === 'connected') {
        syncTimeout = window.setTimeout(() => {
          if (yNodes.size === 0 && initialNodes.length > 0) {
            console.log('📥 Initializing with local data')
            isLocalChangeRef.current = true
            syncNodesToYjs(initialNodes, yNodes, ydoc)
            syncEdgesToYjs(initialEdges, yEdges, ydoc)
            isLocalChangeRef.current = false
          }
        }, 500)
      }
    })

    // Awareness (online users)
    provider.awareness.on('change', () => {
      const states = provider.awareness.getStates()
      setOnlineUsers(states.size)
      console.log('👥 Online users:', states.size)
    })

    // Listen for sync events
    provider.on('sync', (isSynced: boolean) => {
      console.log('🔄 Sync status:', isSynced)
    })

    // Listen for remote changes
    const observeNodes = () => {
      if (!isLocalChangeRef.current) {
        console.log('📦 Remote nodes changed')
        const nodes = yMapToNodes(yNodes)
        onNodesChange(nodes)
      }
    }

    const observeEdges = () => {
      if (!isLocalChangeRef.current) {
        console.log('📦 Remote edges changed')
        const edges = yMapToEdges(yEdges)
        onEdgesChange(edges)
      }
    }

    yNodes.observe(observeNodes)
    yEdges.observe(observeEdges)

    // Cleanup
    return () => {
      clearTimeout(syncTimeout)
      yNodes.unobserve(observeNodes)
      yEdges.unobserve(observeEdges)
      provider.destroy()
      ydoc.destroy()
      console.log('🔌 Disconnected from collaboration')
    }
  }, [documentId])

  // Sync local changes to Yjs with debounce
  const syncLocalNodes = useCallback((nodes: MindMapNode[]) => {
    if (ydocRef.current && providerRef.current && isConnected) {
      const yNodes = ydocRef.current.getMap('nodes')
      isLocalChangeRef.current = true
      try {
        syncNodesToYjs(nodes, yNodes, ydocRef.current)
      } catch (error) {
        console.error('Error syncing nodes:', error)
      } finally {
        isLocalChangeRef.current = false
      }
    }
  }, [isConnected])

  const syncLocalEdges = useCallback((edges: Edge[]) => {
    if (ydocRef.current && providerRef.current && isConnected) {
      const yEdges = ydocRef.current.getMap('edges')
      isLocalChangeRef.current = true
      try {
        syncEdgesToYjs(edges, yEdges, ydocRef.current)
      } catch (error) {
        console.error('Error syncing edges:', error)
      } finally {
        isLocalChangeRef.current = false
      }
    }
  }, [isConnected])

  return {
    isConnected,
    onlineUsers,
    syncLocalNodes,
    syncLocalEdges,
    ydoc: ydocRef.current,
    provider: providerRef.current,
  }
}
