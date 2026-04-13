'use client'

import { useState, useRef, useEffect } from 'react'
import { Camera, Loader2, X, User } from 'lucide-react'

type Props = {
  value: string        // current URL
  onChange: (url: string) => void
  folder?: string      // R2 subfolder, default 'students'
  size?: 'sm' | 'md'
}

export default function ImageUpload({ value, onChange, folder = 'students', size = 'md' }: Props) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync when parent passes a new value (e.g. edit form opens with existing URL)
  useEffect(() => { setPreview(value) }, [value])

  const dim = size === 'sm' ? 'w-16 h-16' : 'w-24 h-24'

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { alert('Please select an image file'); return }
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5MB'); return }

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file)
    setPreview(localUrl)
    setUploading(true)

    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', folder)

      const res  = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json()

      if (!res.ok) throw new Error(json.error ?? 'Upload failed')

      setPreview(json.url)
      onChange(json.url)
    } catch (err: any) {
      alert(err.message)
      setPreview(value) // revert
    } finally {
      setUploading(false)
    }
  }

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setPreview('')
    onChange('')
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        className={`relative ${dim} rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-purple-400 transition overflow-hidden bg-gray-50`}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Student" className="w-full h-full object-cover" />
        ) : (
          <User className="w-8 h-8 text-gray-300" />
        )}

        {/* Upload overlay */}
        {!uploading && (
          <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition flex items-center justify-center rounded-full">
            <Camera className="w-5 h-5 text-white" />
          </div>
        )}

        {/* Spinner */}
        {uploading && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-full">
            <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
          </div>
        )}

        {/* Clear button */}
        {preview && !uploading && (
          <button
            type="button"
            onClick={clear}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"   // on mobile: opens camera directly
        className="hidden"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      <p className="text-xs text-gray-400">
        {uploading ? 'Uploading...' : 'Tap to upload photo'}
      </p>
    </div>
  )
}
