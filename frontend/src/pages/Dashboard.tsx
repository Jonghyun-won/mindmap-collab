import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '@/lib/api-client'
import { MindMap } from '@/types/mindmap'
import { useAuth } from '@/contexts/AuthContext'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const [mindMaps, setMindMaps] = useState<MindMap[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    loadMindMaps()
  }, [])

  const loadMindMaps = async () => {
    try {
      const response = await apiClient.getMindMaps()
      setMindMaps(response.data || [])
    } catch (error) {
      console.error('Error loading mind maps:', error)
    } finally {
      setLoading(false)
    }
  }

  const createMindMap = async () => {
    setCreating(true)
    try {
      const newMindMap = await apiClient.createMindMap('새 마인드맵')
      navigate(`/editor/${newMindMap.id}`)
    } catch (error) {
      console.error('Error creating mind map:', error)
      alert('마인드맵 생성에 실패했습니다')
    } finally {
      setCreating(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return '방금 전'
    if (diffMins < 60) return `${diffMins}분 전`
    if (diffHours < 24) return `${diffHours}시간 전`
    if (diffDays < 7) return `${diffDays}일 전`
    return date.toLocaleDateString('ko-KR')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900">MindMap</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.email}</span>
            <button
              onClick={logout}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Top Section */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">마인드맵</h2>
            <p className="text-gray-600">생각을 연결하고 아이디어를 확장하세요</p>
          </div>
          <button
            onClick={createMindMap}
            disabled={creating}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {creating ? '생성 중...' : '새 마인드맵'}
          </button>
        </div>

        {/* Mind Maps Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-gray-500">로딩 중...</div>
          </div>
        ) : mindMaps.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">마인드맵이 없습니다</h3>
            <p className="text-gray-600 mb-6">첫 번째 마인드맵을 만들어보세요</p>
            <button
              onClick={createMindMap}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors"
            >
              시작하기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {mindMaps.map((mindMap) => (
              <div
                key={mindMap.id}
                onClick={() => navigate(`/editor/${mindMap.id}`)}
                className="bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-md cursor-pointer transition-all p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                  {mindMap.title}
                </h3>
                <p className="text-sm text-gray-500">
                  {formatDate(mindMap.updated_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
