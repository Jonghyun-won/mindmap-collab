import { useState, useEffect } from 'react'
import { Trash2, UserPlus, Mail, Shield, Link, Copy, Loader2 } from 'lucide-react'
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

  // Invite link state
  const [inviteLinks, setInviteLinks] = useState<any[]>([])
  const [linkPermission, setLinkPermission] = useState<'view' | 'edit'>('view')
  const [isCreatingLink, setIsCreatingLink] = useState(false)
  const [isLoadingLinks, setIsLoadingLinks] = useState(false)
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null)

  // Load collaborators and invite links when modal opens
  useEffect(() => {
    if (isOpen) {
      loadCollaborators()
      loadInviteLinks()
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

  const loadInviteLinks = async () => {
    setIsLoadingLinks(true)
    try {
      const data = await apiClient.getInviteLinks(mindMapId)
      setInviteLinks(data.invites)
    } catch (err) {
      console.error('Error loading invite links:', err)
    } finally {
      setIsLoadingLinks(false)
    }
  }

  const handleCreateInviteLink = async () => {
    setIsCreatingLink(true)
    try {
      const result = await apiClient.createInviteLink(mindMapId, linkPermission, 72)
      setInviteLinks([...inviteLinks, result.invite])
      await copyToClipboard(result.url, result.invite.id)
      showToast('초대 링크가 생성되었습니다', 'success')
    } catch (err: any) {
      const errorMessage = err?.message || '링크 생성에 실패했습니다'
      showToast(errorMessage, 'error')
    } finally {
      setIsCreatingLink(false)
    }
  }

  const handleRevokeLink = async (inviteId: string) => {
    try {
      await apiClient.revokeInviteLink(mindMapId, inviteId)
      setInviteLinks(inviteLinks.filter((link) => link.id !== inviteId))
      showToast('초대 링크가 삭제되었습니다', 'success')
    } catch (err: any) {
      showToast(err?.message || '링크 삭제에 실패했습니다', 'error')
    }
  }

  const copyToClipboard = async (text: string, linkId: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedLinkId(linkId)
    setTimeout(() => setCopiedLinkId(null), 2000)
  }

  const getInviteUrl = (token: string) => {
    return `${window.location.origin}/invite/${token}`
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

          {/* Invite Links Section */}
          <div className="border-t pt-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Link className="w-4 h-4" />
              초대 링크
            </h3>

            <div className="flex gap-2">
              <Select
                value={linkPermission}
                onValueChange={(value) => setLinkPermission(value as 'view' | 'edit')}
                disabled={isCreatingLink}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">보기</SelectItem>
                  <SelectItem value="edit">편집</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleCreateInviteLink}
                disabled={isCreatingLink}
                variant="outline"
                className="flex-1"
              >
                {isCreatingLink ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Link className="w-4 h-4" />
                )}
                링크 생성
              </Button>
            </div>

            {isLoadingLinks ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              </div>
            ) : inviteLinks.length > 0 ? (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {inviteLinks.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm"
                  >
                    <Link className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="flex-1 truncate text-gray-600 text-xs font-mono">
                      {getInviteUrl(link.token)}
                    </span>
                    <Badge variant={link.permission === 'edit' ? 'default' : 'secondary'} className="text-[10px] flex-shrink-0">
                      {link.permission === 'edit' ? '편집' : '보기'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => copyToClipboard(getInviteUrl(link.token), link.id)}
                      className="text-gray-500 hover:text-blue-600 flex-shrink-0"
                      title="링크 복사"
                    >
                      {copiedLinkId === link.id ? (
                        <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRevokeLink(link.id)}
                      className="text-gray-500 hover:text-red-600 flex-shrink-0"
                      title="링크 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 text-center py-2">
                생성된 초대 링크가 없습니다
              </p>
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
