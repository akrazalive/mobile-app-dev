'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import PrincipalDashboard from '@/app/components/PrincipalDashboard'
import TeacherDashboard from '@/app/components/TeacherDashboard'
import FarmMasterDashboard from '@/app/components/FarmMasterDashboard'
import StudentDashboard from '@/app/components/StudentDashboard'
import LoadingSpinner from '@/app/components/LoadingSpinner'

export default function DashboardPage() {
  const router = useRouter()
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUserRole()
  }, [])

  const getUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/')
      return
    }

    // Try matching by auth UID first (works if users.id = auth.uid())
    let { data } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    // Fallback: match by email (works if users.id is a separate UUID)
    if (!data) {
      const res = await supabase
        .from('users')
        .select('role')
        .eq('email', user.email)
        .maybeSingle()
      data = res.data
    }

    setUserRole(data?.role ?? 'student')
    setLoading(false)
  }

  if (loading) return <LoadingSpinner />

  switch (userRole) {
    case 'principal':
      return <PrincipalDashboard />
    case 'teacher':
      return <TeacherDashboard />
    case 'farm_master':
      return <FarmMasterDashboard />
    default:
     return <PrincipalDashboard />  
    //return <StudentDashboard />
  }
}