'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Upload, Download, X, CheckCircle, AlertCircle, Loader2, Image as ImageIcon, User } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import imageCompression from 'browser-image-compression'

// ── Pakistani names pool ──────────────────────────────────────────────────────
const PAKISTANI_NAMES = [
  'Muhammad Ali', 'Ahmad Hassan', 'Abdullah Khan', 'Usman Malik', 'Ibrahim Qureshi',
  'Zubair Ahmed', 'Bilal Hussain', 'Farhan Akhtar', 'Talha Raza', 'Saad Nawaz',
  'Omar Farooq', 'Haris Siddiqui', 'Asad Mehmood', 'Hamza Tariq', 'Kamran Shah',
  'Faisal Baig', 'Salman Niazi', 'Adnan Cheema', 'Imran Javed', 'Rizwan Butt',
  'Awais Iqbal', 'Zain Ul Abideen', 'Arsalan Gul', 'Daniyal Mirza', 'Rayhan Bajwa',
  'Noman Chaudhry', 'Taimur Hashmi', 'Waheed Ansari', 'Junaid Bhatti', 'Khurram Awan',
  'Shehzad Rana', 'Muneeb Rehman', 'Basit Zafar', 'Irfan Lodhi', 'Sajid Waqar',
  'Waseem Gill', 'Shahid Dogar', 'Aqeel Syed', 'Zaheer Chandio', 'Naveed Sandhu',
  'Asif Rauf', 'Kashif Memon', 'Khalid Pirzada', 'Naeem Khattak', 'Tahir Abbasi',
  'Qasim Afridi', 'Umer Baloch', 'Younas Sheikh', 'Zafar Mughal', 'Waqas Durrani',
]

const usedNames = new Set<string>()
function getUniqueName(): string {
  const remaining = PAKISTANI_NAMES.filter(n => !usedNames.has(n))
  const pool = remaining.length > 0 ? remaining : PAKISTANI_NAMES
  const name = pool[Math.floor(Math.random() * pool.length)]
  usedNames.add(name)
  return name
}

// ── Types ─────────────────────────────────────────────────────────────────────
type UploadStatus = 'pending' | 'compressing' | 'uploading' | 'done' | 'error'

type FileItem = {
  id: string
  file: File
  previewUrl: string
  name: string
  status: UploadStatus
  uploadedUrl?: string
  error?: string
  originalSize: number
  compressedSize?: number
}

