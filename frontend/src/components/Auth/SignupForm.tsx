import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function SignupForm({ onToggle }: { onToggle: () => void }) {
  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [team, setTeam] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Step 2 state
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [confirmationCode, setConfirmationCode] = useState('')
  const [inputCode, setInputCode] = useState('')
  const [resendMessage, setResendMessage] = useState('')

  const { register, confirmEmail, resendConfirmation } = useAuth()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('이름을 입력해주세요')
      return
    }

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다')
      return
    }

    if (password.length < 8) {
      setError('비밀번호는 최소 8자 이상이어야 합니다')
      return
    }

    setLoading(true)

    try {
      const result = await register(
        email,
        password,
        name.trim(),
        team.trim() || undefined
      )
      setRegisteredEmail(email)
      setConfirmationCode(result.confirmation_code)
      setStep(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원가입에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!inputCode.trim()) {
      setError('인증코드를 입력해주세요')
      return
    }

    setLoading(true)

    try {
      await confirmEmail(registeredEmail, inputCode.trim())
      // confirmEmail sets user + token in context, navigate handled by parent
    } catch (err) {
      setError(err instanceof Error ? err.message : '인증에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setError('')
    setResendMessage('')

    try {
      const result = await resendConfirmation(registeredEmail)
      setConfirmationCode(result.confirmation_code)
      setResendMessage('인증코드가 재발송되었습니다')
    } catch (err) {
      setError(err instanceof Error ? err.message : '코드 재발송에 실패했습니다')
    }
  }

  // Step 2: Email verification
  if (step === 2) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md p-6">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="text-center mb-6">
              <div className="text-green-600 text-5xl mb-4">&#10003;</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                회원가입이 완료되었습니다!
              </h2>
              <p className="text-gray-600 text-sm">
                아래 인증코드를 입력하여 이메일을 인증해주세요.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center mb-6">
              <p className="text-sm text-blue-600 mb-1">인증 코드</p>
              <p className="text-2xl font-bold tracking-widest text-blue-700">
                {confirmationCode}
              </p>
            </div>

            <form onSubmit={handleConfirm} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {resendMessage && (
                <div className="bg-green-50 border border-green-200 rounded p-3">
                  <p className="text-sm text-green-600">{resendMessage}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  6자리 인증코드를 입력하세요
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg tracking-widest"
                  placeholder="______"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors disabled:opacity-50"
              >
                {loading ? '인증 중...' : '인증하기'}
              </button>

              <div className="text-center text-sm">
                <button
                  type="button"
                  onClick={handleResend}
                  className="text-blue-600 hover:underline"
                >
                  코드 재발송
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // Step 1: Registration form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-6">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-8">
            회원가입
          </h1>

          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이름
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="홍길동"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                팀/조직
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="선택사항"
                value={team}
                onChange={(e) => setTeam(e.target.value)}
              />
            </div>

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
                placeholder="최소 8자"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                비밀번호 확인
              </label>
              <input
                type="password"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="비밀번호 재입력"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors disabled:opacity-50"
            >
              {loading ? '가입 중...' : '회원가입'}
            </button>

            <div className="text-center text-sm">
              <button
                type="button"
                onClick={onToggle}
                className="text-blue-600 hover:underline"
              >
                로그인
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
