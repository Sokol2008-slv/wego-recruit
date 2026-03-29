'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { translateValue } from '@/lib/labels'

type Tab = 'applications' | 'candidates' | 'meetings'

type ApplicationRow = {
  id: string
  created_at: string
  status: string
  candidate?: { id: string; name: string; surname: string; phone: string; email?: string }
  vacancy?: { id: string; title: string; company: string; city: string; country: string }
}

type CandidateRow = {
  id: string
  created_at: string
  name: string
  surname: string
  phone: string
  email?: string
  telegram?: string | null
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
  location?: string
  status: string
}

type CandidateDetail = CandidateRow & {
  applications: (ApplicationRow & { vacancy?: { id: string; title: string; company: string; city: string; country: string; salary?: string } })[]
}

type MeetingRow = {
  id: string
  created_at: string
  application_id: string
  scheduled_at: string
  docs_status: string
  status: string
  cancel_reason?: string | null
  notes?: string | null
  candidate?: { id: string; name: string; surname: string; phone: string; email?: string; telegram?: string | null; telegram_id?: string | null }
  vacancy?: { id: string; title: string; company: string; city: string; country: string }
}

const MEETING_STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  scheduled: { label: 'Запланирована', color: 'text-yellow-400', bg: 'bg-yellow-400/15' },
  confirmed: { label: 'Подтверждена', color: 'text-green-400', bg: 'bg-green-400/15' },
  no_response: { label: 'Нет ответа', color: 'text-red-400', bg: 'bg-red-400/15' },
  cancelled: { label: 'Отменена', color: 'text-gray-400', bg: 'bg-gray-400/15' },
  completed: { label: 'Завершена', color: 'text-blue-400', bg: 'bg-blue-400/15' },
}

const DOCS_STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Ожидание', color: 'text-yellow-400', bg: 'bg-yellow-400/15' },
  approved: { label: 'Одобрены', color: 'text-green-400', bg: 'bg-green-400/15' },
  rejected: { label: 'Отклонены', color: 'text-red-400', bg: 'bg-red-400/15' },
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'На рассмотрении', color: 'text-yellow-400', bg: 'bg-yellow-400/15' },
  approved: { label: 'Одобрено', color: 'text-green-400', bg: 'bg-green-400/15' },
  rejected: { label: 'Отклонено', color: 'text-red-400', bg: 'bg-red-400/15' },
  selected: { label: 'Выбрано', color: 'text-blue-400', bg: 'bg-blue-400/15' },
  meeting_scheduled: { label: 'Встреча назначена', color: 'text-purple-400', bg: 'bg-purple-400/15' },
  auto_rejected: { label: 'Авто-отклонено', color: 'text-red-400', bg: 'bg-red-400/15' },
}

