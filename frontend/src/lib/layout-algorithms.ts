import dagre from 'dagre'
import type { Node, Edge } from 'reactflow'

// Layout types
export type LayoutDirection = 'TB' | 'LR' | 'RL' | 'BI' // Top-Bottom, Left-Right, Right-Left, Bilateral

export interface LayoutOptions {
  direction: LayoutDirection
  spacingX?: number // horizontal gap between nodes (default: 80)
  spacingY?: number // vertical gap between levels (default: 100)
  anchorNodeId?: string // if set, this node stays at its original position after layout
}

// Estimate node dimensions based on level and content
export function estimateNodeDimensions(node: Node): { width: number; height: number } {
  const level = node.data?.level ?? 0
  const label = node.data?.label ?? ''

  // Base min dimensions from CustomNode.tsx
  const baseDimensions: Record<number, { width: number; height: number }> = {
    0: { width: 200, height: 80 },
    1: { width: 160, height: 60 },
    2: { width: 120, height: 50 },
  }
  const base = baseDimensions[level] || { width: 100, height: 40 }

  // Estimate width based on label length
  const charWidth = level === 0 ? 18 : level === 1 ? 14 : level === 2 ? 11 : 10
  const padding = level === 0 ? 96 : level === 1 ? 64 : 48
  const labelWidth = label.length * charWidth + padding

  // Add media height if present
  const mediaHeight = node.data?.media ? 120 : 0

  return {
    width: Math.min(Math.max(base.width, labelWidth), 400),
    height: base.height + mediaHeight,
  }
}

// Bilateral (양쪽 방사형) layout: root in center, children spread left and right
function applyBilateralLayout(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions
): Node[] {
  if (nodes.length === 0) return nodes

  const { spacingX = 100, spacingY = 60 } = options

  // Find root node (level 0)
  const rootNode = nodes.find(n => (n.data?.level ?? 0) === 0)
  if (!rootNode) return applyDagreLayout(nodes, edges, { ...options, direction: 'LR' })

  // Find level 1 children (direct children of root)
  const level1Children = nodes.filter(n => n.data?.parentId === rootNode.id)

  // If no children, just return with root positioned
  if (level1Children.length === 0) return nodes

  // Split children into left and right groups (alternate)
  const rightChildren: string[] = []
  const leftChildren: string[] = []
  level1Children.forEach((child, index) => {
    if (index % 2 === 0) {
      rightChildren.push(child.id)
    } else {
      leftChildren.push(child.id)
    }
  })

  // Helper: collect all descendants of given node IDs
  function collectSubtree(rootIds: string[]): Set<string> {
    const ids = new Set<string>(rootIds)
    const queue = [...rootIds]
    while (queue.length > 0) {
      const id = queue.shift()!
      edges.forEach(e => {
        if (e.source === id && !ids.has(e.target)) {
          ids.add(e.target)
          queue.push(e.target)
        }
      })
      nodes.forEach(n => {
        if (n.data?.parentId === id && !ids.has(n.id)) {
          ids.add(n.id)
          queue.push(n.id)
        }
      })
    }
    return ids
  }

  const rightSubtreeIds = collectSubtree(rightChildren)
  const leftSubtreeIds = collectSubtree(leftChildren)

  // Layout right side (root + right subtree) using LR
  const rightNodes = nodes.filter(n => n.id === rootNode.id || rightSubtreeIds.has(n.id))
  const rightEdges = edges.filter(e =>
    (e.source === rootNode.id && rightSubtreeIds.has(e.target)) ||
    (rightSubtreeIds.has(e.source) && rightSubtreeIds.has(e.target))
  )

  const rightLayout = rightNodes.length > 1
    ? applyDagreLayout(rightNodes, rightEdges, { direction: 'LR', spacingX, spacingY })
    : rightNodes

  // Layout left side (root + left subtree) using RL
  const leftNodes = nodes.filter(n => n.id === rootNode.id || leftSubtreeIds.has(n.id))
  const leftEdges = edges.filter(e =>
    (e.source === rootNode.id && leftSubtreeIds.has(e.target)) ||
    (leftSubtreeIds.has(e.source) && leftSubtreeIds.has(e.target))
  )

  const leftLayout = leftNodes.length > 1
    ? applyDagreLayout(leftNodes, leftEdges, { direction: 'RL', spacingX, spacingY })
    : leftNodes

  // Use anchor position or root's original position
  const anchorPos = options.anchorNodeId
    ? (nodes.find(n => n.id === options.anchorNodeId)?.position ?? rootNode.position)
    : rootNode.position

  // Get root position from each side's layout
  const rightRoot = rightLayout.find(n => n.id === rootNode.id)
  const leftRoot = leftLayout.find(n => n.id === rootNode.id)

  // Build position map
  const positionMap = new Map<string, { x: number; y: number }>()

  // Place root at anchor position
  positionMap.set(rootNode.id, anchorPos)

  // Offset right side: anchor right root to the root position
  if (rightRoot) {
    const rightOffsetX = anchorPos.x - rightRoot.position.x
    const rightOffsetY = anchorPos.y - rightRoot.position.y
    rightLayout.forEach(n => {
      if (n.id !== rootNode.id) {
        positionMap.set(n.id, {
          x: n.position.x + rightOffsetX,
          y: n.position.y + rightOffsetY,
        })
      }
    })
  }

  // Offset left side: anchor left root to the root position
  if (leftRoot) {
    const leftOffsetX = anchorPos.x - leftRoot.position.x
    const leftOffsetY = anchorPos.y - leftRoot.position.y
    leftLayout.forEach(n => {
      if (n.id !== rootNode.id) {
        positionMap.set(n.id, {
          x: n.position.x + leftOffsetX,
          y: n.position.y + leftOffsetY,
        })
      }
    })
  }

  // Apply positions
  return nodes.map(n => {
    const pos = positionMap.get(n.id)
    if (pos) {
      return { ...n, position: pos }
    }
    return n
  })
}

