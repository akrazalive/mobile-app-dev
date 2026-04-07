'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSession } from '@/lib/auth'
import PrincipalDashboard from '@/app/components/PrincipalDashboard'
import TeacherDashboard from '@/app/components/TeacherDashboard'
import FarmMasterDashboard from '@/app/components/FarmMasterDashboard'
import StudentDashboard from '@/app/components/StudentDashboard'
import LoadingSpinner from '@/app/components/LoadingSpinner'

export default function DashboardPage() {
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    const session = getSession()
    if (!session) {
      router.push('/')
      return
    }
    setRole(session.role)
  }, [])

  if (!role) return <LoadingSpinner />

  switch (role) {
    case 'principal':   return <PrincipalDashboard />
    case 'teacher':     return <TeacherDashboard />
    case 'farm_master': return <FarmMasterDashboard />
    default:            return <StudentDashboard />
  }
}
