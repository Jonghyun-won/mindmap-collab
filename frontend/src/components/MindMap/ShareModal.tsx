import { useState, useEffect } from 'react'
import { Trash2, UserPlus, Mail, Shield } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { apiClient } from '@/lib/api-client'
import type { Collaborator } from '@/types/mindmap'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  mindMapId: string
  mindMapTitle: string
}

export default function ShareModal({
  isOpen,
  onClose,
  mindMapId,
  mindMapTitle,
}: ShareModalProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('')
  const [invitePermission, setInvitePermission] = useState<'view' | 'edit' | 'admin'>('edit')
  const [isInviting, setIsInviting] = useState(false)

  // Load collaborators when modal opens
  useEffect(() => {
    if (isOpen) {
      loadCollaborators()
    }
  }, [isOpen, mindMapId])

  const loadCollaborators = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await apiClient.getCollaborators(mindMapId)
      setCollaborators(data)
    } catch (err) {
      setError('Failed to load collaborators')
      console.error('Error loading collaborators:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    setIsInviting(true)
    setError(null)
    try {
      const newCollaborator = await apiClient.addCollaborator(
        mindMapId,
        inviteEmail.trim(),
        invitePermission
      )
      setCollaborators([...collaborators, newCollaborator])
      setInviteEmail('')
      setInvitePermission('edit')
      showToast('Collaborator invited successfully', 'success')
    } catch (err: any) {
      const errorMessage = err?.details?.message || err?.message || 'Failed to invite collaborator'
      setError(errorMessage)
      showToast(errorMessage, 'error')
    } finally {
      setIsInviting(false)
    }
  }

  const handleRemoveCollaborator = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this collaborator?')) return

    setError(null)
    try {
      await apiClient.removeCollaborator(mindMapId, userId)
      setCollaborators(collaborators.filter(c => c.user_id !== userId))
      showToast('Collaborator removed successfully', 'success')
    } catch (err: any) {
      const errorMessage = err?.details?.message || err?.message || 'Failed to remove collaborator'
      setError(errorMessage)
      showToast(errorMessage, 'error')
    }
  }

  const showToast = (message: string, type: 'success' | 'error') => {
    // Simple toast implementation - you can replace with a proper toast library
    const toast = document.createElement('div')
    toast.className = `fixed top-4 right-4 z-[100] px-4 py-3 rounded-lg shadow-lg text-white text-sm ${
      type === 'success' ? 'bg-green-600' : 'bg-red-600'
    }`
    toast.textContent = message
    document.body.appendChild(toast)
    setTimeout(() => toast.remove(), 3000)
  }

  const getPermissionBadgeVariant = (permission: string) => {
    switch (permission) {
      case 'admin':
        return 'destructive'
      case 'edit':
        return 'default'
      case 'view':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Share "{mindMapTitle}"</DialogTitle>
          <DialogDescription>
            Invite collaborators to view or edit this mind map
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invite form */}
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="pl-9"
                  disabled={isInviting}
                />
              </div>
              <Select
                value={invitePermission}
                onValueChange={(value) => setInvitePermission(value as 'view' | 'edit' | 'admin')}
                disabled={isInviting}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">
                    <div className="flex items-center gap-2">
                      <Shield className="w-3 h-3" />
                      View
                    </div>
                  </SelectItem>
                  <SelectItem value="edit">
                    <div className="flex items-center gap-2">
                      <Shield className="w-3 h-3" />
                      Edit
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="w-3 h-3" />
                      Admin
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" disabled={isInviting || !inviteEmail.trim()}>
                <UserPlus className="w-4 h-4" />
                Invite
              </Button>
            </div>
          </form>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Collaborators list */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700">
              Collaborators ({collaborators.length})
            </h3>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : collaborators.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No collaborators yet. Invite someone to get started!
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {collaborators.map((collaborator) => (
                  <div
                    key={collaborator.id}
                    className="flex items-center justify-between gap-4 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {collaborator.user?.name || 'Unknown User'}
                        </p>
                        <Badge variant={getPermissionBadgeVariant(collaborator.permission)}>
                          {collaborator.permission}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {collaborator.user?.email || 'No email'}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemoveCollaborator(collaborator.user_id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Remove collaborator"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Permission descriptions */}
          <div className="border-t pt-4">
            <h4 className="text-xs font-semibold text-gray-700 mb-2">Permission Levels</h4>
            <div className="space-y-1 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">view</Badge>
                <span>Can view the mind map</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">edit</Badge>
                <span>Can edit the mind map</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="destructive">admin</Badge>
                <span>Can edit and manage collaborators</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
