interface ToolbarProps {
  onAddNode: () => void;
  selectedNodeId?: string;
  onColorChange?: (color: string) => void;
  onDeleteNode?: () => void;
}

const COLORS = [
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#10b981' },
  { name: 'Yellow', value: '#f59e0b' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Gray', value: '#6b7280' },
];

export default function Toolbar({
  onAddNode,
  selectedNodeId,
  onColorChange,
  onDeleteNode,
}: ToolbarProps) {
  return (
    <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 z-10 space-y-4">
      <div>
        <button
          onClick={onAddNode}
          className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium"
        >
          + Add Node
        </button>
      </div>

      {selectedNodeId && (
        <>
          <div className="border-t pt-4">
            <p className="text-xs font-medium text-gray-700 mb-2">Node Color</p>
            <div className="grid grid-cols-4 gap-2">
              {COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => onColorChange?.(color.value)}
                  className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-400"
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          <div className="border-t pt-4">
            <button
              onClick={onDeleteNode}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
            >
              Delete Node
            </button>
          </div>
        </>
      )}

      <div className="border-t pt-4 text-xs text-gray-500">
        <p className="font-semibold text-gray-700 mb-2">단축키:</p>
        <p className="mb-1">• <kbd className="px-1 bg-gray-200 rounded text-gray-800">Enter</kbd> 형제 노드</p>
        <p className="mb-1">• <kbd className="px-1 bg-gray-200 rounded text-gray-800">Ctrl+Enter</kbd> 하위 노드</p>
        <p className="mb-1">• <kbd className="px-1 bg-gray-200 rounded text-gray-800">Shift+클릭</kbd> 다중 선택</p>
        <p className="mb-1">• <kbd className="px-1 bg-gray-200 rounded text-gray-800">빈공간 드래그</kbd> 박스 선택</p>
        <p className="mb-1">• <kbd className="px-1 bg-gray-200 rounded text-gray-800">드래그</kbd> 하위노드 함께 이동</p>
        <p className="mb-1">• <kbd className="px-1 bg-gray-200 rounded text-gray-800">Ctrl+S</kbd> 저장</p>
        <p className="mb-1">• <kbd className="px-1 bg-gray-200 rounded text-gray-800">Ctrl+Z</kbd> 실행취소</p>
        <p className="mb-1">• <kbd className="px-1 bg-gray-200 rounded text-gray-800">Delete</kbd> 삭제</p>
      </div>
    </div>
  );
}
