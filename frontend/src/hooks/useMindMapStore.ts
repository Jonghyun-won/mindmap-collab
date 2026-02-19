import { useState, useCallback } from 'react'
import {
  Node,
  Edge,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  Connection,
  NodeChange,
  EdgeChange,
} from 'reactflow'

export interface MindMapNode extends Node {
  data: {
    label: string
    color?: string
    level?: number
    parentId?: string
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

// Calculate position for child nodes - Downward tree layout (조직도 스타일)
function getChildPosition(parentNode: MindMapNode, existingNodes: MindMapNode[], level: number) {
  const baseX = parentNode.position.x
  const baseY = parentNode.position.y

  // Count existing children of this parent
  const siblings = existingNodes.filter(n => n.data.parentId === parentNode.id)
  const siblingCount = siblings.length

  // Spacing scales based on level for better organization
  const verticalSpacing = 150 // Consistent vertical spacing between levels
  const horizontalSpacing = level === 1 ? 300 : Math.max(200 - (level * 20), 120)

  // Calculate total width needed for all siblings
  const totalWidth = siblingCount * horizontalSpacing

  // Position new node: spread horizontally, place below parent
  const xOffset = (siblingCount * horizontalSpacing) - (totalWidth / 2)

  return {
    x: baseX + xOffset,
    y: baseY + verticalSpacing
  }
}

// Calculate position for sibling nodes (same level) - horizontally aligned
function getSiblingPosition(currentNode: MindMapNode, existingNodes: MindMapNode[], parentId?: string) {
  const siblings = existingNodes.filter(
    n => n.data.parentId === parentId && n.data.level === currentNode.data.level
  )

  const level = currentNode.data.level || 0
  const horizontalSpacing = level === 1 ? 300 : Math.max(200 - (level * 20), 120)

  // Place to the right of the last sibling
  if (siblings.length > 0) {
    const lastSibling = siblings[siblings.length - 1]
    return {
      x: lastSibling.position.x + horizontalSpacing,
      y: lastSibling.position.y // Same Y (same level)
    }
  }

  // If no siblings, place next to current node
  return {
    x: currentNode.position.x + horizontalSpacing,
    y: currentNode.position.y
  }
}

interface HistoryState {
  nodes: MindMapNode[]
  edges: Edge[]
}

export function useMindMapStore() {
  const [nodes, setNodes] = useState<MindMapNode[]>([
    {
      id: '1',
      type: 'custom',
      data: { label: 'Central Idea', color: '#6366f1', level: 0 },
      position: { x: 0, y: 0 }, // Root at origin, fitView will center it
    },
  ])
  const [edges, setEdges] = useState<Edge[]>([])
  const [history, setHistory] = useState<HistoryState[]>([])
  const [clipboard, setClipboard] = useState<MindMapNode | null>(null)

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
            type: 'bezier',
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
                type: 'bezier',
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
    if (node) {
      setClipboard(node)
    }
  }, [nodes])

  const pasteNode = useCallback((targetNodeId?: string) => {
    if (!clipboard) return

    saveHistory()
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
            type: 'bezier',
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
  }, [clipboard, saveHistory])

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
  }
}