// Main layout function using dagre
export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = { direction: 'TB' }
): Node[] {
  if (nodes.length === 0) return nodes

  // Bilateral layout requires custom handling — dagre doesn't support 'BI'
  if (options.direction === 'BI') {
    return applyBilateralLayout(nodes, edges, options)
  }

  const { direction, spacingX = 80, spacingY = 100 } = options

  // Map internal direction to dagre rankdir
  // Our 'RL' means user wants root-left, children-right (dagre 'LR')
  const dagreDirection = direction === 'RL' ? 'LR' : direction

  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({
    rankdir: dagreDirection,
    nodesep: spacingX,
    ranksep: spacingY,
    marginx: 50,
    marginy: 50,
  })

  // Add nodes with their estimated dimensions
  nodes.forEach((node) => {
    const dims = estimateNodeDimensions(node)
    g.setNode(node.id, { width: dims.width, height: dims.height })
  })

  // Add edges
  edges.forEach((edge) => {
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      g.setEdge(edge.source, edge.target)
    }
  })

  // Run dagre layout
  dagre.layout(g)

  // Apply computed positions (dagre uses center coords, ReactFlow uses top-left)
  let result = nodes.map((node) => {
    const dagreNode = g.node(node.id)
    if (!dagreNode) return node

    return {
      ...node,
      position: {
        x: dagreNode.x - dagreNode.width / 2,
        y: dagreNode.y - dagreNode.height / 2,
      },
    }
  })

  // If anchorNodeId is set, shift all nodes so the anchor stays at its original position
  if (options.anchorNodeId) {
    const originalAnchor = nodes.find(n => n.id === options.anchorNodeId)
    const layoutedAnchor = result.find(n => n.id === options.anchorNodeId)
    if (originalAnchor && layoutedAnchor) {
      const offsetX = originalAnchor.position.x - layoutedAnchor.position.x
      const offsetY = originalAnchor.position.y - layoutedAnchor.position.y
      result = result.map(n => ({
        ...n,
        position: {
          x: n.position.x + offsetX,
          y: n.position.y + offsetY,
        },
      }))
    }
  }

  return result
}

