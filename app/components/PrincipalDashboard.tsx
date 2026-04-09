'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Users, BookOpen, GraduationCap, Plus, Trash2, LogOut, Crown, Edit, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { clearSession } from '@/lib/auth'

type TabType = 'students' | 'teachers' | 'classes' | 'sections'

const tabs = [
  { id: 'students', label: 'Students', icon: GraduationCap },
  { id: 'teachers', label: 'Teachers', icon: Users },
  { id: 'classes',  label: 'Classes',  icon: BookOpen },
  { id: 'sections', label: 'Sections', icon: BookOpen },
]

type Student = {
  id?: string
  student_name: string
  roll_number: string
  class_id: string
  section_id: string
  parent_name: string
  parent_phone: string
  parent_email: string
  address: string
  date_of_birth: string
  gender: string
  blood_group: string
  medical_info: string
  user_id?: string
  users?: { name: string; email: string }
  classes?: { name: string }
  sections?: { name: string }
}

export default function PrincipalDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('students')
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  
  // Form state
  const [classes, setClasses] = useState<any[]>([])
  const [sections, setSections] = useState<any[]>([])
  const [formLoading, setFormLoading] = useState(false)
  
  const [formData, setFormData] = useState<Student>({
    student_name: '',
    roll_number: '',
    class_id: '',
    section_id: '',
    parent_name: '',
    parent_phone: '',
    parent_email: '',
    address: '',
    date_of_birth: '',
    gender: 'male',
    blood_group: '',
    medical_info: ''
  })

  useEffect(() => { 
    fetchData() 
    fetchClasses()
  }, [activeTab])

  const fetchData = async () => {
    setLoading(true)
    let query
    switch (activeTab) {
      case 'students': 
        query = supabase.from('students').select('*, users(name, email), classes(name), sections(name)')
        break
      case 'teachers': 
        query = supabase.from('users').select('*').eq('role', 'teacher')
        break
      case 'classes':  
        query = supabase.from('classes').select('*')
        break
      case 'sections': 
        query = supabase.from('sections').select('*, classes(name)')
        break
    }
    const { data: result, error } = await query
    if (!error) setData(result || [])
    setLoading(false)
  }

  const fetchClasses = async () => {
    const { data } = await supabase.from('classes').select('*').order('name')
    if (data) setClasses(data)
  }

  const fetchSections = async (classId: string) => {
    const { data } = await supabase
      .from('sections')
      .select('*')
      .eq('class_id', classId)
    if (data) setSections(data)
  }

  const handleClassChange = (classId: string) => {
    setFormData({ ...formData, class_id: classId, section_id: '' })
    fetchSections(classId)
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingStudent(null)
    setFormData({
      student_name: '',
      roll_number: '',
      class_id: '',
      section_id: '',
      parent_name: '',
      parent_phone: '',
      parent_email: '',
      address: '',
      date_of_birth: '',
      gender: 'male',
      blood_group: '',
      medical_info: ''
    })
    setSections([])
  }

  const handleEdit = (student: any) => {
    setEditingStudent(student)
    setFormData({
      student_name: student.users?.name || '',
      roll_number: student.roll_number || '',
      class_id: student.class_id || '',
      section_id: student.section_id || '',
      parent_name: student.parent_name || '',
      parent_phone: student.parent_phone || '',
      parent_email: student.parent_email || '',
      address: student.address || '',
      date_of_birth: student.date_of_birth || '',
      gender: student.gender || 'male',
      blood_group: student.blood_group || '',
      medical_info: student.medical_info || ''
    })
    if (student.class_id) fetchSections(student.class_id)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)

    try {
      if (editingStudent?.id) {
        // Update user name
        if (editingStudent.user_id) {
          await supabase.from('users').update({ name: formData.student_name }).eq('id', editingStudent.user_id)
        }
        // Update student record
        const { error } = await supabase.from('students').update({
          roll_number: formData.roll_number,
          class_id: formData.class_id,
          section_id: formData.section_id,
          parent_name: formData.parent_name,
          parent_phone: formData.parent_phone,
          parent_email: formData.parent_email,
          address: formData.address,
          date_of_birth: formData.date_of_birth || null,
          gender: formData.gender,
          blood_group: formData.blood_group || null,
          medical_info: formData.medical_info || null,
        }).eq('id', editingStudent.id)

        if (error) throw error
        toast.success('Student updated')
      } else {
        // Generate a unique internal email — never use parent email as login
        const uniqueEmail = `student.${formData.roll_number}.${Date.now()}@school.internal`

        const { data: userData, error: userError } = await supabase
          .from('users')
          .insert([{
            email: uniqueEmail,
            name: formData.student_name,
            role: 'student',
            phone: formData.parent_phone,
            address: formData.address,
            date_of_birth: formData.date_of_birth || null,
            gender: formData.gender,
          }])
          .select()
          .single()

        if (userError) throw userError

        const { error: studentError } = await supabase.from('students').insert([{
          user_id: userData.id,
          roll_number: formData.roll_number,
          class_id: formData.class_id,
          section_id: formData.section_id,
          parent_name: formData.parent_name,
          parent_phone: formData.parent_phone,
          parent_email: formData.parent_email,
          address: formData.address,
          date_of_birth: formData.date_of_birth || null,
          gender: formData.gender,
          blood_group: formData.blood_group || null,
          medical_info: formData.medical_info || null,
        }])

        if (studentError) throw studentError
        toast.success('Student added')
      }

      resetForm()
      fetchData()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteOther = async (id: string) => {
    const table = activeTab === 'teachers' ? 'users' : activeTab
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Deleted'); fetchData() }
  }

  const handleLogout = () => { 
    clearSession()
    window.location.href = '/' 
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 min-h-screen">
        <div className="bg-purple-600 px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-700 rounded-xl flex items-center justify-center">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Principal</p>
              <p className="text-purple-200 text-xs">Dashboard</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id as TabType)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                activeTab === id ? 'bg-purple-50 text-purple-700' : 'text-gray-600 hover:bg-gray-50'}`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
            <LogOut className="w-4 h-4" />Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile header */}
        <div className="lg:hidden bg-purple-600 text-white px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Crown className="w-5 h-5" />
            <span className="font-bold">Principal Dashboard</span>
          </div>
          <button onClick={handleLogout} className="bg-purple-700 p-2 rounded-xl">
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Desktop page title */}
        <div className="hidden lg:flex items-center justify-between px-8 py-6 bg-white border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900 capitalize">{activeTab}</h1>
          <button onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition">
            <LogOut className="w-4 h-4" />Logout
          </button>
        </div>

        {/* Mobile tabs */}
        <div className="lg:hidden flex bg-white border-b overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id as TabType)}
              className={`flex-1 py-3 flex items-center justify-center gap-1.5 text-xs font-medium whitespace-nowrap transition ${
                activeTab === id ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500'}`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 lg:p-8">
          {activeTab === 'students' ? (
            <div>
              <button 
                onClick={() => setShowForm(!showForm)}
                className="w-full lg:w-auto mb-4 bg-purple-600 text-white px-4 py-2 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-purple-700 transition">
                {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showForm ? 'Cancel' : 'Add New Student'}
              </button>

              {/* Student Form */}
              {showForm && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">
                    {editingStudent ? 'Edit Student' : 'Add New Student'}
                  </h2>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Student Full Name *</label>
                        <input
                          type="text"
                          required
                          value={formData.student_name}
                          onChange={(e) => setFormData({...formData, student_name: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="e.g. Ali Hassan"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number *</label>
                        <input
                          type="text"
                          required
                          value={formData.roll_number}
                          onChange={(e) => setFormData({...formData, roll_number: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Class *</label>
                        <select
                          required
                          value={formData.class_id}
                          onChange={(e) => handleClassChange(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="">Select Class</option>
                          {classes.map((cls) => (
                            <option key={cls.id} value={cls.id}>{cls.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Section *</label>
                        <select
                          required
                          value={formData.section_id}
                          onChange={(e) => setFormData({...formData, section_id: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                          disabled={!formData.class_id}
                        >
                          <option value="">Select Section</option>
                          {sections.map((sec) => (
                            <option key={sec.id} value={sec.id}>{sec.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                        <select
                          value={formData.gender}
                          onChange={(e) => setFormData({...formData, gender: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                        <input
                          type="date"
                          value={formData.date_of_birth}
                          onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
                        <select
                          value={formData.blood_group}
                          onChange={(e) => setFormData({...formData, blood_group: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="">Select</option>
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Parent/Guardian Name</label>
                        <input
                          type="text"
                          value={formData.parent_name}
                          onChange={(e) => setFormData({...formData, parent_name: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Parent Phone</label>
                        <input
                          type="tel"
                          value={formData.parent_phone}
                          onChange={(e) => setFormData({...formData, parent_phone: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Parent Email</label>
                        <input
                          type="email"
                          value={formData.parent_email}
                          onChange={(e) => setFormData({...formData, parent_email: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                        <textarea
                          rows={2}
                          value={formData.address}
                          onChange={(e) => setFormData({...formData, address: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Medical Info</label>
                        <textarea
                          rows={2}
                          value={formData.medical_info}
                          onChange={(e) => setFormData({...formData, medical_info: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                          placeholder="Any allergies or medical conditions"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="submit"
                        disabled={formLoading}
                        className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50"
                      >
                        {formLoading ? 'Saving...' : (editingStudent ? 'Update Student' : 'Add Student')}
                      </button>
                      <button
                        type="button"
                        onClick={resetForm}
                        className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Students List */}
              <div className="space-y-3">
                {loading ? (
                  <div className="text-center py-16 text-gray-400">Loading...</div>
                ) : data.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">No students found</div>
                ) : (
                  data.map((student: any) => (
                    <div key={student.id} className="bg-white rounded-xl p-4 border border-gray-100">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800">{student.users?.name || 'Student'}</h3>
                          <p className="text-sm text-gray-500 mt-0.5">
                            Roll: {student.roll_number} · {student.classes?.name}-{student.sections?.name}
                          </p>
                          {student.parent_name && (
                            <p className="text-sm text-gray-500">Parent: {student.parent_name} ({student.parent_phone})</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleEdit(student)} 
                            className="text-blue-400 p-2 hover:text-blue-600 transition"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setDeleteConfirm(student.id)} 
                            className="text-red-400 p-2 hover:text-red-600 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div>
              <button className="w-full lg:w-auto mb-4 bg-purple-600 text-white px-4 py-2 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-purple-700 transition">
                <Plus className="w-4 h-4" />
                Add New {activeTab.slice(0, -1)}
              </button>

              <div className="space-y-3">
                {loading ? (
                  <div className="text-center py-16 text-gray-400">Loading...</div>
                ) : data.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">No {activeTab} found</div>
                ) : (
                  data.map((item: any) => (
                    <div key={item.id} className="bg-white rounded-xl p-4 border border-gray-100 flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {activeTab === 'teachers' ? item.name : item.name}
                        </h3>
                        {activeTab === 'teachers' && <p className="text-sm text-gray-500 mt-0.5">{item.email}</p>}
                        {activeTab === 'sections' && <p className="text-sm text-gray-500 mt-0.5">{item.classes?.name} · Room {item.room_number}</p>}
                      </div>
                      <button onClick={() => handleDeleteOther(item.id)} className="text-red-400 p-2 hover:text-red-600 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this student? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  supabase.from('students').delete().eq('id', deleteConfirm!).then(({ error }) => {
                    if (error) toast.error(error.message)
                    else { toast.success('Deleted'); fetchData() }
                    setDeleteConfirm(null)
                  })
                }}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}