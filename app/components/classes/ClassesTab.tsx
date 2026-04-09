'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Edit, Trash2, Eye, User, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import ClassForm from './ClassForm'
import ClassDetail from './ClassDetail'

type View = 'list' | 'add' | 'edit' | 'detail'

export default function ClassesTab() {
  const [view, setView] = useState<View>('list')
  const [classes, setClasses] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchClasses() }, [])

  const fetchClasses = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('classes')
      .select('*, users:class_teacher_id(name, email)')
      .order('grade_level', { ascending: true })
    if (data) setClasses(data)
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this class? All sections and assignments will also be removed.')) return
    const { error } = await supabase.from('classes').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Class deleted'); fetchClasses() }
  }

  const refresh = () => { fetchClasses(); setView('list'); setSelected(null) }

  if (view === 'add' || view === 'edit') {
    return <ClassForm cls={view === 'edit' ? selected : undefined} onSaved={refresh} onCancel={() => setView('list')} />
  }

  if (view === 'detail' && selected) {
    return <ClassDetail cls={selected} onBack={() => setView('list')} />
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setView('add')}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-purple-700 transition">
          <Plus className="w-4 h-4" />Add Class
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : classes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No classes yet</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((cls: any) => (
            <div key={cls.id} className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">{cls.name}</h3>
                  {cls.grade_level && (
                    <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-medium">
                      Grade {cls.grade_level}
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setSelected(cls); setView('detail') }}
                    className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button onClick={() => { setSelected(cls); setView('edit') }}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(cls.id)}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Class teacher */}
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-gray-300 shrink-0" />
                <span className="text-gray-600 truncate">
                  {cls.users?.name ?? <span className="text-gray-400 italic">No teacher assigned</span>}
                </span>
              </div>

              {cls.description && (
                <p className="text-xs text-gray-400 truncate">{cls.description}</p>
              )}

              <button onClick={() => { setSelected(cls); setView('detail') }}
                className="w-full mt-auto text-xs text-purple-600 font-semibold flex items-center justify-center gap-1 py-1.5 rounded-lg hover:bg-purple-50 transition">
                <BookOpen className="w-3.5 h-3.5" />View Subjects & Sections
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
