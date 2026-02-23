import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, Shield, ShieldOff, UserCheck, UserX, Users, Map, CheckCircle, XCircle, MailCheck } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import type { AdminUser, AdminDashboardStats, AdminUserListResponse } from '@/types/admin'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<AdminDashboardStats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(true)
  const limit = 15

  const fetchStats = useCallback(async () => {
    try {
      const data = await apiClient.getAdminStats()
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch admin stats:', error)
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const data: AdminUserListResponse = await apiClient.getAdminUsers(page, limit, search || undefined)
      setUsers(data.users)
      setTotal(data.total)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    fetchStats()
    fetchUsers()
  }, [fetchStats, fetchUsers])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setSearch(searchInput)
  }

  const handleToggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin'
    try {
      await apiClient.updateUserRole(userId, newRole)
      fetchUsers()
      fetchStats()
    } catch (error: any) {
      alert(error.message || '역할 변경에 실패했습니다')
    }
  }

  const handleVerifyUser = async (userId: string) => {
    try {
      await apiClient.verifyUser(userId)
      fetchUsers()
      fetchStats()
    } catch (error: any) {
      alert(error.message || '인증 처리에 실패했습니다')
    }
  }

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await apiClient.updateUserStatus(userId, !currentStatus)
      fetchUsers()
      fetchStats()
    } catch (error: any) {
      alert(error.message || '상태 변경에 실패했습니다')
    }
  }

  const totalPages = Math.ceil(total / limit)

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return '오늘'
    if (days === 1) return '어제'
    if (days < 7) return `${days}일 전`
    if (days < 30) return `${Math.floor(days / 7)}주 전`
    return date.toLocaleDateString('ko-KR')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">관리자 대시보드</h1>
              <p className="text-sm text-gray-500">사용자 및 시스템 관리</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Users className="w-4 h-4" />
                <span className="text-sm">전체 사용자</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.total_users}</p>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center gap-2 text-green-600 mb-1">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">인증 완료</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.verified_users}</p>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center gap-2 text-blue-600 mb-1">
                <UserCheck className="w-4 h-4" />
                <span className="text-sm">활성 사용자</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.active_users}</p>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center gap-2 text-purple-600 mb-1">
                <Map className="w-4 h-4" />
                <span className="text-sm">전체 마인드맵</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.total_mindmaps}</p>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="bg-white rounded-lg border p-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                className="w-full pl-9 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="이메일 또는 이름으로 검색..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              검색
            </button>
          </form>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">사용자</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">팀</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">역할</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">인증</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">마인드맵</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">마지막 활동</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">상태</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      로딩 중...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      사용자가 없습니다
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.name || '-'}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{user.team || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'admin'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {user.role === 'admin' ? '관리자' : '사용자'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {user.email_verified ? (
                          <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400 mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-medium text-gray-900">
                        {user.mindmap_count}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(user.last_activity)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          user.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {user.is_active ? '활성' : '비활성'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {!user.email_verified && (
                            <button
                              onClick={() => handleVerifyUser(user.id)}
                              className="p-1.5 rounded-lg transition-colors text-gray-400 hover:bg-green-50 hover:text-green-600"
                              title="이메일 인증 처리"
                            >
                              <MailCheck className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleToggleRole(user.id, user.role)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              user.role === 'admin'
                                ? 'text-purple-600 hover:bg-purple-50'
                                : 'text-gray-400 hover:bg-gray-100 hover:text-purple-600'
                            }`}
                            title={user.role === 'admin' ? '관리자 해제' : '관리자 지정'}
                          >
                            {user.role === 'admin' ? (
                              <ShieldOff className="w-4 h-4" />
                            ) : (
                              <Shield className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleToggleStatus(user.id, user.is_active)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              user.is_active
                                ? 'text-gray-400 hover:bg-red-50 hover:text-red-600'
                                : 'text-red-500 hover:bg-green-50 hover:text-green-600'
                            }`}
                            title={user.is_active ? '비활성화' : '활성화'}
                          >
                            {user.is_active ? (
                              <UserX className="w-4 h-4" />
                            ) : (
                              <UserCheck className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t flex items-center justify-between">
              <p className="text-sm text-gray-500">
                전체 {total}명 중 {(page - 1) * limit + 1}-{Math.min(page * limit, total)}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  이전
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
                  if (pageNum > totalPages) return null
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`px-3 py-1 text-sm border rounded ${
                        pageNum === page ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  다음
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
