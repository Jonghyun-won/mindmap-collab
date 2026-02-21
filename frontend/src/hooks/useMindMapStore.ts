import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Node,
  Edge,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  Connection,
  NodeChange,
  EdgeChange,
  MarkerType,
} from 'reactflow'
import { useYjsCollaboration } from './useYjsCollaboration'

export interface MindMapNode extends Node {
  data: {
    label: string
    color?: string
    level?: number
    parentId?: string
    collapsed?: boolean
  }
}

// Get color based on level (4 distinct colors, then gray)
function getColorForLevel(level: number): string {
  const colors = [
    '#6366f1', // Level 0: Indigo (Root)
    '#3b82f6', // Level 1: Blue
    '#10b981', // Level 2: Green
    '#f59e0b', // Level 3: Orange
    '#9ca3af', // Level 4+: Gray
  ]
  return colors[Math.min(level, 4)]
}

// Calculate position for child nodes - Balanced tree layout (centered around parent)
function getChildPosition(parentNode: MindMapNode, existingNodes: MindMapNode[], level: number) {
  const baseX = parentNode.position.x
  const baseY = parentNode.position.y

  // Count existing children of this parent
  const siblings = existingNodes.filter(n => n.data.parentId === parentNode.id)
  const siblingCount = siblings.length

  // Spacing scales based on level for better organization
  const verticalSpacing = 180
  const horizontalSpacing = level === 1 ? 400 : Math.max(250 - (level * 20), 150)

  // Total children count including the new one being added
  const totalChildren = siblingCount + 1

  // Center all children around parent's X position
  const startX = baseX - ((totalChildren - 1) * horizontalSpacing) / 2

  // New node position (last index)
  const newX = startX + siblingCount * horizontalSpacing

  // Also reposition existing siblings to maintain balance
  siblings.forEach((sibling, index) => {
    sibling.position = {
      x: startX + index * horizontalSpacing,
      y: baseY + verticalSpacing,
    }
  })

  return {
    x: newX,
    y: baseY + verticalSpacing
  }
}

// Calculate position for sibling nodes (same level) - balanced around parent
function getSiblingPosition(currentNode: MindMapNode, existingNodes: MindMapNode[], parentId?: string) {
  const siblings = existingNodes.filter(
    n => n.data.parentId === parentId && n.data.level === currentNode.data.level
  )

  const level = currentNode.data.level || 0
  const horizontalSpacing = level === 1 ? 400 : Math.max(250 - (level * 20), 150)

  // Find parent node to center around
  const parentNode = parentId ? existingNodes.find(n => n.id === parentId) : null
  const centerX = parentNode ? parentNode.position.x : currentNode.position.x

  // Total siblings including the new one
  const totalSiblings = siblings.length + 1

  // Center all siblings around parent's X position
  const startX = centerX - ((totalSiblings - 1) * horizontalSpacing) / 2

  // Reposition existing siblings to maintain balance
  siblings.forEach((sibling, index) => {
    sibling.position = {
      x: startX + index * horizontalSpacing,
      y: sibling.position.y,
    }
  })

  // New node gets the last position
  return {
    x: startX + siblings.length * horizontalSpacing,
    y: currentNode.position.y
  }
}

interface ClipboardData {
  type: 'mindmap-nodes'
  version: 1
  rootNode: any
  descendants: any[]
  edges: any[]
}

interface HistoryState {
  nodes: MindMapNode[]
  edges: Edge[]
}

