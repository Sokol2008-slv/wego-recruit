import { createClient } from '@supabase/supabase-js'

let _supabase: ReturnType<typeof createClient> | null = null

export function getDb() {
  if (_supabase) return _supabase
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  if (url && key) {
    _supabase = createClient(url, key)
    return _supabase
  }
  return null
}

// Removed legacy export — all files now use getDb()

// === ТИПЫ ТАБЛИЦ ===

export type Candidate = {
  id: string
  created_at: string
  name: string
  surname: string
  phone: string
  telegram?: string | null
  has_telegram: boolean
  telegram_id?: string | null
  location?: string
  age_range: string
  citizenship: string
  work_permit: string
  job_type: string[]
  country: string
  housing_needed: string
  start_date: string
  schedule: string
  couple: string
  polish_level: string
  restrictions: string
  restrictions_comment?: string | null
  extra_info?: string | null
  auth_token?: string
  registered: boolean
  source: 'telegram' | 'direct' | 'other'
  status: 'new' | 'contacted' | 'hired' | 'rejected'
}

export type Employer = {
  id: string
  created_at: string
  company: string
  contact_name: string
  phone?: string
  telegram_chat_id?: string
  telegram_username?: string
  active: boolean
}

export type Vacancy = {
  id: string
  created_at: string
  employer_id?: string
  title: string
  company: string
  country: string
  city: string
  salary?: string
  housing: boolean
  schedule?: string
  description?: string
  requirements?: string
  departure_options: string[]
  tags: string[]
  headcount: number
  active: boolean
  category: 'blue_collar' | 'office' | 'hr'
}

export type Application = {
  id: string
  created_at: string
  candidate_id: string
  vacancy_id: string
  status: 'pending' | 'approved' | 'rejected' | 'selected' | 'auto_rejected'
  employer_response_at?: string | null
  worker_selected_at?: string | null
  // Joined data (from queries)
  vacancy?: Vacancy
  candidate?: Candidate
}

export type Meeting = {
  id: string
  created_at: string
  application_id: string
  candidate_id: string
  vacancy_id: string
  scheduled_at: string
  docs_status: 'pending' | 'approved' | 'rejected'
  docs_approved_at?: string | null
  reminder_sent: boolean
  confirmation_sent: boolean
  candidate_confirmed?: boolean | null
  candidate_confirmed_at?: string | null
  status: 'scheduled' | 'confirmed' | 'no_response' | 'cancelled' | 'completed'
  cancelled_at?: string | null
  cancel_reason?: string | null
  notes?: string | null
  // Joined data
  candidate?: Candidate
  vacancy?: Vacancy
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
