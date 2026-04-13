'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, GraduationCap, Users, BookOpen } from 'lucide-react'

const GRADE_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  default: { bg: 'bg-slate-100',  text: 'text-slate-700',  badge: 'bg-slate-200 text-slate-700'  },
  '6':     { bg: 'bg-sky-50',     text: 'text-sky-700',    badge: 'bg-sky-100 text-sky-700'      },
  '7':     { bg: 'bg-violet-50',  text: 'text-violet-700', badge: 'bg-violet-100 text-violet-700'},
  '8':     { bg: 'bg-emerald-50', text: 'text-emerald-700',badge: 'bg-emerald-100 text-emerald-700'},
  '9':     { bg: 'bg-amber-50',   text: 'text-amber-700',  badge: 'bg-amber-100 text-amber-700'  },
  '10':    { bg: 'bg-rose-50',    text: 'text-rose-700',   badge: 'bg-rose-100 text-rose-700'    },
}

function getColor(gradeLevel: number | null) {
  return GRADE_COLORS[String(gradeLevel)] ?? GRADE_COLORS.default
}

function Avatar({ url, name }: { url?: string; name: string }) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  if (url) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={name} className="w-full h-full object-cover" />
  )
  return (
    <span className="text-2xl font-bold text-white select-none">{initials}</span>
  )
}

const AVATAR_GRADIENTS = [
  'from-sky-400 to-blue-600',
  'from-violet-400 to-purple-600',
  'from-emerald-400 to-teal-600',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-600',
  'from-cyan-400 to-sky-600',
]

function gradientFor(name: string) {
  const idx = name.charCodeAt(0) % AVATAR_GRADIENTS.length
  return AVATAR_GRADIENTS[idx]
}

export default function StudentsDirectory() {
  const [students, setStudents] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, classes: 0 })

  useEffect(() => {
    supabase.from('classes').select('id,name,grade_level').order('grade_level')
      .then(({ data }) => { if (data) setClasses(data) })
    fetchStudents()
  }, [])

  useEffect(() => {
    const t = setTimeout(fetchStudents, search ? 300 : 0)
    return () => clearTimeout(t)
  }, [search, filterClass])

  const fetchStudents = async () => {
    setLoading(true)

    let userIds: string[] = []
    if (search) {
      const { data } = await supabase.from('users').select('id').ilike('name', `%${search}%`)
      userIds = (data ?? []).map(u => u.id)
    }

    let q = supabase
      .from('students')
      .select('*, users(name, avatar_url), classes(name, grade_level), sections(name)')
      .order('roll_number')

    if (filterClass) q = q.eq('class_id', filterClass)

    if (search) {
      const parts = [
        `roll_number.ilike.%${search}%`,
        `parent_name.ilike.%${search}%`,
        ...(userIds.length > 0 ? [`user_id.in.(${userIds.join(',')})`] : []),
      ]
      q = q.or(parts.join(','))
    }

    const { data } = await q
    if (data) {
      setStudents(data)
      setStats({ total: data.length, classes: new Set(data.map(s => s.class_id)).size })
    }
    setLoading(false)
  }

  const grouped = classes
    .filter(c => !filterClass || c.id === filterClass)
    .map(c => ({
      ...c,
      students: students.filter(s => s.class_id === c.id),
    }))
    .filter(c => c.students.length > 0 || filterClass === c.id)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero header */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-10 lg:py-14">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">GHS Nawakalay (Barikot)</h1>
              <p className="text-slate-400 text-sm mt-0.5">Student Directory</p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-4 mb-8">
            <div className="bg-white/10 rounded-xl px-4 py-2 flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-300" />
              <span className="text-sm font-semibold">{stats.total} Students</span>
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-2 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-slate-300" />
              <span className="text-sm font-semibold">{classes.length} Classes</span>
            </div>
          </div>

          {/* Search + filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, parent or roll no..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-white/30 text-sm"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilterClass('')}
                className={`px-4 py-3 rounded-xl text-sm font-semibold transition ${
                  !filterClass ? 'bg-white text-slate-800' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                All
              </button>
              {classes.map(c => (
                <button
                  key={c.id}
                  onClick={() => setFilterClass(filterClass === c.id ? '' : c.id)}
                  className={`px-4 py-3 rounded-xl text-sm font-semibold transition ${
                    filterClass === c.id ? 'bg-white text-slate-800' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-3" />
                <div className="h-3 bg-gray-200 rounded mx-auto w-3/4 mb-2" />
                <div className="h-2.5 bg-gray-100 rounded mx-auto w-1/2" />
              </div>
            ))}
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-20">
            <GraduationCap className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 font-medium">No students found</p>
            {search && <p className="text-gray-300 text-sm mt-1">Try a different search term</p>}
          </div>
        ) : filterClass ? (
          // Single class — just show the grid
          <StudentGrid students={students} />
        ) : (
          // Grouped by class
          <div className="space-y-10">
            {grouped.map(cls => {
              const color = getColor(cls.grade_level)
              return (
                <section key={cls.id}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${color.badge}`}>
                      <BookOpen className="w-4 h-4" />
                      <span className="font-bold text-sm">{cls.name}</span>
                    </div>
                    <span className="text-sm text-gray-400">{cls.students.length} students</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  <StudentGrid students={cls.students} gradeLevel={cls.grade_level} />
                </section>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-8 text-xs text-gray-400 border-t border-gray-200 mt-4">
        GHS Nawakalay (Barikot) · Student Directory
      </div>
    </div>
  )
}

function StudentGrid({ students, gradeLevel }: { students: any[]; gradeLevel?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {students.map(s => (
        <StudentCard key={s.id} student={s} gradeLevel={gradeLevel ?? s.classes?.grade_level} />
      ))}
    </div>
  )
}

function StudentCard({ student: s, gradeLevel }: { student: any; gradeLevel?: number }) {
  const name     = s.users?.name ?? 'Unknown'
  const photoUrl = s.users?.avatar_url
  const color    = getColor(gradeLevel ?? null)
  const gradient = gradientFor(name)

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100 flex flex-col">
      {/* Photo */}
      <div className={`relative h-28 sm:h-32 flex items-center justify-center bg-gradient-to-br ${gradient} overflow-hidden`}>
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <Avatar url={undefined} name={name} />
        )}
        {/* Class badge */}
        <div className={`absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full ${color.badge}`}>
          {s.classes?.name ?? '—'}
        </div>
      </div>

      {/* Info */}
      <div className="p-3 flex-1 flex flex-col">
        <p className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">{name}</p>
        {s.parent_name && (
          <p className="text-xs text-gray-400 mt-1 truncate">{s.parent_name}</p>
        )}
        <div className="mt-auto pt-2 flex items-center justify-between">
          <span className="text-xs text-gray-400">Roll {s.roll_number}</span>
          {s.sections?.name && (
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${color.badge}`}>
              Sec {s.sections.name}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
