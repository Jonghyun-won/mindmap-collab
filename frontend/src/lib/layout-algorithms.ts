import { MindMapNode } from "@/types/mindmap"

export interface LayoutOptions {
  spacingX?: number
  spacingY?: number
}

/**
 * Tree layout algorithm (client-side)
 * Matches backend layout_algorithm.py logic
 */
export function applyTreeLayout(
  nodes: MindMapNode[],
  options: LayoutOptions = {}
): MindMapNode[] {
  const { spacingX = 250, spacingY = 150 } = options

  if (!nodes || nodes.length === 0) return []

  // Convert to map for quick lookup
  const nodeMap = new Map(nodes.map((n) => [n.id, { ...n }]))

  // Find root node
  let root = nodes.find((n) => !n.parentId)
  if (!root) {
    root = nodes[0]
    root.parentId = null
    root.level = 0
  }

  // Build parent-child relationships
  const childrenMap = new Map<string, MindMapNode[]>()
  nodes.forEach((node) => {
    if (node.parentId) {
      if (!childrenMap.has(node.parentId)) {
        childrenMap.set(node.parentId, [])
      }
      childrenMap.get(node.parentId)!.push(nodeMap.get(node.id)!)
    }
  })

  // Recursive layout function
  function layoutSubtree(
    nodeId: string,
    x: number,
    y: number
  ): { width: number; bounds: { minX: number; maxX: number } } {
    const node = nodeMap.get(nodeId)
    if (!node) return { width: 0, bounds: { minX: 0, maxX: 0 } }

    const children = childrenMap.get(nodeId) || []

    if (children.length === 0) {
      // Leaf node
      node.position = { x, y }
      return { width: spacingX, bounds: { minX: x, maxX: x } }
    }

    // Layout children recursively
    let currentX = x
    let minX = Infinity
    let maxX = -Infinity
    const childResults: Array<{ id: string; centerX: number }> = []

    children.forEach((child) => {
      const result = layoutSubtree(child.id, currentX, y + spacingY)
      const childNode = nodeMap.get(child.id)!
      const childCenterX = childNode.position.x

      childResults.push({ id: child.id, centerX: childCenterX })

      minX = Math.min(minX, result.bounds.minX)
      maxX = Math.max(maxX, result.bounds.maxX)
      currentX += result.width
    })

    // Position parent at the center of children
    const parentX = (minX + maxX) / 2
    node.position = { x: parentX, y }

    return {
      width: currentX - x,
      bounds: { minX: Math.min(minX, parentX), maxX: Math.max(maxX, parentX) },
    }
  }

  // Start layout from root
  layoutSubtree(root.id, 0, 0)

  // Center the entire tree
  const allX = Array.from(nodeMap.values()).map((n) => n.position.x)
  const minX = Math.min(...allX)
  const maxX = Math.max(...allX)
  const offsetX = -(minX + maxX) / 2

  nodeMap.forEach((node) => {
    node.position.x += offsetX
  })

  return Array.from(nodeMap.values())
}

/**
 * Future expansion: Radial, Org-Chart, etc.
 */
export function applyRadialLayout(
  nodes: MindMapNode[],
  _options: LayoutOptions = {}
): MindMapNode[] {
  // Phase 6 implementation
  return nodes
}
