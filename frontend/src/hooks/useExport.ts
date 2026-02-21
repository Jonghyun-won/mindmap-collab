import { useState } from "react"
import { MindMapExportData } from "@/types/mindmap"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export function useExport(mindmapId: string) {
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const exportJSON = async (): Promise<MindMapExportData | null> => {
    setIsExporting(true)
    setError(null)

    try {
      const token = localStorage.getItem("access_token")
      const response = await fetch(
        `${API_BASE_URL}/mindmaps/${mindmapId}/export?format=json`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed")
      return null
    } finally {
      setIsExporting(false)
    }
  }

  return { exportJSON, isExporting, error }
}
