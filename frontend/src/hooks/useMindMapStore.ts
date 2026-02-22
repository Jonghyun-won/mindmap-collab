import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Node,
  Edge,
  Position,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  Connection,
  NodeChange,
  EdgeChange,
  MarkerType,
} from 'reactflow'
import { useYjsCollaboration } from './useYjsCollaboration'
import { applyDagreLayout } from '@/lib/layout-algorithms'

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

// Set sourcePosition and targetPosition on each node based on layout direction
function setHandlePositions(nodes: MindMapNode[], direction: 'TB' | 'RL' | 'BI'): MindMapNode[] {
  return nodes.map(n => {
    let sourcePosition: Position
    let targetPosition: Position

    switch (direction) {
      case 'TB':
        sourcePosition = Position.Bottom
        targetPosition = Position.Top
        break
      case 'RL':
        sourcePosition = Position.Left
        targetPosition = Position.Right
        break
      case 'BI': {
        const rootNode = nodes.find(node => (node.data?.level ?? 0) === 0)
        if (rootNode && n.id !== rootNode.id) {
          if (n.position.x < rootNode.position.x) {
            // Left side: source goes further left, target comes from right (toward root)
            sourcePosition = Position.Left
            targetPosition = Position.Right
          } else {
            // Right side: source goes further right, target comes from left (toward root)
            sourcePosition = Position.Right
            targetPosition = Position.Left
          }
        } else {
          // Root node in bilateral
          sourcePosition = Position.Right
          targetPosition = Position.Left
        }
        break
      }
    }

    return {
      ...n,
      sourcePosition,
      targetPosition,
    }
  })
}

