'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Calendar, CheckCircle, Clock, Users, LogOut, School } from 'lucide-react'
import toast from 'react-hot-toast'

type ClassWithSections = { id: string; name: string; sections: { id: string; name: string }[] }
type StudentRow = { id: string; roll_number: string; users: { name: string; email: string } | null }
type AttendanceRow = { id: string; student_id: string; status: string; absence_reason?: string }

const ABSENCE_REASONS = [
  { value: 'leave',        label: 'Leave' },
  { value: 'sick',         label: 'Sick' },
  { value: 'unauthorized', label: 'Unauthorized' },
  { value: 'suspended',    label: 'Suspended' },
  { value: 'other',        label: 'Other' },
]

export default function FarmMasterDashboard() {
  const [classes, setClasses] = useState<ClassWithSections[]>([])
  const [selectedClass, setSelectedClass] = useState<ClassWithSections | null>(null)
  const [students, setStudents] = useState<StudentRow[]>([])
  const [attendance, setAttendance] = useState<AttendanceRow[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalStudents: 0, presentToday: 0, absentToday: 0, lateToday: 0 })
  const [farmMasterName, setFarmMasterName] = useState('')
  // per-student absence reason, keyed by student id
  const [absenceReasons, setAbsenceReasons] = useState<Record<string, string>>({})

  useEffect(() => { fetchData() }, [selectedClass, selectedDate])

  const fetchData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: ud } = await supabase.from('users').select('name').eq('email', user.email).maybeSingle()
    setFarmMasterName(ud?.name || 'Farm Master')

    const { data: cls } = await supabase.from('classes').select('*, sections(*)')
    if (cls) setClasses(cls)

    if (selectedClass) {
      const { data: sList } = await supabase.from('students')
        .select('*, users(name, email)').eq('class_id', selectedClass.id)
      if (sList) { setStudents(sList); setStats(p => ({ ...p, totalStudents: sList.length })) }

      const { data: aList } = await supabase.from('attendance')
        .select('*').eq('class_id', selectedClass.id).eq('date', selectedDate)
      if (aList) {
        setAttendance(aList)
        setStats(p => ({
          ...p,
          presentToday: aList.filter(a => a.status === 'present').length,
          absentToday:  aList.filter(a => a.status === 'absent').length,
          lateToday:    aList.filter(a => a.status === 'late').length,
        }))
      }
    }
    setLoading(false)
  }

  const markAttendance = async (studentId: string, status: string, absenceReason = 'leave') => {
    const session = (await import('@/lib/auth')).getSession()

    // Delete existing record for this student+date first, then insert fresh
    // This avoids upsert constraint issues entirely
    await supabase.from('attendance')
      .delete()
      .eq('student_id', studentId)
      .eq('date', selectedDate)

    const { error } = await supabase.from('attendance').insert({
      student_id:     studentId,
      class_id:       selectedClass?.id,
      section_id:     selectedClass?.sections?.[0]?.id ?? null,
      date:           selectedDate,
      status,
      marked_by:      session?.id ?? null,
      remarks:        status === 'absent' ? `Absent — ${absenceReason}` : '',
      absence_reason: status === 'absent' ? absenceReason : null,
    })
    if (error) toast.error(error.message)
    else { toast.success(`Marked ${status}`); fetchData() }
  }

  const markAllPresent = async () => {
    if (!selectedClass || students.length === 0) return
    const session = (await import('@/lib/auth')).getSession()
    const sectionId = selectedClass.sections?.[0]?.id ?? null

    await supabase.from('attendance')
      .delete()
      .eq('class_id', selectedClass.id)
      .eq('date', selectedDate)

    const rows = students.map(s => ({
      student_id: s.id,
      class_id:   selectedClass.id,
      section_id: sectionId,
      date:       selectedDate,
      status:     'present',
      marked_by:  session?.id ?? null,
      remarks:    '',
    }))

    const { error } = await supabase.from('attendance').insert(rows)
    if (error) toast.error(error.message)
    else { toast.success(`All ${students.length} students marked present`); fetchData() }
  }

  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = '/' }

  const pct = stats.totalStudents > 0 ? ((stats.presentToday / stats.totalStudents) * 100).toFixed(1) : '0'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 min-h-screen">
        <div className="bg-orange-600 px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-700 rounded-xl flex items-center justify-center">
              <School className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">{farmMasterName}</p>
              <p className="text-orange-200 text-xs">Farm Master</p>
            </div>
          </div>
        </div>

        {/* Stats in sidebar */}
        <div className="p-4 border-b border-gray-100 space-y-2">
          {[
            { label: 'Total Students', value: stats.totalStudents, color: 'text-gray-800' },
            { label: 'Present',        value: stats.presentToday,  color: 'text-green-600' },
            { label: 'Absent',         value: stats.absentToday,   color: 'text-red-500'   },
            { label: 'Late',           value: stats.lateToday,     color: 'text-orange-500'},
          ].map(({ label, value, color }) => (
            <div key={label} className="flex justify-between items-center">
              <span className="text-sm text-gray-500">{label}</span>
              <span className={`font-bold ${color}`}>{value}</span>
            </div>
          ))}
        </div>

        {/* Class list in sidebar */}
        <div className="flex-1 p-4 overflow-y-auto">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Classes</p>
          <div className="space-y-1">
            {classes.map(cls => (
              <button key={cls.id} onClick={() => setSelectedClass(cls)}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition ${
                  selectedClass?.id === cls.id ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                {cls.name}
                <span className="text-xs text-gray-400 ml-2">{cls.sections?.length || 0} sections</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-gray-100">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
            <LogOut className="w-4 h-4" />Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden bg-orange-600 text-white px-4 py-4 flex justify-between items-center">
          <span className="font-bold">Farm Master Dashboard</span>
          <button onClick={handleLogout} className="bg-orange-700 p-2 rounded-xl"><LogOut className="w-4 h-4" /></button>
        </div>

        {/* Desktop title */}
        <div className="hidden lg:flex items-center justify-between px-8 py-6 bg-white border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">
            {selectedClass ? `Attendance — ${selectedClass.name}` : 'Select a Class'}
          </h1>
        </div>

        {/* Mobile stats */}
        <div className="lg:hidden grid grid-cols-4 gap-2 p-4">
          {[
            { label: 'Total',   value: stats.totalStudents, icon: Users,       color: 'text-orange-600' },
            { label: 'Present', value: stats.presentToday,  icon: CheckCircle, color: 'text-green-600'  },
            { label: 'Late',    value: stats.lateToday,     icon: Clock,       color: 'text-orange-500' },
            { label: 'Absent',  value: stats.absentToday,   icon: Calendar,    color: 'text-red-500'    },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl p-2 text-center border border-gray-100">
              <Icon className={`w-4 h-4 ${color} mx-auto mb-1`} />
              <p className={`text-lg font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          ))}
        </div>

        {/* Mobile class selector */}
        <div className="lg:hidden px-4 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Class</label>
          <div className="grid grid-cols-2 gap-2">
            {classes.map(cls => (
              <button key={cls.id} onClick={() => setSelectedClass(cls)}
                className={`p-3 rounded-xl text-center border transition text-sm font-medium ${
                  selectedClass?.id === cls.id ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-700 border-gray-200'}`}>
                {cls.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 p-4 lg:p-8">
          <div className="max-w-3xl">
            {/* Date picker */}
            <div className="bg-white rounded-xl p-4 border border-gray-100 mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500" />
            </div>

            {!selectedClass ? (
              <div className="bg-orange-50 rounded-xl p-10 text-center border border-orange-100">
                <Calendar className="w-10 h-10 text-orange-300 mx-auto mb-3" />
                <p className="text-orange-700 font-medium">Select a class to mark attendance</p>
              </div>
            ) : loading ? (
              <div className="text-center py-16 text-gray-400">Loading...</div>
            ) : students.length === 0 ? (
              <div className="text-center py-16 text-gray-400">No students in this class</div>
            ) : (
              <div className="space-y-3">
                {/* Summary */}
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-gray-700">Attendance Summary</span>
                    <span className="text-sm font-semibold text-orange-600">{pct}% Present</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                {/* Mark all */}
                <button onClick={markAllPresent}
                  className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-green-700 transition">
                  <CheckCircle className="w-5 h-5" />Mark All Present
                </button>

                {students.map(student => {
                  const rec = attendance.find(a => a.student_id === student.id)
                  const reason = absenceReasons[student.id] ?? rec?.absence_reason ?? 'leave'
                  return (
                    <div key={student.id} className="bg-white rounded-xl p-4 border border-gray-100">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-800">{student.users?.name}</h3>
                          <p className="text-sm text-gray-500">Roll No: {student.roll_number}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          rec?.status === 'present' ? 'bg-green-100 text-green-700' :
                          rec?.status === 'absent'  ? 'bg-red-100 text-red-700' :
                          rec?.status === 'late'    ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-500'}`}>
                          {rec?.status?.toUpperCase() || 'NOT MARKED'}
                        </span>
                      </div>

                      {/* Absence reason — shown when already absent or pre-selecting */}
                      <div className="mb-2">
                        <select
                          value={reason}
                          onChange={e => setAbsenceReasons(r => ({ ...r, [student.id]: e.target.value }))}
                          className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 focus:ring-2 focus:ring-orange-400 outline-none bg-gray-50"
                        >
                          {ABSENCE_REASONS.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => markAttendance(student.id, 'present')}
                          className="py-2 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-700 transition">
                          Present
                        </button>
                        <button onClick={() => markAttendance(student.id, 'absent', reason)}
                          className="py-2 rounded-lg text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition">
                          Absent
                        </button>
                        <button onClick={() => markAttendance(student.id, 'late')}
                          className="py-2 rounded-lg text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 transition">
                          Late
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
