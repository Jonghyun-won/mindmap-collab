import { useCallback, useEffect, useState, useRef } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  NodeTypes,
  SelectionMode,
  BackgroundVariant,
} from 'reactflow'
import 'reactflow/dist/style.css'

import CustomNode from './CustomNode'
import EditorToolbar from './EditorToolbar'
import { useMindMapStore } from '@/hooks/useMindMapStore'
import { useSaveMindMap } from '@/hooks/useSaveMindMap'

const nodeTypes: NodeTypes = {
  custom: CustomNode,
}

interface MindMapCanvasProps {
  mindMapTitle: string
  documentId: string
}

export default function MindMapCanvas({ mindMapTitle, documentId }: MindMapCanvasProps) {
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
    findAllDescendants,
    reparentNode,
  } = useMindMapStore()

  // Track dragging state
  const dragStateRef = useRef<{
    nodeId: string
    startX: number
    startY: number
    descendants: string[]
  } | null>(null)

  // Save functionality (simplified - no Yjs for now)
  const { saveMindMap, isSaving, lastSaved } = useSaveMindMap()

  // Manual save handler
  const handleSave = useCallback(async () => {
    // For now, save without Yjs - just use current nodes/edges state
    const success = await saveMindMap(documentId, mindMapTitle, null, { nodes, edges })
    if (!success) {
      alert('Failed to save mindmap')
    }
  }, [documentId, mindMapTitle, nodes, edges, saveMindMap])

  const [selectedNode, setSelectedNode] = useState<string | undefined>()
  const [selectedNodes, setSelectedNodes] = useState<string[]>([])

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
    }

    window.addEventListener('nodeUpdate', handleNodeUpdate)
    return () => window.removeEventListener('nodeUpdate', handleNodeUpdate)
  }, [updateNodeLabel])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if typing in input
      if ((event.target as HTMLElement).tagName === 'INPUT') {
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

      // Ctrl+V: Paste
      if (isCtrl && event.key === 'v') {
        event.preventDefault()
        pasteNode(selectedNode)
        return
      }

      // Delete: 노드 삭제
      if (event.key === 'Delete' && selectedNode) {
        event.preventDefault()
        deleteNode(selectedNode)
        setSelectedNode(undefined)
        return
      }

      // Enter: 형제 노드 추가 (수평적)
      if (event.key === 'Enter' && !isCtrl && selectedNode) {
        event.preventDefault()
        event.stopPropagation()
        const newNodeId = addSiblingNode(selectedNode)
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
      if ((event.key === 'Enter' && isCtrl) || (event.key === 'Tab' && selectedNode)) {
        event.preventDefault()
        event.stopPropagation()
        const newNodeId = addChildNode(selectedNode)
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

      // Space: 빠른 자식 노드 추가
      if (event.key === ' ' && selectedNode) {
        event.preventDefault()
        event.stopPropagation()
        const newNodeId = addChildNode(selectedNode)
        setTimeout(() => setSelectedNode(newNodeId), 100)
        return
      }

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
  }, [selectedNode, deleteNode, addChildNode, addSiblingNode, copyNode, pasteNode, undo, handleSave])

  const handleColorChange = useCallback(
    (color: string) => {
      if (selectedNode) {
        updateNodeColor(selectedNode, color)
      }
    },
    [selectedNode, updateNodeColor]
  )

  const handleDeleteNode = useCallback(() => {
    if (selectedNode) {
      deleteNode(selectedNode)
      setSelectedNode(undefined)
    }
  }, [selectedNode, deleteNode])

  // Handle node drag
  const handleNodeDrag = useCallback((_event: any, node: any) => {
    try {
      if (!dragStateRef.current || dragStateRef.current.nodeId !== node.id) {
        let allDescendants: string[] = []

        if (selectedNodes.length > 1 && selectedNodes.includes(node.id)) {
          selectedNodes.forEach(selectedId => {
            const descendants = findAllDescendants(selectedId, nodes)
            allDescendants = [...allDescendants, ...descendants]
          })
          allDescendants = [...new Set(allDescendants)]
          allDescendants = allDescendants.filter(id => !selectedNodes.includes(id))
        } else {
          allDescendants = findAllDescendants(node.id, nodes)
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
  }, [nodes, selectedNodes, findAllDescendants, setNodes])

  // Handle node drag stop
  const handleNodeDragStop = useCallback((_event: any, node: any) => {
    try {
      dragStateRef.current = null

      const droppedOnNode = nodes.find(n => {
        if (n.id === node.id) return false
        const dx = Math.abs(n.position.x - node.position.x)
        const dy = Math.abs(n.position.y - node.position.y)
        return dx < 50 && dy < 50
      })

      if (droppedOnNode) {
        const descendants = findAllDescendants(node.id, nodes)
        if (!descendants.includes(droppedOnNode.id) && droppedOnNode.id !== node.id) {
          reparentNode(node.id, droppedOnNode.id)
        }
      }
    } catch (error) {
      console.error('Error in handleNodeDragStop:', error)
    }
  }, [nodes, findAllDescendants, reparentNode])

  return (
    <div className="w-full h-full relative bg-white">
      {/* Toolbar - XMind style top toolbar (60px height) */}
      <div className="h-[60px] relative">
        <EditorToolbar
          onAddNode={addNode}
          selectedNodeId={selectedNode}
          onColorChange={handleColorChange}
          onDeleteNode={handleDeleteNode}
          onSave={handleSave}
          isSaving={isSaving}
          lastSaved={lastSaved}
        />
      </div>

      {/* ReactFlow Canvas - fills remaining screen */}
      <div style={{ width: '100%', height: 'calc(100% - 60px)' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onSelectionChange={onSelectionChange}
          onNodeDrag={handleNodeDrag}
          onNodeDragStop={handleNodeDragStop}
          nodeTypes={nodeTypes}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          fitView={true}
          fitViewOptions={{ padding: 0.2, maxZoom: 1, minZoom: 0.5 }}
          minZoom={0.1}
          maxZoom={2}
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
          <MiniMap
            nodeColor={(node: any) => node.data.color || '#6366f1'}
            className="bg-white border border-gray-200 rounded-lg shadow-sm"
            maskColor="rgba(0, 0, 0, 0.05)"
          />
        </ReactFlow>
      </div>
    </div>
  )
}
