import { useState } from "react"
import { ImportRequest } from "@/types/mindmap"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export function useImport(mindmapId: string) {
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const importJSON = async (data: ImportRequest): Promise<boolean> => {
    setIsImporting(true)
    setError(null)

    try {
      const token = localStorage.getItem("access_token")
      const response = await fetch(
        `${API_BASE_URL}/mindmaps/${mindmapId}/import`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        }
      )

      if (!response.ok) {
        throw new Error(`Import failed: ${response.statusText}`)
      }

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed")
      return false
    } finally {
      setIsImporting(false)
    }
  }

  return { importJSON, isImporting, error }
}
