'use client'

import { useState, useRef } from 'react'
import { Upload, FileSpreadsheet, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { parseFile, importStudents, ImportRow, ImportResult } from '@/lib/importStudents'
import { supabase } from '@/lib/supabase'

type Props = { onImported: () => void }

export default function StudentImport({ onImported }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportRow[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [sections, setSections] = useState<any[]>([])
  const [classId, setClassId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const loadClasses = async () => {
    const { data } = await supabase.from('classes').select('*').order('name')
    if (data) setClasses(data)
  }

  const handleFile = async (f: File) => {
    setFile(f)
    setLoading(true)
    try {
      const rows = await parseFile(f)
      setPreview(rows)
      await loadClasses()
      setStep('preview')
    } catch (e: any) {
      alert(e.message)
    }
    setLoading(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleClassChange = async (id: string) => {
    setClassId(id)
    setSectionId('')
    const { data } = await supabase.from('sections').select('*').eq('class_id', id)
    if (data) setSections(data)
  }

  const handleImport = async () => {
    if (!classId || !sectionId) { alert('Please select class and section'); return }
    setLoading(true)
    const res = await importStudents(preview, classId, sectionId)
    setResult(res)
    setStep('result')
    setLoading(false)
    if (res.success > 0) onImported()
  }

  const reset = () => {
    setFile(null); setPreview([]); setClassId(''); setSectionId('')
    setStep('upload'); setResult(null); setClasses([]); setSections([])
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Import Students</h2>
          <p className="text-sm text-gray-500 mt-0.5">Upload an Excel or CSV file to bulk import students</p>
        </div>
        {step !== 'upload' && (
          <button onClick={reset} className="text-gray-400 hover:text-gray-600 transition">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition ${
            dragging ? 'border-purple-400 bg-purple-50' : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          {loading ? (
            <Loader2 className="w-10 h-10 text-purple-400 mx-auto mb-3 animate-spin" />
          ) : (
            <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          )}
          <p className="font-medium text-gray-700">Drop your file here or click to browse</p>
          <p className="text-sm text-gray-400 mt-1">Supports .xlsx, .xls, .csv</p>
        </div>
      )}

      {/* Step 2: Preview + class/section select */}
      {step === 'preview' && (
        <div className="space-y-4">
          {/* File info */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <FileSpreadsheet className="w-5 h-5 text-green-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{file?.name}</p>
              <p className="text-xs text-gray-500">{preview.length} students found</p>
            </div>
          </div>

          {/* Class + Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Class *</label>
              <select value={classId} onChange={e => handleClassChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm">
                <option value="">Select Class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Section *</label>
              <select value={sectionId} onChange={e => setSectionId(e.target.value)}
                disabled={!classId}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm disabled:opacity-50">
                <option value="">Select Section</option>
                {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {/* Preview table */}
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['#', 'Adm No', 'Name', 'Father Name', 'DOB', 'Gender', 'Roll No', 'Emg Contact'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.slice(0, 10).map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                    <td className="px-3 py-2 text-gray-700">{row.adm_no}</td>
                    <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">{row.name}</td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{row.father_name}</td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{row.dob}</td>
                    <td className="px-3 py-2 text-gray-600 capitalize">{row.gender}</td>
                    <td className="px-3 py-2 text-gray-600">{row.roll_number}</td>
                    <td className="px-3 py-2 text-gray-600">{row.emg_no}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 10 && (
              <div className="px-3 py-2 text-xs text-gray-400 bg-gray-50 border-t border-gray-200">
                Showing 10 of {preview.length} rows
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={handleImport} disabled={loading || !classId || !sectionId}
              className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-purple-700 transition disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {loading ? 'Importing...' : `Import ${preview.length} Students`}
            </button>
            <button onClick={reset} className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Result */}
      {step === 'result' && result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-700">{result.success}</p>
              <p className="text-sm text-green-600">Imported successfully</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-red-600">{result.failed}</p>
              <p className="text-sm text-red-500">Failed</p>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="rounded-lg border border-red-200 overflow-hidden">
              <div className="bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">Failed Rows</div>
              <div className="divide-y divide-red-100 max-h-48 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <div key={i} className="px-3 py-2 text-sm">
                    <span className="font-medium text-gray-800">Row {e.row} — {e.name}</span>
                    <p className="text-xs text-red-500 mt-0.5">{e.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={reset}
            className="w-full bg-purple-600 text-white py-2.5 rounded-xl font-semibold hover:bg-purple-700 transition">
            Import Another File
          </button>
        </div>
      )}
    </div>
  )
}
