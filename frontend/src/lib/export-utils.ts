import { MindMapNode, MindMapEdge, MindMapSettings, MindMapExportData } from "@/types/mindmap"

/**
 * Export mindmap to JSON
 */
export function exportToJSON(
  nodes: MindMapNode[],
  edges: MindMapEdge[],
  settings: MindMapSettings
): MindMapExportData {
  return {
    nodes,
    edges,
    settings,
    version: "1.0",
    exported_at: new Date().toISOString(),
  }
}

/**
 * Download JSON file
 */
export function downloadJSON(data: MindMapExportData, filename: string) {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: "application/json" })
  const url = URL.createObjectURL(blob)

  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Upload JSON file (File input)
 */
export async function uploadJSON(file: File): Promise<MindMapExportData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string)

        // Validation
        if (!json.nodes || !Array.isArray(json.nodes)) {
          throw new Error("Invalid JSON: missing nodes array")
        }
        if (!json.edges || !Array.isArray(json.edges)) {
          throw new Error("Invalid JSON: missing edges array")
        }

        resolve(json as MindMapExportData)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsText(file)
  })
}

/**
 * Validate nodes
 */
export function validateNodes(nodes: MindMapNode[]): boolean {
  const requiredFields = ["id", "label", "position", "level"]

  for (const node of nodes) {
    for (const field of requiredFields) {
      if (!(field in node)) {
        throw new Error(`Node missing required field: ${field}`)
      }
    }

    if (!node.position?.x || !node.position?.y) {
      throw new Error("Node position must have x and y")
    }
  }

  return true
}
