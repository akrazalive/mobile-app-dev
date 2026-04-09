'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Loader2, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

type Props = {
  teacher?: any
  onSaved: () => void
  onCancel: () => void
}

const DEFAULT_PASSWORD = 'password123'

export default function TeacherForm({ teacher, onSaved, onCancel }: Props) {
  const [form, setForm] = useState({
    name:          teacher?.name          ?? '',
    email:         teacher?.email         ?? '',
    phone:         teacher?.phone         ?? '',
    gender:        teacher?.gender        ?? 'male',
    date_of_birth: teacher?.date_of_birth ?? '',
    address:       teacher?.address       ?? '',
    is_active:     teacher?.is_active     ?? true,
    password:      DEFAULT_PASSWORD,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        name:          form.name,
        email:         form.email.toLowerCase().trim(),
        phone:         form.phone         || null,
        gender:        form.gender        || null,
        date_of_birth: form.date_of_birth || null,
        address:       form.address       || null,
        is_active:     form.is_active,
        role:          'teacher',
        password:      form.password,
      }

      if (teacher?.id) {
        // Update — don't overwrite password if left as default and teacher already exists
        const updatePayload: any = { ...payload }
        if (!form.password) delete updatePayload.password
        const { error } = await supabase.from('users').update(updatePayload).eq('id', teacher.id)
        if (error) throw error
        toast.success('Teacher updated')
      } else {
        // Check email not already taken
        const { data: existing } = await supabase
          .from('users').select('id').eq('email', payload.email).maybeSingle()
        if (existing) throw new Error('A user with this email already exists')

        const { error } = await supabase.from('users').insert(payload)
        if (error) throw error
        toast.success(`Teacher created — login: ${payload.email} / ${form.password}`)
      }
      onSaved()
    } catch (err: any) {
      toast.error(err.message)
    }
    setLoading(false)
  }

  const field = (label: string, key: string, type = 'text', required = false, placeholder = '') => (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        {label}{required && ' *'}
      </label>
      <input
        type={type} required={required} value={(form as any)[key]}
        onChange={e => set(key, e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
      />
    </div>
  )

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{teacher ? 'Edit Teacher' : 'Add Teacher'}</h2>
          {!teacher && (
            <p className="text-xs text-gray-400 mt-0.5">Default password is <span className="font-mono font-semibold">{DEFAULT_PASSWORD}</span></p>
          )}
        </div>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Full name */}
          <div className="sm:col-span-2">
            {field('Full Name', 'name', 'text', true, 'e.g. Mr. Ahmad Khan')}
          </div>

          {/* Email */}
          {field('Email Address', 'email', 'email', true, 'teacher@school.com')}

          {/* Phone */}
          {field('Phone Number', 'phone', 'tel', false, '0300-0000000')}

          {/* Gender */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Gender</label>
            <select value={form.gender} onChange={e => set('gender', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none">
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* DOB */}
          {field('Date of Birth', 'date_of_birth', 'date')}

          {/* Address */}
          <div className="sm:col-span-2">
            {field('Address', 'address', 'text', false, 'Home address')}
          </div>

          {/* Password */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              {teacher ? 'Change Password (leave as-is to keep current)' : 'Login Password *'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={e => set('password', e.target.value)}
                required={!teacher}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              />
              <button type="button" onClick={() => setShowPassword(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Active toggle */}
          <div className="sm:col-span-2 flex items-center gap-3">
            <button type="button" onClick={() => set('is_active', !form.is_active)}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.is_active ? 'bg-green-500' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : ''}`} />
            </button>
            <span className="text-sm text-gray-700">Account {form.is_active ? 'Active' : 'Inactive'}</span>
          </div>
        </div>

        {/* Credentials preview for new teacher */}
        {!teacher && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-green-800 mb-1">Login credentials for this teacher:</p>
            <p className="text-sm text-green-700">Email: <span className="font-mono">{form.email || '—'}</span></p>
            <p className="text-sm text-green-700">Password: <span className="font-mono">{form.password}</span></p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading}
            className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-purple-700 transition disabled:opacity-50">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Saving...' : (teacher ? 'Update Teacher' : 'Create Teacher')}
          </button>
          <button type="button" onClick={onCancel}
            className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-semibold hover:bg-gray-200 transition">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
