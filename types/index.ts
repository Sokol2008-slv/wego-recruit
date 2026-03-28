// Категории пользователей платформы
export type UserCategory = 'blue_collar' | 'office' | 'hr'

// Шаги анкеты соискателя
export type WorkerFormData = {
  category: UserCategory
  age_range: string
  gender: string
  housing_needed: string
  country: string
  citizenship: string
  departure: string
  name: string
  phone: string
  telegram?: string
}

// Результат теста
export type TestResult = {
  answers: Record<string, string>
  score: number
  passed: boolean
  completed_at: string
}

// Форма работодателя
export type EmployerFormData = {
  company: string
  country: string
  specialty: string
  count: number
  start_date: string
  housing: string
  contact: string
  phone: string
  notes?: string
}