type ClassOption = { id: string; name: string; grade_level: number | null }

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function compressImage(file: File): Promise<File> {
  return imageCompression(file, {
    maxSizeMB: 0.8,
    maxWidthOrHeight: 1280,
    useWebWorker: true,
    fileType: 'image/webp',
  })
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function UploadStudentsPage() {
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [items, setItems] = useState<FileItem[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.from('classes').select('id,name,grade_level').order('grade_level')
      .then(({ data }) => { if (data) setClasses(data) })
  }, [])

  // ── File handling ───────────────────────────────────────────────────────────
  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (arr.length === 0) { toast.error('Only image files are accepted'); return }

    const newItems: FileItem[] = arr.map(f => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file: f,
      previewUrl: URL.createObjectURL(f),
      name: getUniqueName(),
      status: 'pending',
      originalSize: f.size,
    }))
    setItems(prev => [...prev, ...newItems])
  }, [])

  const removeItem = (id: string) => {
    setItems(prev => {
      const item = prev.find(i => i.id === id)
      if (item) URL.revokeObjectURL(item.previewUrl)
      return prev.filter(i => i.id !== id)
    })
  }

  const updateItem = (id: string, patch: Partial<FileItem>) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i))

  // ── Drag & drop ─────────────────────────────────────────────────────────────
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    addFiles(e.dataTransfer.files)
  }

  // ── Upload one item ─────────────────────────────────────────────────────────
  const uploadOne = async (item: FileItem) => {
    updateItem(item.id, { status: 'compressing' })
    let toUpload: File
    try {
      toUpload = await compressImage(item.file)
      updateItem(item.id, { compressedSize: toUpload.size, status: 'uploading' })
    } catch {
      toUpload = item.file          // fallback: upload as-is
      updateItem(item.id, { status: 'uploading' })
    }

    try {
      const fd = new FormData()
      fd.append('file', toUpload)
      fd.append('folder', 'students')
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Upload failed')
      updateItem(item.id, { status: 'done', uploadedUrl: json.url })
    } catch (err: any) {
      updateItem(item.id, { status: 'error', error: err.message })
    }
  }

  // ── Upload all pending ──────────────────────────────────────────────────────
  const uploadAll = async () => {
    const pending = items.filter(i => i.status === 'pending' || i.status === 'error')
    if (pending.length === 0) { toast('Nothing to upload'); return }
    await Promise.all(pending.map(uploadOne))
    toast.success('All done!')
  }

  // ── Download a photo ────────────────────────────────────────────────────────
  const downloadPhoto = async (item: FileItem) => {
    const url = item.uploadedUrl ?? item.previewUrl
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${item.name.replace(/\s+/g, '_')}.webp`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch {
      // fallback: open in new tab
      window.open(url, '_blank')
    }
  }

  // ── Counts ──────────────────────────────────────────────────────────────────
  const counts = {
    total: items.length,
    done: items.filter(i => i.status === 'done').length,
    errors: items.filter(i => i.status === 'error').length,
    inProgress: items.filter(i => i.status === 'compressing' || i.status === 'uploading').length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-700 to-purple-500 text-white px-4 py-5 shadow">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-xl font-bold">Batch Photo Upload</h1>
          <p className="text-purple-200 text-sm">Upload up to 80 photos — auto-compressed &amp; named</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition ${
            isDragging ? 'border-purple-500 bg-purple-50' : 'border-gray-300 hover:border-purple-400 bg-white'
          }`}
        >
          <Upload className="w-10 h-10 text-purple-400 mx-auto mb-3" />
          <p className="text-gray-700 font-semibold">Drop photos here or click to browse</p>
          <p className="text-gray-400 text-sm mt-1">
            Supports JPG, PNG, HEIC — each photo compressed to under 1 MB automatically
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={e => e.target.files && addFiles(e.target.files)}
          />
        </div>

        {/* Stats + actions bar */}
        {items.length > 0 && (
          <div className="bg-white rounded-2xl p-4 flex flex-wrap items-center gap-3 shadow-sm border border-gray-100">
            <div className="flex gap-4 flex-1 flex-wrap text-sm">
              <span className="text-gray-500">{counts.total} photos</span>
              {counts.done > 0 && <span className="text-green-600 font-medium">{counts.done} uploaded</span>}
              {counts.errors > 0 && <span className="text-red-500 font-medium">{counts.errors} failed</span>}
              {counts.inProgress > 0 && <span className="text-purple-500 font-medium">{counts.inProgress} in progress</span>}
            </div>
            <button
              onClick={() => setItems([])}
              className="text-sm text-gray-400 hover:text-red-500 transition px-3 py-1.5 rounded-lg hover:bg-red-50"
            >
              Clear all
            </button>
            <button
              onClick={uploadAll}
              disabled={counts.inProgress > 0}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-xl flex items-center gap-2 transition"
            >
              {counts.inProgress > 0 ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
              ) : (
                <><Upload className="w-4 h-4" /> Upload All</>
              )}
            </button>
          </div>
        )}

        {/* Photo grid */}
        {items.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {items.map(item => (
              <PhotoCard
                key={item.id}
                item={item}
                onRemove={() => removeItem(item.id)}
                onDownload={() => downloadPhoto(item)}
                onNameChange={name => updateItem(item.id, { name })}
              />
            ))}
          </div>
        )}

        {/* ── View section: students already uploaded ── */}
        <UploadedStudentsView classes={classes} />
      </div>
    </div>
  )
}

