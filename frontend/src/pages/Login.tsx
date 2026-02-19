import { useState } from 'react'
import LoginForm from '@/components/Auth/LoginForm'
import SignupForm from '@/components/Auth/SignupForm'

export default function Login() {
  const [showSignup, setShowSignup] = useState(false)

  return showSignup ? (
    <SignupForm onToggle={() => setShowSignup(false)} />
  ) : (
    <LoginForm onToggle={() => setShowSignup(true)} />
  )
}
