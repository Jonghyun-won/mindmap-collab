import { useState } from "react"
import { MindMapNode, AutoLayoutRequest } from "@/types/mindmap"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export function useAutoLayout(mindmapId: string) {
  const [isApplying, setIsApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const applyLayout = async (
    request: AutoLayoutRequest
  ): Promise<MindMapNode[] | null> => {
    setIsApplying(true)
    setError(null)

    try {
      const token = localStorage.getItem("access_token")
      const response = await fetch(
        `${API_BASE_URL}/mindmaps/${mindmapId}/auto-layout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(request),
        }
      )

      if (!response.ok) {
        throw new Error(`Auto layout failed: ${response.statusText}`)
      }

      const data = await response.json()
      return data.nodes
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auto layout failed")
      return null
    } finally {
      setIsApplying(false)
    }
  }

  return { applyLayout, isApplying, error }
}
