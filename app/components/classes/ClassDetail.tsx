'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, User, BookOpen, Users, LayoutGrid } from 'lucide-react'

type Props = { cls: any; onBack: () => void }

export default function ClassDetail({ cls, onBack }: Props) {
  const [subjects, setSubjects] = useState<any[]>([])
  const [sections, setSections] = useState<any[]>([])
  const [studentCount, setStudentCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [subRes, secRes, stuRes] = await Promise.all([
        supabase.from('teacher_subjects')
          .select('*, subjects(name, code), users(name)')
          .eq('class_id', cls.id),
        supabase.from('sections').select('*').eq('class_id', cls.id),
        supabase.from('students').select('id', { count: 'exact', head: true }).eq('class_id', cls.id),
      ])
      if (subRes.data) setSubjects(subRes.data)
      if (secRes.data) setSections(secRes.data)
      setStudentCount(stuRes.count ?? 0)
      setLoading(false)
    }
    load()
  }, [cls.id])

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition">
        <ArrowLeft className="w-4 h-4" />Back to Classes
      </button>

      {/* Class header */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{cls.name}</h2>
            {cls.description && <p className="text-sm text-gray-500 mt-0.5">{cls.description}</p>}
          </div>
          <span className="bg-purple-50 text-purple-700 text-xs font-semibold px-3 py-1 rounded-full">
            Grade {cls.grade_level}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <Users className="w-5 h-5 text-purple-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-gray-800">{studentCount}</p>
            <p className="text-xs text-gray-500">Students</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <LayoutGrid className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-gray-800">{sections.length}</p>
            <p className="text-xs text-gray-500">Sections</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <BookOpen className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-gray-800">{subjects.length}</p>
            <p className="text-xs text-gray-500">Subjects</p>
          </div>
        </div>
      </div>

      {/* Class Teacher */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Class Teacher</h3>
        {cls.users ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-800">{cls.users.name}</p>
              <p className="text-xs text-gray-400">{cls.users.email}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">No class teacher assigned</p>
        )}
      </div>

      {/* Subjects */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Subjects & Teachers</h3>
        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : subjects.length === 0 ? (
          <p className="text-sm text-gray-400">No subjects assigned</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {subjects.map((s: any) => (
              <div key={s.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{s.subjects?.name}</p>
                  <p className="text-xs text-gray-400">{s.subjects?.code}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <User className="w-3 h-3 text-green-600" />
                  </div>
                  <span className="text-sm text-gray-600">{s.users?.name ?? '—'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sections */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Sections</h3>
        {sections.length === 0 ? (
          <p className="text-sm text-gray-400">No sections yet</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {sections.map((sec: any) => (
              <div key={sec.id} className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                <p className="font-bold text-gray-800">Section {sec.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">Room {sec.room_number || '—'}</p>
                <p className="text-xs text-gray-400">Cap: {sec.capacity}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
