'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { loginWithTable } from '@/lib/auth'
import { ArrowLeft, LogIn } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

const roleColors: Record<string, string> = {
  principal:   'bg-purple-600',
  teacher:     'bg-green-600',
  farm_master: 'bg-orange-600',
  student:     'bg-blue-600',
}

const roleFocus: Record<string, string> = {
  principal:   'focus:ring-purple-500',
  teacher:     'focus:ring-green-500',
  farm_master: 'focus:ring-orange-500',
  student:     'focus:ring-blue-500',
}

const demoCredentials: Record<string, { email: string; password: string }> = {
  principal:   { email: 'principal@school.com', password: 'password123' },
  teacher:     { email: 'teacher@school.com',   password: 'password123' },
  farm_master: { email: 'farm@school.com',       password: 'password123' },
  student:     { email: 'student@school.com',    password: 'password123' },
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const role = searchParams.get('role') || 'student'
  const demo = demoCredentials[role] ?? { email: '', password: '' }

  const [email, setEmail] = useState(demo.email)
  const [password, setPassword] = useState(demo.password)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await loginWithTable(email, password)
      toast.success('Login successful!')
      router.push('/dashboard')
    } catch (err: any) {
      toast.error(err.message)
    }
    setLoading(false)
  }

  const btnColor = roleColors[role] ?? 'bg-blue-600'
  const focusRing = roleFocus[role] ?? 'focus:ring-blue-500'

  return (
    <div className="w-full max-w-md">
      <Link href="/" className="inline-flex items-center text-gray-500 text-sm mb-8 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-1 capitalize">
        Login as {role.replace('_', ' ')}
      </h1>
      <p className="text-gray-500 text-sm mb-8">Credentials are pre-filled — just hit Login</p>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 ${focusRing} focus:border-transparent outline-none`}
            required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 ${focusRing} focus:border-transparent outline-none`}
            required />
        </div>
        <button type="submit" disabled={loading}
          className={`w-full ${btnColor} text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50`}>
          <LogIn className="w-5 h-5" />
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <Suspense fallback={<div className="text-gray-400 text-sm">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
