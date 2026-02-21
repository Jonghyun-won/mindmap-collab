import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { apiClient } from '../lib/api-client'

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState('')
  const [mindmapId, setMindmapId] = useState('')

  useEffect(() => {
    if (!user) {
      localStorage.setItem('pending_invite', token || '')
      navigate('/login')
      return
    }

    acceptInvite()
  }, [user, token])

  const acceptInvite = async () => {
    try {
      const result = await apiClient.acceptInviteLink(token!)
      setMindmapId(result.mindmap_id)
      setStatus('success')
      setTimeout(() => navigate(`/editor/${result.mindmap_id}`), 2000)
    } catch (err: any) {
      setStatus('error')
      setError(err.message || '초대 링크가 유효하지 않습니다')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">초대를 수락하는 중...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">초대 수락 완료!</h2>
            <p className="text-gray-600 mb-4">마인드맵으로 이동합니다...</p>
            <button
              onClick={() => navigate(`/editor/${mindmapId}`)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              바로 이동
            </button>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">오류</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              대시보드로 이동
            </button>
          </>
        )}
      </div>
    </div>
  )
}
