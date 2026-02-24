import { useEffect, useState, useCallback, useRef } from 'react'
import * as Y from 'yjs'
import { HocuspocusProvider } from '@hocuspocus/provider'
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
  const providerRef = useRef<HocuspocusProvider | null>(null)
  const isLocalChangeRef = useRef(false)

  // Store callbacks in refs to avoid stale closures in the observer
  const onNodesChangeRef = useRef(onNodesChange)
  const onEdgesChangeRef = useRef(onEdgesChange)
  useEffect(() => { onNodesChangeRef.current = onNodesChange }, [onNodesChange])
  useEffect(() => { onEdgesChangeRef.current = onEdgesChange }, [onEdgesChange])

  useEffect(() => {
    // Create Yjs document
    const ydoc = new Y.Doc()
    ydocRef.current = ydoc

    const yNodes = ydoc.getMap('nodes')
    const yEdges = ydoc.getMap('edges')

    // WebSocket URL - use VITE_WS_URL environment variable
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000'

    console.log('🔗 Connecting to WebSocket:', wsUrl, 'Document:', documentId)

    // Create Hocuspocus provider
    const provider = new HocuspocusProvider({
      url: wsUrl,
      name: documentId,
      document: ydoc,
      connect: true,
    })
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
    provider.awareness?.on('change', () => {
      const states = provider.awareness?.getStates()
      if (states) {
        setOnlineUsers(states.size)
        console.log('👥 Online users:', states.size)
      }
    })

    // Listen for sync events
    provider.on('sync', (isSynced: boolean) => {
      console.log('🔄 Sync status:', isSynced)
    })

    // Listen for remote changes (use refs to avoid stale closures)
    const observeNodes = () => {
      if (!isLocalChangeRef.current && yNodes.size > 0) {
        console.log('📦 Remote nodes changed, count:', yNodes.size)
        const nodes = yMapToNodes(yNodes)
        if (nodes.length > 0) {
          onNodesChangeRef.current(nodes)
        }
      }
    }

    const observeEdges = () => {
      if (!isLocalChangeRef.current && yEdges.size > 0) {
        console.log('📦 Remote edges changed, count:', yEdges.size)
        const edges = yMapToEdges(yEdges)
        onEdgesChangeRef.current(edges)
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
      }
      // Defer reset so Yjs observer sees the flag as true
      queueMicrotask(() => {
        isLocalChangeRef.current = false
      })
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
      }
      // Defer reset so Yjs observer sees the flag as true
      queueMicrotask(() => {
        isLocalChangeRef.current = false
      })
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
