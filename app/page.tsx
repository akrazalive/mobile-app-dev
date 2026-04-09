'use client'

import { useRouter } from 'next/navigation'
import { GraduationCap, School, Users, Crown, ArrowRight } from 'lucide-react'

const roles = [
  { id: 'student',     name: 'Student',     icon: GraduationCap, bg: 'bg-blue-600',   text: 'text-blue-600',   light: 'bg-blue-50'   },
  { id: 'teacher',     name: 'Teacher',     icon: Users,         bg: 'bg-green-600',  text: 'text-green-600',  light: 'bg-green-50'  },
  { id: 'farm_master', name: 'Farm Master', icon: School,        bg: 'bg-orange-600', text: 'text-orange-600', light: 'bg-orange-50' },
  { id: 'principal',   name: 'Principal',   icon: Crown,         bg: 'bg-purple-600', text: 'text-purple-600', light: 'bg-purple-50' },
]

export default function Home() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-blue-600 rounded-2xl mx-auto mb-5 flex items-center justify-center">
            <School className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">GHS Nawakalay (Barikot)</h1>
          <p className="text-gray-500 text-sm">Empowering Minds, Building Futures</p>
        </div>

        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 text-center">Select Your Role</h2>

        <div className="space-y-3">
          {roles.map((role) => {
            const Icon = role.icon
            return (
              <button
                key={role.id}
                onClick={() => router.push(`/login?role=${role.id}`)}
                className={`w-full ${role.light} border border-gray-200 p-4 rounded-2xl flex items-center justify-between hover:border-gray-300 transition-all`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-11 h-11 ${role.bg} rounded-xl flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <div className={`font-semibold text-gray-900`}>{role.name}</div>
                    <div className="text-gray-400 text-xs">Tap to login</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </button>
            )
          })}
        </div>

        <p className="text-center text-gray-400 text-xs mt-10">School Management System</p>
      </div>
    </div>
  )
}