export function useMindMapStore(documentId?: string) {
  const storageKey = documentId ? `mindmap_${documentId}` : null

  const [nodes, setNodes] = useState<MindMapNode[]>([
    // Level 0: Root
    {
      id: '1',
      type: 'custom',
      data: { label: '중심 주제', color: '#6366f1', level: 0 },
      position: { x: 0, y: 0 },
    },
    // Level 1: Children
    {
      id: '2',
      type: 'custom',
      data: { label: '주제 1', color: '#3b82f6', level: 1, parentId: '1' },
      position: { x: -400, y: 180 },
    },
    {
      id: '3',
      type: 'custom',
      data: { label: '주제 2', color: '#3b82f6', level: 1, parentId: '1' },
      position: { x: 0, y: 180 },
    },
    {
      id: '4',
      type: 'custom',
      data: { label: '주제 3', color: '#3b82f6', level: 1, parentId: '1' },
      position: { x: 400, y: 180 },
    },
    // Level 2: Grandchildren of 주제 1
    {
      id: '5',
      type: 'custom',
      data: { label: '하위 주제 1-1', color: '#10b981', level: 2, parentId: '2' },
      position: { x: -500, y: 360 },
    },
    {
      id: '6',
      type: 'custom',
      data: { label: '하위 주제 1-2', color: '#10b981', level: 2, parentId: '2' },
      position: { x: -300, y: 360 },
    },
    // Level 2: Grandchildren of 주제 2
    {
      id: '7',
      type: 'custom',
      data: { label: '하위 주제 2-1', color: '#10b981', level: 2, parentId: '3' },
      position: { x: -100, y: 360 },
    },
    {
      id: '8',
      type: 'custom',
      data: { label: '하위 주제 2-2', color: '#10b981', level: 2, parentId: '3' },
      position: { x: 100, y: 360 },
    },
    // Level 2: Grandchildren of 주제 3
    {
      id: '9',
      type: 'custom',
      data: { label: '하위 주제 3-1', color: '#10b981', level: 2, parentId: '4' },
      position: { x: 300, y: 360 },
    },
    {
      id: '10',
      type: 'custom',
      data: { label: '하위 주제 3-2', color: '#10b981', level: 2, parentId: '4' },
      position: { x: 500, y: 360 },
    },
  ])
  const [edges, setEdges] = useState<Edge[]>([
    // Root -> Level 1
    { id: 'e1-2', source: '1', target: '2', type: 'smoothstep' },
    { id: 'e1-3', source: '1', target: '3', type: 'smoothstep' },
    { id: 'e1-4', source: '1', target: '4', type: 'smoothstep' },
    // 주제 1 -> Level 2
    { id: 'e2-5', source: '2', target: '5', type: 'smoothstep' },
    { id: 'e2-6', source: '2', target: '6', type: 'smoothstep' },
    // 주제 2 -> Level 2
    { id: 'e3-7', source: '3', target: '7', type: 'smoothstep' },
    { id: 'e3-8', source: '3', target: '8', type: 'smoothstep' },
    // 주제 3 -> Level 2
    { id: 'e4-9', source: '4', target: '9', type: 'smoothstep' },
    { id: 'e4-10', source: '4', target: '10', type: 'smoothstep' },
  ])
  const [history, setHistory] = useState<HistoryState[]>([])
  const [clipboard, setClipboard] = useState<MindMapNode | null>(null)

  // Track if changes are from remote (Yjs) to prevent sync loops
  const isRemoteChangeRef = useRef(false)

  // Load from localStorage on mount
  useEffect(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        try {
          const { nodes: savedNodes, edges: savedEdges } = JSON.parse(saved)
          if (savedNodes && savedNodes.length > 0) {
            setNodes(savedNodes)
            setEdges(savedEdges || [])
            console.log('Loaded from localStorage:', savedNodes.length, 'nodes')
          }
        } catch (error) {
          console.error('Failed to load from localStorage:', error)
        }
      }
    }
  }, [storageKey])

  // Yjs real-time collaboration
  const {
    isConnected,
    onlineUsers,
    syncLocalNodes,
    syncLocalEdges,
    provider,
  } = useYjsCollaboration({
    documentId: documentId || 'default',
    onNodesChange: (remoteNodes) => {
      isRemoteChangeRef.current = true
      setNodes(remoteNodes)
      isRemoteChangeRef.current = false
    },
    onEdgesChange: (remoteEdges) => {
      isRemoteChangeRef.current = true
      setEdges(remoteEdges)
      isRemoteChangeRef.current = false
    },
    initialNodes: nodes,
    initialEdges: edges,
  })

  // Sync local changes to Yjs when nodes/edges change
  useEffect(() => {
    if (!isRemoteChangeRef.current && isConnected) {
      syncLocalNodes(nodes)
    }
  }, [nodes, isConnected, syncLocalNodes])

  useEffect(() => {
    if (!isRemoteChangeRef.current && isConnected) {
      syncLocalEdges(edges)
    }
  }, [edges, isConnected, syncLocalEdges])

  // Save to localStorage whenever nodes/edges change (debounced)
  useEffect(() => {
    if (storageKey && nodes.length > 0) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem(storageKey, JSON.stringify({ nodes, edges }))
        console.log('Saved to localStorage:', nodes.length, 'nodes')
      }, 500) // Debounce 500ms

      return () => clearTimeout(timeoutId)
    }
  }, [nodes, edges, storageKey])

  // Save to history before making changes
  const saveHistory = useCallback(() => {
    setHistory((prev) => {
      const newHistory = [...prev, { nodes, edges }]
      // Keep only last 20 states
      return newHistory.slice(-20)
    })
  }, [nodes, edges])

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds))

      // Save history after drag operations
      const hasDragEnd = changes.some(c => c.type === 'position' && c.dragging === false)
      if (hasDragEnd) {
        saveHistory()
      }
    },
    [saveHistory]
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  )

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    []
  )

  const addNode = useCallback(() => {
    const newNode: MindMapNode = {
      id: `${Date.now()}`,
      type: 'custom',
      data: { label: 'New Node', color: '#6366f1', level: 0 },
      position: {
        x: Math.random() * 400 + 200,
        y: Math.random() * 400 + 200,
      },
    }
    setNodes((nds) => [...nds, newNode])
  }, [])

  const addChildNode = useCallback((parentId: string, autoSelect: boolean = true) => {
    saveHistory()
    const newNodeId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    setNodes((nds) => {
      const parentNode = nds.find(n => n.id === parentId)
      if (!parentNode) return nds

      const parentLevel = parentNode.data.level || 0
      const newLevel = parentLevel + 1

      // Check max depth (20 levels)
      if (newLevel >= 20) {
        alert('Maximum depth of 20 levels reached!')
        return nds
      }

      const position = getChildPosition(parentNode, nds, newLevel)
      const color = getColorForLevel(newLevel)

      const newNode: MindMapNode = {
        id: newNodeId,
        type: 'custom',
        data: {
          label: 'New Node',
          color: color,
          level: newLevel,
          parentId: parentId,
        },
        position,
        selected: autoSelect, // Auto-select new node
      }

      return [...nds, newNode]
    })

    // Auto-connect to parent
    setTimeout(() => {
      setEdges((eds) => {
        const edgeExists = eds.some(e => e.source === parentId && e.target === newNodeId)
        if (!edgeExists) {
          return [...eds, {
            id: `e-${parentId}-${newNodeId}`,
            source: parentId,
            target: newNodeId,
            type: 'smoothstep',
            animated: false,
          }]
        }
        return eds
      })
    }, 50)

    // Return new node ID for selection
    return newNodeId
  }, [saveHistory])

  const addSiblingNode = useCallback((currentNodeId: string, autoSelect: boolean = true) => {
    saveHistory()
    const newNodeId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    setNodes((nds) => {
      const currentNode = nds.find(n => n.id === currentNodeId)
      if (!currentNode) return nds

      const level = currentNode.data.level || 0
      const parentId = currentNode.data.parentId

      const position = getSiblingPosition(currentNode, nds, parentId)
      const color = getColorForLevel(level)

      const newNode: MindMapNode = {
        id: newNodeId,
        type: 'custom',
        data: {
          label: 'New Node',
          color: color,
          level: level,
          parentId: parentId,
        },
        position,
        selected: autoSelect, // Auto-select new node
      }

      return [...nds, newNode]
    })

    // Only connect to parent if has parent (not siblings)
    setTimeout(() => {
      setNodes((nds) => {
        const newNode = nds.find(n => n.id === newNodeId)
        if (newNode?.data.parentId) {
          setEdges((eds) => {
            const edgeExists = eds.some(e => e.source === newNode.data.parentId && e.target === newNodeId)
            if (!edgeExists) {
              return [...eds, {
                id: `e-${newNode.data.parentId}-${newNodeId}`,
                source: newNode.data.parentId!,
                target: newNodeId,
                type: 'smoothstep',
                animated: false,
              }]
            }
            return eds
          })
        }
        return nds
      })
    }, 50)

    // Return new node ID for selection
    return newNodeId
  }, [saveHistory])

  const updateNodeLabel = useCallback((nodeId: string, label: string) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, label } }
          : node
      )
    )
  }, [])

  const updateNodeColor = useCallback((nodeId: string, color: string) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, color } }
          : node
      )
    )
  }, [])

  const toggleEdgeArrow = useCallback((edgeId: string) => {
    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.id === edgeId) {
          const hasArrow = edge.markerEnd && typeof edge.markerEnd === 'object' && (edge.markerEnd as any).type
          return {
            ...edge,
            markerEnd: hasArrow ? undefined : { type: MarkerType.ArrowClosed, width: 20, height: 20 },
          }
        }
        return edge
      })
    )
  }, [])

  const updateEdgeStyle = useCallback((edgeId: string, updates: Partial<Edge>) => {
    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.id === edgeId) {
          return { ...edge, ...updates }
        }
        return edge
      })
    )
  }, [])

  const deleteNode = useCallback((nodeId: string) => {
    saveHistory()
    setNodes((nds) => nds.filter((node) => node.id !== nodeId))
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId))
  }, [saveHistory])

  // Find all descendants of a node
  const findAllDescendants = useCallback((nodeId: string, nodesList: MindMapNode[]): string[] => {
    const children = nodesList.filter(n => n.data.parentId === nodeId)
    let descendants = children.map(c => c.id)
    children.forEach(child => {
      descendants = [...descendants, ...findAllDescendants(child.id, nodesList)]
    })
    return descendants
  }, [])

  // Move node with all descendants
  const moveNodeWithDescendants = useCallback((nodeId: string, deltaX: number, deltaY: number) => {
    setNodes((nds) => {
      const descendantIds = findAllDescendants(nodeId, nds)
      const affectedIds = new Set([nodeId, ...descendantIds])

      return nds.map(node => {
        if (affectedIds.has(node.id)) {
          return {
            ...node,
            position: {
              x: node.position.x + deltaX,
              y: node.position.y + deltaY,
            },
          }
        }
        return node
      })
    })
  }, [findAllDescendants])

  // Reparent node (change parent)
  const reparentNode = useCallback((nodeId: string, newParentId: string | undefined) => {
    saveHistory()
    setNodes((nds) => {
      return nds.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              parentId: newParentId,
              level: newParentId ? ((nds.find(n => n.id === newParentId)?.data.level || 0) + 1) : 0,
              color: newParentId ? getColorForLevel((nds.find(n => n.id === newParentId)?.data.level || 0) + 1) : getColorForLevel(0),
            },
          }
        }
        return node
      })
    })

    // Update edges - remove old parent connection, add new one
    setEdges((eds) => {
      // Remove old parent connection
      const filtered = eds.filter(e => e.target !== nodeId)

      // Add new parent connection if parent exists
      if (newParentId) {
        return [...filtered, {
          id: `e-${newParentId}-${nodeId}`,
          source: newParentId,
          target: nodeId,
          type: 'smoothstep',
          animated: false,
        }]
      }

      return filtered
    })
  }, [saveHistory])

  const copyNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return

    const descendantIds = findAllDescendants(nodeId, nodes)
    const subtreeNodeIds = new Set([nodeId, ...descendantIds])
    const subtreeNodes = nodes.filter(n => subtreeNodeIds.has(n.id))
    const subtreeEdges = edges.filter(
      e => subtreeNodeIds.has(e.source) && subtreeNodeIds.has(e.target)
    )

    const clipboardData: ClipboardData = {
      type: 'mindmap-nodes',
      version: 1,
      rootNode: { ...node },
      descendants: subtreeNodes.filter(n => n.id !== nodeId),
      edges: subtreeEdges,
    }

    navigator.clipboard.writeText(JSON.stringify(clipboardData)).catch(err => {
      console.warn('Failed to write to system clipboard:', err)
    })

    setClipboard(node)
  }, [nodes, edges, findAllDescendants])

  const pasteNode = useCallback(async (targetNodeId?: string) => {
    let clipboardData: ClipboardData | null = null

    // Try reading from system clipboard
    try {
      const text = await navigator.clipboard.readText()
      const parsed = JSON.parse(text)
      if (parsed?.type === 'mindmap-nodes' && parsed?.version === 1) {
        clipboardData = parsed as ClipboardData
      }
    } catch {
      // Fall through to in-memory fallback
    }

    if (!clipboardData && !clipboard) return

    saveHistory()

    if (clipboardData) {
      // Paste subtree with ID remapping
      const allSourceNodes = [clipboardData.rootNode, ...clipboardData.descendants]

      // Build old->new ID map
      const idMap = new Map<string, string>()
      allSourceNodes.forEach((n: any) => {
        idMap.set(n.id, `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
      })

      const rootNewId = idMap.get(clipboardData.rootNode.id)!

      // Calculate root position
      let rootPosition = { x: 100, y: 100 }
      let targetLevel = 0
      if (targetNodeId) {
        const targetNode = nodes.find(n => n.id === targetNodeId)
        if (targetNode) {
          targetLevel = (targetNode.data?.level ?? 0)
          rootPosition = {
            x: targetNode.position.x + 250,
            y: targetNode.position.y + 50,
          }
        }
      }

      // Calculate level delta
      const originalRootLevel = clipboardData.rootNode.data?.level ?? 0
      const newRootLevel = targetNodeId ? targetLevel + 1 : originalRootLevel
      const levelDelta = newRootLevel - originalRootLevel

      // Position offset from original root
      const originalRootPos = clipboardData.rootNode.position

      // Remap nodes
      const newNodes: MindMapNode[] = allSourceNodes.map((n: any) => {
        const isRoot = n.id === clipboardData!.rootNode.id
        const newLevel = (n.data?.level ?? 0) + levelDelta

        return {
          ...n,
          id: idMap.get(n.id)!,
          type: 'custom',
          data: {
            ...n.data,
            parentId: isRoot
              ? (targetNodeId || undefined)
              : (idMap.get(n.data?.parentId) || undefined),
            level: newLevel,
            color: getColorForLevel(newLevel),
          },
          position: isRoot
            ? rootPosition
            : {
                x: rootPosition.x + (n.position.x - originalRootPos.x),
                y: rootPosition.y + (n.position.y - originalRootPos.y),
              },
          selected: false,
          dragging: false,
        }
      })

      // Remap edges
      const newEdges: Edge[] = clipboardData.edges
        .filter((e: any) => idMap.has(e.source) && idMap.has(e.target))
        .map((e: any) => ({
          ...e,
          id: `e-${idMap.get(e.source)}-${idMap.get(e.target)}`,
          source: idMap.get(e.source)!,
          target: idMap.get(e.target)!,
        }))

      // Add edge from target to pasted root
      if (targetNodeId) {
        newEdges.push({
          id: `e-${targetNodeId}-${rootNewId}`,
          source: targetNodeId,
          target: rootNewId,
          type: 'smoothstep',
        })
      }

      setNodes(nds => [...nds, ...newNodes])
      setEdges(eds => [...eds, ...newEdges])
    } else if (clipboard) {
      // Fallback: single-node paste from in-memory clipboard
      const newNodeId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      if (targetNodeId) {
        // Paste as child of selected node
        setNodes((nds) => {
          const targetNode = nds.find(n => n.id === targetNodeId)
          if (!targetNode) return nds

          const newLevel = (targetNode.data.level || 0) + 1

          if (newLevel >= 20) {
            alert('Maximum depth of 20 levels reached!')
            return nds
          }

          const position = getChildPosition(targetNode, nds, newLevel)

          const newNode: MindMapNode = {
            id: newNodeId,
            type: 'custom',
            data: {
              ...clipboard.data,
              level: newLevel,
              parentId: targetNodeId,
            },
            position,
          }

          return [...nds, newNode]
        })

        // Connect to parent
        setTimeout(() => {
          setEdges((eds) => {
            return [...eds, {
              id: `e-${targetNodeId}-${newNodeId}`,
              source: targetNodeId,
              target: newNodeId,
              type: 'smoothstep',
              animated: false,
            }]
          })
        }, 50)
      } else {
        // Paste at same level
        setNodes((nds) => {
          const newNode: MindMapNode = {
            id: newNodeId,
            type: 'custom',
            data: { ...clipboard.data },
            position: {
              x: clipboard.position.x + 50,
              y: clipboard.position.y + 50,
            },
          }
          return [...nds, newNode]
        })
      }
    }
  }, [clipboard, nodes, edges, saveHistory, setNodes, setEdges])

  const undo = useCallback(() => {
    if (history.length === 0) return

    const lastState = history[history.length - 1]
    setNodes(lastState.nodes)
    setEdges(lastState.edges)
    setHistory((prev) => prev.slice(0, -1))
  }, [history])

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    addChildNode,
    addSiblingNode,
    updateNodeLabel,
    updateNodeColor,
    deleteNode,
    copyNode,
    pasteNode,
    undo,
    setNodes,
    setEdges,
    findAllDescendants,
    moveNodeWithDescendants,
    reparentNode,
    toggleEdgeArrow,
    updateEdgeStyle,
    // Collaboration status
    isConnected,
    onlineUsers,
    provider,
  }
}
