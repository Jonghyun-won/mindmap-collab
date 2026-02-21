import { useState, useEffect } from 'react'
import { apiClient } from '../../lib/api-client'
import { Clock, User, X } from 'lucide-react'

interface ChangeHistoryProps {
  mindmapId: string
  isOpen: boolean
  onClose: () => void
}

const ACTION_LABELS: Record<string, string> = {
  node_added: '노드 추가',
  node_deleted: '노드 삭제',
  node_edited: '노드 편집',
  node_moved: '노드 이동',
  edge_added: '연결선 추가',
  edge_deleted: '연결선 삭제',
  style_changed: '스타일 변경',
}

export function ChangeHistory({ mindmapId, isOpen, onClose }: ChangeHistoryProps) {
  const [changes, setChanges] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    if (isOpen && mindmapId) {
      loadHistory()
    }
  }, [isOpen, mindmapId, page])

  const loadHistory = async () => {
    setLoading(true)
    try {
      const result = await apiClient.getChangeHistory(mindmapId, page, 30)
      setChanges(result.changes)
      setTotal(result.total)
    } catch (err) {
      console.error('Failed to load history:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return '방금 전'
    if (minutes < 60) return `${minutes}분 전`
    if (hours < 24) return `${hours}시간 전`
    if (days < 7) return `${days}일 전`
    return date.toLocaleDateString('ko-KR')
  }

  if (!isOpen) return null

  return (
    <div className="absolute right-0 top-0 h-full w-80 bg-white border-l border-gray-200 shadow-lg z-40 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">변경 히스토리</h3>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-center py-8 text-gray-500">로딩 중...</div>
        ) : changes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">변경 기록이 없습니다</div>
        ) : (
          <div className="space-y-3">
            {changes.map((change) => (
              <div key={change.id} className="flex gap-3 p-3 rounded-lg hover:bg-gray-50">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{change.user_name || '알 수 없음'}</span>
                    {' '}
                    <span className="text-gray-600">
                      {ACTION_LABELS[change.action] || change.action}
                    </span>
                  </p>
                  {change.details?.label && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      "{change.details.label}"
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">{formatTime(change.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {total > 30 && (
        <div className="p-3 border-t border-gray-200 flex justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50"
          >
            이전
          </button>
          <span className="text-sm text-gray-500">
            {page} / {Math.ceil(total / 30)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(total / 30)}
            className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50"
          >
            다음
          </button>
        </div>
      )}
    </div>
  )
}
