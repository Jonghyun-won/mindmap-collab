import { useCallback, useEffect, useState, useRef } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  NodeTypes,
  SelectionMode,
  BackgroundVariant,
  Panel,
  Node,
  Edge,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Map, Users, Wifi, WifiOff, History } from 'lucide-react'

import CustomNode from './CustomNode'
import EditorToolbar from './EditorToolbar'
import ShareModal from './ShareModal'
import CollaboratorCursors from './CollaboratorCursors'
import { ChangeHistory } from './ChangeHistory'
import { NodeDetailPanel } from '@/components/ui/NodeDetailPanel'
import { ExportModal } from '@/components/ui/ExportModal'
import { EdgeDetailPanel } from '@/components/ui/EdgeDetailPanel'
import { apiClient } from '@/lib/api-client'
import { useMindMapStore } from '@/hooks/useMindMapStore'
import { useSaveMindMap } from '@/hooks/useSaveMindMap'
import { usePresence } from '@/hooks/usePresence'
import { useAuth } from '@/contexts/AuthContext'
import type { MindMapNode as MindMapNodeType } from '@/types/mindmap'

const nodeTypes: NodeTypes = {
  custom: CustomNode,
}

interface MindMapCanvasProps {
  mindMapTitle: string
  documentId: string
  onTitleSave?: (newTitle: string) => void
}

// Wrapper component that provides ReactFlowProvider context
export default function MindMapCanvas(props: MindMapCanvasProps) {
  return (
    <ReactFlowProvider>
      <MindMapCanvasInner {...props} />
    </ReactFlowProvider>
  )
}

