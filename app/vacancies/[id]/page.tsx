'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import type { Vacancy } from '@/lib/supabase'

export default function VacancyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [vacancy, setVacancy] = useState<Vacancy | null>(null)
  const [loading, setLoading] = useState(true)
  const [applied, setApplied] = useState(false)
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    fetch(`/api/vacancies/${params.id}`)
      .then(res => res.json())
      .then(data => {
        setVacancy(data.vacancy || null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [params.id])

  const handleApply = async () => {
    const token = localStorage.getItem('wego_token')
    if (!token) {
      router.push(`/worker?redirect=/vacancies/${params.id}`)
      return
    }

    setApplying(true)
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ vacancyId: params.id }),
      })

      if (res.ok || res.status === 409) {
        setApplied(true)
      } else if (res.status === 401) {
        router.push(`/worker?redirect=/vacancies/${params.id}`)
      }
    } catch {
      alert('Ошибка соединения')
    } finally {
      setApplying(false)
    }
  }

  if (loading) {
    return (
      <>
        <Nav />
        <main className="min-h-screen pt-24 pb-12 px-4">
          <div className="max-w-2xl mx-auto text-center text-muted py-12">Загрузка...</div>
        </main>
      </>
    )
  }

  if (!vacancy) {
    return (
      <>
        <Nav />
        <main className="min-h-screen pt-24 pb-12 px-4">
          <div className="max-w-2xl mx-auto text-center py-12">
            <div className="text-4xl mb-4">🔍</div>
            <div className="text-muted">Вакансия не найдена</div>
            <button onClick={() => router.push('/vacancies')} className="mt-4 text-accent hover:underline">
              ← К списку вакансий
            </button>
          </div>
        </main>
      </>
    )
  }

  const flag = vacancy.country === 'Польша' ? '🇵🇱' : vacancy.country === 'Германия' ? '🇩🇪' : '🌍'

  return (
    <>
      <Nav />
      <main className="min-h-screen pt-24 pb-12 px-4">
        <div className="max-w-2xl mx-auto">
          <button onClick={() => router.push('/vacancies')} className="text-sm text-muted hover:text-white transition-colors mb-6 inline-block">
            ← Все вакансии
          </button>

          <div className="bg-bg2 border border-border rounded-2xl p-6">
            <div className="flex items-center gap-2 text-sm text-muted mb-2">
              <span className="text-lg">{flag}</span>
              <span>{vacancy.city}, {vacancy.country}</span>
            </div>

            <h1 className="font-display text-3xl text-white mb-1">{vacancy.title}</h1>
            <p className="text-muted mb-4">{vacancy.company}</p>

            {vacancy.salary && (
              <div className="text-3xl font-bold text-accent mb-6">{vacancy.salary}</div>
            )}

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {vacancy.housing && (
                <div className="bg-bg3 rounded-xl p-3">
                  <div className="text-xs text-muted mb-1">Жильё</div>
                  <div className="text-sm text-success font-medium">✓ Предоставляется</div>
                </div>
              )}
              {vacancy.schedule && (
                <div className="bg-bg3 rounded-xl p-3">
                  <div className="text-xs text-muted mb-1">График</div>
                  <div className="text-sm text-white font-medium">{vacancy.schedule}</div>
                </div>
              )}
            </div>

            {/* Description */}
            {vacancy.description && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-white mb-2">Описание</h2>
                <div className="text-muted text-sm whitespace-pre-line">{vacancy.description}</div>
              </div>
            )}

            {/* Requirements */}
            {vacancy.requirements && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-white mb-2">Требования</h2>
                <div className="text-muted text-sm whitespace-pre-line">{vacancy.requirements}</div>
              </div>
            )}

            {/* Tags */}
            {vacancy.tags && vacancy.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {vacancy.tags.map(tag => (
                  <span key={tag} className="text-xs bg-bg3 text-muted px-2.5 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Apply button */}
            <button
              onClick={applied ? undefined : handleApply}
              disabled={applied || applying}
              className={`w-full py-3 rounded-xl font-medium transition-colors ${
                applied
                  ? 'bg-success/20 text-success'
                  : 'bg-accent hover:bg-accent/90 text-white'
              } disabled:opacity-50`}
            >
              {applied ? '✓ Заявка отправлена' : applying ? 'Отправка...' : 'Подать заявку'}
            </button>
          </div>
        </div>
      </main>
    </>
  )
}
