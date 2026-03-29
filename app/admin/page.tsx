'use client'

import { useState, useEffect, useCallback } from 'react'

type Tab = 'applications' | 'candidates'

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

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'На рассмотрении', color: 'text-yellow-400', bg: 'bg-yellow-400/15' },
  approved: { label: 'Одобрено', color: 'text-green-400', bg: 'bg-green-400/15' },
  rejected: { label: 'Отклонено', color: 'text-red-400', bg: 'bg-red-400/15' },
  selected: { label: 'Встреча назначена', color: 'text-blue-400', bg: 'bg-blue-400/15' },
  auto_rejected: { label: 'Авто-отклонено', color: 'text-red-400', bg: 'bg-red-400/15' },
}

export default function AdminPage() {
  const [adminEmail, setAdminEmail] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState(false)
  const [tab, setTab] = useState<Tab>('applications')

  // Applications tab
  const [applications, setApplications] = useState<ApplicationRow[]>([])
  const [appsLoading, setAppsLoading] = useState(false)

  // Candidates tab
  const [candidates, setCandidates] = useState<CandidateRow[]>([])
  const [candidatesLoading, setCandidatesLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [searchDebounce, setSearchDebounce] = useState('')

  // Candidate detail
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const getStoredEmail = () => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('admin_email') || adminEmail
    }
    return adminEmail
  }

  const handleLogin = async () => {
    setAuthError(false)
    try {
      const res = await fetch('/api/admin/applications', {
        headers: { 'X-Admin-Email': adminEmail },
      })
      if (res.ok) {
        sessionStorage.setItem('admin_email', adminEmail)
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
        headers: { 'X-Admin-Email': getStoredEmail() },
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
        headers: { 'X-Admin-Email': getStoredEmail() },
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
        headers: { 'X-Admin-Email': getStoredEmail() },
      })
      if (res.ok) {
        const data = await res.json()
        setSelectedCandidate({ ...data.candidate, applications: data.applications || [] })
      }
    } catch { /* ignore */ }
    setDetailLoading(false)
  }

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

  // Check stored session
  useEffect(() => {
    const stored = sessionStorage.getItem('admin_email')
    if (stored) {
      setAdminEmail(stored)
      fetch('/api/admin/applications', {
        headers: { 'X-Admin-Email': stored },
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
          <p className="text-muted text-sm mb-6 text-center">Введите ваш email для входа</p>
          <input
            type="email"
            value={adminEmail}
            onChange={e => { setAdminEmail(e.target.value); setAuthError(false) }}
            onKeyDown={e => { if (e.key === 'Enter') handleLogin() }}
            className={`w-full bg-bg2 border rounded-xl px-4 py-3 text-white placeholder:text-muted/40 outline-none focus:border-accent transition-colors mb-3 ${authError ? 'border-red-500' : 'border-border'}`}
            placeholder="admin@example.com"
            autoFocus
          />
          {authError && <p className="text-red-500 text-xs mb-3">Email не имеет доступа</p>}
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
      { label: 'Возраст', value: c.age_range },
      { label: 'Гражданство', value: c.citizenship },
      { label: 'Разрешение на работу', value: c.work_permit },
      { label: 'Тип работы', value: c.job_type?.join(', ') },
      { label: 'Страна', value: c.country },
      { label: 'Жильё', value: c.housing_needed },
      { label: 'Начало работы', value: c.start_date },
      { label: 'График', value: c.schedule },
      { label: 'Пара', value: c.couple },
      { label: 'Польский', value: c.polish_level },
      { label: 'Ограничения', value: c.restrictions },
      { label: 'Комментарий к ограничениям', value: c.restrictions_comment },
      { label: 'Локация', value: c.location },
      { label: 'Статус', value: c.status },
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
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-3xl text-white">Админ панель</h1>
          <button
            onClick={() => { sessionStorage.removeItem('admin_email'); setAuthed(false); setAdminEmail('') }}
            className="text-sm text-muted hover:text-white transition-colors"
          >
            Выйти
          </button>
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
        </div>

        {/* Applications tab */}
        {tab === 'applications' && (
          <>
            {appsLoading && <div className="text-muted text-center py-8">Загрузка...</div>}
            {!appsLoading && applications.length === 0 && (
              <div className="text-muted text-center py-8">Нет заявок</div>
            )}
            {!appsLoading && applications.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted border-b border-border">
                      <th className="pb-3 pr-4">Кандидат</th>
                      <th className="pb-3 pr-4">Вакансия</th>
                      <th className="pb-3 pr-4">Компания</th>
                      <th className="pb-3 pr-4">Статус</th>
                      <th className="pb-3">Дата</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map(app => {
                      const sc = STATUS_LABELS[app.status] || STATUS_LABELS.pending
                      return (
                        <tr key={app.id} className="border-b border-border/50 hover:bg-bg2/50">
                          <td className="py-3 pr-4 text-white">
                            {app.candidate?.name} {app.candidate?.surname}
                          </td>
                          <td className="py-3 pr-4 text-white">{app.vacancy?.title}</td>
                          <td className="py-3 pr-4 text-muted">{app.vacancy?.company}</td>
                          <td className="py-3 pr-4">
                            <span className={`text-xs px-2.5 py-1 rounded-full ${sc.bg} ${sc.color}`}>
                              {sc.label}
                            </span>
                          </td>
                          <td className="py-3 text-muted">{new Date(app.created_at).toLocaleDateString('ru-RU')}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
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
      </div>
    </main>
  )
}
