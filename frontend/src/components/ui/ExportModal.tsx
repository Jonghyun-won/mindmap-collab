import { useState } from "react"
import { useReactFlow } from "reactflow"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useExport } from "@/hooks/useExport"
import { useImport } from "@/hooks/useImport"
import { downloadJSON, uploadJSON } from "@/lib/export-utils"
import { exportToPNG, exportToJPG, exportToSVG, exportToPDF } from "@/lib/image-export"
import { Upload, Image, FileImage, FileText, Database, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/useToast"

interface ExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mindmapId: string
  mindmapTitle: string
}

type ExportingType = "png" | "jpg" | "svg" | "pdf" | null

export function ExportModal({
  open,
  onOpenChange,
  mindmapId,
  mindmapTitle,
}: ExportModalProps) {
  const { getNodes } = useReactFlow()
  const { exportJSON, isExporting } = useExport(mindmapId)
  const { importJSON, isImporting } = useImport(mindmapId)
  const { success, error } = useToast()
  const [importMode, setImportMode] = useState<"replace" | "merge">("replace")
  const [exportingType, setExportingType] = useState<ExportingType>(null)

  const handleExport = async () => {
    const data = await exportJSON()
    if (data) {
      downloadJSON(data, `${mindmapTitle}.json`)
      success("Exported successfully")
      onOpenChange(false)
    } else {
      error("Export failed")
    }
  }

  const handleExportPNG = async () => {
    setExportingType("png")
    try {
      await exportToPNG(getNodes(), `${mindmapTitle}.png`)
      success("PNG exported successfully")
      onOpenChange(false)
    } catch (err) {
      error(err instanceof Error ? err.message : "PNG export failed")
    } finally {
      setExportingType(null)
    }
  }

  const handleExportJPG = async () => {
    setExportingType("jpg")
    try {
      await exportToJPG(getNodes(), `${mindmapTitle}.jpg`)
      success("JPG exported successfully")
      onOpenChange(false)
    } catch (err) {
      error(err instanceof Error ? err.message : "JPG export failed")
    } finally {
      setExportingType(null)
    }
  }

  const handleExportSVG = async () => {
    setExportingType("svg")
    try {
      await exportToSVG(getNodes(), `${mindmapTitle}.svg`)
      success("SVG exported successfully")
      onOpenChange(false)
    } catch (err) {
      error(err instanceof Error ? err.message : "SVG export failed")
    } finally {
      setExportingType(null)
    }
  }

  const handleExportPDF = async () => {
    setExportingType("pdf")
    try {
      await exportToPDF(getNodes(), `${mindmapTitle}.pdf`, mindmapTitle)
      success("PDF exported successfully")
      onOpenChange(false)
    } catch (err) {
      error(err instanceof Error ? err.message : "PDF export failed")
    } finally {
      setExportingType(null)
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const data = await uploadJSON(file)
      const result = await importJSON({
        nodes: data.nodes,
        edges: data.edges,
        settings: data.settings,
        mode: importMode,
      })

      if (result) {
        success("Imported successfully")
        onOpenChange(false)
        window.location.reload()
      } else {
        error("Import failed")
      }
    } catch (err) {
      error(err instanceof Error ? err.message : "Invalid JSON")
    }
  }

  const isAnyExporting = exportingType !== null || isExporting

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export / Import</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Label className="text-sm text-muted-foreground">Export mindmap</Label>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-auto flex-col gap-1.5 py-3"
              onClick={handleExportPNG}
              disabled={isAnyExporting}
            >
              {exportingType === "png" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Image className="h-5 w-5" />
              )}
              <span className="text-sm font-medium">PNG</span>
              <span className="text-[11px] text-muted-foreground leading-tight">
                High-res image
              </span>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col gap-1.5 py-3"
              onClick={handleExportJPG}
              disabled={isAnyExporting}
            >
              {exportingType === "jpg" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <FileImage className="h-5 w-5" />
              )}
              <span className="text-sm font-medium">JPG</span>
              <span className="text-[11px] text-muted-foreground leading-tight">
                Compressed
              </span>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col gap-1.5 py-3"
              onClick={handleExportSVG}
              disabled={isAnyExporting}
            >
              {exportingType === "svg" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <FileImage className="h-5 w-5" />
              )}
              <span className="text-sm font-medium">SVG</span>
              <span className="text-[11px] text-muted-foreground leading-tight">
                Vector image
              </span>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col gap-1.5 py-3"
              onClick={handleExportPDF}
              disabled={isAnyExporting}
            >
              {exportingType === "pdf" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <FileText className="h-5 w-5" />
              )}
              <span className="text-sm font-medium">PDF</span>
              <span className="text-[11px] text-muted-foreground leading-tight">
                Document
              </span>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col gap-1.5 py-3"
              onClick={handleExport}
              disabled={isAnyExporting}
            >
              {isExporting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Database className="h-5 w-5" />
              )}
              <span className="text-sm font-medium">JSON</span>
              <span className="text-[11px] text-muted-foreground leading-tight">
                Data backup
              </span>
            </Button>
          </div>

          <div className="border-t pt-3">
            <Label className="text-sm text-muted-foreground">Import from JSON</Label>
            <div className="mt-2 space-y-2">
              <div className="flex gap-2">
                <Button
                  variant={importMode === "replace" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setImportMode("replace")}
                >
                  Replace
                </Button>
                <Button
                  variant={importMode === "merge" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setImportMode("merge")}
                >
                  Merge
                </Button>
              </div>
              <Button
                variant="outline"
                className="w-full"
                disabled={isImporting}
                asChild
              >
                <label>
                  <Upload className="mr-2 h-4 w-4" />
                  {isImporting ? "Importing..." : "Upload JSON"}
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleImport}
                  />
                </label>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
