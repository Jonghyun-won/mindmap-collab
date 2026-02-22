import { memo, useState, useEffect, useRef } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { ChevronsDown } from 'lucide-react'

interface CustomNodeData {
  label: string
  color?: string
  level?: number
  parentId?: string
  borderColor?: string
  collapsed?: boolean
  media?: {
    type: 'image' | 'video'
    url: string
    width?: number
    height?: number
  } | null
  readOnly?: boolean
}

function CustomNode({ data, id, selected, sourcePosition, targetPosition }: NodeProps<CustomNodeData>) {
  const [isEditing, setIsEditing] = useState(false)
  const [label, setLabel] = useState(data.label)
  const debounceTimerRef = useRef<number | undefined>(undefined)

  // Update label when data changes
  useEffect(() => {
    setLabel(data.label)
  }, [data.label])

  // Text input debounce (300ms)
  useEffect(() => {
    if (!isEditing) return

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = window.setTimeout(() => {
      if (label.trim() && label !== data.label) {
        const event = new CustomEvent('nodeUpdate', {
          detail: { id, label: label.trim() },
        })
        window.dispatchEvent(event)
      }
    }, 300)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [label, isEditing, id, data.label])

  const handleDoubleClick = () => {
    if (data.readOnly) return
    setIsEditing(true)
  }

  const handleBlur = () => {
    setIsEditing(false)
    if (label.trim()) {
      const event = new CustomEvent('nodeUpdate', {
        detail: { id, label: label.trim() },
      })
      window.dispatchEvent(event)
    } else {
      setLabel(data.label)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const isCtrl = e.ctrlKey || e.metaKey

    // Ctrl+Enter: create child node
    if (e.key === 'Enter' && isCtrl) {
      e.preventDefault()
      e.stopPropagation()
      handleBlur()
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('addChildNode', { detail: { parentId: id } }))
      }, 50)
      return
    }

    // Enter (without Shift): finish editing
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      e.stopPropagation()
      handleBlur()
      return
    }

    // Shift+Enter: allow default behavior (newline in textarea)

    if (e.key === 'Escape') {
      setLabel(data.label)
      setIsEditing(false)
    }
  }

  const level = data.level || 0

  // XMind-style sizing - bigger and bolder
  const getFontSize = () => {
    if (level === 0) return 'text-3xl font-bold'
    if (level === 1) return 'text-xl font-semibold'
    if (level === 2) return 'text-lg font-medium'
    return 'text-base font-medium'
  }

  const getPadding = () => {
    if (level === 0) return 'px-12 py-6'
    if (level === 1) return 'px-8 py-4'
    if (level === 2) return 'px-6 py-3'
    return 'px-4 py-2'
  }

  const getMinSize = () => {
    if (level === 0) return 'min-w-[200px] min-h-[80px]'
    if (level === 1) return 'min-w-[160px] min-h-[60px]'
    if (level === 2) return 'min-w-[120px] min-h-[50px]'
    return 'min-w-[100px] min-h-[40px]'
  }

  const getBorderRadius = () => {
    if (level === 0) return 'rounded-2xl'
    if (level === 1) return 'rounded-xl'
    return 'rounded-lg'
  }

  // Determine if color is light or dark for text color
  const isLightColor = (color: string) => {
    const hex = color.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    return brightness > 155
  }

  const bgColor = data.color || '#6366f1'
  const textColor = isLightColor(bgColor) ? '#1f2937' : '#ffffff'

  return (
    <div className="relative group">
      <div
        data-id={id}
        className={`
          ${getPadding()} ${getBorderRadius()} ${getFontSize()} ${getMinSize()}
          max-w-[400px]
          shadow-2xl
          transition-all duration-200
          ${selected
            ? 'border-4 border-red-500 shadow-xl scale-105'
            : 'hover:shadow-lg hover:scale-102'
          }
        `}
        style={{
          backgroundColor: bgColor,
          color: textColor,
          opacity: 1,
          borderWidth: selected ? undefined : '2px',
          borderStyle: selected ? undefined : 'solid',
          borderColor: selected ? undefined : (data.borderColor || '#d1d5db'),
        }}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {/* Handles - positioned based on layout direction */}
        <Handle
          type="target"
          position={targetPosition || Position.Top}
          className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{
            background: bgColor,
            border: '2px solid white',
          }}
        />

        {isEditing && !data.readOnly ? (
          <textarea
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            rows={1}
            autoFocus
            className="bg-transparent border-none outline-none w-full text-center resize-none"
            style={{ color: textColor }}
            placeholder="Enter text..."
          />
        ) : (
          <div className="text-center whitespace-pre-wrap">
            {data.label}
          </div>
        )}

        {/* Media content */}
        {data.media && (
          <div className="mt-2 flex justify-center">
            {data.media.type === 'image' ? (
              <img
                src={data.media.url}
                alt=""
                className="rounded-lg object-contain"
                style={{
                  maxWidth: data.media.width || 280,
                  maxHeight: data.media.height || 200,
                }}
                draggable={false}
              />
            ) : data.media.type === 'video' ? (
              <video
                src={data.media.url}
                controls
                className="rounded-lg"
                style={{
                  maxWidth: data.media.width || 280,
                  maxHeight: data.media.height || 200,
                }}
              />
            ) : null}
          </div>
        )}

        <Handle
          type="source"
          position={sourcePosition || Position.Bottom}
          className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{
            background: bgColor,
            border: '2px solid white',
          }}
        />
      </div>

      {/* Collapsed children indicator */}
      {data.collapsed && (
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-2 py-0.5 bg-gray-100 border border-gray-300 rounded-full text-[10px] text-gray-500 shadow-sm">
          <ChevronsDown className="w-3 h-3" />
        </div>
      )}
    </div>
  )
}

export default memo(CustomNode)
