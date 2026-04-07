'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Users, BookOpen, Calendar, CheckCircle, LogOut, Eye } from 'lucide-react'
import toast from 'react-hot-toast'

type TabType = 'my-classes' | 'students' | 'attendance' | 'marks'

const tabs = [
  { id: 'my-classes', label: 'My Classes', icon: BookOpen },
  { id: 'students',   label: 'Students',   icon: Users },
  { id: 'attendance', label: 'Attendance', icon: Calendar },
  { id: 'marks',      label: 'Marks',      icon: CheckCircle },
]

export default function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('my-classes')
  const [classes, setClasses] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [attendance, setAttendance] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClass, setSelectedClass] = useState<any>(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [teacherName, setTeacherName] = useState('')
  const [stats, setStats] = useState({ totalStudents: 0, totalClasses: 0, todayAttendance: 0 })

  useEffect(() => { fetchTeacherData() }, [activeTab, selectedClass])

  const fetchTeacherData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: td } = await supabase.from('users').select('name').eq('email', user.email).maybeSingle()
    setTeacherName(td?.name || 'Teacher')

    if (activeTab === 'my-classes') {
      const { data: assignments } = await supabase.from('class_assignments')
        .select('*, classes(name), sections(name)').eq('teacher_id', user.id)
      if (assignments) { setClasses(assignments); setStats(p => ({ ...p, totalClasses: assignments.length })) }
    } else if (activeTab === 'students' && selectedClass) {
      const { data: list } = await supabase.from('students')
        .select('*, users(name, email), classes(name), sections(name)').eq('class_id', selectedClass.class_id)
      if (list) { setStudents(list); setStats(p => ({ ...p, totalStudents: list.length })) }
    } else if (activeTab === 'attendance' && selectedClass) {
      const { data: list } = await supabase.from('attendance')
        .select('*').eq('class_id', selectedClass.class_id).eq('date', selectedDate)
      if (list) { setAttendance(list); setStats(p => ({ ...p, todayAttendance: list.filter(a => a.status === 'present').length })) }
    }
    setLoading(false)
  }

  const markAttendance = async (studentId: string, status: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('attendance').upsert({
      student_id: studentId, class_id: selectedClass?.class_id,
      section_id: selectedClass?.section_id, date: selectedDate, status, marked_by: user?.id,
    })
    if (error) toast.error(error.message)
    else { toast.success('Marked'); fetchTeacherData() }
  }

  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = '/' }

  const noClassSelected = (
    <div className="bg-yellow-50 rounded-xl p-6 text-center border border-yellow-100">
      <p className="text-yellow-800 text-sm font-medium">Select a class first</p>
      <button onClick={() => setActiveTab('my-classes')} className="mt-2 text-green-600 text-sm font-semibold">View My Classes →</button>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 min-h-screen">
        <div className="bg-green-600 px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-700 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">{teacherName}</p>
              <p className="text-green-200 text-xs">Teacher</p>
            </div>
          </div>
        </div>
        {/* Stats */}
        <div className="p-4 border-b border-gray-100 grid grid-cols-3 gap-2">
          {[['Classes', stats.totalClasses], ['Students', stats.totalStudents], ['Present', stats.todayAttendance]].map(([l, v]) => (
            <div key={l} className="text-center">
              <p className="text-lg font-bold text-gray-800">{v}</p>
              <p className="text-xs text-gray-400">{l}</p>
            </div>
          ))}
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id as TabType)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                activeTab === id ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50'}`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
            <LogOut className="w-4 h-4" />Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden bg-green-600 text-white px-4 py-4 flex justify-between items-center">
          <span className="font-bold">Teacher Dashboard</span>
          <button onClick={handleLogout} className="bg-green-700 p-2 rounded-xl"><LogOut className="w-4 h-4" /></button>
        </div>

        {/* Desktop title */}
        <div className="hidden lg:flex items-center justify-between px-8 py-6 bg-white border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">{tabs.find(t => t.id === activeTab)?.label}</h1>
        </div>

        {/* Mobile tabs */}
        <div className="lg:hidden flex bg-white border-b overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id as TabType)}
              className={`flex-1 py-3 flex items-center justify-center gap-1.5 text-xs font-medium whitespace-nowrap transition ${
                activeTab === id ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        <div className="flex-1 p-4 lg:p-8">
          <div className="max-w-3xl space-y-3">
            {activeTab === 'my-classes' && (
              loading ? <div className="text-center py-16 text-gray-400">Loading...</div>
              : classes.length === 0 ? <div className="text-center py-16 text-gray-400">No classes assigned</div>
              : classes.map((cls: any) => (
                <div key={cls.id} onClick={() => { setSelectedClass(cls); setActiveTab('students') }}
                  className="bg-white rounded-xl p-4 border border-gray-100 cursor-pointer hover:border-green-200 transition flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-gray-800">{cls.classes?.name}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">Section: {cls.sections?.name} · {cls.subject || 'General'}</p>
                  </div>
                  <Eye className="w-5 h-5 text-green-500" />
                </div>
              ))
            )}

            {activeTab === 'students' && (
              !selectedClass ? noClassSelected
              : loading ? <div className="text-center py-16 text-gray-400">Loading...</div>
              : students.map((s: any) => (
                <div key={s.id} className="bg-white rounded-xl p-4 border border-gray-100">
                  <h3 className="font-semibold text-gray-800">{s.users?.name}</h3>
                  <p className="text-sm text-gray-500">Roll: {s.roll_number} · {s.users?.email}</p>
                </div>
              ))
            )}

            {activeTab === 'attendance' && (
              !selectedClass ? noClassSelected : (
                <>
                  <div className="bg-white rounded-xl p-4 border border-gray-100">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                  {loading ? <div className="text-center py-10 text-gray-400">Loading...</div>
                  : students.map((s: any) => {
                    const rec = attendance.find(a => a.student_id === s.id)
                    return (
                      <div key={s.id} className="bg-white rounded-xl p-4 border border-gray-100">
                        <div className="flex justify-between items-center mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-800">{s.users?.name}</h3>
                            <p className="text-sm text-gray-500">Roll: {s.roll_number}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            rec?.status === 'present' ? 'bg-green-100 text-green-700' :
                            rec?.status === 'absent'  ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                            {rec?.status?.toUpperCase() || 'NOT MARKED'}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          {['present','absent','late'].map(st => (
                            <button key={st} onClick={() => markAttendance(s.id, st)}
                              className={`flex-1 py-2 rounded-lg text-sm font-semibold text-white transition ${
                                st === 'present' ? 'bg-green-600 hover:bg-green-700' :
                                st === 'absent'  ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'}`}>
                              {st.charAt(0).toUpperCase() + st.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </>
              )
            )}

            {activeTab === 'marks' && (
              !selectedClass ? noClassSelected
              : students.map((s: any) => (
                <div key={s.id} className="bg-white rounded-xl p-4 border border-gray-100">
                  <h3 className="font-semibold text-gray-800 mb-3">{s.users?.name}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="number" placeholder="Marks Obtained" className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500" />
                    <input type="number" placeholder="Total Marks" className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                  <button className="w-full mt-3 bg-green-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition">Save Marks</button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
