import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import type { User } from '@/types/auth'

interface HeaderProps {
  user: User | null
  title?: React.ReactNode
  showBackButton?: boolean
}

export default function Header({ user, title, showBackButton }: HeaderProps) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await logout()
  }

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          {showBackButton && (
            <button
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-gray-900 transition-colors"
              title="홈으로"
            >
              ← 뒤로
            </button>
          )}
          {title || <h1 className="text-2xl font-bold text-gray-900">FunnelMind</h1>}
        </div>
        {user && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.email}</span>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
