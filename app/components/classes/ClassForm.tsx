'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Loader2, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

type Props = {
  cls?: any        // undefined = add mode
  onSaved: () => void
  onCancel: () => void
}

type SubjectRow = { subjectId: string; teacherId: string }

export default function ClassForm({ cls, onSaved, onCancel }: Props) {
  const [name, setName] = useState(cls?.name ?? '')
  const [gradeLevel, setGradeLevel] = useState<string>(cls?.grade_level ?? '')
  const [description, setDescription] = useState(cls?.description ?? '')
  const [classTeacherId, setClassTeacherId] = useState(cls?.class_teacher_id ?? '')
  const [teachers, setTeachers] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [subjectRows, setSubjectRows] = useState<SubjectRow[]>([{ subjectId: '', teacherId: '' }])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('users').select('id,name').eq('role', 'teacher').order('name')
      .then(({ data }) => { if (data) setTeachers(data) })
    supabase.from('subjects').select('id,name').order('name')
      .then(({ data }) => { if (data) setSubjects(data) })

    // Load existing subject assignments if editing
    if (cls?.id) {
      supabase.from('teacher_subjects')
        .select('subject_id, teacher_id')
        .eq('class_id', cls.id)
        .then(({ data }) => {
          if (data && data.length > 0) {
            setSubjectRows(data.map(d => ({ subjectId: d.subject_id, teacherId: d.teacher_id })))
          }
        })
    }
  }, [cls])

  const addSubjectRow = () => setSubjectRows(r => [...r, { subjectId: '', teacherId: '' }])
  const removeSubjectRow = (i: number) => setSubjectRows(r => r.filter((_, idx) => idx !== i))
  const updateSubjectRow = (i: number, key: keyof SubjectRow, val: string) =>
    setSubjectRows(r => r.map((row, idx) => idx === i ? { ...row, [key]: val } : row))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      let classId = cls?.id

      const classPayload = {
        name,
        grade_level: gradeLevel ? parseInt(gradeLevel) : null,
        description: description || null,
        class_teacher_id: classTeacherId || null,
      }

      if (classId) {
        const { error } = await supabase.from('classes').update(classPayload).eq('id', classId)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('classes').insert(classPayload).select('id').single()
        if (error) throw error
        classId = data.id
      }

      // Sync teacher_subjects — delete existing then re-insert
      await supabase.from('teacher_subjects').delete().eq('class_id', classId)

      const validRows = subjectRows.filter(r => r.subjectId && r.teacherId)
      if (validRows.length > 0) {
        const { error } = await supabase.from('teacher_subjects').insert(
          validRows.map(r => ({
            class_id: classId,
            subject_id: r.subjectId,
            teacher_id: r.teacherId,
            section_id: null,
          }))
        )
        if (error) throw error
      }

      toast.success(cls ? 'Class updated' : 'Class created')
      onSaved()
    } catch (err: any) {
      toast.error(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-gray-900">{cls ? 'Edit Class' : 'Add Class'}</h2>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class Name *</label>
            <input required value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Grade 6"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level</label>
            <select value={gradeLevel} onChange={e => setGradeLevel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none">
              <option value="">Select</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(g => (
                <option key={g} value={g}>Grade {g}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Class Teacher (Farm Master)</label>
            <select value={classTeacherId} onChange={e => setClassTeacherId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none">
              <option value="">— Not assigned —</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">This teacher can mark attendance for this class</p>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
          </div>
        </div>

        {/* Subject → Teacher assignments */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Subject Assignments</label>
            <button type="button" onClick={addSubjectRow}
              className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-semibold">
              <Plus className="w-3.5 h-3.5" />Add Subject
            </button>
          </div>
          <div className="space-y-2">
            {subjectRows.map((row, i) => (
              <div key={i} className="flex gap-2 items-center">
                <select value={row.subjectId} onChange={e => updateSubjectRow(i, 'subjectId', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none">
                  <option value="">Select Subject</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select value={row.teacherId} onChange={e => updateSubjectRow(i, 'teacherId', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none">
                  <option value="">Select Teacher</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <button type="button" onClick={() => removeSubjectRow(i)}
                  className="text-red-400 hover:text-red-600 p-1 shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading}
            className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-purple-700 transition disabled:opacity-50">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Saving...' : (cls ? 'Update Class' : 'Create Class')}
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
