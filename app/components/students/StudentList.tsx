'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Edit, Trash2, ChevronLeft, ChevronRight, Users, User } from 'lucide-react'

type Props = {
  onEdit: (student: any) => void
  refreshKey: number
}

const PAGE_SIZE = 10

export default function StudentList({ onEdit, refreshKey }: Props) {
  const [students, setStudents] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => { fetchClasses() }, [])
  useEffect(() => { setPage(1) }, [search, filterClass])
  useEffect(() => {
    const t = setTimeout(() => fetchStudents(), search ? 300 : 0)
    return () => clearTimeout(t)
  }, [page, search, filterClass, refreshKey])

  const fetchClasses = async () => {
    const { data } = await supabase.from('classes').select('*').order('name')
    if (data) setClasses(data)
  }

  const fetchStudents = async () => {
    setLoading(true)

    // When searching by name, first resolve matching user_ids
    let userIds: string[] = []
    if (search) {
      const { data: matchedUsers } = await supabase
        .from('users')
        .select('id')
        .ilike('name', `%${search}%`)
      userIds = (matchedUsers ?? []).map(u => u.id)
    }

    let query = supabase
      .from('students')
      .select('*, users(name, email, avatar_url), classes(name), sections(name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

    if (filterClass) query = query.eq('class_id', filterClass)

    if (search) {
      const orParts = [
        `roll_number.ilike.%${search}%`,
        `parent_name.ilike.%${search}%`,
        ...(userIds.length > 0 ? [`user_id.in.(${userIds.join(',')})`] : []),
      ]
      query = query.or(orParts.join(','))
    }

    const { data, count, error } = await query
    if (!error) {
      setStudents(data ?? [])
      setTotal(count ?? 0)
    }
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('students').delete().eq('id', id)
    if (error) alert(error.message)
    else { setDeleteId(null); fetchStudents() }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or roll no..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>
        <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none">
          <option value="">All Classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Table — desktop */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['', 'Name', 'Roll No', 'Class', 'Section', 'Parent', 'Contact', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">Loading...</td></tr>
            ) : students.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">No students found</td></tr>
            ) : students.map(s => (
              <tr key={s.id} className="hover:bg-gray-50 transition">
                <td className="px-4 py-3">
                  {s.users?.avatar_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={s.users.avatar_url} alt="" className="w-24 h-24 object-cover" />
                    : <div className="w-24 h-24 bg-purple-100 flex items-center justify-center"><User className="w-4 h-4 text-purple-400" /></div>
                  }
                </td>
                <td className="px-4 py-3 font-medium text-gray-800">{s.users?.name}</td>
                <td className="px-4 py-3 text-gray-600">{s.roll_number}</td>
                <td className="px-4 py-3 text-gray-600">{s.classes?.name}</td>
                <td className="px-4 py-3 text-gray-600">{s.sections?.name}</td>
                <td className="px-4 py-3 text-gray-600">{s.parent_name || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{s.parent_phone || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => onEdit(s)} className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteId(s.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards — mobile */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading...</div>
        ) : students.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-2 text-gray-200" />
            No students found
          </div>
        ) : students.map(s => (
          <div key={s.id} className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                {s.users?.avatar_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={s.users.avatar_url} alt="" className="w-24 h-24 object-cover shrink-0" />
                  : <div className="w-24 h-24 bg-purple-100 flex items-center justify-center shrink-0"><User className="w-6 h-6 text-purple-400" /></div>
                }
                <div>
                  <p className="font-semibold text-gray-800">{s.users?.name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Roll: {s.roll_number} · {s.classes?.name} {s.sections?.name}
                  </p>
                  {s.parent_name && <p className="text-sm text-gray-400 mt-0.5">{s.parent_name} · {s.parent_phone}</p>}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => onEdit(s)} className="p-2 text-blue-400 hover:text-blue-600 transition">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => setDeleteId(s.id)} className="p-2 text-red-400 hover:text-red-600 transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-gray-500">
            Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-2 text-sm font-medium text-gray-700">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Student?</h3>
            <p className="text-gray-500 text-sm mb-6">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(deleteId)}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 transition">
                Delete
              </button>
              <button onClick={() => setDeleteId(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-200 transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
