'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { GraduationCap, Users, BookOpen, LayoutGrid, ArrowRight } from 'lucide-react'

type Props = { onNavigate: (tab: string) => void }

type Stats = {
  students: number
  teachers: number
  classes: number
  sections: number
}

export default function OverviewTab({ onNavigate }: Props) {
  const [stats, setStats] = useState<Stats>({ students: 0, teachers: 0, classes: 0, sections: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      const [s, t, c, sec] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }),
        supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'teacher'),
        supabase.from('classes').select('id', { count: 'exact', head: true }),
        supabase.from('sections').select('id', { count: 'exact', head: true }),
      ])
      setStats({
        students: s.count ?? 0,
        teachers: t.count ?? 0,
        classes:  c.count ?? 0,
        sections: sec.count ?? 0,
      })
      setLoading(false)
    }
    fetchStats()
  }, [])

  const cards = [
    { label: 'Total Students', value: stats.students, icon: GraduationCap, color: 'bg-purple-50 text-purple-600 border-purple-100', tab: 'students' },
    { label: 'Teachers',       value: stats.teachers, icon: Users,         color: 'bg-blue-50 text-blue-600 border-blue-100',     tab: 'teachers' },
    { label: 'Classes',        value: stats.classes,  icon: BookOpen,      color: 'bg-green-50 text-green-600 border-green-100',  tab: 'classes'  },
    { label: 'Sections',       value: stats.sections, icon: LayoutGrid,    color: 'bg-orange-50 text-orange-600 border-orange-100', tab: 'sections' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Overview</h2>
        <p className="text-sm text-gray-500 mt-0.5">School at a glance</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {cards.map(({ label, value, icon: Icon, color, tab }) => (
          <button key={tab} onClick={() => onNavigate(tab)}
            className={`bg-white border rounded-xl p-4 text-left hover:shadow-sm transition group ${color.split(' ')[2]}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color.split(' ')[0]} ${color.split(' ')[1]}`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {loading ? <span className="inline-block w-8 h-6 bg-gray-100 rounded animate-pulse" /> : value}
            </p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-sm text-gray-500">{label}</p>
              <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition" />
            </div>
          </button>
        ))}
      </div>

      {/* Quick links */}
      <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100">
        {cards.map(({ label, icon: Icon, color, tab }) => (
          <button key={tab} onClick={() => onNavigate(tab)}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color.split(' ')[0]} ${color.split(' ')[1]}`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium text-gray-700">Manage {label}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300" />
          </button>
        ))}
      </div>
    </div>
  )
}