// Convenience functions for specific layout types
export function applyTreeLayout(nodes: Node[], edges: Edge[]): Node[] {
  return applyDagreLayout(nodes, edges, { direction: 'TB', spacingX: 80, spacingY: 100 })
}

export function applyHorizontalLayout(nodes: Node[], edges: Edge[]): Node[] {
  return applyDagreLayout(nodes, edges, { direction: 'LR', spacingX: 100, spacingY: 60 })
}

export function applyBilateralTreeLayout(nodes: Node[], edges: Edge[]): Node[] {
  return applyDagreLayout(nodes, edges, { direction: 'BI', spacingX: 100, spacingY: 60 })
}

// Rebalance only a subtree (for incremental layout after adding a node)
export function rebalanceSubtree(
  allNodes: Node[],
  allEdges: Edge[],
  rootId: string,
): Node[] {
  // Find all nodes in the subtree
  const subtreeIds = new Set<string>()
  const queue = [rootId]
  while (queue.length > 0) {
    const id = queue.shift()!
    subtreeIds.add(id)
    // Find children via edges
    allEdges.forEach(e => {
      if (e.source === id && !subtreeIds.has(e.target)) {
        queue.push(e.target)
      }
    })
  }

  // Also find children via parentId data
  allNodes.forEach(n => {
    if (n.data?.parentId && subtreeIds.has(n.data.parentId)) {
      subtreeIds.add(n.id)
    }
  })

  const subtreeNodes = allNodes.filter(n => subtreeIds.has(n.id))
  const subtreeEdges = allEdges.filter(e => subtreeIds.has(e.source) && subtreeIds.has(e.target))

  if (subtreeNodes.length <= 1) return allNodes

  // Get root position to anchor the subtree
  const rootNode = allNodes.find(n => n.id === rootId)
  if (!rootNode) return allNodes

  const rootPos = { ...rootNode.position }

  // Layout the subtree
  const layoutedSubtree = applyDagreLayout(subtreeNodes, subtreeEdges, { direction: 'TB', spacingX: 80, spacingY: 100 })

  // Find the root in layouted result and calculate offset
  const layoutedRoot = layoutedSubtree.find(n => n.id === rootId)
  if (!layoutedRoot) return allNodes

  const offsetX = rootPos.x - layoutedRoot.position.x
  const offsetY = rootPos.y - layoutedRoot.position.y

  // Apply offset so root stays in place, children reposition relative to it
  const layoutedMap = new Map<string, { x: number; y: number }>()
  layoutedSubtree.forEach(n => {
    layoutedMap.set(n.id, {
      x: n.position.x + offsetX,
      y: n.position.y + offsetY,
    })
  })

  // Merge back
  return allNodes.map(n => {
    const newPos = layoutedMap.get(n.id)
    if (newPos) {
      return { ...n, position: newPos }
    }
    return n
  })
}

// Detect overlapping node pairs based on their positions and estimated dimensions
export function detectOverlaps(nodes: Node[]): Array<[string, string]> {
  const overlaps: Array<[string, string]> = []
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i]
    const aDims = estimateNodeDimensions(a)
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j]
      const bDims = estimateNodeDimensions(b)
      const overlapX = a.position.x < b.position.x + bDims.width &&
                        a.position.x + aDims.width > b.position.x
      const overlapY = a.position.y < b.position.y + bDims.height &&
                        a.position.y + aDims.height > b.position.y
      if (overlapX && overlapY) {
        overlaps.push([a.id, b.id])
      }
    }
  }
  return overlaps
}
