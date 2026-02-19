import { memo, useState, useEffect, useRef } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface CustomNodeData {
  label: string;
  color?: string;
  level?: number;
  parentId?: string;
}

function CustomNode({ data, id, selected }: NodeProps<CustomNodeData>) {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.label);
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  // 텍스트 입력 디바운스 (300ms)
  useEffect(() => {
    if (!isEditing) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (label.trim() && label !== data.label) {
        const event = new CustomEvent('nodeUpdate', {
          detail: { id, label: label.trim() },
        });
        window.dispatchEvent(event);
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [label, isEditing, id, data.label]);

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (label.trim()) {
      // 즉시 업데이트
      const event = new CustomEvent('nodeUpdate', {
        detail: { id, label: label.trim() },
      });
      window.dispatchEvent(event);
    } else {
      setLabel(data.label);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation(); // Prevent event bubbling

      if (isEditing) {
        handleBlur();
        return;
      }

      // Don't handle here - let MindMapCanvas handle it
      // This prevents double firing
    } else if (e.key === 'Escape') {
      setLabel(data.label);
      setIsEditing(false);
    }
  };

  const level = data.level || 0;
  const fontSize = level === 0 ? 'text-lg' : level === 1 ? 'text-base' : 'text-sm';
  const padding = level === 0 ? 'px-6 py-3' : level === 1 ? 'px-5 py-2.5' : 'px-4 py-2';

  return (
    <div
      className={`${padding} rounded-lg border-2 min-w-[120px] ${
        selected ? 'border-red-500 shadow-lg' : 'border-gray-300'
      } ${fontSize}`}
      style={{
        backgroundColor: data.color || '#6366f1',
        color: '#ffffff',
      }}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3" />

      {isEditing ? (
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus
          className={`bg-transparent border-none outline-none text-white placeholder-white/70 w-full text-center font-medium ${fontSize}`}
          placeholder="Enter text..."
        />
      ) : (
        <div className={`text-center font-medium whitespace-nowrap ${fontSize}`}>
          {data.label}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />

      {/* Level indicator for debugging */}
      {level > 0 && (
        <div className="absolute -top-2 -right-2 bg-white text-gray-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
          {level}
        </div>
      )}
    </div>
  );
}

export default memo(CustomNode);
