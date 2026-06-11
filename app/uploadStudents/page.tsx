'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Upload, Download, X, CheckCircle, AlertCircle, Loader2, Image as ImageIcon, Trash2, CheckSquare, Square } from 'lucide-react'
import toast from 'react-hot-toast'
import imageCompression from 'browser-image-compression'
import JSZip from 'jszip'

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

type GalleryPhoto = {
  id: string
  name: string
  url: string
  uploaded_at: string
}

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
  const [items, setItems] = useState<FileItem[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [gallery, setGallery] = useState<GalleryPhoto[]>([])
  const [galleryLoading, setGalleryLoading] = useState(true)
  const [zoomed, setZoomed] = useState<{ url: string; name: string } | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkDownloading, setBulkDownloading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Load gallery on mount ───────────────────────────────────────────────────
  const loadGallery = useCallback(async () => {
    setGalleryLoading(true)
    try {
      const res = await fetch('/api/gallery')
      const json = await res.json()
      setGallery(json.photos ?? [])
    } catch {
      setGallery([])
    } finally {
      setGalleryLoading(false)
    }
  }, [])

  useEffect(() => { loadGallery() }, [loadGallery])

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

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    addFiles(e.dataTransfer.files)
  }

  // ── Upload one item → save to gallery ──────────────────────────────────────
  const uploadOne = async (item: FileItem) => {
    updateItem(item.id, { status: 'compressing' })
    let toUpload: File
    try {
      toUpload = await compressImage(item.file)
      updateItem(item.id, { compressedSize: toUpload.size, status: 'uploading' })
    } catch {
      toUpload = item.file
      updateItem(item.id, { status: 'uploading' })
    }

    try {
      // 1. Upload to R2
      const fd = new FormData()
      fd.append('file', toUpload)
      fd.append('folder', 'students')
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Upload failed')

      const uploadedUrl: string = json.url

      // 2. Save URL + name to gallery (Supabase)
      // Get the current name from state at this point
      setItems(prev => {
        const current = prev.find(i => i.id === item.id)
        const currentName = current?.name ?? item.name
        // fire-and-forget save
        fetch('/api/gallery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: currentName, url: uploadedUrl }),
        }).then(r => r.json()).then(g => {
          if (g.photo) setGallery(prev => [g.photo, ...prev])
        })
        return prev.map(i => i.id === item.id ? { ...i, status: 'done', uploadedUrl } : i)
      })
    } catch (err: any) {
      updateItem(item.id, { status: 'error', error: err.message })
    }
  }

  const uploadAll = async () => {
    const pending = items.filter(i => i.status === 'pending' || i.status === 'error')
    if (pending.length === 0) { toast('Nothing to upload'); return }
    await Promise.all(pending.map(uploadOne))
    toast.success('All done!')
  }

  // ── Download ────────────────────────────────────────────────────────────────
  const downloadByUrl = async (url: string, name: string) => {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${name.replace(/\s+/g, '_')}.webp`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch {
      window.open(url, '_blank')
    }
  }

  // ── Delete from gallery ─────────────────────────────────────────────────────
  const deleteFromGallery = async (id: string) => {
    setGallery(prev => prev.filter(p => p.id !== id))
    setSelected(prev => { const s = new Set(prev); s.delete(id); return s })
    await fetch('/api/gallery', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
  }

  // ── Selection helpers ────────────────────────────────────────────────────────
  const toggleSelect = (id: string) =>
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  const selectAll = () => setSelected(new Set(gallery.map(p => p.id)))
  const clearSelection = () => setSelected(new Set())
  const allSelected = gallery.length > 0 && selected.size === gallery.length

  // ── Bulk download as zip ─────────────────────────────────────────────────────
  const downloadSelected = async () => {
    const targets = gallery.filter(p => selected.size === 0 || selected.has(p.id))
    if (targets.length === 0) return
    setBulkDownloading(true)
    const toastId = toast.loading(`Preparing ${targets.length} photos…`)
    try {
      const zip = new JSZip()
      await Promise.all(targets.map(async (photo, i) => {
        const res = await fetch(photo.url)
        const blob = await res.blob()
        zip.file(`${String(i + 1).padStart(3, '0')}_${photo.name.replace(/\s+/g, '_')}.webp`, blob)
      }))
      const content = await zip.generateAsync({ type: 'blob' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(content)
      a.download = `photos_${targets.length}.zip`
      a.click()
      URL.revokeObjectURL(a.href)
      toast.success(`Downloaded ${targets.length} photos`, { id: toastId })
    } catch {
      toast.error('Download failed', { id: toastId })
    } finally {
      setBulkDownloading(false)
    }
  }

  const counts = {
    total: items.length,
    done: items.filter(i => i.status === 'done').length,
    errors: items.filter(i => i.status === 'error').length,
    inProgress: items.filter(i => i.status === 'compressing' || i.status === 'uploading').length,
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Zoom lightbox */}
      {zoomed && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onMouseLeave={() => setZoomed(null)}
          onClick={() => setZoomed(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={zoomed.url}
            alt={zoomed.name}
            className="max-h-[90vh] max-w-[90vw] rounded-2xl shadow-2xl object-contain"
            onClick={e => e.stopPropagation()}
          />
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur text-white text-sm px-4 py-2 rounded-full">
            {zoomed.name}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-700 to-purple-500 text-white px-4 py-5 shadow">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-xl font-bold">Photo Upload</h1>
          <p className="text-purple-200 text-sm">Upload photos — auto-compressed, saved &amp; viewable anywhere</p>
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
          <p className="text-gray-400 text-sm mt-1">JPG, PNG, HEIC — compressed automatically before upload</p>
          <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden"
            onChange={e => e.target.files && addFiles(e.target.files)} />
        </div>

        {/* Queue bar */}
        {items.length > 0 && (
          <div className="bg-white rounded-2xl p-4 flex flex-wrap items-center gap-3 shadow-sm border border-gray-100">
            <div className="flex gap-4 flex-1 flex-wrap text-sm">
              <span className="text-gray-500">{counts.total} photos</span>
              {counts.done > 0 && <span className="text-green-600 font-medium">{counts.done} uploaded</span>}
              {counts.errors > 0 && <span className="text-red-500 font-medium">{counts.errors} failed</span>}
              {counts.inProgress > 0 && <span className="text-purple-500 font-medium">{counts.inProgress} in progress</span>}
            </div>
            <button onClick={() => setItems([])}
              className="text-sm text-gray-400 hover:text-red-500 transition px-3 py-1.5 rounded-lg hover:bg-red-50">
              Clear queue
            </button>
            <button onClick={uploadAll} disabled={counts.inProgress > 0}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-xl flex items-center gap-2 transition">
              {counts.inProgress > 0
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
                : <><Upload className="w-4 h-4" /> Upload All</>}
            </button>
          </div>
        )}

        {/* Upload queue grid */}
        {items.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {items.map(item => (
              <PhotoCard key={item.id} item={item}
                onRemove={() => removeItem(item.id)}
                onDownload={() => downloadByUrl(item.uploadedUrl ?? item.previewUrl, item.name)}
                onNameChange={name => updateItem(item.id, { name })} />
            ))}
          </div>
        )}

        {/* ── Saved Gallery ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <ImageIcon className="w-5 h-5 text-purple-500" />
              <h2 className="font-semibold text-gray-800">
                Saved Photos
                {gallery.length > 0 && <span className="ml-2 text-sm font-normal text-gray-400">({gallery.length})</span>}
              </h2>
            </div>

            {gallery.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {/* Select all / clear */}
                <button onClick={allSelected ? clearSelection : selectAll}
                  className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium transition">
                  {allSelected
                    ? <><CheckSquare className="w-3.5 h-3.5" /> Deselect all</>
                    : <><Square className="w-3.5 h-3.5" /> Select all</>}
                </button>

                {/* Download selected / all */}
                <button onClick={downloadSelected} disabled={bulkDownloading}
                  className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium transition">
                  {bulkDownloading
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Zipping…</>
                    : <><Download className="w-3.5 h-3.5" />
                        {selected.size > 0 ? `Download ${selected.size} selected` : `Download all (${gallery.length})`}
                      </>}
                </button>
              </div>
            )}
          </div>

          <div className="p-5">
            {galleryLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="rounded-2xl bg-gray-100 animate-pulse h-40" />
                ))}
              </div>
            ) : gallery.length === 0 ? (
              <div className="text-center py-10">
                <ImageIcon className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No saved photos yet — upload some above</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {gallery.map(photo => {
                  const isSelected = selected.has(photo.id)
                  return (
                    <div key={photo.id}
                      className={`rounded-2xl overflow-hidden border shadow-sm flex flex-col transition cursor-pointer ${
                        isSelected ? 'border-purple-500 ring-2 ring-purple-400' : 'border-gray-100'
                      }`}
                      onClick={() => toggleSelect(photo.id)}
                    >
                      <div className="relative h-32 bg-gray-100 cursor-zoom-in"
                        onMouseEnter={() => setZoomed({ url: photo.url, name: photo.name })}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" loading="lazy" />

                        {/* Selection tick */}
                        <div className={`absolute top-2 left-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                          isSelected ? 'bg-purple-600 border-purple-600' : 'bg-white/80 border-gray-300'
                        }`}>
                          {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>

                        <div className="absolute top-2 right-2 flex gap-1"
                          onClick={e => e.stopPropagation()}>
                          <button onClick={() => downloadByUrl(photo.url, photo.name)}
                            className="w-6 h-6 bg-white/90 rounded-full flex items-center justify-center hover:bg-white shadow"
                            title="Download">
                            <Download className="w-3 h-3 text-gray-700" />
                          </button>
                          <button onClick={() => deleteFromGallery(photo.id)}
                            className="w-6 h-6 bg-white/90 rounded-full flex items-center justify-center hover:bg-red-50 shadow"
                            title="Delete">
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </button>
                        </div>
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-semibold text-gray-800 truncate">{photo.name}</p>
                        <p className="text-xs text-gray-400">{new Date(photo.uploaded_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Photo card (upload queue) ─────────────────────────────────────────────────
function PhotoCard({ item, onRemove, onDownload, onNameChange }: {
  item: FileItem
  onRemove: () => void
  onDownload: () => void
  onNameChange: (name: string) => void
}) {
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState(item.name)

  const statusLabel = () => {
    if (item.status === 'compressing') return 'Compressing…'
    if (item.status === 'uploading') return 'Uploading…'
    if (item.status === 'done') {
      return item.compressedSize
        ? `${formatBytes(item.compressedSize)} (was ${formatBytes(item.originalSize)})`
        : formatBytes(item.originalSize)
    }
    if (item.status === 'error') return item.error ?? 'Failed'
    return formatBytes(item.originalSize)
  }

  return (
    <div className={`bg-white rounded-2xl overflow-hidden shadow-sm border flex flex-col ${
      item.status === 'error' ? 'border-red-200' :
      item.status === 'done'  ? 'border-green-200' : 'border-gray-100'
    }`}>
      <div className="relative h-32 bg-gray-100 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.previewUrl} alt={item.name} className="w-full h-full object-cover" />
        <div className="absolute top-2 right-2 flex gap-1">
          {item.status === 'done' && (
            <button onClick={onDownload}
              className="w-6 h-6 bg-white/90 rounded-full flex items-center justify-center hover:bg-white shadow">
              <Download className="w-3 h-3 text-gray-700" />
            </button>
          )}
          <button onClick={onRemove}
            className="w-6 h-6 bg-white/90 rounded-full flex items-center justify-center hover:bg-red-50 shadow">
            <X className="w-3 h-3 text-gray-700" />
          </button>
        </div>
        <div className={`absolute bottom-2 left-2 text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
          item.status === 'done'  ? 'bg-green-100 text-green-700' :
          item.status === 'error' ? 'bg-red-100 text-red-700' : 'bg-white/80 text-gray-600'
        }`}>
          {(item.status === 'compressing' || item.status === 'uploading') && <Loader2 className="w-3 h-3 animate-spin" />}
          {item.status === 'done'  && <CheckCircle className="w-3 h-3" />}
          {item.status === 'error' && <AlertCircle className="w-3 h-3" />}
          {item.status === 'pending' ? 'Ready' :
           item.status === 'compressing' ? 'Compressing' :
           item.status === 'uploading'   ? 'Uploading' :
           item.status === 'done'        ? 'Done' : 'Error'}
        </div>
      </div>
      <div className="p-2 flex-1 flex flex-col gap-1">
        {editingName ? (
          <input autoFocus value={nameVal}
            onChange={e => setNameVal(e.target.value)}
            onBlur={() => { onNameChange(nameVal); setEditingName(false) }}
            onKeyDown={e => { if (e.key === 'Enter') { onNameChange(nameVal); setEditingName(false) } }}
            className="text-xs font-semibold w-full border border-purple-300 rounded px-1 py-0.5 focus:outline-none" />
        ) : (
          <button onClick={() => setEditingName(true)}
            className="text-xs font-semibold text-gray-800 text-left hover:text-purple-600 truncate">
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
