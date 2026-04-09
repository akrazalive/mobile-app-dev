'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { generateStudentPDF, ReportFilters } from '@/lib/studentReport'
import { FileDown, Loader2, X, SlidersHorizontal } from 'lucide-react'
import toast from 'react-hot-toast'

type Props = { onClose: () => void }

const emptyFilters: ReportFilters = {
  classId: '', sectionId: '', gender: '', dobFrom: '', dobTo: '',
}

export default function StudentReport({ onClose }: Props) {
  const [filters, setFilters] = useState<ReportFilters>({ ...emptyFilters })
  const [classes, setClasses] = useState<any[]>([])
  const [sections, setSections] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [counting, setCounting] = useState(false)

  useEffect(() => {
    supabase.from('classes').select('*').order('name').then(({ data }) => { if (data) setClasses(data) })
  }, [])

  // Live count whenever filters change
  useEffect(() => {
    const timer = setTimeout(async () => {
      setCounting(true)
      try {
        let q = supabase.from('students').select('id', { count: 'exact', head: true })
        if (filters.classId)   q = q.eq('class_id', filters.classId)
        if (filters.sectionId) q = q.eq('section_id', filters.sectionId)
        if (filters.gender)    q = q.eq('gender', filters.gender)
        if (filters.dobFrom)   q = q.gte('date_of_birth', filters.dobFrom)
        if (filters.dobTo)     q = q.lte('date_of_birth', filters.dobTo)
        const { count } = await q
        setPreviewCount(count ?? 0)
      } finally {
        setCounting(false)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [filters])

  const set = (k: keyof ReportFilters, v: string) =>
    setFilters(f => ({ ...f, [k]: v }))

  const handleClassChange = async (id: string) => {
    set('classId', id)
    set('sectionId', '')
    if (id) {
      const { data } = await supabase.from('sections').select('*').eq('class_id', id)
      if (data) setSections(data)
    } else {
      setSections([])
    }
  }

  const handleDownload = async () => {
    if (previewCount === 0) { toast.error('No students match the selected filters'); return }
    setLoading(true)
    try {
      const className   = classes.find(c => c.id === filters.classId)?.name
      const sectionName = sections.find(s => s.id === filters.sectionId)?.name
      const count = await generateStudentPDF(
        // strip empty strings so query doesn't filter on them
        Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) as ReportFilters,
        { className, sectionName }
      )
      toast.success(`PDF downloaded — ${count} students`)
    } catch (e: any) {
      toast.error(e.message)
    }
    setLoading(false)
  }

  const resetFilters = () => { setFilters({ ...emptyFilters }); setSections([]) }

  const hasFilters = Object.values(filters).some(v => v)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
            <SlidersHorizontal className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Generate Report</h2>
            <p className="text-sm text-gray-500">Filter students and download as PDF</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Filters grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">

        {/* Class */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Class</label>
          <select value={filters.classId} onChange={e => handleClassChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none">
            <option value="">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Section */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Section</label>
          <select value={filters.sectionId} onChange={e => set('sectionId', e.target.value)}
            disabled={!filters.classId}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none disabled:opacity-50">
            <option value="">All Sections</option>
            {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {/* Gender */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Gender</label>
          <select value={filters.gender} onChange={e => set('gender', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none">
            <option value="">All Genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* DOB From */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Date of Birth — From</label>
          <input type="date" value={filters.dobFrom} onChange={e => set('dobFrom', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
        </div>

        {/* DOB To */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Date of Birth — To</label>
          <input type="date" value={filters.dobTo} onChange={e => set('dobTo', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
        </div>

      </div>

      {/* Live count + actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${counting ? 'bg-yellow-400 animate-pulse' : 'bg-green-500'}`} />
          <span className="text-sm text-gray-600">
            {counting ? 'Counting...' : (
              previewCount === null ? 'Loading...' :
              <><span className="font-bold text-gray-900">{previewCount}</span> student{previewCount !== 1 ? 's' : ''} match</>
            )}
          </span>
          {hasFilters && (
            <button onClick={resetFilters} className="text-xs text-purple-600 hover:underline ml-2">
              Clear filters
            </button>
          )}
        </div>

        <button onClick={handleDownload} disabled={loading || previewCount === 0}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-purple-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-purple-700 transition disabled:opacity-50">
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" />Generating...</>
            : <><FileDown className="w-4 h-4" />Download PDF</>
          }
        </button>
      </div>
    </div>
  )
}
