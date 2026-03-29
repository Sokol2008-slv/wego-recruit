'use client'

import { useState, useEffect } from 'react'
import Nav from '@/components/Nav'
import VacancyCard from '@/components/VacancyCard'
import type { Vacancy } from '@/lib/supabase'

export default function VacanciesPage() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetch('/api/vacancies')
      .then(res => res.json())
      .then(data => {
        setVacancies(data.vacancies || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Динамические фильтры по странам
  const countries = [...new Set(vacancies.map(v => v.country))]
  const filters = [
    { label: 'Все', value: 'all' },
    ...countries.map(c => ({
      label: c === 'Польша' ? '🇵🇱 Польша' : c === 'Германия' ? '🇩🇪 Германия' : `🌍 ${c}`,
      value: c,
    })),
  ]

  const filtered = filter === 'all' ? vacancies : vacancies.filter(v => v.country === filter)

  return (
    <>
      <Nav />
      <main className="min-h-screen pt-24 pb-12 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-display text-4xl text-white mb-2">Доступные вакансии</h1>
          <p className="text-muted mb-6">Выберите подходящую вакансию и откликнитесь</p>

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
                <VacancyCard key={v.id} vacancy={v} />
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
