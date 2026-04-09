'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { CheckCircle, Clock, Calendar, Users, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'

const ABSENCE_REASONS = [
  { value: 'leave',        label: 'Leave' },
  { value: 'sick',         label: 'Sick' },
  { value: 'unauthorized', label: 'Unauthorized' },
  { value: 'suspended',    label: 'Suspended' },
  { value: 'other',        label: 'Other' },
]

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

  useEffect(() => {
    if (selectedClass) loadAttendance()
  }, [selectedClass, selectedDate])

  const loadAttendance = async () => {
    setLoading(true)
    const [stuRes, attRes] = await Promise.all([
      supabase.from('students').select('*, users(name)').eq('class_id', selectedClass.id).order('roll_number'),
      supabase.from('attendance').select('*').eq('class_id', selectedClass.id).eq('date', selectedDate),
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
    const { error } = await supabase.from('attendance').upsert({
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
    for (const s of students) await mark(s.id, status)
    toast.success(`All marked ${status}`)
  }

  const pct = stats.total > 0 ? ((stats.present / stats.total) * 100).toFixed(0) : '0'

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <select
            value={selectedClass?.id ?? ''}
            onChange={e => {
              const cls = classes.find(c => c.id === e.target.value)
              setSelectedClass(cls ?? null)
            }}
            className="w-full appearance-none px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white pr-10"
          >
            <option value="">Select a class</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
        <input
          type="date" value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none"
        />
      </div>

      {!selectedClass ? (
        <div className="bg-purple-50 rounded-xl p-10 text-center border border-purple-100">
          <Calendar className="w-10 h-10 text-purple-300 mx-auto mb-3" />
          <p className="text-purple-700 font-medium">Select a class to view attendance</p>
        </div>
      ) : loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Total',   value: stats.total,   color: 'text-gray-800',   bg: 'bg-white'       },
              { label: 'Present', value: stats.present, color: 'text-green-600',  bg: 'bg-green-50'    },
              { label: 'Absent',  value: stats.absent,  color: 'text-red-500',    bg: 'bg-red-50'      },
              { label: 'Late',    value: stats.late,    color: 'text-orange-500', bg: 'bg-orange-50'   },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`${bg} rounded-xl p-3 text-center border border-gray-100`}>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>

          {/* Progress */}
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium text-gray-700">Attendance Rate</span>
              <span className="font-bold text-purple-600">{pct}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* Bulk actions */}
          {students.length > 0 && (
            <div className="flex gap-2">
              <button onClick={() => markAll('present')}
                className="flex-1 bg-green-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-green-700 transition flex items-center justify-center gap-1.5">
                <CheckCircle className="w-4 h-4" />Mark All Present
              </button>
              <button onClick={() => markAll('absent')}
                className="flex-1 bg-red-500 text-white py-2 rounded-xl text-sm font-semibold hover:bg-red-600 transition flex items-center justify-center gap-1.5">
                Mark All Absent
              </button>
            </div>
          )}

          {/* Student list */}
          {students.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Users className="w-10 h-10 mx-auto mb-2 text-gray-200" />
              No students in this class
            </div>
          ) : (
            <div className="space-y-2">
              {students.map(s => {
                const rec    = attendance.find(a => a.student_id === s.id)
                const reason = absenceReasons[s.id] ?? rec?.absence_reason ?? 'leave'
                return (
                  <div key={s.id} className="bg-white rounded-xl p-4 border border-gray-100">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-gray-800">{s.users?.name}</p>
                        <p className="text-xs text-gray-400">Roll: {s.roll_number}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        rec?.status === 'present' ? 'bg-green-100 text-green-700' :
                        rec?.status === 'absent'  ? 'bg-red-100 text-red-600'    :
                        rec?.status === 'late'    ? 'bg-orange-100 text-orange-600' :
                        'bg-gray-100 text-gray-500'}`}>
                        {rec?.status?.toUpperCase() ?? 'NOT MARKED'}
                      </span>
                    </div>

                    {/* Absence reason */}
                    <select
                      value={reason}
                      onChange={e => setAbsenceReasons(r => ({ ...r, [s.id]: e.target.value }))}
                      className="w-full mb-2 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 bg-gray-50 focus:ring-2 focus:ring-purple-400 outline-none"
                    >
                      {ABSENCE_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>

                    <div className="grid grid-cols-3 gap-2">
                      {(['present', 'absent', 'late'] as const).map(st => (
                        <button key={st} onClick={() => mark(s.id, st)}
                          className={`py-1.5 rounded-lg text-xs font-semibold text-white transition ${
                            st === 'present' ? 'bg-green-600 hover:bg-green-700' :
                            st === 'absent'  ? 'bg-red-500 hover:bg-red-600' :
                            'bg-orange-500 hover:bg-orange-600'}`}>
                          {st.charAt(0).toUpperCase() + st.slice(1)}
                        </button>
                      ))}
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
