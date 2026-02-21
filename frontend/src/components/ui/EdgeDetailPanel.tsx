import { Edge } from 'reactflow'

interface EdgeDetailPanelProps {
  edge: Edge
  onToggleArrow: (edgeId: string) => void
  onUpdateStyle: (edgeId: string, updates: Partial<Edge>) => void
  onClose: () => void
}

export function EdgeDetailPanel({ edge, onToggleArrow, onUpdateStyle, onClose }: EdgeDetailPanelProps) {
  const hasArrow = edge.markerEnd && typeof edge.markerEnd === 'object' && (edge.markerEnd as any).type

  return (
    <div className="absolute right-4 top-20 w-64 bg-white rounded-xl shadow-lg border border-gray-200 p-4 z-50">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-900">연결선 설정</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          ✕
        </button>
      </div>

      {/* Arrow toggle */}
      <div className="mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!hasArrow}
            onChange={() => onToggleArrow(edge.id)}
            className="w-4 h-4 rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">화살표 표시</span>
        </label>
      </div>

      {/* Edge type */}
      <div>
        <label className="block text-sm text-gray-600 mb-1">연결선 스타일</label>
        <select
          value={edge.type || 'smoothstep'}
          onChange={(e) => onUpdateStyle(edge.id, { type: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="smoothstep">부드러운 직각</option>
          <option value="straight">직선</option>
          <option value="bezier">곡선</option>
          <option value="step">직각</option>
        </select>
      </div>
    </div>
  )
}
