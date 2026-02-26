import { Plus, Save, Trash2, Palette, Info, Users, ArrowLeft, Share2, Clock, Download, LayoutGrid, ArrowDown, GitBranch } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

interface EditorToolbarProps {
  mindMapTitle?: string
  onTitleSave?: (newTitle: string) => void
  onAddNode: () => void
  selectedNodeId?: string
  onColorChange?: (color: string) => void
  onDeleteNode?: () => void
  onSave: () => void
  isSaving: boolean
  lastSaved: Date | null
  activeUsers?: number // 실시간 협업 인원 (추후 구현)
  onShareClick?: () => void
  onShowHistory?: () => void
  onShowExport?: () => void
  onAutoLayout?: (direction: 'TB' | 'RL' | 'BI') => void
  readOnly?: boolean
}

const COLORS = [
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#10b981' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Slate', value: '#64748b' },
]

export default function EditorToolbar({
  mindMapTitle = 'Untitled',
  onTitleSave,
  onAddNode,
  selectedNodeId,
  onColorChange,
  onDeleteNode,
  onSave,
  isSaving,
  lastSaved,
  activeUsers = 1, // 기본값: 1명 (본인)
  onShareClick,
  onShowHistory,
  onShowExport,
  onAutoLayout,
  readOnly = false,
}: EditorToolbarProps) {
  const navigate = useNavigate()
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showLayoutMenu, setShowLayoutMenu] = useState(false)
  const layoutMenuRef = useRef<HTMLDivElement>(null)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState(mindMapTitle)

  const handleTitleSave = () => {
    if (editedTitle.trim() && onTitleSave) {
      onTitleSave(editedTitle.trim())
    }
    setIsEditingTitle(false)
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave()
    } else if (e.key === 'Escape') {
      setEditedTitle(mindMapTitle)
      setIsEditingTitle(false)
    }
  }

  // Close layout menu when clicking outside
  useEffect(() => {
    if (!showLayoutMenu) return
    const handleClickOutside = (e: MouseEvent) => {
      if (layoutMenuRef.current && !layoutMenuRef.current.contains(e.target as HTMLElement)) {
        setShowLayoutMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showLayoutMenu])

  return (
    <>
      {/* Left: Back button and Title */}
      <div className="absolute top-3 left-4 z-10 flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors bg-white/95 backdrop-blur-sm shadow-sm border border-gray-200"
          title="대시보드로"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>

        {isEditingTitle ? (
          <input
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={handleTitleKeyDown}
            autoFocus
            className="px-3 py-2 text-lg font-semibold border-2 border-blue-500 rounded-lg focus:outline-none bg-white shadow-sm min-w-[200px]"
          />
        ) : (
          <button
            onClick={() => {
              setEditedTitle(mindMapTitle)
              setIsEditingTitle(true)
            }}
            className="px-3 py-2 text-lg font-semibold text-gray-800 hover:text-blue-600 transition-colors bg-white/95 backdrop-blur-sm shadow-sm border border-gray-200 rounded-lg hover:border-blue-400"
          >
            {mindMapTitle}
          </button>
        )}
      </div>

      {/* Center: Minimal top toolbar */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 px-4 py-2">
        {/* Read-only badge */}
        {readOnly && (
          <div className="px-2 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-md border border-amber-200">
            읽기 전용
          </div>
        )}

        {/* Add node */}
        {!readOnly && (
          <button
            onClick={onAddNode}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors group"
            title="노드 추가 (Enter: 형제 | Ctrl+Enter: 자식)"
          >
            <Plus className="w-5 h-5 text-gray-700" />
          </button>
        )}

        {!readOnly && <div className="w-px h-6 bg-gray-200" />}

        {/* Color picker */}
        {!readOnly && (
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              disabled={!selectedNodeId}
              className={`p-2 rounded-md transition-colors ${
                selectedNodeId
                  ? 'hover:bg-gray-100 text-gray-700'
                  : 'text-gray-300 cursor-not-allowed'
              }`}
              title="Change color"
            >
              <Palette className="w-5 h-5" />
            </button>

            {/* Color palette popup */}
            {showColorPicker && selectedNodeId && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setShowColorPicker(false)}
                />
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-30 bg-white rounded-lg shadow-xl border border-gray-200 p-3">
                  <div className="grid grid-cols-4 gap-2">
                    {COLORS.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => {
                          onColorChange?.(color.value)
                          setShowColorPicker(false)
                        }}
                        className="w-10 h-10 rounded-lg border-2 border-gray-200 hover:border-gray-400 hover:scale-110 transition-all"
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Delete */}
        {!readOnly && (
          <button
            onClick={onDeleteNode}
            disabled={!selectedNodeId}
            className={`p-2 rounded-md transition-colors ${
              selectedNodeId
                ? 'hover:bg-red-50 text-red-600'
                : 'text-gray-300 cursor-not-allowed'
            }`}
            title="Delete node (Delete)"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}

        <div className="w-px h-6 bg-gray-200" />

        {/* Share button */}
        {onShareClick && (
          <button
            onClick={onShareClick}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors text-gray-700"
            title="Share mindmap"
          >
            <Share2 className="w-5 h-5" />
          </button>
        )}

        {/* History button */}
        {onShowHistory && (
          <button
            onClick={onShowHistory}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
            title="변경 히스토리"
          >
            <Clock className="w-5 h-5" />
          </button>
        )}

        {/* Export button */}
        {onShowExport && (
          <button
            onClick={onShowExport}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
            title="내보내기"
          >
            <Download className="w-5 h-5" />
          </button>
        )}

        {/* Auto Layout button */}
        {!readOnly && (
          <>
            <div className="w-px h-6 bg-gray-200" />
            <div className="relative" ref={layoutMenuRef}>
              <button
                onClick={() => setShowLayoutMenu(!showLayoutMenu)}
                className="p-2 rounded-md hover:bg-gray-100 transition-colors text-gray-700"
                title="정렬 (Layout)"
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              {showLayoutMenu && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[180px] z-50">
                  <button
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                    onClick={() => {
                      onAutoLayout?.('TB')
                      setShowLayoutMenu(false)
                    }}
                  >
                    <ArrowDown className="w-4 h-4" />
                    트리 (하향)
                  </button>
                  <button
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                    onClick={() => {
                      onAutoLayout?.('RL')
                      setShowLayoutMenu(false)
                    }}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    트리 (우→좌)
                  </button>
                  <button
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                    onClick={() => {
                      onAutoLayout?.('BI')
                      setShowLayoutMenu(false)
                    }}
                  >
                    <GitBranch className="w-4 h-4" />
                    양쪽 방사형
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Save button */}
        {!readOnly && (
          <button
            onClick={onSave}
            disabled={isSaving}
            className={`px-3 py-2 rounded-md transition-colors flex items-center gap-2 ${
              isSaving
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
            title="Save mindmap (Ctrl+S)"
          >
            <Save className="w-4 h-4" />
            <span className="text-sm font-medium">
              {isSaving ? 'Saving...' : 'Save'}
            </span>
          </button>
        )}

        {/* Help button */}
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors text-gray-700"
          title="Keyboard shortcuts"
        >
          <Info className="w-5 h-5" />
        </button>
      </div>

      {/* Collaboration indicator - Upper right */}
      <div className="absolute top-3 right-4 z-10 flex items-center gap-2">
        {/* Active users indicator */}
        <div className="flex items-center gap-2 bg-white/95 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200 px-3 py-1.5">
          <Users className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-medium text-gray-700">
            {activeUsers === 1 ? '나' : `${activeUsers}명`} 수정중
          </span>
        </div>

        {/* Last saved time */}
        {lastSaved && !isSaving && (
          <div className="text-xs text-gray-500 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm border border-gray-200">
            <span className="text-gray-400">최근 저장:</span>{' '}
            {lastSaved.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>

      {/* Help popup */}
      {showHelp && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setShowHelp(false)}
          />
          <div className="absolute top-16 right-4 z-30 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-64">
            <div className="font-semibold text-gray-800 mb-3 text-sm">⌨️ 단축키</div>
            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex justify-between items-center gap-4">
                <kbd className="kbd">Enter</kbd>
                <span>수평 노드 (형제)</span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <kbd className="kbd">Ctrl+Enter</kbd>
                <span>하위 노드 (자식)</span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <kbd className="kbd">Tab</kbd>
                <span>하위 노드 (자식)</span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <kbd className="kbd">Space</kbd>
                <span>빠른 하위 추가</span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <kbd className="kbd">F3</kbd>
                <span>노드 편집</span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <kbd className="kbd">Delete</kbd>
                <span>노드 삭제</span>
              </div>
              <div className="border-t border-gray-200 my-2"></div>
              <div className="flex justify-between items-center gap-4">
                <kbd className="kbd">↑ ↓</kbd>
                <span>부모/자식 이동</span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <kbd className="kbd">← →</kbd>
                <span>형제 간 이동</span>
              </div>
              <div className="border-t border-gray-200 my-2"></div>
              <div className="flex justify-between items-center gap-4">
                <kbd className="kbd">Ctrl+S</kbd>
                <span>저장</span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <kbd className="kbd">Ctrl+Z</kbd>
                <span>실행 취소</span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <kbd className="kbd">Ctrl+C/V</kbd>
                <span>복사/붙여넣기</span>
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        .kbd {
          display: inline-block;
          padding: 2px 6px;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-family: monospace;
          font-size: 11px;
          font-weight: 600;
          color: #374151;
        }
      `}</style>
    </>
  )
}
