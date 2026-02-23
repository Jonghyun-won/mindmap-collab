import * as Y from 'yjs'
import { Edge } from 'reactflow'
import { MindMapNode } from '@/hooks/useMindMapStore'

// Convert React Flow nodes to Yjs format
export function nodesToYMap(nodes: MindMapNode[], yNodes: Y.Map<any>) {
  nodes.forEach((node) => {
    const nodeData = {
      id: node.id,
      type: node.type,
      position: node.position,
      data: node.data,
      selected: node.selected || false,
    }
    yNodes.set(node.id, nodeData)
  })
}

// Convert React Flow edges to Yjs format
export function edgesToYMap(edges: Edge[], yEdges: Y.Map<any>) {
  edges.forEach((edge) => {
    yEdges.set(edge.id, edge)
  })
}

// Convert Yjs nodes to React Flow format
export function yMapToNodes(yNodes: Y.Map<any>): MindMapNode[] {
  const nodes: MindMapNode[] = []
  yNodes.forEach((value) => {
    nodes.push({
      id: value.id,
      type: value.type || 'custom',
      position: value.position,
      data: value.data,
      selected: value.selected || false,
    })
  })
  return nodes
}

// Convert Yjs edges to React Flow format
export function yMapToEdges(yEdges: Y.Map<any>): Edge[] {
  const edges: Edge[] = []
  yEdges.forEach((value) => {
    edges.push(value)
  })
  return edges
}

// Sync local changes to Yjs
export function syncNodesToYjs(
  nodes: MindMapNode[],
  yNodes: Y.Map<any>,
  ydoc: Y.Doc
) {
  ydoc.transact(() => {
    // Remove deleted nodes
    const nodeIds = new Set(nodes.map(n => n.id))
    const yNodeIds = Array.from(yNodes.keys())

    yNodeIds.forEach(id => {
      if (!nodeIds.has(id)) {
        yNodes.delete(id)
      }
    })

    // Update or add nodes
    nodes.forEach((node) => {
      const existing = yNodes.get(node.id)
      const nodeData = {
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data,
        selected: node.selected || false,
      }

      // Shallow comparison for position (hot path during drag) with deep check only for data
      const hasChanged = !existing ||
        existing.position?.x !== nodeData.position?.x ||
        existing.position?.y !== nodeData.position?.y ||
        existing.type !== nodeData.type ||
        existing.selected !== nodeData.selected ||
        JSON.stringify(existing.data) !== JSON.stringify(nodeData.data)

      if (hasChanged) {
        yNodes.set(node.id, nodeData)
      }
    })
  })
}

export function syncEdgesToYjs(
  edges: Edge[],
  yEdges: Y.Map<any>,
  ydoc: Y.Doc
) {
  ydoc.transact(() => {
    // Remove deleted edges
    const edgeIds = new Set(edges.map(e => e.id))
    const yEdgeIds = Array.from(yEdges.keys())

    yEdgeIds.forEach(id => {
      if (!edgeIds.has(id)) {
        yEdges.delete(id)
      }
    })

    // Update or add edges
    edges.forEach((edge) => {
      const existing = yEdges.get(edge.id)
      if (!existing || JSON.stringify(existing) !== JSON.stringify(edge)) {
        yEdges.set(edge.id, edge)
      }
    })
  })
}
