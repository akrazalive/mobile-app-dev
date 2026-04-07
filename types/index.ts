export type User = {
  id: string
  email: string
  name: string
  role: 'principal' | 'teacher' | 'farm_master' | 'student'
  phone?: string
  avatar_url?: string
}

export type Class = {
  id: string
  name: string
  description?: string
}

export type Section = {
  id: string
  class_id: string
  name: string
  room_number?: string
  capacity?: number
}

export type Student = {
  id: string
  user_id: string
  roll_number: string
  class_id: string
  section_id: string
  parent_name?: string
  parent_phone?: string
}