import { MindMapNode } from '@/hooks/useMindMapStore'

// Find all descendants of a node (children, grandchildren, etc.)
export function findAllDescendants(
  nodeId: string,
  allNodes: MindMapNode[]
): MindMapNode[] {
  const descendants: MindMapNode[] = []
  const directChildren = allNodes.filter(n => n.data.parentId === nodeId)

  directChildren.forEach(child => {
    descendants.push(child)
    // Recursively find grandchildren
    const grandchildren = findAllDescendants(child.id, allNodes)
    descendants.push(...grandchildren)
  })

  return descendants
}

// Move a node and all its descendants by a delta
export function moveNodeWithDescendants(
  draggedNodeId: string,
  deltaX: number,
  deltaY: number,
  allNodes: MindMapNode[]
): MindMapNode[] {
  const descendants = findAllDescendants(draggedNodeId, allNodes)
  const affectedNodeIds = new Set([draggedNodeId, ...descendants.map(n => n.id)])

  return allNodes.map(node => {
    if (affectedNodeIds.has(node.id)) {
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
}
