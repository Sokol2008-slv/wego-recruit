import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null!

// Типы таблиц (расширяй по мере роста)
export type Candidate = {
  id: string
  created_at: string
  name: string
  phone: string
  telegram?: string
  age_range: string
  gender: string
  housing_needed: boolean
  country: string
  citizenship: string
  departure: string
  test_score?: number
  test_answers?: Record<string, unknown>
  source: 'telegram' | 'direct' | 'other'
  status: 'new' | 'contacted' | 'hired' | 'rejected'
}

export type EmployerRequest = {
  id: string
  created_at: string
  company: string
  country: string
  specialty: string
  headcount: number
  start_date: string
  housing_provided: boolean
  contact_name: string
  phone: string
  notes?: string
  status: 'new' | 'in_progress' | 'closed'
}

export type Vacancy = {
  id: string
  title: string
  company: string
  country: string
  city: string
  salary: string
  housing: boolean
  departure_options: string[]
  tags: string[]
  headcount: number
  active: boolean
  category: 'blue_collar' | 'office' | 'hr'
}
