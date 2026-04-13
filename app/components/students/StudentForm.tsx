'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import ImageUpload from '../ui/ImageUpload'

type Props = {
  student?: any
  onSaved: () => void
  onCancel: () => void
}

const emptyForm = {
  student_name: '', roll_number: '', class_id: '', section_id: '',
  parent_name: '', parent_phone: '', parent_email: '',
  address: '', date_of_birth: '', gender: 'male', blood_group: '', medical_info: '',
  avatar_url: '',
}

export default function StudentForm({ student, onSaved, onCancel }: Props) {
  const [form, setForm] = useState({ ...emptyForm })
  const [classes, setClasses] = useState<any[]>([])
  const [sections, setSections] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('classes').select('*').order('name').then(({ data }) => { if (data) setClasses(data) })
    if (student) {
      setForm({
        student_name:  student.users?.name || '',
        roll_number:   student.roll_number || '',
        class_id:      student.class_id || '',
        section_id:    student.section_id || '',
        parent_name:   student.parent_name || '',
        parent_phone:  student.parent_phone || '',
        parent_email:  student.parent_email || '',
        address:       student.address || '',
        date_of_birth: student.date_of_birth || '',
        gender:        student.gender || 'male',
        blood_group:   student.blood_group || '',
        medical_info:  student.medical_info || '',
        avatar_url:    student.users?.avatar_url || '',
      })
      if (student.class_id) loadSections(student.class_id)
    }
  }, [student])

  const loadSections = async (classId: string) => {
    const { data } = await supabase.from('sections').select('*').eq('class_id', classId)
    if (data) setSections(data)
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (student?.id) {
        if (student.user_id) {
          await supabase.from('users').update({
            name: form.student_name,
            avatar_url: form.avatar_url || null,
          }).eq('id', student.user_id)
        }
        const { error } = await supabase.from('students').update({
          roll_number: form.roll_number, class_id: form.class_id, section_id: form.section_id,
          parent_name: form.parent_name, parent_phone: form.parent_phone, parent_email: form.parent_email,
          address: form.address || null, date_of_birth: form.date_of_birth || null,
          gender: form.gender, blood_group: form.blood_group || null, medical_info: form.medical_info || null,
        }).eq('id', student.id)
        if (error) throw error
        toast.success('Student updated')
      } else {
        const email = `student.${form.roll_number}.${Date.now()}@school.internal`
        const { data: user, error: ue } = await supabase.from('users')
          .insert({
            email, name: form.student_name, role: 'student',
            phone: form.parent_phone || null,
            date_of_birth: form.date_of_birth || null,
            gender: form.gender,
            avatar_url: form.avatar_url || null,
          })
          .select('id').single()
        if (ue) throw ue
        const { error: se } = await supabase.from('students').insert({
          user_id: user.id, roll_number: form.roll_number, class_id: form.class_id,
          section_id: form.section_id, parent_name: form.parent_name || null,
          parent_phone: form.parent_phone || null, parent_email: form.parent_email || null,
          address: form.address || null, date_of_birth: form.date_of_birth || null,
          gender: form.gender, blood_group: form.blood_group || null, medical_info: form.medical_info || null,
        })
        if (se) throw se
        toast.success('Student added')
      }
      onSaved()
    } catch (err: any) {
      toast.error(err.message)
    }
    setLoading(false)
  }

  const field = (label: string, key: string, type = 'text', required = false) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && ' *'}</label>
      <input type={type} required={required} value={(form as any)[key]}
        onChange={e => set(key, e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
    </div>
  )

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-gray-900">{student ? 'Edit Student' : 'Add Student'}</h2>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Photo upload — centered at top */}
        <div className="flex justify-center pb-2">
          <ImageUpload
            value={form.avatar_url}
            onChange={url => set('avatar_url', url)}
            folder="students"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">{field('Full Name', 'student_name', 'text', true)}</div>
          {field('Roll Number', 'roll_number', 'text', true)}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class *</label>
            <select required value={form.class_id}
              onChange={e => { set('class_id', e.target.value); set('section_id', ''); loadSections(e.target.value) }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none">
              <option value="">Select Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Section *</label>
            <select required value={form.section_id} disabled={!form.class_id}
              onChange={e => set('section_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none disabled:opacity-50">
              <option value="">Select Section</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
            <select value={form.gender} onChange={e => set('gender', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none">
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          {field('Date of Birth', 'date_of_birth', 'date')}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
            <select value={form.blood_group} onChange={e => set('blood_group', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none">
              <option value="">Select</option>
              {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div className="sm:col-span-2">{field("Parent/Guardian Name", 'parent_name')}</div>
          {field('Parent Phone', 'parent_phone', 'tel')}
          {field('Parent Email', 'parent_email', 'email')}
          <div className="sm:col-span-2">{field('Address', 'address')}</div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Medical Info</label>
            <textarea rows={2} value={form.medical_info} onChange={e => set('medical_info', e.target.value)}
              placeholder="Allergies, conditions..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none" />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading}
            className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-purple-700 transition disabled:opacity-50">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Saving...' : (student ? 'Update' : 'Add Student')}
          </button>
          <button type="button" onClick={onCancel}
            className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-semibold hover:bg-gray-200 transition">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
