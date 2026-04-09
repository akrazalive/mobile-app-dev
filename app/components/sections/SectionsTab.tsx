'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Edit, Trash2, X, Loader2, Check } from 'lucide-react'
import toast from 'react-hot-toast'

type Section = { id?: string; class_id: string; name: string; room_number: string; capacity: string }

const empty = (classId = ''): Section => ({ class_id: classId, name: '', room_number: '', capacity: '30' })

export default function SectionsTab() {
  const [sections, setSections] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [filterClass, setFilterClass] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<Section>(empty())
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('classes').select('id,name').order('grade_level').then(({ data }) => { if (data) setClasses(data) })
  }, [])

  useEffect(() => { fetchSections() }, [filterClass])

  const fetchSections = async () => {
    setLoading(true)
    let q = supabase.from('sections').select('*, classes(name)').order('name')
    if (filterClass) q = q.eq('class_id', filterClass)
    const { data } = await q
    if (data) setSections(data)
    setLoading(false)
  }

  const openAdd = () => { setEditing(null); setForm(empty(filterClass)); setShowForm(true) }
  const openEdit = (sec: any) => {
    setEditing(sec)
    setForm({ id: sec.id, class_id: sec.class_id, name: sec.name, room_number: sec.room_number ?? '', capacity: String(sec.capacity ?? 30) })
    setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditing(null) }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        class_id: form.class_id,
        name: form.name.toUpperCase(),
        room_number: form.room_number || null,
        capacity: parseInt(form.capacity) || 30,
      }
      if (editing?.id) {
        const { error } = await supabase.from('sections').update(payload).eq('id', editing.id)
        if (error) throw error
        toast.success('Section updated')
      } else {
        const { error } = await supabase.from('sections').insert(payload)
        if (error) throw error
        toast.success('Section created')
      }
      closeForm(); fetchSections()
    } catch (err: any) {
      toast.error(err.message)
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('sections').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Deleted'); fetchSections() }
    setDeleteId(null)
  }

  const set = (k: keyof Section, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-purple-700 transition">
          <Plus className="w-4 h-4" />Add Section
        </button>
        <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none">
          <option value="">All Classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">{editing ? 'Edit Section' : 'Add Section'}</h3>
            <button onClick={closeForm} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Class *</label>
              <select required value={form.class_id} onChange={e => set('class_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none">
                <option value="">Select Class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Section Name *</label>
              <input required value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="e.g. A"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Room Number</label>
              <input value={form.room_number} onChange={e => set('room_number', e.target.value)}
                placeholder="e.g. 101"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Capacity</label>
              <input type="number" value={form.capacity} onChange={e => set('capacity', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
            </div>
            <div className="sm:col-span-2 lg:col-span-4 flex gap-2">
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-purple-700 transition disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button type="button" onClick={closeForm}
                className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : sections.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No sections found</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sections.map((sec: any) => (
            <div key={sec.id} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900">Section {sec.name}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{sec.classes?.name}</p>
                  <div className="flex gap-3 mt-2 text-xs text-gray-400">
                    {sec.room_number && <span>Room {sec.room_number}</span>}
                    <span>Capacity: {sec.capacity}</span>
                    <span>Strength: {sec.current_strength ?? 0}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(sec)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteId(sec.id)}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-900 mb-2">Delete Section?</h3>
            <p className="text-sm text-gray-500 mb-5">Students in this section will lose their section assignment.</p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(deleteId)}
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
