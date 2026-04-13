'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { CheckCircle, Calendar, Users, ChevronDown, User } from 'lucide-react'
import toast from 'react-hot-toast'

const ABSENCE_REASONS = [
  { value: 'leave',        label: 'Leave'        },
  { value: 'sick',         label: 'Sick'         },
  { value: 'unauthorized', label: 'Unauthorized' },
  { value: 'suspended',    label: 'Suspended'    },
  { value: 'other',        label: 'Other'        },
]

const STATUS_STYLE: Record<string, string> = {
  present: 'bg-green-100 text-green-700',
  absent:  'bg-red-100 text-red-600',
  late:    'bg-orange-100 text-orange-600',
}

export default function StudentAttendanceTab() {
  const [classes, setClasses] = useState<any[]>([])
  const [selectedClass, setSelectedClass] = useState<any>(null)
  const [students, setStudents] = useState<any[]>([])
  const [attendance, setAttendance] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [absenceReasons, setAbsenceReasons] = useState<Record<string, string>>({})
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, late: 0 })

  useEffect(() => {
    supabase.from('classes').select('*, sections(*)').order('grade_level')
      .then(({ data }) => { if (data) setClasses(data) })
  }, [])

  useEffect(() => { if (selectedClass) loadAttendance() }, [selectedClass, selectedDate])

  const loadAttendance = async () => {
    setLoading(true)
    const [stuRes, attRes] = await Promise.all([
      supabase.from('students')
        .select('*, users(name, avatar_url)')
        .eq('class_id', selectedClass.id)
        .order('roll_number'),
      supabase.from('attendance')
        .select('*')
        .eq('class_id', selectedClass.id)
        .eq('date', selectedDate),
    ])
    const studs = stuRes.data ?? []
    const atts  = attRes.data ?? []
    setStudents(studs)
    setAttendance(atts)
    setStats({
      total:   studs.length,
      present: atts.filter(a => a.status === 'present').length,
      absent:  atts.filter(a => a.status === 'absent').length,
      late:    atts.filter(a => a.status === 'late').length,
    })
    setLoading(false)
  }

  const mark = async (studentId: string, status: string) => {
    const reason = absenceReasons[studentId] ?? 'leave'
    await supabase.from('attendance').delete()
      .eq('student_id', studentId).eq('date', selectedDate)
    const { error } = await supabase.from('attendance').insert({
      student_id:     studentId,
      class_id:       selectedClass.id,
      section_id:     selectedClass.sections?.[0]?.id ?? null,
      date:           selectedDate,
      status,
      absence_reason: status === 'absent' ? reason : null,
      remarks:        status === 'absent' ? `Absent — ${reason}` : '',
    })
    if (error) toast.error(error.message)
    else loadAttendance()
  }

  const markAll = async (status: string) => {
    if (!students.length) return
    await supabase.from('attendance').delete()
      .eq('class_id', selectedClass.id).eq('date', selectedDate)
    const { error } = await supabase.from('attendance').insert(
      students.map(s => ({
        student_id:     s.id,
        class_id:       selectedClass.id,
        section_id:     selectedClass.sections?.[0]?.id ?? null,
        date:           selectedDate,
        status,
        absence_reason: status === 'absent' ? 'leave' : null,
        remarks:        status === 'absent' ? 'Absent — leave' : '',
      }))
    )
    if (error) toast.error(error.message)
    else { toast.success(`${students.length} students marked ${status}`); loadAttendance() }
  }

  const pct = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0

  return (
    <div className="space-y-3 max-w-3xl">
      {/* Controls row */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <select
            value={selectedClass?.id ?? ''}
            onChange={e => setSelectedClass(classes.find(c => c.id === e.target.value) ?? null)}
            className="w-full appearance-none pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white"
          >
            <option value="">Select class</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>
        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
      </div>

      {!selectedClass ? (
        <div className="bg-purple-50 rounded-xl p-10 text-center border border-purple-100">
          <Calendar className="w-8 h-8 text-purple-300 mx-auto mb-2" />
          <p className="text-purple-700 text-sm font-medium">Select a class to view attendance</p>
        </div>
      ) : loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading...</div>
      ) : (
        <>
          {/* Stats bar */}
          <div className="bg-white rounded-xl border border-gray-100 p-3">
            <div className="grid grid-cols-4 gap-2 mb-2">
              {[
                { label: 'Total',   value: stats.total,   cls: 'text-gray-800'   },
                { label: 'Present', value: stats.present, cls: 'text-green-600'  },
                { label: 'Absent',  value: stats.absent,  cls: 'text-red-500'    },
                { label: 'Late',    value: stats.late,    cls: 'text-orange-500' },
              ].map(({ label, value, cls }) => (
                <div key={label} className="text-center">
                  <p className={`text-lg font-bold ${cls}`}>{value}</p>
                  <p className="text-xs text-gray-400">{label}</p>
                </div>
              ))}
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-right text-xs text-gray-400 mt-1">{pct}% present</p>
          </div>

          {/* Bulk actions */}
          {students.length > 0 && (
            <div className="flex gap-2">
              <button onClick={() => markAll('present')}
                className="flex-1 bg-green-600 text-white py-1.5 rounded-lg text-xs font-semibold hover:bg-green-700 transition flex items-center justify-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />All Present
              </button>
              <button onClick={() => markAll('absent')}
                className="flex-1 bg-red-500 text-white py-1.5 rounded-lg text-xs font-semibold hover:bg-red-600 transition flex items-center justify-center gap-1">
                All Absent
              </button>
            </div>
          )}

          {/* Student list */}
          {students.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Users className="w-8 h-8 mx-auto mb-2 text-gray-200" />
              <p className="text-sm">No students in this class</p>
            </div>
          ) : (
            <div className="space-y-2">
              {students.map(s => {
                const rec    = attendance.find(a => a.student_id === s.id)
                const reason = absenceReasons[s.id] ?? rec?.absence_reason ?? 'leave'
                const photo  = s.users?.avatar_url ?? null

                return (
                  <div key={s.id} className="bg-white rounded-xl border border-gray-100 p-3">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-purple-100 flex items-center justify-center shrink-0">
                        {photo
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={photo} alt="" className="w-full h-full object-cover" loading="lazy" />
                          : <User className="w-5 h-5 text-purple-400" />
                        }
                      </div>

                      {/* Name + roll */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm truncate">{s.users?.name}</p>
                        <p className="text-xs text-gray-400">Roll {s.roll_number}</p>
                      </div>

                      {/* Status badge */}
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                        rec ? STATUS_STYLE[rec.status] ?? 'bg-gray-100 text-gray-500' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {rec?.status?.toUpperCase() ?? '—'}
                      </span>
                    </div>

                    {/* Reason + buttons row */}
                    <div className="flex items-center gap-2 mt-2">
                      <select
                        value={reason}
                        onChange={e => setAbsenceReasons(r => ({ ...r, [s.id]: e.target.value }))}
                        className="flex-1 px-2 py-1 border border-gray-200 rounded-lg text-xs text-gray-600 bg-gray-50 outline-none focus:ring-1 focus:ring-purple-400"
                      >
                        {ABSENCE_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>

                      <div className="flex gap-1 shrink-0">
                        {(['present', 'absent', 'late'] as const).map(st => (
                          <button key={st} onClick={() => mark(s.id, st)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold text-white transition ${
                              st === 'present' ? 'bg-green-600 hover:bg-green-700' :
                              st === 'absent'  ? 'bg-red-500 hover:bg-red-600' :
                              'bg-orange-500 hover:bg-orange-600'
                            } ${rec?.status === st ? 'ring-2 ring-offset-1 ring-current' : ''}`}>
                            {st === 'present' ? 'P' : st === 'absent' ? 'A' : 'L'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
