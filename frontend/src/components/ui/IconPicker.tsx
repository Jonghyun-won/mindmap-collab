import { useState } from "react"
import * as LucideIcons from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

interface IconPickerProps {
  value?: string | null
  onChange: (icon: string | null) => void
}

// Commonly used icons (MVP)
const COMMON_ICONS = [
  "Lightbulb",
  "Star",
  "Heart",
  "CheckCircle",
  "AlertCircle",
  "Info",
  "Zap",
  "Flame",
  "Target",
  "Flag",
  "Bookmark",
  "Tag",
]

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)

  const filteredIcons = COMMON_ICONS.filter((name) =>
    name.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (iconName: string) => {
    onChange(iconName)
    setOpen(false)
  }

  const SelectedIcon = value
    ? (LucideIcons[value as keyof typeof LucideIcons] as React.FC<{ className?: string }>)
    : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          {SelectedIcon ? (
            <SelectedIcon className="h-4 w-4" />
          ) : (
            <LucideIcons.Smile className="h-4 w-4" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="space-y-2">
          <Input
            placeholder="Search icons..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="grid grid-cols-6 gap-1 max-h-48 overflow-y-auto">
            {filteredIcons.map((iconName) => {
              const Icon = LucideIcons[
                iconName as keyof typeof LucideIcons
              ] as React.FC<{ className?: string }>
              return (
                <Button
                  key={iconName}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleSelect(iconName)}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              )
            })}
          </div>
          {value && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                onChange(null)
                setOpen(false)
              }}
            >
              Remove Icon
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
