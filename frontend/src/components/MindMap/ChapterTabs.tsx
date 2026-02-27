import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, Edit2, Trash2, GripVertical, Copy } from 'lucide-react'
import type { Chapter } from '@/types/mindmap'

interface ChapterTabsProps {
  chapters: Chapter[]
  activeChapterId: string
  onChapterChange: (chapterId: string) => void
  onAddChapter: () => void
  onRenameChapter: (chapterId: string, newTitle: string) => void
  onDeleteChapter: (chapterId: string) => void
  onReorderChapters: (chapterIds: string[]) => void
  onDuplicateChapter?: (chapterId: string) => void
  readOnly?: boolean
}

export default function ChapterTabs({
  chapters,
  activeChapterId,
  onChapterChange,
  onAddChapter,
  onRenameChapter,
  onDeleteChapter,
  onReorderChapters,
  onDuplicateChapter,
  readOnly = false,
}: ChapterTabsProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [contextMenu, setContextMenu] = useState<{
    chapterId: string
    x: number
    y: number
  } | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [dragSourceId, setDragSourceId] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const tabsContainerRef = useRef<HTMLDivElement>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  // Focus input when editing begins
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingId])

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [contextMenu])

  // Close context menu on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null)
      }
    }
    if (contextMenu) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [contextMenu])

  // Start inline editing
  const startEditing = useCallback((chapterId: string, currentTitle: string) => {
    if (readOnly) return
    setEditingId(chapterId)
    setEditingTitle(currentTitle)
    setContextMenu(null)
  }, [readOnly])

  // Commit rename
  const commitRename = useCallback(() => {
    if (editingId && editingTitle.trim()) {
      onRenameChapter(editingId, editingTitle.trim())
    }
    setEditingId(null)
    setEditingTitle('')
  }, [editingId, editingTitle, onRenameChapter])

  // Cancel rename
  const cancelRename = useCallback(() => {
    setEditingId(null)
    setEditingTitle('')
  }, [])

  // Handle input key events
  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitRename()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelRename()
    }
    // Stop propagation to prevent MindMapCanvas keyboard shortcuts
    e.stopPropagation()
  }, [commitRename, cancelRename])

  // Handle double click on tab
  const handleDoubleClick = useCallback((chapterId: string, currentTitle: string) => {
    startEditing(chapterId, currentTitle)
  }, [startEditing])

  // Handle right click (context menu)
  const handleContextMenu = useCallback((e: React.MouseEvent, chapterId: string) => {
    if (readOnly) return
    e.preventDefault()
    setContextMenu({
      chapterId,
      x: e.clientX,
      y: e.clientY,
    })
  }, [readOnly])

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, chapterId: string) => {
    if (readOnly) return
    e.dataTransfer.setData('text/plain', chapterId)
    e.dataTransfer.effectAllowed = 'move'
    setDragSourceId(chapterId)
  }, [readOnly])

  const handleDragOver = useCallback((e: React.DragEvent, chapterId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverId(chapterId)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverId(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    const sourceId = e.dataTransfer.getData('text/plain')
    setDragOverId(null)
    setDragSourceId(null)

    if (sourceId === targetId) return

    const currentOrder = chapters.map(c => c.id)
    const sourceIndex = currentOrder.indexOf(sourceId)
    const targetIndex = currentOrder.indexOf(targetId)

    if (sourceIndex === -1 || targetIndex === -1) return

    // Remove source from current position and insert at target position
    const newOrder = [...currentOrder]
    newOrder.splice(sourceIndex, 1)
    newOrder.splice(targetIndex, 0, sourceId)

    onReorderChapters(newOrder)
  }, [chapters, onReorderChapters])

  const handleDragEnd = useCallback(() => {
    setDragOverId(null)
    setDragSourceId(null)
  }, [])

  // Sort chapters by position
  const sortedChapters = [...chapters].sort((a, b) => a.position - b.position)

  return (
    <div className="h-[48px] bg-gray-100 border-t border-gray-300 flex items-stretch select-none">
      {/* Scrollable tabs container */}
      <div
        ref={tabsContainerRef}
        className="flex-1 flex items-stretch overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {sortedChapters.map((chapter) => {
          const isActive = chapter.id === activeChapterId
          const isEditing = chapter.id === editingId
          const isDragOver = chapter.id === dragOverId
          const isDragSource = chapter.id === dragSourceId

          return (
            <div
              key={chapter.id}
              draggable={!readOnly && !isEditing}
              onDragStart={(e) => handleDragStart(e, chapter.id)}
              onDragOver={(e) => handleDragOver(e, chapter.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, chapter.id)}
              onDragEnd={handleDragEnd}
              onClick={() => {
                if (!isEditing) onChapterChange(chapter.id)
              }}
              onDoubleClick={() => handleDoubleClick(chapter.id, chapter.title)}
              onContextMenu={(e) => handleContextMenu(e, chapter.id)}
              className={[
                'flex items-center gap-1 px-4 py-2 min-w-[120px] max-w-[200px] cursor-pointer border-r border-gray-300 transition-colors',
                isActive
                  ? 'bg-white border-t-2 border-t-blue-500 -mt-px font-medium text-gray-900'
                  : 'bg-gray-200 hover:bg-gray-150 text-gray-600 hover:text-gray-800',
                isDragOver && !isDragSource ? 'border-l-2 border-l-blue-500' : '',
                isDragSource ? 'opacity-50' : '',
              ].join(' ')}
            >
              {/* Drag handle */}
              {!readOnly && !isEditing && (
                <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0 cursor-grab active:cursor-grabbing" />
              )}

              {/* Tab content */}
              {isEditing ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  onBlur={commitRename}
                  className="w-full bg-white border border-blue-400 rounded px-1 py-0.5 text-sm outline-none"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="text-base truncate">
                  {chapter.title}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Add chapter button */}
      {!readOnly && (
        <button
          onClick={onAddChapter}
          className="flex items-center justify-center w-[48px] border-l border-gray-300 bg-gray-100 hover:bg-gray-200 transition-colors"
          title="챕터 추가"
        >
          <Plus className="w-5 h-5 text-gray-500" />
        </button>
      )}

      {/* Custom context menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            // Adjust position if overflowing viewport
            transform: `translateY(${
              contextMenu.y + 100 > window.innerHeight ? '-100%' : '0'
            })`,
          }}
        >
          <button
            onClick={() => {
              const chapter = chapters.find(c => c.id === contextMenu.chapterId)
              if (chapter) startEditing(chapter.id, chapter.title)
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            이름 변경
          </button>
          {onDuplicateChapter && (
            <button
              onClick={() => {
                onDuplicateChapter(contextMenu.chapterId)
                setContextMenu(null)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Copy className="w-4 h-4" />
              복제
            </button>
          )}
          <div className="h-px bg-gray-200 my-1" />
          <button
            onClick={() => {
              onDeleteChapter(contextMenu.chapterId)
              setContextMenu(null)
            }}
            disabled={chapters.length <= 1}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            삭제
          </button>
        </div>
      )}
    </div>
  )
}
