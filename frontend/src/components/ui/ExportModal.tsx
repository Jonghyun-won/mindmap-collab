import { useState } from "react"
import { useReactFlow } from "reactflow"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { exportToJPG, exportToPDF } from "@/lib/image-export"
import { FileImage, FileText, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/useToast"

interface ExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mindmapId: string
  mindmapTitle: string
}

type ExportingType = "jpg" | "pdf" | null

export function ExportModal({
  open,
  onOpenChange,
  mindmapId,
  mindmapTitle,
}: ExportModalProps) {
  const { getNodes } = useReactFlow()
  const { success, error } = useToast()
  const [exportingType, setExportingType] = useState<ExportingType>(null)

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

  const isAnyExporting = exportingType !== null

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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
