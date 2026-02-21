import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Marker, MarkerType } from "@/types/mindmap"
import { Flag, AlertCircle, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MarkerPickerProps {
  value?: Marker | null
  onChange: (marker: Marker | null) => void
}

export function MarkerPicker({ value, onChange }: MarkerPickerProps) {
  const handleTypeChange = (type: MarkerType) => {
    let defaultValue = ""
    if (type === "priority") defaultValue = "medium"
    else if (type === "progress") defaultValue = "0"
    else if (type === "flag") defaultValue = "true"

    onChange({ type, value: defaultValue })
  }

  const handleValueChange = (newValue: string) => {
    if (value) {
      onChange({ ...value, value: newValue })
    }
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <Label>Marker</Label>
        {value && (
          <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
            Remove
          </Button>
        )}
      </div>

      <RadioGroup
        value={value?.type || ""}
        onValueChange={(v) => handleTypeChange(v as MarkerType)}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="priority" id="priority" />
          <Label htmlFor="priority" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> Priority
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="progress" id="progress" />
          <Label htmlFor="progress" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Progress
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="flag" id="flag" />
          <Label htmlFor="flag" className="flex items-center gap-2">
            <Flag className="h-4 w-4" /> Flag
          </Label>
        </div>
      </RadioGroup>

      {value?.type === "priority" && (
        <Select value={value.value} onValueChange={handleValueChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="high">🔴 High</SelectItem>
            <SelectItem value="medium">🟡 Medium</SelectItem>
            <SelectItem value="low">🟢 Low</SelectItem>
          </SelectContent>
        </Select>
      )}

      {value?.type === "progress" && (
        <Select value={value.value} onValueChange={handleValueChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">0%</SelectItem>
            <SelectItem value="25">25%</SelectItem>
            <SelectItem value="50">50%</SelectItem>
            <SelectItem value="75">75%</SelectItem>
            <SelectItem value="100">100%</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