function MindMapCanvasInner({ mindMapTitle, documentId, onTitleSave }: MindMapCanvasProps) {
  const {
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
    reparentNode,
    toggleEdgeArrow,
    updateEdgeStyle,
    applyAutoLayout,
    // Collaboration status
    isConnected,
    onlineUsers,
    provider,
  } = useMindMapStore(documentId)

  // Track dragging state
  const dragStateRef = useRef<{
    nodeId: string
    startX: number
    startY: number
    descendants: string[]
  } | null>(null)

  // Save functionality (simplified - no Yjs for now)
  const { saveMindMap, isSaving, lastSaved } = useSaveMindMap()

  // Auth context for user info
  const { user } = useAuth()

  // ReactFlow instance for coordinate conversion
  const { screenToFlowPosition, fitView } = useReactFlow()

  // Real-time presence (cursors)
  const { collaborators, updateCursor } = usePresence(provider, user?.name || user?.email || 'Anonymous')

  // Fire-and-forget change history recording
  const recordChange = useCallback((action: string, nodeId?: string, details?: Record<string, any>) => {
    if (!documentId) return
    apiClient.recordChange(documentId, action, nodeId, details).catch(() => {
      // Silently ignore errors - history recording shouldn't break the app
    })
  }, [documentId])

  // Wrap onConnect to record edge additions
  const onConnectWithHistory = useCallback((connection: any) => {
    onConnect(connection)
    recordChange('edge_added', undefined, { source: connection.source, target: connection.target })
  }, [onConnect, recordChange])

  // Manual save handler
  const handleSave = useCallback(async () => {
    // Save to localStorage (immediate)
    if (documentId) {
      localStorage.setItem(`mindmap_${documentId}`, JSON.stringify({ nodes, edges }))
      console.log('Saved to localStorage:', nodes.length, 'nodes')
    }

    // Also save title to backend
    try {
      await saveMindMap(documentId, mindMapTitle, null, { nodes, edges })
      console.log('Saved to backend')
    } catch (error) {
      console.warn('Backend save failed, but localStorage saved:', error)
      // Don't show alert - localStorage save is enough for now
    }
  }, [documentId, mindMapTitle, nodes, edges, saveMindMap])

  const [selectedNode, setSelectedNode] = useState<string | undefined>()
  const [selectedNodes, setSelectedNodes] = useState<string[]>([])
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null)
  const [showMiniMap, setShowMiniMap] = useState(true)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [selectedNodeForDetail, setSelectedNodeForDetail] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [showExport, setShowExport] = useState(false)

  // Handle node selection
  const onSelectionChange = useCallback(({ nodes }: any) => {
    const selectedId = nodes.length > 0 ? nodes[0].id : undefined
    setSelectedNode(selectedId)
    setSelectedNodes(nodes.map((n: any) => n.id))
  }, [])

  // Handle node label update from CustomNode
  useEffect(() => {
    const handleNodeUpdate = (event: any) => {
      const { id, label } = event.detail
      updateNodeLabel(id, label)
      recordChange('node_edited', id, { label })
    }

    window.addEventListener('nodeUpdate', handleNodeUpdate)
    return () => window.removeEventListener('nodeUpdate', handleNodeUpdate)
  }, [updateNodeLabel, recordChange])

  // Toggle collapse/expand for a node's children
  const handleToggleCollapse = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return

    const newCollapsed = !node.data.collapsed
    const childrenIds = findAllDescendants(nodeId, nodes, edges)

    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === nodeId) {
          return { ...n, data: { ...n.data, collapsed: newCollapsed } }
        }
        if (childrenIds.includes(n.id)) {
          return { ...n, hidden: newCollapsed }
        }
        return n
      })
    )

    // Hide/show edges connected to hidden children
    const hiddenSet = new Set(childrenIds)
    setEdges((eds) =>
      eds.map((edge) => {
        if (hiddenSet.has(edge.target)) {
          return { ...edge, hidden: newCollapsed }
        }
        return edge
      })
    )
  }, [nodes, edges, findAllDescendants, setNodes, setEdges])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement

      // Ignore if typing in input, textarea, or contentEditable
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.hasAttribute('contenteditable')
      ) {
        return
      }

      const isCtrl = event.ctrlKey || event.metaKey

      // Ctrl+S: Save
      if (isCtrl && event.key === 's') {
        event.preventDefault()
        handleSave()
        return
      }

      // Ctrl+Z: Undo
      if (isCtrl && event.key === 'z') {
        event.preventDefault()
        undo()
        return
      }

      // Ctrl+C: Copy
      if (isCtrl && event.key === 'c' && selectedNode) {
        event.preventDefault()
        copyNode(selectedNode)
        return
      }

      // Ctrl+V: Paste (with image detection)
      if (isCtrl && event.key === 'v') {
        event.preventDefault()
        navigator.clipboard.read().then(async (items) => {
          let hasImage = false
          for (const item of items) {
            const imageType = item.types.find(t => t.startsWith('image/'))
            if (imageType && selectedNode) {
              hasImage = true
              const blob = await item.getType(imageType)
              const reader = new FileReader()
              reader.onload = () => {
                const dataUrl = reader.result as string
                const img = new Image()
                img.onload = () => {
                  const maxWidth = 300
                  const scale = img.width > maxWidth ? maxWidth / img.width : 1
                  setNodes((nds: any) =>
                    nds.map((node: any) =>
                      node.id === selectedNode
                        ? {
                            ...node,
                            data: {
                              ...node.data,
                              media: {
                                type: 'image',
                                url: dataUrl,
                                width: img.width * scale,
                                height: img.height * scale,
                              },
                            },
                          }
                        : node
                    )
                  )
                }
                img.src = dataUrl
              }
              reader.readAsDataURL(blob)
              return
            }
          }
          // If no image, do normal paste (async - reads from system clipboard internally)
          if (!hasImage) {
            await pasteNode(selectedNode)
          }
        }).catch(async () => {
          // Fallback to normal paste if clipboard.read() fails
          await pasteNode(selectedNode)
        })
        return
      }

      // Delete: 노드 삭제
      if (event.key === 'Delete' && selectedNode) {
        event.preventDefault()
        deleteNode(selectedNode)
        recordChange('node_deleted', selectedNode)
        setSelectedNode(undefined)
        return
      }

      // Ctrl + -: Collapse selected node (하위 노드 숨기기)
      if (isCtrl && (event.key === '-' || event.key === '_') && selectedNode) {
        event.preventDefault()
        const node = nodes.find(n => n.id === selectedNode)
        if (node && !node.data.collapsed) {
          handleToggleCollapse(selectedNode)
        }
        return
      }

      // Ctrl + +: Expand selected node (하위 노드 펼치기)
      if (isCtrl && (event.key === '=' || event.key === '+') && selectedNode) {
        event.preventDefault()
        const node = nodes.find(n => n.id === selectedNode)
        if (node && node.data.collapsed) {
          handleToggleCollapse(selectedNode)
        }
        return
      }

      // Enter: 형제 노드 추가 (수평적)
      if (event.key === 'Enter' && !isCtrl && selectedNode) {
        event.preventDefault()
        event.stopPropagation()
        const newNodeId = addSiblingNode(selectedNode)
        recordChange('node_added', newNodeId, { label: 'New Node', type: 'sibling', parentNodeId: selectedNode })
        setTimeout(() => {
          setSelectedNode(newNodeId)
          // 새 노드 편집 모드로 자동 진입
          const newNode = document.querySelector(`[data-id="${newNodeId}"]`)
          if (newNode) {
            ;(newNode as HTMLElement).focus()
            const event = new MouseEvent('dblclick', { bubbles: true })
            newNode.dispatchEvent(event)
          }
        }, 150)
        return
      }

      // Ctrl+Enter 또는 Tab: 자식 노드 추가 (하위)
      if (selectedNode && ((event.key === 'Enter' && isCtrl) || event.key === 'Tab')) {
        event.preventDefault()
        event.stopPropagation()
        const newNodeId = addChildNode(selectedNode)
        recordChange('node_added', newNodeId, { label: 'New Node', type: 'child', parentNodeId: selectedNode })
        setTimeout(() => {
          setSelectedNode(newNodeId)
          // 새 노드 편집 모드로 자동 진입
          const newNode = document.querySelector(`[data-id="${newNodeId}"]`)
          if (newNode) {
            ;(newNode as HTMLElement).focus()
            const event = new MouseEvent('dblclick', { bubbles: true })
            newNode.dispatchEvent(event)
          }
        }, 150)
        return
      }

      // Space key removed - use Tab or Ctrl+Enter for child nodes

      // F2: 현재 노드 편집
      if (event.key === 'F2' && selectedNode) {
        event.preventDefault()
        const node = document.querySelector(`[data-id="${selectedNode}"]`)
        if (node) {
          const event = new MouseEvent('dblclick', { bubbles: true })
          node.dispatchEvent(event)
        }
        return
      }

      // 화살표 키: 노드 간 이동
      if (selectedNode) {
        const currentNode = nodes.find(n => n.id === selectedNode)
        if (!currentNode) return

        // ArrowDown: 첫 번째 자식으로 이동
        if (event.key === 'ArrowDown') {
          event.preventDefault()
          const children = nodes.filter(n => n.data.parentId === selectedNode)
          if (children.length > 0) {
            setSelectedNode(children[0].id)
          }
          return
        }

        // ArrowUp: 부모로 이동
        if (event.key === 'ArrowUp' && currentNode.data.parentId) {
          event.preventDefault()
          setSelectedNode(currentNode.data.parentId)
          return
        }

        // ArrowLeft/Right: 형제 노드 간 이동
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault()
          const siblings = nodes.filter(
            n => n.data.parentId === currentNode.data.parentId && n.data.level === currentNode.data.level
          )
          const currentIndex = siblings.findIndex(n => n.id === selectedNode)
          if (currentIndex !== -1) {
            const nextIndex = event.key === 'ArrowRight'
              ? (currentIndex + 1) % siblings.length
              : (currentIndex - 1 + siblings.length) % siblings.length
            setSelectedNode(siblings[nextIndex].id)
          }
          return
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true })
  }, [selectedNode, deleteNode, addChildNode, addSiblingNode, copyNode, pasteNode, undo, handleSave, handleToggleCollapse, nodes, setNodes, recordChange])

  const handleColorChange = useCallback(
    (color: string) => {
      if (selectedNode) {
        updateNodeColor(selectedNode, color)
        recordChange('style_changed', selectedNode, { color })
      }
    },
    [selectedNode, updateNodeColor, recordChange]
  )

  const handleDeleteNode = useCallback(() => {
    if (selectedNode) {
      deleteNode(selectedNode)
      recordChange('node_deleted', selectedNode)
      setSelectedNode(undefined)
    }
  }, [selectedNode, deleteNode, recordChange])

  // Handle auto layout
  const handleAutoLayout = useCallback((direction: 'TB' | 'RL' | 'BI') => {
    applyAutoLayout(direction)
    setTimeout(() => {
      fitView({ padding: 0.2, duration: 300 })
    }, 50)
  }, [applyAutoLayout, fitView])

  // Handle node click to open detail panel
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNodeForDetail(node.id)
    setSelectedEdge(null) // deselect edge when node is selected
  }, [])

  // Handle edge click to open edge detail panel
  const onEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge)
    setSelectedNode(undefined) // deselect node when edge is selected
    setSelectedNodeForDetail(null)
  }, [])

  // Handle pane click to clear selections
  const onPaneClick = useCallback(() => {
    setSelectedEdge(null)
    setSelectedNodeForDetail(null)
  }, [])

  // Update node properties from NodeDetailPanel
  const handleNodeUpdate = useCallback((nodeId: string, updates: Partial<MindMapNodeType>) => {
    setNodes((nds: any) =>
      nds.map((node: any) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...updates } }
          : node
      )
    )
  }, [setNodes])

  // Handle mouse move for real-time cursor sharing
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
    updateCursor(position.x, position.y)
  }, [screenToFlowPosition, updateCursor])

  // Handle node drag
  const handleNodeDrag = useCallback((_event: any, node: any) => {
    try {
      if (!dragStateRef.current || dragStateRef.current.nodeId !== node.id) {
        let allDescendants: string[] = []

        if (selectedNodes.length > 1 && selectedNodes.includes(node.id)) {
          selectedNodes.forEach(selectedId => {
            const descendants = findAllDescendants(selectedId, nodes, edges)
            allDescendants = [...allDescendants, ...descendants]
          })
          allDescendants = [...new Set(allDescendants)]
          allDescendants = allDescendants.filter(id => !selectedNodes.includes(id))
        } else {
          allDescendants = findAllDescendants(node.id, nodes, edges)
        }

        dragStateRef.current = {
          nodeId: node.id,
          startX: node.position.x,
          startY: node.position.y,
          descendants: allDescendants,
        }
      }

      const deltaX = node.position.x - dragStateRef.current.startX
      const deltaY = node.position.y - dragStateRef.current.startY

      if (dragStateRef.current.descendants && dragStateRef.current.descendants.length > 0) {
        setNodes((nds) => {
          return nds.map(n => {
            if (dragStateRef.current!.descendants.includes(n.id)) {
              return {
                ...n,
                position: {
                  x: n.position.x + deltaX,
                  y: n.position.y + deltaY,
                },
              }
            }
            return n
          })
        })

        dragStateRef.current.startX = node.position.x
        dragStateRef.current.startY = node.position.y
      }
    } catch (error) {
      console.error('Error in handleNodeDrag:', error)
    }
  }, [nodes, edges, selectedNodes, findAllDescendants, setNodes])

  // Handle node drag stop
  const handleNodeDragStop = useCallback((_event: any, node: any) => {
    try {
      dragStateRef.current = null

      const droppedOnNode = nodes.find((n: any) => {
        if (n.id === node.id) return false
        const dx = Math.abs(n.position.x - node.position.x)
        const dy = Math.abs(n.position.y - node.position.y)
        return dx < 100 && dy < 100
      })

      if (droppedOnNode) {
        // Check if we're dragging multiple selected nodes
        if (selectedNodes.length > 1 && selectedNodes.includes(node.id)) {
          // Multi-node reparenting
          let allDescendants: string[] = []

          // Collect all descendants of all selected nodes
          selectedNodes.forEach((selectedId: string) => {
            const descendants = findAllDescendants(selectedId, nodes, edges)
            allDescendants = [...allDescendants, ...descendants]
          })

          // Remove duplicates
          allDescendants = [...new Set(allDescendants)]

          // Check if drop target is a descendant of any selected node
          if (!allDescendants.includes(droppedOnNode.id) && !selectedNodes.includes(droppedOnNode.id)) {
            // Reparent all selected nodes to the drop target
            selectedNodes.forEach((selectedId: string) => {
              reparentNode(selectedId, droppedOnNode.id)
            })
          }
        } else {
          // Single node reparenting (original logic)
          const descendants = findAllDescendants(node.id, nodes, edges)
          if (!descendants.includes(droppedOnNode.id) && droppedOnNode.id !== node.id) {
            reparentNode(node.id, droppedOnNode.id)
          }
        }
      }
    } catch (error) {
      console.error('Error in handleNodeDragStop:', error)
    }
  }, [nodes, edges, selectedNodes, findAllDescendants, reparentNode])

  return (
    <div className="w-full h-full relative bg-white flex">
      {/* Main content area */}
      <div className="flex-1 flex flex-col">
      {/* Toolbar - XMind style top toolbar (60px height) */}
      <div className="h-[60px] relative">
        <EditorToolbar
          mindMapTitle={mindMapTitle}
          onTitleSave={onTitleSave}
          onAddNode={addNode}
          selectedNodeId={selectedNode}
          onColorChange={handleColorChange}
          onDeleteNode={handleDeleteNode}
          onSave={handleSave}
          isSaving={isSaving}
          lastSaved={lastSaved}
          onShareClick={() => setIsShareModalOpen(true)}
          onShowExport={() => setShowExport(true)}
          onShowHistory={() => setShowHistory(true)}
          onAutoLayout={handleAutoLayout}
        />
      </div>

      {/* ReactFlow Canvas - fills remaining screen */}
      <div style={{ width: '100%', height: 'calc(100% - 60px)' }} onMouseMove={handleMouseMove}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnectWithHistory}
          onSelectionChange={onSelectionChange}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          onNodeDrag={handleNodeDrag}
          onNodeDragStop={handleNodeDragStop}
          nodeTypes={nodeTypes}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          fitView={true}
          fitViewOptions={{ padding: 0.2, maxZoom: 1, minZoom: 0.5 }}
          minZoom={0.1}
          maxZoom={2}
          edgesUpdatable={true}
          selectionMode={SelectionMode.Partial}
          className="bg-white"
          snapToGrid={false}
          nodesDraggable={true}
          multiSelectionKeyCode="Shift"
          selectNodesOnDrag={false}
          selectionOnDrag={true}
          panOnDrag={[1, 2]}
          style={{ width: '100%', height: '100%' }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="#e5e7eb"
          />
          <Controls
            showInteractive={false}
            className="bg-white border border-gray-200 rounded-lg shadow-sm"
          />

          {/* Collaborator cursors */}
          <CollaboratorCursors collaborators={collaborators} />

          {/* Connection status indicator */}
          <Panel position="top-right" className="m-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
              {isConnected ? (
                <Wifi className="w-4 h-4 text-green-600" />
              ) : (
                <WifiOff className="w-4 h-4 text-gray-400" />
              )}
              <span className={`text-sm font-medium ${isConnected ? 'text-green-700' : 'text-gray-500'}`}>
                {isConnected ? 'Connected' : 'Offline'}
              </span>
              {isConnected && onlineUsers > 0 && (
                <>
                  <div className="w-px h-4 bg-gray-300" />
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">
                    {onlineUsers} online
                  </span>
                </>
              )}
              <div className="w-px h-4 bg-gray-300" />
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="변경 히스토리"
              >
                <History className={`w-4 h-4 ${showHistory ? 'text-blue-600' : 'text-gray-500'}`} />
              </button>
            </div>
          </Panel>

          {/* MiniMap toggle button */}
          <Panel position="bottom-left" className="m-2">
            <button
              onClick={() => setShowMiniMap(!showMiniMap)}
              className="p-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg shadow-sm transition-colors"
              title={showMiniMap ? '미니맵 숨기기' : '미니맵 보기'}
            >
              <Map className={`w-5 h-5 ${showMiniMap ? 'text-blue-600' : 'text-gray-400'}`} />
            </button>
          </Panel>

          {showMiniMap && (
            <MiniMap
              nodeColor={(node: any) => node.data.color || '#6366f1'}
              className="!border-2 !border-gray-200 hover:!border-red-500 !rounded-lg !shadow-lg transition-all"
              style={{ backgroundColor: 'white' }}
              maskColor="rgba(0, 0, 0, 0.05)"
              position="bottom-right"
              pannable
              zoomable
            />
          )}
        </ReactFlow>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        mindMapId={documentId}
        mindMapTitle={mindMapTitle}
      />

      {/* Export Modal */}
      <ExportModal
        open={showExport}
        onOpenChange={setShowExport}
        mindmapId={documentId || ''}
        mindmapTitle={mindMapTitle}
      />
      </div>

      {/* EdgeDetailPanel - shows when an edge is selected */}
      {selectedEdge && (
        <EdgeDetailPanel
          edge={selectedEdge}
          onToggleArrow={toggleEdgeArrow}
          onUpdateStyle={updateEdgeStyle}
          onClose={() => setSelectedEdge(null)}
        />
      )}

      {/* ChangeHistory panel */}
      {documentId && (
        <ChangeHistory
          mindmapId={documentId}
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
        />
      )}

      {/* NodeDetailPanel - Right sidebar */}
      {selectedNodeForDetail && (() => {
        const selectedReactFlowNode = nodes.find(n => n.id === selectedNodeForDetail)
        if (!selectedReactFlowNode) return null

        const mindmapNode: MindMapNodeType = {
          id: selectedReactFlowNode.id,
          label: selectedReactFlowNode.data.label,
          position: selectedReactFlowNode.position,
          level: selectedReactFlowNode.data.level || 0,
          parentId: selectedReactFlowNode.data.parentId,
          color: selectedReactFlowNode.data.color,
          borderColor: (selectedReactFlowNode.data as any).borderColor,
        }

        return (
          <NodeDetailPanel
            node={mindmapNode}
            mindmapId={documentId}
            onClose={() => setSelectedNodeForDetail(null)}
            onUpdate={handleNodeUpdate}
          />
        )
      })()}
    </div>
  )
}
