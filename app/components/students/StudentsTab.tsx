'use client'

import { useState } from 'react'
import { Plus, Upload } from 'lucide-react'
import StudentList from './StudentList'
import StudentForm from './StudentForm'
import StudentImport from './StudentImport'

type View = 'list' | 'add' | 'edit' | 'import'

export default function StudentsTab() {
  const [view, setView] = useState<View>('list')
  const [editingStudent, setEditingStudent] = useState<any>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = () => { setRefreshKey(k => k + 1); setView('list'); setEditingStudent(null) }

  const handleEdit = (student: any) => { setEditingStudent(student); setView('edit') }

  return (
    <div className="space-y-4">
      {/* Action bar — only show on list view */}
      {view === 'list' && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setView('add')}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-purple-700 transition">
            <Plus className="w-4 h-4" />Add Student
          </button>
          <button onClick={() => setView('import')}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50 transition">
            <Upload className="w-4 h-4" />Import from Excel
          </button>
        </div>
      )}

      {view === 'list' && (
        <StudentList onEdit={handleEdit} refreshKey={refreshKey} />
      )}

      {(view === 'add' || view === 'edit') && (
        <StudentForm
          student={view === 'edit' ? editingStudent : undefined}
          onSaved={refresh}
          onCancel={() => { setView('list'); setEditingStudent(null) }}
        />
      )}

      {view === 'import' && (
        <StudentImport onImported={refresh} />
      )}
    </div>
  )
}
