import { useCallback, useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  NodeTypes,
  SelectionMode,
} from 'reactflow';
import 'reactflow/dist/style.css';

import CustomNode from './CustomNode';
import Toolbar from './Toolbar';
import CollaboratorCursors from './CollaboratorCursors';
import CollaboratorAvatars from './CollaboratorAvatars';
import Toast from '../common/Toast';
import { useMindMapStore } from '../../hooks/useMindMapStore';
import { useYjsCollaboration } from '../../hooks/useYjsCollaboration';
import { useSaveMindMap } from '../../hooks/useSaveMindMap';
import { usePresence } from '../../hooks/usePresence';
import { useToast } from '../../hooks/useToast';

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

interface MindMapCanvasProps {
  mindMapTitle: string;
}

export default function MindMapCanvas({ mindMapTitle }: MindMapCanvasProps) {
  const { id: documentId } = useParams<{ id: string }>();

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
  } = useMindMapStore();

  // Track dragging state
  const dragStateRef = useRef<{
    nodeId: string;
    startX: number;
    startY: number;
    descendants: string[];
  } | null>(null);

  // Yjs collaboration
  const {
    isConnected,
    onlineUsers,
    syncLocalNodes,
    syncLocalEdges,
    ydoc,
    provider,
  } = useYjsCollaboration({
    documentId: documentId || 'default',
    onNodesChange: setNodes,
    onEdgesChange: setEdges,
    initialNodes: nodes,
    initialEdges: edges,
  });

  // Presence (실시간 커서)
  const { collaborators, updateCursor, updateSelectedNode } = usePresence(provider);

  // Toast 알림
  const { toasts, removeToast, success, error } = useToast();

  // 연결 상태 변화 감지
  const prevConnectedRef = useRef(isConnected);
  useEffect(() => {
    if (prevConnectedRef.current === false && isConnected === true) {
      success('서버에 연결되었습니다');
    } else if (prevConnectedRef.current === true && isConnected === false) {
      error('연결이 끊어졌습니다. 재연결 시도 중...');
    }
    prevConnectedRef.current = isConnected;
  }, [isConnected, success, error]);

  // Save functionality
  const { saveMindMap, autoSave, isSaving, lastSaved } = useSaveMindMap();

  // Sync changes to Yjs
  useEffect(() => {
    syncLocalNodes(nodes);
  }, [nodes, syncLocalNodes]);

  useEffect(() => {
    syncLocalEdges(edges);
  }, [edges, syncLocalEdges]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!documentId || !ydoc) return;

    const autoSaveInterval = setInterval(() => {
      autoSave(documentId, mindMapTitle, ydoc);
    }, 30000); // 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [documentId, mindMapTitle, ydoc, autoSave]);

  // Manual save handler
  const handleSave = useCallback(async () => {
    if (documentId && ydoc) {
      const result = await saveMindMap(documentId, mindMapTitle, ydoc);
      if (result.success) {
        success('마인드맵이 저장되었습니다');
      } else {
        error(`저장 실패: ${result.error}`);
      }
    }
  }, [documentId, mindMapTitle, ydoc, saveMindMap, success, error]);

  const [selectedNode, setSelectedNode] = useState<string | undefined>();
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);

  // Handle node selection
  const onSelectionChange = useCallback(({ nodes }: any) => {
    const selectedId = nodes.length > 0 ? nodes[0].id : undefined;
    setSelectedNode(selectedId);
    setSelectedNodes(nodes.map((n: any) => n.id));

    // 선택된 노드 정보 다른 사용자에게 전달
    updateSelectedNode(selectedId);
  }, [updateSelectedNode]);

  // Handle node label update from CustomNode
  useEffect(() => {
    const handleNodeUpdate = (event: any) => {
      const { id, label } = event.detail;
      updateNodeLabel(id, label);
    };

    window.addEventListener('nodeUpdate', handleNodeUpdate);
    return () => window.removeEventListener('nodeUpdate', handleNodeUpdate);
  }, [updateNodeLabel]);

  // Remove custom event listeners - handle via keyboard shortcuts only
  // This prevents double-firing of events

  // Handle keyboard shortcuts - SINGLE SOURCE OF TRUTH
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if typing in input
      if ((event.target as HTMLElement).tagName === 'INPUT') {
        return;
      }

      const isCtrl = event.ctrlKey || event.metaKey;

      // Ctrl+S: Save
      if (isCtrl && event.key === 's') {
        event.preventDefault();
        handleSave();
        return;
      }

      // Ctrl+Z: Undo
      if (isCtrl && event.key === 'z') {
        event.preventDefault();
        undo();
        return;
      }

      // Ctrl+C: Copy
      if (isCtrl && event.key === 'c' && selectedNode) {
        event.preventDefault();
        copyNode(selectedNode);
        return;
      }

      // Ctrl+V: Paste
      if (isCtrl && event.key === 'v') {
        event.preventDefault();
        pasteNode(selectedNode);
        return;
      }

      if (event.key === 'Delete' && selectedNode) {
        event.preventDefault();
        deleteNode(selectedNode);
        setSelectedNode(undefined);
      } else if (event.key === 'Enter' && selectedNode) {
        event.preventDefault();
        event.stopPropagation();

        if (isCtrl) {
          // Ctrl+Enter: Create child node and auto-select it
          console.log('Creating child node for:', selectedNode);
          const newNodeId = addChildNode(selectedNode);

          // Auto-select the new node after creation
          setTimeout(() => {
            setSelectedNode(newNodeId);
          }, 100);
        } else {
          // Enter: Create sibling node and auto-select it
          console.log('Creating sibling node for:', selectedNode);
          const newNodeId = addSiblingNode(selectedNode);

          // Auto-select the new node so you can keep pressing Enter
          setTimeout(() => {
            setSelectedNode(newNodeId);
          }, 100);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [selectedNode, deleteNode, addChildNode, addSiblingNode, copyNode, pasteNode, undo, handleSave]);

  const handleColorChange = useCallback(
    (color: string) => {
      if (selectedNode) {
        updateNodeColor(selectedNode, color);
      }
    },
    [selectedNode, updateNodeColor]
  );

  const handleDeleteNode = useCallback(() => {
    if (selectedNode) {
      deleteNode(selectedNode);
      setSelectedNode(undefined);
    }
  }, [selectedNode, deleteNode]);

  // 마우스 이동 추적 (커서 위치 공유)
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    updateCursor(event.clientX, event.clientY);
  }, [updateCursor]);

  // Handle node drag
  const handleNodeDrag = useCallback((_event: any, node: any) => {
    try {
      // Initialize drag state on first drag
      if (!dragStateRef.current || dragStateRef.current.nodeId !== node.id) {
        // 다중 선택된 경우 모든 선택된 노드의 descendants 포함
        let allDescendants: string[] = [];

        if (selectedNodes.length > 1 && selectedNodes.includes(node.id)) {
          // 모든 선택된 노드의 descendants 수집
          selectedNodes.forEach(selectedId => {
            const descendants = findAllDescendants(selectedId, nodes);
            allDescendants = [...allDescendants, ...descendants];
          });
          // 중복 제거
          allDescendants = [...new Set(allDescendants)];
          // 선택된 노드들은 제외 (React Flow가 이동시킴)
          allDescendants = allDescendants.filter(id => !selectedNodes.includes(id));
        } else {
          // 단일 선택
          allDescendants = findAllDescendants(node.id, nodes);
        }

        dragStateRef.current = {
          nodeId: node.id,
          startX: node.position.x,
          startY: node.position.y,
          descendants: allDescendants,
        };
      }

      const deltaX = node.position.x - dragStateRef.current.startX;
      const deltaY = node.position.y - dragStateRef.current.startY;

      // Update descendants positions
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
              };
            }
            return n;
          });
        });

        // Update drag state start position
        dragStateRef.current.startX = node.position.x;
        dragStateRef.current.startY = node.position.y;
      }
    } catch (error) {
      console.error('Error in handleNodeDrag:', error);
    }
  }, [nodes, selectedNodes, findAllDescendants, setNodes]);

  // Handle node drag stop
  const handleNodeDragStop = useCallback((_event: any, node: any) => {
    try {
      dragStateRef.current = null;

      // Check if node was dropped on another node (reparenting)
      const droppedOnNode = nodes.find(n => {
        if (n.id === node.id) return false;
        const dx = Math.abs(n.position.x - node.position.x);
        const dy = Math.abs(n.position.y - node.position.y);
        return dx < 50 && dy < 50; // Within 50px
      });

      if (droppedOnNode) {
        // Prevent making a node its own descendant
        const descendants = findAllDescendants(node.id, nodes);
        if (!descendants.includes(droppedOnNode.id) && droppedOnNode.id !== node.id) {
          console.log(`🔗 Reparenting ${node.id} to ${droppedOnNode.id}`);
          reparentNode(node.id, droppedOnNode.id);
        }
      }
    } catch (error) {
      console.error('Error in handleNodeDragStop:', error);
    }
  }, [nodes, findAllDescendants, reparentNode]);

  return (
    <div className="w-full h-full relative" onMouseMove={handleMouseMove}>
      {/* 실시간 커서 */}
      <CollaboratorCursors collaborators={collaborators} />

      {/* Connection Status & Save */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        {/* Connection Status & Collaborators */}
        <div className="bg-white rounded-lg shadow-lg px-4 py-2 flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm font-medium text-gray-700">
            {isConnected ? '연결됨' : '연결 중...'}
          </span>
          {onlineUsers > 0 && (
            <span className="text-xs text-gray-500 ml-2">
              👥 {onlineUsers}명 온라인
            </span>
          )}

          {/* 협업자 아바타 */}
          {collaborators.size > 0 && (
            <div className="ml-2 border-l pl-2">
              <CollaboratorAvatars collaborators={collaborators} />
            </div>
          )}
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`bg-white rounded-lg shadow-lg px-4 py-2 text-sm font-medium flex items-center gap-2 ${
            isSaving
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-indigo-600 hover:bg-indigo-50 cursor-pointer'
          }`}
        >
          {isSaving ? (
            <>
              <span className="animate-spin">⏳</span>
              저장 중...
            </>
          ) : (
            <>
              💾 저장하기
            </>
          )}
        </button>

        {/* Last Saved */}
        {lastSaved && (
          <div className="bg-white rounded-lg shadow-lg px-4 py-2 text-xs text-gray-500">
            마지막 저장: {lastSaved.toLocaleTimeString('ko-KR')}
          </div>
        )}
      </div>

      <Toolbar
        onAddNode={addNode}
        selectedNodeId={selectedNode}
        onColorChange={handleColorChange}
        onDeleteNode={handleDeleteNode}
      />

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
        fitView
        selectionMode={SelectionMode.Partial}
        className="bg-gray-50"
        snapToGrid={false}
        nodesDraggable={true}
        multiSelectionKeyCode="Shift"
        selectNodesOnDrag={false}
        selectionOnDrag={true}
        panOnDrag={[1, 2]}
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={(node: any) => node.data.color || '#6366f1'}
          className="bg-white"
        />
      </ReactFlow>

      {/* Toast 알림 */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}
