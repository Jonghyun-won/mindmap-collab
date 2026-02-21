import { useState, useEffect, useCallback } from "react"
import { MindMapNode, NodeShape, Marker, MarkerType } from "@/types/mindmap"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { apiClient } from "../../lib/api-client"

interface NodeDetailPanelProps {
  node: MindMapNode | null
  mindmapId: string
  onClose: () => void
  onUpdate: (nodeId: string, updates: Partial<MindMapNode>) => void
}

// Shape options
const SHAPES: { value: NodeShape; label: string }[] = [
  { value: "rectangle", label: "Rectangle" },
  { value: "circle", label: "Circle" },
  { value: "rounded", label: "Rounded" },
  { value: "diamond", label: "Diamond" },
]

// Color options
const COLORS = [
  { value: "#3b82f6", label: "Blue" },
  { value: "#ef4444", label: "Red" },
  { value: "#10b981", label: "Green" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#8b5cf6", label: "Purple" },
  { value: "#ec4899", label: "Pink" },
  { value: "#6b7280", label: "Gray" },
]

// Border color options
const BORDER_COLORS = [
  { value: "#d1d5db", label: "Gray (Default)" },
  { value: "#000000", label: "Black" },
  { value: "#ef4444", label: "Red" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#10b981", label: "Green" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#8b5cf6", label: "Purple" },
]

// Marker types and values
const MARKER_TYPES: { value: MarkerType; label: string }[] = [
  { value: "priority", label: "Priority" },
  { value: "progress", label: "Progress" },
  { value: "flag", label: "Flag" },
]

const PRIORITY_VALUES = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
]

export function NodeDetailPanel({
  node,
  mindmapId,
  onClose,
  onUpdate,
}: NodeDetailPanelProps) {
  const [note, setNote] = useState(node?.note || "")
  const [markerType, setMarkerType] = useState<MarkerType | null>(
    node?.marker?.type || null
  )
  const [markerValue, setMarkerValue] = useState<string>(
    node?.marker?.value || ""
  )
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState("")
  const [loadingComments, setLoadingComments] = useState(false)

  const loadComments = useCallback(async () => {
    if (!node || !mindmapId) return
    setLoadingComments(true)
    try {
      const result = await apiClient.getNodeComments(mindmapId, node.id)
      setComments(result.comments)
    } catch (err) {
      console.error("Failed to load comments:", err)
    } finally {
      setLoadingComments(false)
    }
  }, [node?.id, mindmapId])

  useEffect(() => {
    setNote(node?.note || "")
    setMarkerType(node?.marker?.type || null)
    setMarkerValue(node?.marker?.value || "")
  }, [node?.id])

  useEffect(() => {
    if (node && mindmapId) {
      loadComments()
    }
  }, [node?.id, mindmapId, loadComments])

  if (!node) return null

  const handleSaveNote = () => {
    onUpdate(node.id, { note })
  }

  const handleShapeChange = (shape: NodeShape) => {
    onUpdate(node.id, { shape })
  }

  const handleColorChange = (color: string) => {
    onUpdate(node.id, { color })
  }

  const handleMarkerChange = (type: MarkerType | null, value: string) => {
    const marker: Marker | null = type ? { type, value } : null
    onUpdate(node.id, { marker })
  }

  const handleAddComment = async () => {
    if (!newComment.trim() || !node || !mindmapId) return
    try {
      await apiClient.createNodeComment(mindmapId, node.id, newComment.trim())
      setNewComment("")
      loadComments()
    } catch (err) {
      console.error("Failed to add comment:", err)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!node || !mindmapId) return
    try {
      await apiClient.deleteNodeComment(mindmapId, node.id, commentId)
      loadComments()
    } catch (err) {
      console.error("Failed to delete comment:", err)
    }
  }

  return (
    <div className="w-80 border-l bg-background p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Node Details</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <Label>Label</Label>
          <p className="text-sm mt-1">{node.label}</p>
        </div>

        {/* Shape Selector */}
        <div>
          <Label>Shape</Label>
          <Select
            value={node.shape || "rectangle"}
            onValueChange={(value) => handleShapeChange(value as NodeShape)}
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Select shape" />
            </SelectTrigger>
            <SelectContent>
              {SHAPES.map((shape) => (
                <SelectItem key={shape.value} value={shape.value}>
                  {shape.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Border Color */}
        <div>
          <Label>Border Color</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {BORDER_COLORS.map((color) => (
              <button
                key={color.value}
                className="w-8 h-8 rounded border-2"
                style={{
                  backgroundColor: color.value,
                  borderColor:
                    node.borderColor === color.value ? "#000" : "transparent",
                }}
                onClick={() => onUpdate(node.id, { borderColor: color.value })}
                title={color.label}
              />
            ))}
          </div>
        </div>

        {/* Color Selector */}
        <div>
          <Label>Color</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {COLORS.map((color) => (
              <button
                key={color.value}
                className="w-8 h-8 rounded border-2"
                style={{
                  backgroundColor: color.value,
                  borderColor:
                    node.color === color.value ? "#000" : "transparent",
                }}
                onClick={() => handleColorChange(color.value)}
                title={color.label}
              />
            ))}
          </div>
        </div>

        {/* Marker Picker */}
        <div>
          <Label>Marker</Label>
          <div className="space-y-2 mt-2">
            <Select
              value={markerType || "none"}
              onValueChange={(value) => {
                const newType = value === "none" ? null : (value as MarkerType)
                setMarkerType(newType)
                if (!newType) {
                  handleMarkerChange(null, "")
                  setMarkerValue("")
                } else {
                  // Set default values
                  const defaultValue =
                    newType === "priority"
                      ? "medium"
                      : newType === "progress"
                      ? "0"
                      : "true"
                  setMarkerValue(defaultValue)
                  handleMarkerChange(newType, defaultValue)
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="No marker" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No marker</SelectItem>
                {MARKER_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {markerType === "priority" && (
              <Select
                value={markerValue}
                onValueChange={(value) => {
                  setMarkerValue(value)
                  handleMarkerChange("priority", value)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_VALUES.map((priority) => (
                    <SelectItem key={priority.value} value={priority.value}>
                      <Badge
                        variant={
                          priority.value === "high"
                            ? "destructive"
                            : priority.value === "medium"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {priority.label}
                      </Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {markerType === "progress" && (
              <div className="space-y-1">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={markerValue}
                  onChange={(e) => {
                    setMarkerValue(e.target.value)
                    handleMarkerChange("progress", e.target.value)
                  }}
                  className="w-full"
                />
                <p className="text-sm text-muted-foreground">
                  {markerValue}%
                </p>
              </div>
            )}

            {markerType === "flag" && (
              <Badge variant="default">Flagged</Badge>
            )}
          </div>
        </div>

        {/* Note */}
        <div>
          <Label>Note</Label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add notes..."
            className="mt-2"
            rows={5}
          />
          <Button
            onClick={handleSaveNote}
            disabled={note === node.note}
            size="sm"
            className="mt-2"
          >
            Save Note
          </Button>
        </div>

        {/* Comments Section */}
        {mindmapId && (
          <div className="border-t pt-3">
            <h4 className="text-sm font-medium text-gray-700 mb-2">댓글</h4>

            {loadingComments ? (
              <p className="text-xs text-gray-400">로딩 중...</p>
            ) : comments.length > 0 ? (
              <div className="space-y-2 max-h-[200px] overflow-y-auto mb-2">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="bg-gray-50 rounded-lg p-2 text-sm"
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-gray-800 text-xs">
                        {comment.user_name ||
                          comment.user_email ||
                          "알 수 없음"}
                      </span>
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-gray-400 hover:text-red-500 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="text-gray-600 text-xs mt-1">
                      {comment.content}
                    </p>
                    <p className="text-gray-400 text-[10px] mt-1">
                      {new Date(comment.created_at).toLocaleString("ko-KR")}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 mb-2">댓글이 없습니다</p>
            )}

            <div className="flex gap-1">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                placeholder="댓글 입력..."
                className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                전송
              </button>
            </div>
          </div>
        )}

        {/* Media Section */}
        <div className="border-t pt-3">
          <h4 className="text-sm font-medium text-gray-700 mb-2">미디어</h4>

          {node.media ? (
            <div className="space-y-2">
              {node.media.type === "image" && (
                <img
                  src={node.media.url}
                  alt=""
                  className="w-full rounded-lg object-contain max-h-[150px]"
                />
              )}
              <button
                onClick={() => onUpdate(node.id, { media: null })}
                className="w-full px-2 py-1.5 text-xs text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
              >
                미디어 제거
              </button>
            </div>
          ) : (
            <div>
              <label className="block w-full px-3 py-2 text-xs text-center text-gray-600 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:text-blue-600">
                이미지 업로드
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = () => {
                      const dataUrl = reader.result as string
                      const isVideo = file.type.startsWith("video/")
                      if (isVideo) {
                        onUpdate(node.id, {
                          media: {
                            type: "video",
                            url: dataUrl,
                            width: 280,
                            height: 200,
                          },
                        })
                      } else {
                        const img = new Image()
                        img.onload = () => {
                          const maxWidth = 280
                          const scale =
                            img.width > maxWidth ? maxWidth / img.width : 1
                          onUpdate(node.id, {
                            media: {
                              type: "image",
                              url: dataUrl,
                              width: img.width * scale,
                              height: img.height * scale,
                            },
                          })
                        }
                        img.src = dataUrl
                      }
                    }
                    reader.readAsDataURL(file)
                  }}
                />
              </label>
              <p className="text-[10px] text-gray-400 mt-1 text-center">
                또는 노드 선택 후 Ctrl+V로 붙여넣기
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
