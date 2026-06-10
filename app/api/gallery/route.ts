import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://rhdepoxamlohzlnhociz.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoZGVwb3hhbWxvaHpsbmhvY2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NjcwMTEsImV4cCI6MjA5MTA0MzAxMX0.9IeRMF8UgKIhJH8fMbHcOrZtlwZXa7o8Ru2YAi_cPX8'
)

export async function GET() {
  const { data, error } = await supabase
    .from('photo_gallery')
    .select('id, name, url, uploaded_at')
    .order('uploaded_at', { ascending: false })

  if (error) return NextResponse.json({ photos: [] }) // table may not exist yet
  return NextResponse.json({ photos: data ?? [] })
}

export async function POST(req: NextRequest) {
  const { name, url } = await req.json()
  if (!name || !url) return NextResponse.json({ error: 'name and url required' }, { status: 400 })

  const { data, error } = await supabase
    .from('photo_gallery')
    .insert({ name, url })
    .select('id, name, url, uploaded_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ photo: data })
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase.from('photo_gallery').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
