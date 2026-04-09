'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Edit, Trash2, User, Phone, Mail, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import TeacherForm from './TeacherForm'

type View = 'list' | 'add' | 'edit'

export default function TeachersTab() {
  const [view, setView] = useState<View>('list')
  const [teachers, setTeachers] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => { fetchTeachers() }, [])

  const fetchTeachers = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('users')
      .select(`
        *,
        classes!classes_class_teacher_id_fkey(name)
      `)
      .eq('role', 'teacher')
      .order('name')
    if (data) setTeachers(data)
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('users').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Teacher deleted'); fetchTeachers() }
    setDeleteId(null)
  }

  const refresh = () => { fetchTeachers(); setView('list'); setSelected(null) }

  if (view === 'add' || view === 'edit') {
    return (
      <TeacherForm
        teacher={view === 'edit' ? selected : undefined}
        onSaved={refresh}
        onCancel={() => { setView('list'); setSelected(null) }}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <button onClick={() => setView('add')}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-purple-700 transition">
          <Plus className="w-4 h-4" />Add Teacher
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : teachers.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No teachers yet</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teachers.map((t: any) => (
            <div key={t.id} className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col gap-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 leading-tight">{t.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.is_active ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                      {t.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => { setSelected(t); setView('edit') }}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteId(t.id)}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-gray-500">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{t.email}</span>
                </div>
                {t.phone && (
                  <div className="flex items-center gap-2 text-gray-500">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span>{t.phone}</span>
                  </div>
                )}
                {t.classes?.length > 0 && (
                  <div className="flex items-center gap-2 text-gray-500">
                    <BookOpen className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      Class Master: {t.classes.map((c: any) => c.name).join(', ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Extra info */}
              <div className="flex flex-wrap gap-2 text-xs">
                {t.gender && (
                  <span className="bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full capitalize">{t.gender}</span>
                )}
                {t.date_of_birth && (
                  <span className="bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full">
                    DOB: {new Date(t.date_of_birth).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-900 mb-2">Delete Teacher?</h3>
            <p className="text-sm text-gray-500 mb-5">This will remove the teacher account permanently.</p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(deleteId!)}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 transition">Delete</button>
              <button onClick={() => setDeleteId(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-200 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