// Wrapper: apply dagre layout then set handle positions
function layoutAndSetHandles(
  nodes: MindMapNode[],
  edgesList: Edge[],
  direction: 'TB' | 'RL' | 'BI',
  anchorNodeId?: string,
): MindMapNode[] {
  // Only anchor the root for TB layout. For RL and BI, anchoring the root
  // at its original (TB) position would reverse the intended direction —
  // dagre places the root on the right for RL, but anchoring shifts it back
  // to the left, making the tree appear as LR instead.
  const effectiveAnchor = direction === 'TB' ? anchorNodeId : undefined
  const positioned = applyDagreLayout(nodes, edgesList, { direction, anchorNodeId: effectiveAnchor })
  return setHandlePositions(positioned, direction)
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
  const [layoutDirection, setLayoutDirection] = useState<'TB' | 'RL' | 'BI'>('TB')

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
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, type: 'smoothstep' }, eds))
      // Also set parentId on the target node so findAllDescendants works correctly
      if (connection.source && connection.target) {
        const sourceId = connection.source
        const targetId = connection.target
        setNodes((nds) => nds.map(n => {
          if (n.id === targetId) {
            const sourceNode = nds.find(s => s.id === sourceId)
            const newLevel = (sourceNode?.data.level ?? 0) + 1
            return {
              ...n,
              data: {
                ...n.data,
                parentId: sourceId,
                level: newLevel,
                color: getColorForLevel(newLevel),
              },
            }
          }
          return n
        }))
      }
    },
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

    // Create edge first (needed for dagre)
    const newEdge: Edge = {
      id: `e-${parentId}-${newNodeId}`,
      source: parentId,
      target: newNodeId,
      type: 'smoothstep',
    }

    setNodes((nds) => {
      const parentNode = nds.find(n => n.id === parentId)
      if (!parentNode) return nds

      const parentLevel = parentNode.data.level || 0
      const newLevel = parentLevel + 1

      // Check max depth (20 levels)
      if (newLevel >= 20) {
        return nds
      }

      const newNode: MindMapNode = {
        id: newNodeId,
        type: 'custom',
        position: { x: parentNode.position.x, y: parentNode.position.y + 100 }, // temporary
        data: {
          label: 'New Node',
          color: getColorForLevel(newLevel),
          level: newLevel,
          parentId: parentId,
        },
        selected: autoSelect,
      }

      const allNodes: MindMapNode[] = [
        ...nds.map(n => ({ ...n, selected: autoSelect ? false : n.selected })),
        newNode,
      ]

      // Get current edges + new edge for dagre computation
      const allEdges = [...edges, newEdge]

      // Find root node to anchor
      const rootNode = allNodes.find(n => (n.data.level ?? 0) === 0)

      return layoutAndSetHandles(allNodes, allEdges, layoutDirection, rootNode?.id)
    })

    // Also add the edge to edge state
    setEdges((eds) => [...eds, newEdge])

    return newNodeId
  }, [saveHistory, edges, setNodes, setEdges, layoutDirection])

  const addSiblingNode = useCallback((currentNodeId: string, autoSelect: boolean = true) => {
    saveHistory()
    const newNodeId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    setNodes((nds) => {
      const currentNode = nds.find(n => n.id === currentNodeId)
      if (!currentNode) return nds

      const parentId = currentNode.data.parentId
      if (!parentId) return nds // Can't add sibling to root

      const level = currentNode.data.level || 0

      const newNode: MindMapNode = {
        id: newNodeId,
        type: 'custom',
        position: { x: currentNode.position.x + 100, y: currentNode.position.y }, // temporary
        data: {
          label: 'New Node',
          color: getColorForLevel(level),
          level: level,
          parentId: parentId,
        },
        selected: autoSelect,
      }

      const newEdge: Edge = {
        id: `e-${parentId}-${newNodeId}`,
        source: parentId,
        target: newNodeId,
        type: 'smoothstep',
      }

      const allNodes: MindMapNode[] = [
        ...nds.map(n => ({ ...n, selected: autoSelect ? false : n.selected })),
        newNode,
      ]

      const allEdges = [...edges, newEdge]
      const rootNode = allNodes.find(n => (n.data.level ?? 0) === 0)

      // Also add edge
      setEdges((eds) => [...eds, newEdge])

      return layoutAndSetHandles(allNodes, allEdges, layoutDirection, rootNode?.id)
    })

    return newNodeId
  }, [saveHistory, edges, setNodes, setEdges, layoutDirection])

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

  // Find all descendants of a node (checks both parentId data and edges)
  const findAllDescendants = useCallback((nodeId: string, nodesList: MindMapNode[], edgesList?: Edge[]): string[] => {
    // Find children via parentId data
    const childrenByParentId = nodesList.filter(n => n.data.parentId === nodeId).map(c => c.id)

    // Find children via edges (source -> target)
    const childrenByEdges = edgesList
      ? edgesList.filter(e => e.source === nodeId).map(e => e.target)
      : []

    // Combine and deduplicate
    const childIds = [...new Set([...childrenByParentId, ...childrenByEdges])]

    let descendants = [...childIds]
    childIds.forEach(childId => {
      descendants = [...descendants, ...findAllDescendants(childId, nodesList, edgesList)]
    })
    return [...new Set(descendants)]
  }, [])

  const deleteNode = useCallback((nodeId: string) => {
    saveHistory()

    const descendantIds = findAllDescendants(nodeId, nodes, edges)
    const idsToRemove = new Set([nodeId, ...descendantIds])

    const remainingNodes = nodes.filter(n => !idsToRemove.has(n.id))
    const remainingEdges = edges.filter(e => !idsToRemove.has(e.source) && !idsToRemove.has(e.target))

    // Re-layout remaining tree
    const rootNode = remainingNodes.find(n => (n.data.level ?? 0) === 0)
    if (rootNode && remainingNodes.length > 0) {
      const repositioned = layoutAndSetHandles(remainingNodes, remainingEdges, layoutDirection, rootNode.id)
      setNodes(repositioned)
    } else {
      setNodes(remainingNodes)
    }
    setEdges(remainingEdges)
  }, [saveHistory, nodes, edges, findAllDescendants, setNodes, setEdges, layoutDirection])

  // Move node with all descendants
  const moveNodeWithDescendants = useCallback((nodeId: string, deltaX: number, deltaY: number) => {
    setNodes((nds) => {
      const descendantIds = findAllDescendants(nodeId, nds, edges)
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
  }, [findAllDescendants, edges])

  // Reparent node (change parent)
  const reparentNode = useCallback((nodeId: string, newParentId: string | undefined) => {
    saveHistory()

    // Update node data (parentId, level, color) and also update descendants' levels
    const updatedNodes = nodes.map(node => {
      if (node.id === nodeId) {
        const newLevel = newParentId ? ((nodes.find(n => n.id === newParentId)?.data.level || 0) + 1) : 0
        return {
          ...node,
          data: {
            ...node.data,
            parentId: newParentId,
            level: newLevel,
            color: getColorForLevel(newLevel),
          },
        }
      }
      return node
    })

    // Recursively update descendant levels
    const updateDescendantLevels = (nds: MindMapNode[], parentNodeId: string, parentLevel: number): MindMapNode[] => {
      return nds.map(n => {
        if (n.data.parentId === parentNodeId) {
          const newLevel = parentLevel + 1
          return { ...n, data: { ...n.data, level: newLevel, color: getColorForLevel(newLevel) } }
        }
        return n
      })
    }

    const reparentedNode = updatedNodes.find(n => n.id === nodeId)
    const reparentedLevel = reparentedNode?.data.level ?? 0
    const descendantIds = findAllDescendants(nodeId, updatedNodes, edges)

    let finalNodes = [...updatedNodes]
    // Update descendants level by level
    const queue = [{ id: nodeId, level: reparentedLevel }]
    while (queue.length > 0) {
      const { id: currentId, level: currentLevel } = queue.shift()!
      finalNodes = updateDescendantLevels(finalNodes, currentId, currentLevel)
      // Find children of currentId for next iteration
      const children = finalNodes.filter(n => n.data.parentId === currentId)
      children.forEach(child => {
        if (descendantIds.includes(child.id)) {
          queue.push({ id: child.id, level: currentLevel + 1 })
        }
      })
    }

    // Update edges - remove old parent connection, add new one
    const filteredEdges = edges.filter(e => e.target !== nodeId)
    const updatedEdges = newParentId
      ? [...filteredEdges, {
          id: `e-${newParentId}-${nodeId}`,
          source: newParentId,
          target: nodeId,
          type: 'smoothstep',
          animated: false,
        }]
      : filteredEdges

    // Re-layout with dagre
    const rootNode = finalNodes.find(n => (n.data.level ?? 0) === 0)
    if (rootNode && finalNodes.length > 0) {
      const repositioned = layoutAndSetHandles(finalNodes, updatedEdges, layoutDirection, rootNode.id)
      setNodes(repositioned)
    } else {
      setNodes(finalNodes)
    }
    setEdges(updatedEdges)
  }, [saveHistory, nodes, edges, findAllDescendants, setNodes, setEdges, layoutDirection])

  const copyNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return

    const descendantIds = findAllDescendants(nodeId, nodes, edges)
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

      // Determine target level
      let targetLevel = 0
      if (targetNodeId) {
        const targetNode = nodes.find(n => n.id === targetNodeId)
        if (targetNode) {
          targetLevel = (targetNode.data?.level ?? 0)
        }
      }

      // Calculate level delta
      const originalRootLevel = clipboardData.rootNode.data?.level ?? 0
      const newRootLevel = targetNodeId ? targetLevel + 1 : originalRootLevel
      const levelDelta = newRootLevel - originalRootLevel

      // Remap nodes (temporary positions - dagre will handle layout)
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
          position: { x: 0, y: 0 }, // temporary - dagre will reposition
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

      // Combine with existing and run dagre layout
      const allNodes = [...nodes, ...newNodes]
      const allEdges = [...edges, ...newEdges]
      const rootNode = allNodes.find(n => (n.data.level ?? 0) === 0)
      const repositioned = layoutAndSetHandles(allNodes, allEdges, layoutDirection, rootNode?.id)
      setNodes(repositioned)
      setEdges(allEdges)
    } else if (clipboard) {
      // Fallback: single-node paste from in-memory clipboard
      const newNodeId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      if (targetNodeId) {
        // Paste as child of selected node
        const targetNode = nodes.find(n => n.id === targetNodeId)
        if (!targetNode) return

        const newLevel = (targetNode.data.level || 0) + 1
        if (newLevel >= 20) return

        const newNode: MindMapNode = {
          id: newNodeId,
          type: 'custom',
          data: {
            ...clipboard.data,
            level: newLevel,
            parentId: targetNodeId,
            color: getColorForLevel(newLevel),
          },
          position: { x: 0, y: 0 }, // temporary
        }

        const newEdge: Edge = {
          id: `e-${targetNodeId}-${newNodeId}`,
          source: targetNodeId,
          target: newNodeId,
          type: 'smoothstep',
        }

        const allNodes = [...nodes, newNode]
        const allEdges = [...edges, newEdge]
        const rootNode = allNodes.find(n => (n.data.level ?? 0) === 0)
        const repositioned = layoutAndSetHandles(allNodes, allEdges, layoutDirection, rootNode?.id)
        setNodes(repositioned)
        setEdges(allEdges)
      } else {
        // Paste at same level (no parent connection, no layout needed)
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

  const applyAutoLayout = useCallback((direction: 'TB' | 'RL' | 'BI' = 'TB') => {
    saveHistory()
    setLayoutDirection(direction)
    setNodes((nds) => {
      const currentEdges = edges
      const positioned = applyDagreLayout(nds, currentEdges, { direction })
      return setHandlePositions(positioned, direction)
    })
  }, [edges, saveHistory])

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
    applyAutoLayout,
    layoutDirection,
    setLayoutDirection,
    // Collaboration status
    isConnected,
    onlineUsers,
    provider,
  }
}