// ── Photo card ────────────────────────────────────────────────────────────────
function PhotoCard({
  item,
  onRemove,
  onDownload,
  onNameChange,
}: {
  item: FileItem
  onRemove: () => void
  onDownload: () => void
  onNameChange: (name: string) => void
}) {
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState(item.name)

  const statusIcon = () => {
    if (item.status === 'done') return <CheckCircle className="w-4 h-4 text-green-500" />
    if (item.status === 'error') return <AlertCircle className="w-4 h-4 text-red-500" />
    if (item.status === 'compressing' || item.status === 'uploading')
      return <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
    return null
  }

  const statusLabel = () => {
    if (item.status === 'compressing') return 'Compressing…'
    if (item.status === 'uploading') return 'Uploading…'
    if (item.status === 'done') {
      const saved = item.compressedSize
        ? `${formatBytes(item.compressedSize)} (was ${formatBytes(item.originalSize)})`
        : formatBytes(item.originalSize)
      return saved
    }
    if (item.status === 'error') return item.error ?? 'Failed'
    return formatBytes(item.originalSize)
  }

  return (
    <div className={`bg-white rounded-2xl overflow-hidden shadow-sm border flex flex-col transition ${
      item.status === 'error' ? 'border-red-200' :
      item.status === 'done'  ? 'border-green-200' : 'border-gray-100'
    }`}>
      {/* Image */}
      <div className="relative h-32 bg-gray-100 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.previewUrl} alt={item.name} className="w-full h-full object-cover" />

        {/* Overlay controls */}
        <div className="absolute top-2 right-2 flex gap-1">
          {item.status === 'done' && (
            <button onClick={onDownload}
              className="w-6 h-6 bg-white/90 rounded-full flex items-center justify-center hover:bg-white shadow"
              title="Download">
              <Download className="w-3 h-3 text-gray-700" />
            </button>
          )}
          <button onClick={onRemove}
            className="w-6 h-6 bg-white/90 rounded-full flex items-center justify-center hover:bg-red-50 shadow"
            title="Remove">
            <X className="w-3 h-3 text-gray-700" />
          </button>
        </div>

        {/* Status badge */}
        <div className={`absolute bottom-2 left-2 text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
          item.status === 'done' ? 'bg-green-100 text-green-700' :
          item.status === 'error' ? 'bg-red-100 text-red-700' :
          'bg-white/80 text-gray-600'
        }`}>
          {statusIcon()}
          {item.status === 'pending' ? 'Ready' :
           item.status === 'compressing' ? 'Compressing' :
           item.status === 'uploading' ? 'Uploading' :
           item.status === 'done' ? 'Done' : 'Error'}
        </div>
      </div>

      {/* Name + info */}
      <div className="p-2 flex-1 flex flex-col gap-1">
        {editingName ? (
          <input
            autoFocus
            value={nameVal}
            onChange={e => setNameVal(e.target.value)}
            onBlur={() => { onNameChange(nameVal); setEditingName(false) }}
            onKeyDown={e => { if (e.key === 'Enter') { onNameChange(nameVal); setEditingName(false) } }}
            className="text-xs font-semibold w-full border border-purple-300 rounded px-1 py-0.5 focus:outline-none"
          />
        ) : (
          <button onClick={() => setEditingName(true)}
            className="text-xs font-semibold text-gray-800 text-left hover:text-purple-600 transition truncate">
            {item.name}
          </button>
        )}
        <p className={`text-xs truncate ${item.status === 'error' ? 'text-red-400' : 'text-gray-400'}`}>
          {statusLabel()}
        </p>
      </div>
    </div>
  )
}

// ── View already-uploaded students ────────────────────────────────────────────
function UploadedStudentsView({ classes }: { classes: ClassOption[] }) {
  const [filterClass, setFilterClass] = useState<string>('')
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchStudents = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('students')
      .select('id, roll_number, users(name, avatar_url), classes(id, name, grade_level), sections(name)')
      .not('users.avatar_url', 'is', null)
      .order('roll_number')

    if (filterClass) q = (q as any).eq('class_id', filterClass)

    const { data } = await q
    // Filter out students with no photo (RLS join quirk)
    const withPhoto = (data ?? []).filter((s: any) => s.users?.avatar_url)
    setStudents(withPhoto)
    setLoading(false)
  }, [filterClass])

  useEffect(() => { fetchStudents() }, [fetchStudents])

  const downloadPhoto = async (s: any) => {
    const url: string = s.users.avatar_url
    const name: string = s.users.name ?? 'student'
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${name.replace(/\s+/g, '_')}_roll${s.roll_number}.webp`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch {
      window.open(url, '_blank')
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Section header */}
      <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <ImageIcon className="w-5 h-5 text-purple-500" />
          <h2 className="font-semibold text-gray-800">
            Students with Photos
            {students.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-400">({students.length})</span>
            )}
          </h2>
        </div>

        {/* Class filter buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterClass('')}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
              !filterClass ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            All Classes
          </button>
          {classes.map(c => (
            <button
              key={c.id}
              onClick={() => setFilterClass(filterClass === c.id ? '' : c.id)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                filterClass === c.id ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="p-5">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-gray-100 animate-pulse h-40" />
            ))}
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-10">
            <User className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No photos uploaded yet{filterClass ? ' for this class' : ''}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {students.map(s => (
              <div key={s.id} className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm flex flex-col">
                <div className="relative h-32 bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.users.avatar_url} alt={s.users?.name} className="w-full h-full object-cover" loading="lazy" />
                  <button
                    onClick={() => downloadPhoto(s)}
                    className="absolute top-2 right-2 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center hover:bg-white shadow"
                    title="Download photo">
                    <Download className="w-3.5 h-3.5 text-gray-700" />
                  </button>
                  <div className="absolute bottom-2 left-2 text-xs bg-black/40 text-white px-2 py-0.5 rounded-full">
                    {s.classes?.name ?? '—'}
                  </div>
                </div>
                <div className="p-2">
                  <p className="text-xs font-semibold text-gray-800 truncate">{s.users?.name}</p>
                  <p className="text-xs text-gray-400">Roll {s.roll_number}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
