import { supabase } from './supabase'

export type SessionUser = {
  id: string
  email: string
  name: string
  role: string
}

const SESSION_KEY = 'school_session'

export async function loginWithTable(email: string, password: string): Promise<SessionUser> {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, role, password')
    .eq('email', email)
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw new Error('Login failed. Please try again.')
  if (!data) throw new Error('No account found with that email.')
  if (data.password !== password) throw new Error('Incorrect password.')

  const session: SessionUser = { id: data.id, email: data.email, name: data.name, role: data.role }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

export function getSession(): SessionUser | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export function clearSession() {
  if (typeof window !== 'undefined') localStorage.removeItem(SESSION_KEY)
}
