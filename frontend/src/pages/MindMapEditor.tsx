import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import MindMapCanvas from '@/components/MindMap/MindMapCanvas'
import { apiClient } from '@/lib/api-client'

export default function MindMapEditor() {
  const { id } = useParams<{ id: string }>()
  const [mindMapTitle, setMindMapTitle] = useState('Untitled Mind Map')

  // Load mind map title
  useEffect(() => {
    if (id) {
      loadMindMapTitle(id)
    }
  }, [id])

  const loadMindMapTitle = async (mindMapId: string) => {
    try {
      const data = await apiClient.getMindMap(mindMapId)
      if (data) {
        setMindMapTitle(data.title)
      }
    } catch (error) {
      console.error('Error loading title:', error)
    }
  }

  const handleTitleSave = async (newTitle: string) => {
    if (!id || !newTitle.trim()) return

    try {
      await apiClient.updateMindMap(id, newTitle.trim())
      setMindMapTitle(newTitle.trim())
    } catch (error) {
      console.error('Error updating title:', error)
      alert('제목 변경에 실패했습니다')
    }
  }

  return (
    <div className="w-screen h-screen overflow-hidden">
      <MindMapCanvas
        mindMapTitle={mindMapTitle}
        documentId={id || 'default'}
        onTitleSave={handleTitleSave}
      />
    </div>
  )
}
