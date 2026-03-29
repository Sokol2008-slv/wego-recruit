'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import { useAuth } from '@/lib/useAuth'
import type { Application } from '@/lib/supabase'

type Tab = 'pending' | 'approved' | 'rejected'

const TABS: { key: Tab; label: string; color: string; bgColor: string }[] = [
  { key: 'pending', label: 'На рассмотрении', color: 'text-warning', bgColor: 'bg-warning/15' },
  { key: 'approved', label: 'Одобрено', color: 'text-success', bgColor: 'bg-success/15' },
  { key: 'rejected', label: 'Отклонено', color: 'text-danger', bgColor: 'bg-danger/15' },
]

export default function DashboardPage() {
  const router = useRouter()
  const { isLoggedIn, token, name } = useAuth()
  const [tab, setTab] = useState<Tab>('pending')
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [selecting, setSelecting] = useState<string | null>(null)
  const [showWarning, setShowWarning] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoggedIn && !loading) {
      router.push('/worker?redirect=/dashboard')
      return
    }

    if (!token) return

    fetch('/api/applications', {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        setApplications(data.applications || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [isLoggedIn, token, loading, router])

  const filterApps = (t: Tab) => {
    if (t === 'pending') return applications.filter(a => a.status === 'pending')
    if (t === 'approved') return applications.filter(a => a.status === 'approved' || a.status === 'selected')
    return applications.filter(a => a.status === 'rejected' || a.status === 'auto_rejected')
  }

  const counts = {
    pending: filterApps('pending').length,
    approved: filterApps('approved').length,
    rejected: filterApps('rejected').length,
  }

  const handleSelect = async (applicationId: string) => {
    setSelecting(applicationId)
    try {
      const res = await fetch(`/api/applications/${applicationId}/select`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (res.ok) {
        // Refresh applications
        const data = await fetch('/api/applications', {
          headers: { 'Authorization': `Bearer ${token}` },
        }).then(r => r.json())
        setApplications(data.applications || [])
        setShowWarning(null)
      }
    } catch {
      alert('Ошибка')
    } finally {
      setSelecting(null)
    }
  }

  const currentApps = filterApps(tab)
  const approvedCount = filterApps('approved').length

  return (
    <>
      <Nav />
      <main className="min-h-screen pt-24 pb-12 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-display text-3xl text-white mb-1">Мои заявки</h1>
          <p className="text-muted text-sm mb-6">{name ? `${name}, вот ваши заявки` : 'Ваши заявки на вакансии'}</p>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t.key
                    ? `${t.bgColor} ${t.color}`
                    : 'bg-bg2 border border-border text-muted hover:text-white'
                }`}
              >
                {t.label}
                {counts[t.key] > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${t.bgColor} ${t.color}`}>
                    {counts[t.key]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Loading */}
          {loading && (
            <div className="text-center py-12 text-muted">Загрузка...</div>
          )}

          {/* Applications list */}
          {!loading && currentApps.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">
                {tab === 'pending' ? '⏳' : tab === 'approved' ? '✅' : '📋'}
              </div>
              <div className="text-muted">
                {tab === 'pending' && 'Нет заявок на рассмотрении'}
                {tab === 'approved' && 'Пока нет одобренных заявок'}
                {tab === 'rejected' && 'Нет отклонённых заявок'}
              </div>
              {applications.length === 0 && (
                <button
                  onClick={() => router.push('/vacancies')}
                  className="mt-4 px-4 py-2 rounded-lg bg-accent text-white text-sm hover:bg-accent/90 transition-colors"
                >
                  Смотреть вакансии
                </button>
              )}
            </div>
          )}

          {!loading && (
            <div className="space-y-3">
              {currentApps.map(app => {
                const v = app.vacancy
                const statusConfig = {
                  pending: { label: 'На рассмотрении', color: 'text-warning', bg: 'bg-warning/15' },
                  approved: { label: 'Одобрено', color: 'text-success', bg: 'bg-success/15' },
                  selected: { label: 'Выбрано вами', color: 'text-accent', bg: 'bg-accent/15' },
                  rejected: { label: 'Отклонено', color: 'text-danger', bg: 'bg-danger/15' },
                  auto_rejected: { label: 'Автоматически отклонено', color: 'text-danger', bg: 'bg-danger/15' },
                }
                const sc = statusConfig[app.status] || statusConfig.pending

                return (
                  <div key={app.id} className="bg-bg2 border border-border rounded-2xl p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{v?.title}</h3>
                        <p className="text-sm text-muted">{v?.company} · {v?.city}, {v?.country}</p>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full ${sc.bg} ${sc.color}`}>
                        {sc.label}
                      </span>
                    </div>

                    {v?.salary && (
                      <div className="text-lg font-bold text-accent mb-3">{v.salary}</div>
                    )}

                    {/* Кнопка "Выбрать" для одобренных */}
                    {app.status === 'approved' && (
                      <button
                        onClick={() => {
                          if (approvedCount > 1) {
                            setShowWarning(app.id)
                          } else {
                            handleSelect(app.id)
                          }
                        }}
                        disabled={selecting === app.id}
                        className="w-full mt-2 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white font-medium transition-colors disabled:opacity-50"
                      >
                        {selecting === app.id ? 'Обработка...' : 'Выбрать эту вакансию'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* Warning modal */}
      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-bg2 border border-border rounded-2xl p-6 max-w-md w-full">
            <div className="text-3xl mb-3">⚠️</div>
            <h3 className="text-xl font-semibold text-white mb-2">Внимание</h3>
            <p className="text-muted text-sm mb-6">
              Когда вы выберете одну вакансию, все остальные одобренные заявки <strong className="text-danger">автоматически отклоняются</strong>. Это действие нельзя отменить.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowWarning(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border text-muted hover:text-white transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={() => handleSelect(showWarning)}
                disabled={!!selecting}
                className="flex-1 px-4 py-2.5 rounded-lg bg-accent hover:bg-accent/90 text-white font-medium transition-colors disabled:opacity-50"
              >
                {selecting ? 'Обработка...' : 'Подтвердить выбор'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
