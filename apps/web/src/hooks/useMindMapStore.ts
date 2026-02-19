import { useState, useCallback } from 'react';
import {
  Node,
  Edge,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  Connection,
  NodeChange,
  EdgeChange,
} from 'reactflow';

export interface MindMapNode extends Node {
  data: {
    label: string;
    color?: string;
    level?: number;
    parentId?: string;
  };
}

// Get color based on level (4 distinct colors, then gray)
function getColorForLevel(level: number): string {
  const colors = [
    '#6366f1', // Level 0: Indigo (Main)
    '#3b82f6', // Level 1: Blue
    '#10b981', // Level 2: Green
    '#f59e0b', // Level 3: Orange
    '#ef4444', // Level 4: Red
    '#9ca3af', // Level 5: Gray
    '#d1d5db', // Level 6+: Light gray
  ];
  return colors[Math.min(level, colors.length - 1)];
}

// Calculate position for child nodes with left-right balance and collision detection
function getChildPosition(parentNode: MindMapNode, existingNodes: MindMapNode[], level: number) {
  const baseX = parentNode.position.x;
  const baseY = parentNode.position.y;

  // Count existing children of this parent
  const children = existingNodes.filter(
    n => n.data.parentId === parentNode.id
  );

  const horizontalSpacing = 140; // 더 좁은 간격
  const verticalSpacing = 80; // 더 좁은 세로 간격

  // Alternate left and right for balance
  const childIndex = children.length;

  let xOffset: number;
  if (childIndex === 0) {
    // First child: center-left
    xOffset = -horizontalSpacing / 2;
  } else if (childIndex % 2 === 1) {
    // Odd index: right side
    const rightCount = Math.floor((childIndex + 1) / 2);
    xOffset = rightCount * horizontalSpacing;
  } else {
    // Even index: left side
    const leftCount = childIndex / 2;
    xOffset = -(leftCount * horizontalSpacing + horizontalSpacing / 2);
  }

  let proposedX = baseX + xOffset;
  let proposedY = baseY + verticalSpacing;

  // Enhanced collision detection - check multiple times with increasing offsets
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const hasCollision = existingNodes.some(node => {
      const dx = Math.abs(node.position.x - proposedX);
      const dy = Math.abs(node.position.y - proposedY);
      return dx < 80 && dy < 60; // Minimum distance threshold
    });

    if (!hasCollision) {
      // Found a good position
      break;
    }

    // Try different offsets to find non-overlapping position
    if (attempts < 5) {
      // First try horizontal shifts
      proposedX += (attempts % 2 === 0 ? 40 : -40) * Math.ceil(attempts / 2);
    } else {
      // Then try vertical shifts
      proposedY += 30;
    }

    attempts++;
  }

  return {
    x: proposedX,
    y: proposedY,
  };
}

// Calculate position for sibling nodes (same level) - horizontally aligned
function getSiblingPosition(currentNode: MindMapNode, existingNodes: MindMapNode[], parentId?: string) {
  const siblings = existingNodes.filter(
    n => n.data.parentId === parentId && n.data.level === currentNode.data.level
  );

  const horizontalSpacing = 140; // 더 좁은 간격

  // Find the rightmost sibling to place new one to its right
  let rightmostX = currentNode.position.x;
  siblings.forEach(sibling => {
    if (sibling.position.x > rightmostX) {
      rightmostX = sibling.position.x;
    }
  });

  let proposedX = rightmostX + horizontalSpacing;
  let proposedY = currentNode.position.y; // SAME Y for horizontal alignment

  // Check for collisions and adjust if needed
  let attempts = 0;
  while (attempts < 5) {
    const hasCollision = existingNodes.some(node => {
      const dx = Math.abs(node.position.x - proposedX);
      const dy = Math.abs(node.position.y - proposedY);
      return dx < 80 && dy < 60;
    });

    if (!hasCollision) break;

    // If collision, shift right more
    proposedX += 50;
    attempts++;
  }

  return {
    x: proposedX,
    y: proposedY,
  };
}

interface HistoryState {
  nodes: MindMapNode[];
  edges: Edge[];
}

