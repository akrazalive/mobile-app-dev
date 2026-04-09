'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { CheckCircle, Calendar, Users, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'

// Teachers have their own attendance — present/absent/late with a reason
const ABSENCE_REASONS = [
  { value: 'leave',        label: 'Leave' },
  { value: 'sick',         label: 'Sick' },
  { value: 'unauthorized', label: 'Unauthorized' },
  { value: 'other',        label: 'Other' },
]

// We store teacher attendance in the same attendance table
// using teacher's user id as student_id is wrong — instead we use a separate
// approach: store in attendance with student_id = null and a teacher_id column.
// But since schema doesn't have teacher attendance table yet, we use the users
// table to list teachers and a dedicated teacher_attendance table approach.
// For now we use a simple local state + supabase upsert into a "teacher_attendance"
// concept stored in attendance with class_id = null and a remarks field.
// CLEANEST: use the existing attendance table with student_id pointing to
// the teacher's own student-like record — but teachers don't have student records.
// BEST APPROACH without schema change: store in a separate table.
// We'll use the existing `leave_requests` table for teacher absences,
// and show a simple daily register UI.

type TeacherRecord = {
  id: string
  name: string
  email: string
  phone?: string
  status?: string
  reason?: string
}

export default function TeacherAttendanceTab() {
  const [teachers, setTeachers] = useState<TeacherRecord[]>([])
  const [attendance, setAttendance] = useState<Record<string, { status: string; reason: string }>>({})
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => { loadTeachers() }, [])
  useEffect(() => { if (teachers.length > 0) loadAttendance() }, [selectedDate, teachers])

  const loadTeachers = async () => {
    setLoading(true)
    const { data } = await supabase.from('users').select('id,name,email,phone')
      .eq('role', 'teacher').eq('is_active', true).order('name')
    if (data) setTeachers(data)
    setLoading(false)
  }

  const loadAttendance = async () => {
    // We store teacher attendance in leave_requests with leave_type = 'sick'/'casual'
    // and status = 'approved' meaning they were absent that day.
    // For present we just don't have a record.
    // Better: use a dedicated query. We'll use the attendance table with
    // student_id = teacher's id (treating teacher id as the record key via remarks).
    // Actually cleanest without schema change: store in attendance with
    // student_id = null is not allowed (NOT NULL). 
    // We'll use a workaround: store teacher daily attendance in a JSON in localStorage
    // for now and persist to supabase via remarks in leave_requests.
    // 
    // REAL SOLUTION: just use leave_requests for absences, and assume present otherwise.
    const { data } = await supabase
      .from('leave_requests')
      .select('user_id, leave_type, status, reason, start_date')
      .eq('start_date', selectedDate)
      .in('user_id', teachers.map(t => t.id))

    const map: Record<string, { status: string; reason: string }> = {}
    if (data) {
      data.forEach(r => {
        map[r.user_id] = {
          status: r.status === 'approved' ? 'absent' : 'leave_pending',
          reason: r.leave_type ?? 'leave',
        }
      })
    }
    setAttendance(map)
  }

  const mark = async (teacherId: string, status: string, reason = 'leave') => {
    setSaving(teacherId)
    try {
      if (status === 'present') {
        // Remove any leave request for this date
        await supabase.from('leave_requests')
          .delete()
          .eq('user_id', teacherId)
          .eq('start_date', selectedDate)
        setAttendance(a => { const n = { ...a }; delete n[teacherId]; return n })
        toast.success('Marked present')
      } else {
        // Upsert a leave request as the absence record
        const { error } = await supabase.from('leave_requests').upsert({
          user_id:    teacherId,
          leave_type: reason as any,
          start_date: selectedDate,
          end_date:   selectedDate,
          reason:     `Marked ${status} by principal`,
          status:     'approved',
        }, { onConflict: 'user_id,start_date' })
        if (error) throw error
        setAttendance(a => ({ ...a, [teacherId]: { status, reason } }))
        toast.success(`Marked ${status}`)
      }
    } catch (err: any) {
      toast.error(err.message)
    }
    setSaving(null)
  }

  const present  = teachers.filter(t => !attendance[t.id]).length
  const absent   = teachers.filter(t => attendance[t.id]?.status === 'absent').length

  return (
    <div className="space-y-4">
      {/* Date picker */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-800">Teacher Attendance Register</h3>
          <p className="text-sm text-gray-400 mt-0.5">Mark daily attendance for all teachers</p>
        </div>
        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
          <p className="text-xl font-bold text-gray-800">{teachers.length}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3 text-center border border-green-100">
          <p className="text-xl font-bold text-green-600">{present}</p>
          <p className="text-xs text-gray-500">Present</p>
        </div>
        <div className="bg-red-50 rounded-xl p-3 text-center border border-red-100">
          <p className="text-xl font-bold text-red-500">{absent}</p>
          <p className="text-xs text-gray-500">Absent</p>
        </div>
      </div>

      {/* Bulk mark all present */}
      {teachers.length > 0 && (
        <button onClick={async () => { for (const t of teachers) await mark(t.id, 'present'); toast.success('All marked present') }}
          className="w-full bg-green-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2">
          <CheckCircle className="w-4 h-4" />Mark All Present
        </button>
      )}

      {/* Teacher list */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : teachers.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users className="w-10 h-10 mx-auto mb-2 text-gray-200" />
          No teachers found
        </div>
      ) : (
        <div className="space-y-2">
          {teachers.map(t => {
            const rec    = attendance[t.id]
            const status = rec?.status ?? 'present'
            const reason = rec?.reason ?? 'leave'
            const isSaving = saving === t.id

            return (
              <div key={t.id} className="bg-white rounded-xl p-4 border border-gray-100">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-gray-800">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.email}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    status === 'present' ? 'bg-green-100 text-green-700' :
                    status === 'absent'  ? 'bg-red-100 text-red-600'    :
                    'bg-yellow-100 text-yellow-700'}`}>
                    {status === 'present' ? 'PRESENT' : status === 'absent' ? 'ABSENT' : 'LEAVE PENDING'}
                  </span>
                </div>

                {/* Reason dropdown */}
                <div className="relative mb-2">
                  <select
                    defaultValue={reason}
                    onChange={e => {
                      // update local reason for this teacher
                      setAttendance(a => ({ ...a, [t.id]: { status: a[t.id]?.status ?? 'absent', reason: e.target.value } }))
                    }}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 bg-gray-50 focus:ring-2 focus:ring-purple-400 outline-none appearance-none pr-8"
                  >
                    {ABSENCE_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => mark(t.id, 'present')} disabled={isSaving}
                    className="py-1.5 rounded-lg text-xs font-semibold text-white bg-green-600 hover:bg-green-700 transition disabled:opacity-50">
                    Present
                  </button>
                  <button onClick={() => mark(t.id, 'absent', attendance[t.id]?.reason ?? 'leave')} disabled={isSaving}
                    className="py-1.5 rounded-lg text-xs font-semibold text-white bg-red-500 hover:bg-red-600 transition disabled:opacity-50">
                    Absent
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
