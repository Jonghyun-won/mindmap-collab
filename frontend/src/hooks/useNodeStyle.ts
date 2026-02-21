import { useState } from "react"
import { MindMapNode } from "@/types/mindmap"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

interface UpdateNodeStyleParams {
  icon?: string | null
  shape?: "rectangle" | "circle" | "rounded" | "diamond"
  collapsed?: boolean
  text_format?: {
    bold?: boolean
    italic?: boolean
    underline?: boolean
    link?: string | null
  }
  marker?: {
    type: "priority" | "progress" | "flag"
    value: string
  } | null
  note?: string | null
}

export function useNodeStyle(mindmapId: string) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateNodeStyle = async (
    nodeId: string,
    updates: UpdateNodeStyleParams
  ): Promise<MindMapNode | null> => {
    setIsUpdating(true)
    setError(null)

    try {
      const token = localStorage.getItem("access_token")
      const response = await fetch(
        `${API_BASE_URL}/mindmaps/${mindmapId}/nodes/${nodeId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updates),
        }
      )

      if (!response.ok) {
        throw new Error(`Update failed: ${response.statusText}`)
      }

      const data = await response.json()
      return data.node
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed")
      return null
    } finally {
      setIsUpdating(false)
    }
  }

  return { updateNodeStyle, isUpdating, error }
}