const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Все статусы' },
  { value: 'pending', label: 'На рассмотрении' },
  { value: 'approved', label: 'Одобрено' },
  { value: 'rejected', label: 'Отклонено' },
  { value: 'selected', label: 'Выбрано' },
  { value: 'meeting_scheduled', label: 'Встреча назначена' },
  { value: 'auto_rejected', label: 'Авто-отклонено' },
]

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'только что'
  if (mins < 60) return `${mins}м назад`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}ч назад`
  const days = Math.floor(hours / 24)
  return `${days}д назад`
}

type SortField = 'name' | 'date' | 'status'
type SortDir = 'asc' | 'desc'

export default function AdminPage() {
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState(false)
  const [tab, setTab] = useState<Tab>('applications')

  // Applications tab
  const [applications, setApplications] = useState<ApplicationRow[]>([])
  const [appsLoading, setAppsLoading] = useState(false)

  // Applications search + filters
  const [appsSearch, setAppsSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Applications sorting
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // Candidates tab
  const [candidates, setCandidates] = useState<CandidateRow[]>([])
  const [candidatesLoading, setCandidatesLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [searchDebounce, setSearchDebounce] = useState('')

  // Candidate detail
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Meetings tab
  const [meetings, setMeetings] = useState<MeetingRow[]>([])
  const [meetingsLoading, setMeetingsLoading] = useState(false)
  const [cancelMeetingId, setCancelMeetingId] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [rescheduleMeetingId, setRescheduleMeetingId] = useState<string | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')

  const getAuthHeaders = (): Record<string, string> => {
    const email = (typeof window !== 'undefined' ? sessionStorage.getItem('admin_email') : null) || adminEmail
    const pass = (typeof window !== 'undefined' ? sessionStorage.getItem('admin_password') : null) || adminPassword
    return { 'X-Admin-Email': email, 'X-Admin-Password': pass }
  }

  const handleLogin = async () => {
    setAuthError(false)
    try {
      const res = await fetch('/api/admin/applications', {
        headers: { 'X-Admin-Email': adminEmail, 'X-Admin-Password': adminPassword },
      })
      if (res.ok) {
        sessionStorage.setItem('admin_email', adminEmail)
        sessionStorage.setItem('admin_password', adminPassword)
        setAuthed(true)
        const data = await res.json()
        setApplications(data.applications || [])
      } else {
        setAuthError(true)
      }
    } catch {
      setAuthError(true)
    }
  }

  const fetchApplications = useCallback(async () => {
    setAppsLoading(true)
    try {
      const res = await fetch('/api/admin/applications', {
        headers: { ...getAuthHeaders() },
      })
      if (res.ok) {
        const data = await res.json()
        setApplications(data.applications || [])
      }
    } catch { /* ignore */ }
    setAppsLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchCandidates = useCallback(async (q: string) => {
    setCandidatesLoading(true)
    try {
      const params = q ? `?search=${encodeURIComponent(q)}` : ''
      const res = await fetch(`/api/admin/candidates${params}`, {
        headers: { ...getAuthHeaders() },
      })
      if (res.ok) {
        const data = await res.json()
        setCandidates(data.candidates || [])
      }
    } catch { /* ignore */ }
    setCandidatesLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchCandidateDetail = async (id: string) => {
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/admin/candidates/${id}`, {
        headers: { ...getAuthHeaders() },
      })
      if (res.ok) {
        const data = await res.json()
        setSelectedCandidate({ ...data.candidate, applications: data.applications || [] })
      }
    } catch { /* ignore */ }
    setDetailLoading(false)
  }

  const viewCandidate = (candidateId: string) => {
    setTab('candidates')
    fetchCandidateDetail(candidateId)
  }

  const fetchMeetings = useCallback(async () => {
    setMeetingsLoading(true)
    try {
      const res = await fetch('/api/admin/meetings', {
        headers: { ...getAuthHeaders() },
      })
      if (res.ok) {
        const data = await res.json()
        setMeetings(data.meetings || [])
      }
    } catch { /* ignore */ }
    setMeetingsLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleApproveDocs = async (meetingId: string) => {
    try {
      await fetch(`/api/admin/meetings/${meetingId}`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ docsStatus: 'approved' }),
      })
      fetchMeetings()
    } catch { /* ignore */ }
  }

  const handleCancelMeeting = async (meetingId: string) => {
    try {
      await fetch(`/api/admin/meetings/${meetingId}`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled', cancelReason: cancelReason || 'Без причины' }),
      })
      setCancelMeetingId(null)
      setCancelReason('')
      fetchMeetings()
    } catch { /* ignore */ }
  }

  const handleRescheduleMeeting = async (meetingId: string) => {
    if (!rescheduleDate) return
    try {
      await fetch(`/api/admin/meetings/${meetingId}`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt: new Date(rescheduleDate).toISOString() }),
      })
      setRescheduleMeetingId(null)
      setRescheduleDate('')
      fetchMeetings()
    } catch { /* ignore */ }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir(field === 'date' ? 'desc' : 'asc')
    }
  }

  const sortArrow = (field: SortField) => {
    if (sortField !== field) return ''
    return sortDir === 'asc' ? ' \u25B2' : ' \u25BC'
  }

  // Filtered and sorted applications
  const filteredSortedApps = useMemo(() => {
    let result = [...applications]

    // Status filter
    if (statusFilter) {
      result = result.filter(app => app.status === statusFilter)
    }

    // Text search across all fields
    if (appsSearch.trim()) {
      const q = appsSearch.trim().toLowerCase()
      result = result.filter(app => {
        const name = (app.candidate?.name || '').toLowerCase()
        const surname = (app.candidate?.surname || '').toLowerCase()
        const phone = (app.candidate?.phone || '').toLowerCase()
        const email = (app.candidate?.email || '').toLowerCase()
        const vacancyTitle = (app.vacancy?.title || '').toLowerCase()
        const company = (app.vacancy?.company || '').toLowerCase()
        const statusLabel = (STATUS_LABELS[app.status]?.label || '').toLowerCase()
        return (
          name.includes(q) ||
          surname.includes(q) ||
          `${name} ${surname}`.includes(q) ||
          phone.includes(q) ||
          email.includes(q) ||
          vacancyTitle.includes(q) ||
          company.includes(q) ||
          statusLabel.includes(q)
        )
      })
    }

    // Sorting
    result.sort((a, b) => {
      let cmp = 0
      if (sortField === 'name') {
        const aName = `${a.candidate?.name || ''} ${a.candidate?.surname || ''}`.toLowerCase()
        const bName = `${b.candidate?.name || ''} ${b.candidate?.surname || ''}`.toLowerCase()
        cmp = aName.localeCompare(bName)
      } else if (sortField === 'date') {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      } else if (sortField === 'status') {
        const aLabel = (STATUS_LABELS[a.status]?.label || '').toLowerCase()
        const bLabel = (STATUS_LABELS[b.status]?.label || '').toLowerCase()
        cmp = aLabel.localeCompare(bLabel)
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [applications, appsSearch, statusFilter, sortField, sortDir])

  // Stats
  const stats = useMemo(() => {
    const uniqueCandidateIds = new Set(applications.map(a => a.candidate?.id).filter(Boolean))
    const pendingCount = applications.filter(a => a.status === 'pending').length
    const activeMeetings = meetings.filter(m => m.status !== 'cancelled' && m.status !== 'completed').length
    return {
      candidates: uniqueCandidateIds.size,
      applications: applications.length,
      pending: pendingCount,
      activeMeetings,
    }
  }, [applications, meetings])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounce(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (authed && tab === 'candidates') {
      fetchCandidates(searchDebounce)
    }
  }, [authed, tab, searchDebounce, fetchCandidates])

  useEffect(() => {
    if (authed && tab === 'applications') {
      fetchApplications()
    }
  }, [authed, tab, fetchApplications])

  useEffect(() => {
    if (authed && tab === 'meetings') {
      fetchMeetings()
    }
  }, [authed, tab, fetchMeetings])

  // Fetch meetings for stats when authed (even if not on meetings tab)
  useEffect(() => {
    if (authed && meetings.length === 0) {
      fetchMeetings()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed])

  // Check stored session
  useEffect(() => {
    const storedEmail = sessionStorage.getItem('admin_email')
    const storedPass = sessionStorage.getItem('admin_password')
    if (storedEmail && storedPass) {
      setAdminEmail(storedEmail)
      setAdminPassword(storedPass)
      fetch('/api/admin/applications', {
        headers: { 'X-Admin-Email': storedEmail, 'X-Admin-Password': storedPass },
      }).then(res => {
        if (res.ok) {
          setAuthed(true)
          res.json().then(data => setApplications(data.applications || []))
        }
      }).catch(() => {})
    }
  }, [])

  if (!authed) {
    return (
      <main className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="max-w-sm w-full">
          <h1 className="font-display text-3xl text-white mb-2 text-center">Админ панель</h1>
          <p className="text-muted text-sm mb-6 text-center">Введите email и пароль для входа</p>
          <input
            type="email"
            value={adminEmail}
            onChange={e => { setAdminEmail(e.target.value); setAuthError(false) }}
            onKeyDown={e => { if (e.key === 'Enter') handleLogin() }}
            className={`w-full bg-bg2 border rounded-xl px-4 py-3 text-white placeholder:text-muted/40 outline-none focus:border-accent transition-colors mb-3 ${authError ? 'border-red-500' : 'border-border'}`}
            placeholder="Email"
            autoFocus
          />
          <input
            type="password"
            value={adminPassword}
            onChange={e => { setAdminPassword(e.target.value); setAuthError(false) }}
            onKeyDown={e => { if (e.key === 'Enter') handleLogin() }}
            className={`w-full bg-bg2 border rounded-xl px-4 py-3 text-white placeholder:text-muted/40 outline-none focus:border-accent transition-colors mb-3 ${authError ? 'border-red-500' : 'border-border'}`}
            placeholder="Пароль"
          />
          {authError && <p className="text-red-500 text-xs mb-3">Неверный email или пароль</p>}
          <button
            onClick={handleLogin}
            className="w-full py-3 rounded-xl bg-accent hover:bg-accent/90 text-white font-medium transition-colors"
          >
            Войти
          </button>
        </div>
      </main>
    )
  }

  // Candidate detail view
  if (selectedCandidate) {
    const c = selectedCandidate
    const fields: { label: string; value: string | undefined | null }[] = [
      { label: 'Имя', value: c.name },
      { label: 'Фамилия', value: c.surname },
      { label: 'Email', value: c.email },
      { label: 'Телефон', value: c.phone },
      { label: 'Telegram', value: c.telegram },
      { label: 'Возраст', value: translateValue('age_range', c.age_range) },
      { label: 'Гражданство', value: translateValue('citizenship', c.citizenship) },
      { label: 'Разрешение на работу', value: translateValue('work_permit', c.work_permit) },
      { label: 'Тип работы', value: translateValue('job_type', c.job_type) },
      { label: 'Страна', value: translateValue('country', c.country) },
      { label: 'Жильё', value: translateValue('housing_needed', c.housing_needed) },
      { label: 'Начало работы', value: translateValue('start_date', c.start_date) },
      { label: 'График', value: translateValue('schedule', c.schedule) },
      { label: 'Пара', value: translateValue('couple', c.couple) },
      { label: 'Польский', value: translateValue('polish_level', c.polish_level) },
      { label: 'Ограничения', value: translateValue('restrictions', c.restrictions) },
      { label: 'Комментарий к ограничениям', value: c.restrictions_comment },
      { label: 'Локация', value: c.location },
      { label: 'Статус', value: translateValue('status', c.status) },
    ]

    return (
      <main className="min-h-screen bg-bg pt-8 pb-12 px-4">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => setSelectedCandidate(null)}
            className="text-sm text-muted hover:text-white transition-colors mb-6 inline-block"
          >
            &larr; Назад к списку
          </button>

          <h1 className="font-display text-3xl text-white mb-1">{c.name} {c.surname}</h1>
          <p className="text-muted text-sm mb-6">Зарегистрирован: {new Date(c.created_at).toLocaleDateString('ru-RU')}</p>

          {detailLoading ? (
            <div className="text-muted text-center py-8">Загрузка...</div>
          ) : (
            <>
              <div className="bg-bg2 border border-border rounded-2xl p-5 mb-6">
                <h2 className="text-lg font-semibold text-white mb-4">Анкета</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {fields.map(f => f.value ? (
                    <div key={f.label}>
                      <div className="text-xs text-muted">{f.label}</div>
                      <div className="text-sm text-white">{f.value}</div>
                    </div>
                  ) : null)}
                </div>
              </div>

              <h2 className="text-lg font-semibold text-white mb-3">Заявки ({c.applications?.length || 0})</h2>
              {(!c.applications || c.applications.length === 0) ? (
                <p className="text-muted text-sm">Нет заявок</p>
              ) : (
                <div className="space-y-3">
                  {c.applications.map(app => {
                    const sc = STATUS_LABELS[app.status] || STATUS_LABELS.pending
                    return (
                      <div key={app.id} className="bg-bg2 border border-border rounded-xl p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-white font-medium">{app.vacancy?.title}</div>
                            <div className="text-sm text-muted">{app.vacancy?.company} &middot; {app.vacancy?.city}, {app.vacancy?.country}</div>
                            {app.vacancy?.salary && <div className="text-sm text-accent font-medium mt-1">{app.vacancy.salary}</div>}
                          </div>
                          <span className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap ${sc.bg} ${sc.color}`}>
                            {sc.label}
                          </span>
                        </div>
                        <div className="text-xs text-muted mt-2">{new Date(app.created_at).toLocaleDateString('ru-RU')}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-bg pt-8 pb-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-3xl text-white">Админ панель</h1>
          <button
            onClick={() => { sessionStorage.removeItem('admin_email'); sessionStorage.removeItem('admin_password'); setAuthed(false); setAdminEmail(''); setAdminPassword('') }}
            className="text-sm text-muted hover:text-white transition-colors"
          >
            Выйти
          </button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-bg2 border border-border rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-lg">👥</span>
            <div>
              <div className="text-white text-lg font-semibold leading-tight">{stats.candidates}</div>
              <div className="text-muted text-xs">Кандидатов</div>
            </div>
          </div>
          <div className="bg-bg2 border border-border rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-lg">📋</span>
            <div>
              <div className="text-white text-lg font-semibold leading-tight">{stats.applications}</div>
              <div className="text-muted text-xs">Заявок</div>
            </div>
          </div>
          <div className="bg-bg2 border border-border rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-lg">⏳</span>
            <div>
              <div className="text-yellow-400 text-lg font-semibold leading-tight">{stats.pending}</div>
              <div className="text-muted text-xs">На рассмотрении</div>
            </div>
          </div>
          <div className="bg-bg2 border border-border rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-lg">📅</span>
            <div>
              <div className="text-green-400 text-lg font-semibold leading-tight">{stats.activeMeetings}</div>
              <div className="text-muted text-xs">Активных встреч</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('applications')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === 'applications'
                ? 'bg-accent/15 text-accent'
                : 'bg-bg2 border border-border text-muted hover:text-white'
            }`}
          >
            Все заявки
          </button>
          <button
            onClick={() => setTab('candidates')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === 'candidates'
                ? 'bg-accent/15 text-accent'
                : 'bg-bg2 border border-border text-muted hover:text-white'
            }`}
          >
            Кандидаты
          </button>
          <button
            onClick={() => setTab('meetings')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === 'meetings'
                ? 'bg-accent/15 text-accent'
                : 'bg-bg2 border border-border text-muted hover:text-white'
            }`}
          >
            Встречи
          </button>
        </div>

        {/* Applications tab */}
        {tab === 'applications' && (
          <>
            <div className="flex gap-3 mb-4">
              <input
                value={appsSearch}
                onChange={e => setAppsSearch(e.target.value)}
                className="flex-1 bg-bg2 border border-border rounded-xl px-4 py-3 text-white placeholder:text-muted/40 outline-none focus:border-accent transition-colors"
                placeholder="Поиск по имени, телефону, email, вакансии, компании, статусу..."
              />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-bg2 border border-border rounded-xl px-4 py-3 text-white outline-none focus:border-accent transition-colors appearance-none cursor-pointer min-w-[180px]"
              >
                {STATUS_FILTER_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            {appsLoading && <div className="text-muted text-center py-8">Загрузка...</div>}
            {!appsLoading && applications.length === 0 && (
              <div className="text-muted text-center py-8">Нет заявок</div>
            )}
            {!appsLoading && applications.length > 0 && (() => {
              return filteredSortedApps.length === 0 ? (
                <div className="text-muted text-center py-8">Ничего не найдено</div>
              ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted border-b border-border">
                      <th
                        className="pb-3 pr-4 cursor-pointer hover:text-white transition-colors select-none"
                        onClick={() => handleSort('name')}
                      >
                        Кандидат<span className="text-muted text-xs ml-1">{sortArrow('name')}</span>
                      </th>
                      <th className="pb-3 pr-4">Телефон</th>
                      <th className="pb-3 pr-4">Email</th>
                      <th className="pb-3 pr-4">Вакансия</th>
                      <th className="pb-3 pr-4">Компания</th>
                      <th
                        className="pb-3 pr-4 cursor-pointer hover:text-white transition-colors select-none"
                        onClick={() => handleSort('status')}
                      >
                        Статус<span className="text-muted text-xs ml-1">{sortArrow('status')}</span>
                      </th>
                      <th
                        className="pb-3 cursor-pointer hover:text-white transition-colors select-none"
                        onClick={() => handleSort('date')}
                      >
                        Дата<span className="text-muted text-xs ml-1">{sortArrow('date')}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSortedApps.map(app => {
                      const sc = STATUS_LABELS[app.status] || STATUS_LABELS.pending
                      return (
                        <tr key={app.id} className="border-b border-border/50 hover:bg-bg2/50">
                          <td className="py-3 pr-4">
                            {app.candidate?.id ? (
                              <button
                                onClick={() => viewCandidate(app.candidate!.id)}
                                className="text-white hover:text-accent transition-colors text-left"
                              >
                                {app.candidate?.name} {app.candidate?.surname}
                              </button>
                            ) : (
                              <span className="text-white">{app.candidate?.name} {app.candidate?.surname}</span>
                            )}
                          </td>
                          <td className="py-3 pr-4 text-muted text-xs">{app.candidate?.phone || '-'}</td>
                          <td className="py-3 pr-4 text-muted text-xs">{app.candidate?.email || '-'}</td>
                          <td className="py-3 pr-4 text-white">{app.vacancy?.title}</td>
                          <td className="py-3 pr-4 text-muted">{app.vacancy?.company}</td>
                          <td className="py-3 pr-4">
                            <span className={`text-xs px-2.5 py-1 rounded-full ${sc.bg} ${sc.color}`}>
                              {sc.label}
                            </span>
                            {app.status === 'selected' && !applications.some(a => a.candidate?.id === app.candidate?.id && a.status === 'meeting_scheduled') && (
                              <button
                                onClick={async () => {
                                  const date = prompt('Дата и время встречи (ГГГГ-ММ-ДД ЧЧ:ММ):', new Date(Date.now() + 86400000).toISOString().slice(0, 16).replace('T', ' '))
                                  if (!date) return
                                  try {
                                    const res = await fetch('/api/admin/meetings', {
                                      method: 'POST',
                                      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ applicationId: app.id, scheduledAt: new Date(date).toISOString() }),
                                    })
                                    if (res.ok) {
                                      alert('Встреча создана!')
                                      fetchApplications()
                                      setTab('meetings')
                                      fetchMeetings()
                                    } else {
                                      const data = await res.json()
                                      alert('Ошибка: ' + (data.error || 'Неизвестная'))
                                    }
                                  } catch { alert('Ошибка соединения') }
                                }}
                                className="ml-2 text-xs px-2.5 py-1 rounded-full bg-accent/15 text-accent hover:bg-accent/25 transition-colors"
                              >
                                Создать встречу
                              </button>
                            )}
                          </td>
                          <td className="py-3">
                            <div className="text-muted">
                              {new Date(app.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="text-muted/60 text-xs">{relativeTime(app.created_at)}</div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              )
            })()}
          </>
        )}

        {/* Candidates tab */}
        {tab === 'candidates' && (
          <>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-bg2 border border-border rounded-xl px-4 py-3 text-white placeholder:text-muted/40 outline-none focus:border-accent transition-colors mb-4"
              placeholder="Поиск по имени или фамилии..."
            />
            {candidatesLoading && <div className="text-muted text-center py-8">Загрузка...</div>}
            {!candidatesLoading && candidates.length === 0 && (
              <div className="text-muted text-center py-8">Кандидаты не найдены</div>
            )}
            {!candidatesLoading && candidates.length > 0 && (
              <div className="space-y-2">
                {candidates.map(c => (
                  <button
                    key={c.id}
                    onClick={() => fetchCandidateDetail(c.id)}
                    className="w-full text-left bg-bg2 border border-border rounded-xl p-4 hover:border-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white font-medium">{c.name} {c.surname}</div>
                        <div className="text-sm text-muted">{c.phone} {c.email ? `| ${c.email}` : ''}</div>
                      </div>
                      <div className="text-xs text-muted">{new Date(c.created_at).toLocaleDateString('ru-RU')}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Meetings tab */}
        {tab === 'meetings' && (
          <>
            {meetingsLoading && <div className="text-muted text-center py-8">Загрузка...</div>}
            {!meetingsLoading && meetings.length === 0 && (
              <div className="text-muted text-center py-8">Нет встреч</div>
            )}
            {!meetingsLoading && meetings.length > 0 && (
              <div className="space-y-3">
                {meetings.map(m => {
                  const ms = MEETING_STATUS_LABELS[m.status] || MEETING_STATUS_LABELS.scheduled
                  const ds = DOCS_STATUS_LABELS[m.docs_status] || DOCS_STATUS_LABELS.pending
                  const scheduledDate = new Date(m.scheduled_at)
                  const dateStr = scheduledDate.toLocaleString('ru-RU', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })

                  return (
                    <div key={m.id} className="bg-bg2 border border-border rounded-xl p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="text-white font-medium">
                            {m.candidate?.name} {m.candidate?.surname}
                          </div>
                          {m.candidate?.phone && (
                            <div className="text-xs text-muted mt-0.5">
                              <span>&#x1F4DE; {m.candidate.phone}</span>
                              {m.candidate?.email && (
                                <span className="ml-3">&#x1F4E7; {m.candidate.email}</span>
                              )}
                            </div>
                          )}
                          <div className="text-sm text-muted mt-1">
                            {m.vacancy?.title} &middot; {m.vacancy?.company}
                          </div>
                          <div className="text-sm text-accent font-medium mt-1">
                            {dateStr}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap ${ms.bg} ${ms.color}`}>
                            {ms.label}
                          </span>
                          <span className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap ${ds.bg} ${ds.color}`}>
                            Док: {ds.label}
                          </span>
                        </div>
                      </div>

                      {m.cancel_reason && (
                        <div className="text-xs text-red-400 mb-2">Причина отмены: {m.cancel_reason}</div>
                      )}

                      {m.status !== 'cancelled' && m.status !== 'completed' && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {m.docs_status !== 'approved' && (
                            <button
                              onClick={() => handleApproveDocs(m.id)}
                              className="text-xs px-3 py-1.5 rounded-lg bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors"
                            >
                              Документы ОК
                            </button>
                          )}

                          {rescheduleMeetingId === m.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="datetime-local"
                                value={rescheduleDate}
                                onChange={e => setRescheduleDate(e.target.value)}
                                className="bg-bg border border-border rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-accent"
                              />
                              <button
                                onClick={() => handleRescheduleMeeting(m.id)}
                                className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition-colors"
                              >
                                Сохранить
                              </button>
                              <button
                                onClick={() => { setRescheduleMeetingId(null); setRescheduleDate('') }}
                                className="text-xs px-2 py-1.5 text-muted hover:text-white transition-colors"
                              >
                                Отмена
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setRescheduleMeetingId(m.id)}
                              className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition-colors"
                            >
                              Назначить дату
                            </button>
                          )}

                          {cancelMeetingId === m.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={cancelReason}
                                onChange={e => setCancelReason(e.target.value)}
                                placeholder="Причина отмены..."
                                className="bg-bg border border-border rounded-lg px-2 py-1 text-xs text-white placeholder:text-muted/40 outline-none focus:border-accent"
                              />
                              <button
                                onClick={() => handleCancelMeeting(m.id)}
                                className="text-xs px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
                              >
                                Подтвердить
                              </button>
                              <button
                                onClick={() => { setCancelMeetingId(null); setCancelReason('') }}
                                className="text-xs px-2 py-1.5 text-muted hover:text-white transition-colors"
                              >
                                Отмена
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setCancelMeetingId(m.id)}
                              className="text-xs px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
                            >
                              Отменить
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
