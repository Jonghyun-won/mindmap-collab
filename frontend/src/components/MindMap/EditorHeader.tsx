import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Check } from 'lucide-react'

interface EditorHeaderProps {
  title: string
  onTitleSave: (newTitle: string) => void
  isSaving: boolean
}

export default function EditorHeader({ title, onTitleSave, isSaving }: EditorHeaderProps) {
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(title)
  const [showSaved, setShowSaved] = useState(false)

  const handleSave = () => {
    if (editedTitle.trim() && editedTitle !== title) {
      onTitleSave(editedTitle.trim())
      setShowSaved(true)
      setTimeout(() => setShowSaved(false), 2000)
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      setEditedTitle(title)
      setIsEditing(false)
    }
  }

  return (
    <header className="h-14 border-b border-gray-200 flex items-center px-4 bg-white">
      <div className="flex items-center gap-3 flex-1">
        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Back to dashboard"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>

        {/* Title editor */}
        <div className="flex-1 max-w-md">
          {isEditing ? (
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              autoFocus
              className="w-full px-2 py-1 text-lg font-medium border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <button
              onClick={() => {
                setEditedTitle(title)
                setIsEditing(true)
              }}
              className="text-lg font-medium text-gray-800 hover:text-blue-600 transition-colors px-2 py-1 rounded hover:bg-gray-50"
            >
              {title}
            </button>
          )}
        </div>

        {/* Save indicator */}
        <div className="ml-auto flex items-center gap-2">
          {showSaved && (
            <div className="flex items-center gap-1.5 text-green-600 text-sm">
              <Check className="w-4 h-4" />
              <span>Saved</span>
            </div>
          )}
          {isSaving && (
            <div className="flex items-center gap-1.5 text-gray-500 text-sm">
              <Save className="w-4 h-4 animate-pulse" />
              <span>Saving...</span>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
