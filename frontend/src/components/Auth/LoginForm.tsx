import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginForm({ onToggle }: { onToggle: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showVerifyOption, setShowVerifyOption] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const { login, resendConfirmation } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setShowVerifyOption(false)
    setResendMessage('')
    setLoading(true)

    try {
      await login(email, password)
    } catch (err: any) {
      const status = err?.status
      const message = err?.message || '로그인에 실패했습니다'

      if (status === 403 || message.includes('인증')) {
        setError('이메일 인증이 완료되지 않았습니다. 이메일을 확인해주세요.')
        setShowVerifyOption(true)
      } else {
        setError(message)
        setShowVerifyOption(false)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    setResendLoading(true)
    setResendMessage('')
    try {
      await resendConfirmation(email)
      setResendMessage('인증 이메일이 재발송되었습니다. 이메일을 확인해주세요.')
      setShowVerifyOption(false)
    } catch (err: any) {
      setResendMessage(err?.message || '재발송에 실패했습니다')
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-6">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-8">
            FunnelMind
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className={`border rounded p-3 ${
                showVerifyOption
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <p className={`text-sm ${showVerifyOption ? 'text-amber-700' : 'text-red-600'}`}>
                  {error}
                </p>
                {showVerifyOption && (
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendLoading}
                    className="mt-2 text-sm text-blue-600 hover:underline disabled:opacity-50"
                  >
                    {resendLoading ? '발송 중...' : '인증 이메일 재발송'}
                  </button>
                )}
              </div>
            )}

            {resendMessage && (
              <div className="bg-green-50 border border-green-200 rounded p-3">
                <p className="text-sm text-green-600">{resendMessage}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이메일
              </label>
              <input
                type="email"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                비밀번호
              </label>
              <input
                type="password"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors disabled:opacity-50"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>

            <div className="text-center text-sm">
              <button
                type="button"
                onClick={onToggle}
                className="text-blue-600 hover:underline"
              >
                회원가입
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
