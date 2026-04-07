'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Calendar, CheckCircle, User, LogOut, TrendingUp, Award } from 'lucide-react'
import { getSession, clearSession } from '@/lib/auth'

export default function StudentDashboard() {
  const [studentData, setStudentData] = useState<any>(null)
  const [attendance, setAttendance] = useState<any[]>([])
  const [marks, setMarks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [stats, setStats] = useState({ attendancePercentage: 0, totalDays: 0, presentDays: 0, averageMarks: 0 })

  useEffect(() => { fetchStudentData() }, [])

  const fetchStudentData = async () => {
    setLoading(true)
    const session = getSession()
    if (!session) { window.location.href = '/'; return }

    // students.user_id links to our users table id
    const { data: student } = await supabase.from('students')
      .select('*, users(name, email, phone), classes(name), sections(name, room_number)')
      .eq('user_id', session.id)
      .maybeSingle()

    if (student) {
      setStudentData(student)
      const { data: aList } = await supabase.from('attendance').select('*')
        .eq('student_id', student.id).order('date', { ascending: false })
      if (aList) {
        setAttendance(aList)
        const present = aList.filter(a => a.status === 'present').length
        setStats(p => ({ ...p, attendancePercentage: aList.length > 0 ? (present / aList.length) * 100 : 0, totalDays: aList.length, presentDays: present }))
      }
      const { data: mList } = await supabase.from('marks').select('*').eq('student_id', student.id)
      if (mList) {
        setMarks(mList)
        const avg = mList.length > 0 ? mList.reduce((a, m) => a + (m.marks_obtained || 0), 0) / mList.length : 0
        setStats(p => ({ ...p, averageMarks: avg }))
      }
    }
    setLoading(false)
  }

  const handleLogout = () => { clearSession(); window.location.href = '/' }

  const monthStats = (() => {
    const f = attendance.filter(a => new Date(a.date).getMonth() === selectedMonth)
    const present = f.filter(a => a.status === 'present').length
    return { present, total: f.length, percentage: f.length > 0 ? (present / f.length) * 100 : 0 }
  })()

  const attColor = stats.attendancePercentage >= 75 ? 'text-green-600' : stats.attendancePercentage >= 60 ? 'text-orange-500' : 'text-red-500'

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 min-h-screen">
        <div className="bg-blue-600 px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-700 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">{studentData?.users?.name}</p>
              <p className="text-blue-200 text-xs">{studentData?.users?.email}</p>
            </div>
          </div>
        </div>
        <div className="p-4 border-b border-gray-100 space-y-2">
          <div className="flex justify-between"><span className="text-sm text-gray-500">Class</span><span className="text-sm font-semibold text-gray-800">{studentData?.classes?.name}</span></div>
          <div className="flex justify-between"><span className="text-sm text-gray-500">Section</span><span className="text-sm font-semibold text-gray-800">{studentData?.sections?.name}</span></div>
          <div className="flex justify-between"><span className="text-sm text-gray-500">Roll No</span><span className="text-sm font-semibold text-gray-800">{studentData?.roll_number}</span></div>
        </div>
        <div className="p-4 border-b border-gray-100 space-y-3">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm text-gray-500">Attendance</span>
              <span className={`text-sm font-bold ${attColor}`}>{stats.attendancePercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: `${stats.attendancePercentage}%` }} />
            </div>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Avg Marks</span>
            <span className="text-sm font-bold text-blue-600">{stats.averageMarks.toFixed(0)}%</span>
          </div>
        </div>
        <div className="flex-1" />
        <div className="p-4 border-t border-gray-100">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
            <LogOut className="w-4 h-4" />Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden bg-blue-600 text-white px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-700 rounded-full flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold">{studentData?.users?.name}</p>
                <div className="flex gap-2 mt-0.5">
                  <span className="bg-blue-700 px-2 py-0.5 rounded-full text-xs">{studentData?.classes?.name}</span>
                  <span className="bg-blue-700 px-2 py-0.5 rounded-full text-xs">Roll: {studentData?.roll_number}</span>
                </div>
              </div>
            </div>
            <button onClick={handleLogout} className="bg-blue-700 p-2 rounded-xl"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Desktop title */}
        <div className="hidden lg:flex items-center px-8 py-6 bg-white border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Student Dashboard</h1>
        </div>

        <div className="flex-1 p-4 lg:p-8">
          <div className="max-w-3xl space-y-4">
            {/* Mobile stats */}
            <div className="lg:hidden grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <div className="flex justify-between mb-2"><CheckCircle className="w-5 h-5 text-green-600" /><span className="text-xs text-gray-400">Overall</span></div>
                <p className={`text-2xl font-bold ${attColor}`}>{stats.attendancePercentage.toFixed(1)}%</p>
                <p className="text-xs text-gray-400 mt-1">Attendance</p>
                <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                  <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${stats.attendancePercentage}%` }} />
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <div className="flex justify-between mb-2"><Award className="w-5 h-5 text-blue-600" /><span className="text-xs text-gray-400">Average</span></div>
                <p className="text-2xl font-bold text-blue-600">{stats.averageMarks.toFixed(0)}%</p>
                <p className="text-xs text-gray-400 mt-1">Marks</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
                <p className="text-2xl font-bold text-blue-600">{stats.totalDays}</p>
                <p className="text-xs text-gray-500">Total Days</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center border border-green-100">
                <p className="text-2xl font-bold text-green-600">{stats.presentDays}</p>
                <p className="text-xs text-gray-500">Present</p>
              </div>
              <div className="bg-red-50 rounded-xl p-3 text-center border border-red-100">
                <p className="text-2xl font-bold text-red-500">{stats.totalDays - stats.presentDays}</p>
                <p className="text-xs text-gray-500">Absent</p>
              </div>
            </div>

            {/* Monthly */}
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-800">Monthly Attendance</h3>
                <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={i}>{new Date(2024, i).toLocaleString('default', { month: 'long' })}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-3xl font-bold text-blue-600">{monthStats.percentage.toFixed(0)}%</p>
                  <p className="text-xs text-gray-400 mt-1">This month</p>
                </div>
                <div className="text-right text-sm">
                  <p><span className="text-green-600 font-semibold">{monthStats.present}</span> Present</p>
                  <p><span className="text-red-500 font-semibold">{monthStats.total - monthStats.present}</span> Absent</p>
                  <p className="text-gray-400 text-xs">Total: {monthStats.total}</p>
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 mt-3">
                <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${monthStats.percentage}%` }} />
              </div>
            </div>

            {/* Recent attendance */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />Recent Attendance
              </h3>
              <div className="space-y-2">
                {attendance.slice(0, 7).map((r: any) => (
                  <div key={r.id} className="bg-white rounded-xl p-3 flex justify-between items-center border border-gray-100">
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{new Date(r.date).toLocaleDateString()}</p>
                      {r.remarks && <p className="text-xs text-gray-400">{r.remarks}</p>}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      r.status === 'present' ? 'bg-green-100 text-green-700' :
                      r.status === 'absent'  ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                      {r.status.toUpperCase()}
                    </span>
                  </div>
                ))}
                {attendance.length === 0 && <div className="bg-white rounded-xl p-8 text-center border border-gray-100 text-gray-400 text-sm">No records yet</div>}
              </div>
            </div>

            {/* Marks */}
            {marks.length > 0 && (
              <div className="pb-6">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />Recent Marks
                </h3>
                <div className="space-y-2">
                  {marks.slice(0, 5).map((m: any) => (
                    <div key={m.id} className="bg-white rounded-xl p-3 border border-gray-100">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-gray-800 text-sm">{m.subject_name || m.subject}</span>
                        <span className="text-sm font-semibold text-blue-600">{m.marks_obtained}/{m.total_marks}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${(m.marks_obtained / m.total_marks) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
