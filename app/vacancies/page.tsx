'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import VacancyCard from '@/components/VacancyCard'
import { useAuth } from '@/lib/useAuth'
import type { Vacancy } from '@/lib/supabase'

const COUNTRY_MAP: Record<string, string> = {
  poland: 'Польша',
  germany: 'Германия',
  czech: 'Чехия',
}

export default function VacanciesPage() {
  const router = useRouter()
  const { isLoggedIn } = useAuth()
  const [vacancies, setVacancies] = useState<Vacancy[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [authChecked, setAuthChecked] = useState(false)
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set())
  const [candidateCountry, setCandidateCountry] = useState<string | null>(null)
  const [hasActiveMeeting, setHasActiveMeeting] = useState(false)

  useEffect(() => {
    // Даём useAuth время проверить localStorage
    const timer = setTimeout(() => setAuthChecked(true), 100)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!authChecked) return

    if (!isLoggedIn) {
      setLoading(false)
      return
    }

    // Load candidate survey for vacancy matching
    try {
      const surveyRaw = localStorage.getItem('wego_survey')
      if (surveyRaw) {
        const survey = JSON.parse(surveyRaw)
        if (survey.country) {
          setCandidateCountry(COUNTRY_MAP[survey.country] || survey.country)
        }
      }
    } catch { /* ignore */ }

    fetch('/api/vacancies')
      .then(res => res.json())
      .then(data => {
        setVacancies(data.vacancies || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))

    // Load applied vacancy IDs
    const token = localStorage.getItem('wego_token')
    if (token) {
      fetch('/api/applications', {
        headers: { 'Authorization': `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => {
          if (data.applications) {
            setAppliedIds(new Set(data.applications.map((a: { vacancy_id: string }) => a.vacancy_id)))
          }
        })
        .catch(() => {})

      // Check for active meetings
      fetch('/api/meetings', {
        headers: { 'Authorization': `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => {
          if (data.meetings) {
            const active = data.meetings.some((m: { status: string }) => m.status !== 'cancelled')
            setHasActiveMeeting(active)
          }
        })
        .catch(() => {})
    }
  }, [authChecked, isLoggedIn])

  // Динамические фильтры по странам
  const countries = [...new Set(vacancies.map(v => v.country))]
  const filters = [
    { label: 'Все', value: 'all' },
    ...countries.map(c => ({
      label: c === 'Польша' ? '🇵🇱 Польша' : c === 'Германия' ? '🇩🇪 Германия' : `🌍 ${c}`,
      value: c,
    })),
  ]

  const filteredRaw = filter === 'all' ? vacancies : vacancies.filter(v => v.country === filter)

  // Sort matching vacancies to the top
  const filtered = candidateCountry
    ? [...filteredRaw].sort((a, b) => {
        const aMatch = a.country === candidateCountry ? 0 : 1
        const bMatch = b.country === candidateCountry ? 0 : 1
        return aMatch - bMatch
      })
    : filteredRaw

  // Не авторизован — показываем "пресную" страницу
  if (authChecked && !isLoggedIn) {
    return (
      <>
        <Nav />
        <main className="min-h-screen pt-24 pb-12 px-4">
          <div className="max-w-lg mx-auto text-center py-16">
            <div className="text-6xl mb-6">🔒</div>
            <h1 className="font-display text-4xl text-white mb-4">Доступ к вакансиям</h1>
            <p className="text-muted mb-2">
              Для просмотра вакансий необходимо пройти регистрацию.
            </p>
            <p className="text-muted text-sm mb-8">
              Заполните короткую анкету — это займёт 2 минуты.
              После этого вы получите доступ к актуальным предложениям работы.
            </p>
            <button
              onClick={() => router.push('/worker?redirect=/vacancies')}
              className="px-8 py-3 rounded-xl bg-accent hover:bg-accent/90 text-white font-medium text-lg transition-colors"
            >
              Зарегистрироваться
            </button>
            <div className="mt-12 grid grid-cols-3 gap-4 text-center">
              <div className="bg-bg2 border border-border rounded-xl p-4">
                <div className="text-2xl mb-2">🌍</div>
                <div className="text-xs text-muted">Работа в Европе</div>
              </div>
              <div className="bg-bg2 border border-border rounded-xl p-4">
                <div className="text-2xl mb-2">🏠</div>
                <div className="text-xs text-muted">С жильём</div>
              </div>
              <div className="bg-bg2 border border-border rounded-xl p-4">
                <div className="text-2xl mb-2">💰</div>
                <div className="text-xs text-muted">Достойная оплата</div>
              </div>
            </div>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Nav />
      <main className="min-h-screen pt-24 pb-12 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-display text-4xl text-white mb-2">Доступные вакансии</h1>
          <p className="text-muted mb-6">Выберите подходящую вакансию и откликнитесь</p>

          {hasActiveMeeting && (
            <div className="bg-yellow-400/15 text-yellow-400 rounded-xl px-4 py-3 mb-6 text-sm font-medium">
              📅 У вас назначена встреча. Подача новых заявок приостановлена.{' '}
              <a href="/dashboard" className="underline hover:text-yellow-300 transition-colors">
                Перейти к встречам &rarr;
              </a>
            </div>
          )}

          {/* Filters */}
          {countries.length > 1 && (
            <div className="flex gap-2 mb-8 flex-wrap">
              {filters.map(f => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filter === f.value
                      ? 'bg-accent text-white'
                      : 'bg-bg2 border border-border text-muted hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center py-12 text-muted">
              Загрузка вакансий...
            </div>
          )}

          {/* Vacancy list */}
          {!loading && (
            <div className="space-y-4">
              {filtered.map(v => (
                <VacancyCard
                  key={v.id}
                  vacancy={v}
                  applied={appliedIds.has(v.id)}
                  matching={!!candidateCountry && v.country === candidateCountry}
                />
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📋</div>
              <div className="text-muted">
                {vacancies.length === 0
                  ? 'Пока нет доступных вакансий. Заходите позже!'
                  : 'Нет вакансий для выбранного фильтра'
                }
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