export function useMindMapStore() {
  const [nodes, setNodes] = useState<MindMapNode[]>([
    {
      id: '1',
      type: 'custom',
      data: { label: 'Main Topic', color: '#6366f1', level: 0 },
      position: { x: 400, y: 50 },
    },
  ]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [clipboard, setClipboard] = useState<MindMapNode | null>(null);

  // Save to history before making changes
  const saveHistory = useCallback(() => {
    setHistory((prev) => {
      const newHistory = [...prev, { nodes, edges }];
      // Keep only last 20 states
      return newHistory.slice(-20);
    });
  }, [nodes, edges]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));

      // Save history after drag operations
      const hasDragEnd = changes.some(c => c.type === 'position' && c.dragging === false);
      if (hasDragEnd) {
        saveHistory();
      }
    },
    [saveHistory]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    []
  );

  const addNode = useCallback(() => {
    const newNode: MindMapNode = {
      id: `${Date.now()}`,
      type: 'custom',
      data: { label: 'New Node', color: '#6366f1', level: 0 },
      position: {
        x: Math.random() * 400 + 200,
        y: Math.random() * 400 + 200,
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }, []);

  const addChildNode = useCallback((parentId: string, autoSelect: boolean = true) => {
    saveHistory();
    const newNodeId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    setNodes((nds) => {
      const parentNode = nds.find(n => n.id === parentId);
      if (!parentNode) return nds;

      const parentLevel = parentNode.data.level || 0;
      const newLevel = parentLevel + 1;

      // Check max depth (20 levels)
      if (newLevel >= 20) {
        alert('Maximum depth of 20 levels reached!');
        return nds;
      }

      const position = getChildPosition(parentNode, nds, newLevel);
      const color = getColorForLevel(newLevel);

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
      };

      return [...nds, newNode];
    });

    // Auto-connect to parent
    setTimeout(() => {
      setEdges((eds) => {
        const edgeExists = eds.some(e => e.source === parentId && e.target === newNodeId);
        if (!edgeExists) {
          return [...eds, {
            id: `e-${parentId}-${newNodeId}`,
            source: parentId,
            target: newNodeId,
            type: 'smoothstep',
            animated: false,
          }];
        }
        return eds;
      });
    }, 50);

    // Return new node ID for selection
    return newNodeId;
  }, [saveHistory]);

  const addSiblingNode = useCallback((currentNodeId: string, autoSelect: boolean = true) => {
    saveHistory();
    const newNodeId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    setNodes((nds) => {
      const currentNode = nds.find(n => n.id === currentNodeId);
      if (!currentNode) return nds;

      const level = currentNode.data.level || 0;
      const parentId = currentNode.data.parentId;

      const position = getSiblingPosition(currentNode, nds, parentId);
      const color = getColorForLevel(level);

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
      };

      return [...nds, newNode];
    });

    // Only connect to parent if has parent (not siblings)
    setTimeout(() => {
      setNodes((nds) => {
        const newNode = nds.find(n => n.id === newNodeId);
        if (newNode?.data.parentId) {
          setEdges((eds) => {
            const edgeExists = eds.some(e => e.source === newNode.data.parentId && e.target === newNodeId);
            if (!edgeExists) {
              return [...eds, {
                id: `e-${newNode.data.parentId}-${newNodeId}`,
                source: newNode.data.parentId!,
                target: newNodeId,
                type: 'smoothstep',
                animated: false,
              }];
            }
            return eds;
          });
        }
        return nds;
      });
    }, 50);

    // Return new node ID for selection
    return newNodeId;
  }, [saveHistory]);

  const updateNodeLabel = useCallback((nodeId: string, label: string) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, label } }
          : node
      )
    );
  }, []);

  const updateNodeColor = useCallback((nodeId: string, color: string) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, color } }
          : node
      )
    );
  }, []);

  const deleteNode = useCallback((nodeId: string) => {
    saveHistory();
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
  }, [saveHistory]);

  // Find all descendants of a node
  const findAllDescendants = useCallback((nodeId: string, nodesList: MindMapNode[]): string[] => {
    const children = nodesList.filter(n => n.data.parentId === nodeId);
    let descendants = children.map(c => c.id);
    children.forEach(child => {
      descendants = [...descendants, ...findAllDescendants(child.id, nodesList)];
    });
    return descendants;
  }, []);

  // Move node with all descendants
  const moveNodeWithDescendants = useCallback((nodeId: string, deltaX: number, deltaY: number) => {
    setNodes((nds) => {
      const descendantIds = findAllDescendants(nodeId, nds);
      const affectedIds = new Set([nodeId, ...descendantIds]);

      return nds.map(node => {
        if (affectedIds.has(node.id)) {
          return {
            ...node,
            position: {
              x: node.position.x + deltaX,
              y: node.position.y + deltaY,
            },
          };
        }
        return node;
      });
    });
  }, [findAllDescendants]);

  // Reparent node (change parent)
  const reparentNode = useCallback((nodeId: string, newParentId: string | undefined) => {
    saveHistory();
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
          };
        }
        return node;
      });
    });

    // Update edges - remove old parent connection, add new one
    setEdges((eds) => {
      // Remove old parent connection
      const filtered = eds.filter(e => e.target !== nodeId);

      // Add new parent connection if parent exists
      if (newParentId) {
        return [...filtered, {
          id: `e-${newParentId}-${nodeId}`,
          source: newParentId,
          target: nodeId,
          type: 'smoothstep',
          animated: false,
        }];
      }

      return filtered;
    });
  }, [saveHistory]);

  const copyNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setClipboard(node);
    }
  }, [nodes]);

  const pasteNode = useCallback((targetNodeId?: string) => {
    if (!clipboard) return;

    saveHistory();
    const newNodeId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    if (targetNodeId) {
      // Paste as child of selected node
      setNodes((nds) => {
        const targetNode = nds.find(n => n.id === targetNodeId);
        if (!targetNode) return nds;

        const newLevel = (targetNode.data.level || 0) + 1;

        if (newLevel >= 20) {
          alert('Maximum depth of 20 levels reached!');
          return nds;
        }

        const position = getChildPosition(targetNode, nds, newLevel);

        const newNode: MindMapNode = {
          id: newNodeId,
          type: 'custom',
          data: {
            ...clipboard.data,
            level: newLevel,
            parentId: targetNodeId,
          },
          position,
        };

        return [...nds, newNode];
      });

      // Connect to parent
      setTimeout(() => {
        setEdges((eds) => {
          return [...eds, {
            id: `e-${targetNodeId}-${newNodeId}`,
            source: targetNodeId,
            target: newNodeId,
            type: 'smoothstep',
            animated: false,
          }];
        });
      }, 50);
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
        };
        return [...nds, newNode];
      });
    }
  }, [clipboard, saveHistory]);

  const undo = useCallback(() => {
    if (history.length === 0) return;

    const lastState = history[history.length - 1];
    setNodes(lastState.nodes);
    setEdges(lastState.edges);
    setHistory((prev) => prev.slice(0, -1));
  }, [history]);

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
  };
}
