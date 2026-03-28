'use client'

import { useState } from 'react'
import Nav from '@/components/Nav'
import VacancyCard from '@/components/VacancyCard'

const VACANCIES = [
  {
    id: '1',
    title: 'Разнорабочий на завод',
    company: 'PolPak Sp. z o.o.',
    country: 'Польша',
    city: 'Варшава',
    salary: '4 200 – 5 000 PLN/мес',
    housing: true,
    tags: ['Завод', 'Муж', '18–55'],
    headcount: 30,
    departure: 'Через 3 дня',
  },
  {
    id: '2',
    title: 'Сортировщик на складе',
    company: 'Amazon Logistics',
    country: 'Польша',
    city: 'Вроцлав',
    salary: '4 500 – 5 200 PLN/мес',
    housing: true,
    tags: ['Склад', 'Муж/Жен', '18–50'],
    headcount: 100,
    departure: 'Через неделю',
  },
  {
    id: '3',
    title: 'Строитель-универсал',
    company: 'BauGruppe GmbH',
    country: 'Германия',
    city: 'Берлин',
    salary: '2 800 – 3 500 EUR/мес',
    housing: false,
    tags: ['Стройка', 'Муж', '25–50', 'Опыт'],
    headcount: 15,
    departure: 'Через 2 недели',
  },
  {
    id: '4',
    title: 'Упаковщик мясной продукции',
    company: 'Drobimex S.A.',
    country: 'Польша',
    city: 'Щецин',
    salary: '4 000 – 4 800 PLN/мес',
    housing: true,
    tags: ['Завод', 'Муж/Жен', '18–55'],
    headcount: 50,
    departure: 'Через 3 дня',
  },
  {
    id: '5',
    title: 'Сварщик MIG/MAG',
    company: 'MetallBau AG',
    country: 'Германия',
    city: 'Мюнхен',
    salary: '3 200 – 4 000 EUR/мес',
    housing: true,
    tags: ['Сварка', 'Муж', '25–50', 'Сертификат'],
    headcount: 8,
    departure: 'Через месяц',
  },
  {
    id: '6',
    title: 'Рабочий на ферму',
    company: 'Agro-Farm Sp. z o.o.',
    country: 'Польша',
    city: 'Люблин',
    salary: '3 800 – 4 500 PLN/мес',
    housing: true,
    tags: ['Сельхоз', 'Муж/Жен', 'Пара'],
    headcount: 40,
    departure: 'Через неделю',
  },
]

type Filter = 'all' | 'Польша' | 'Германия'

export default function VacanciesPage() {
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = filter === 'all'
    ? VACANCIES
    : VACANCIES.filter(v => v.country === filter)

  const filters: { label: string; value: Filter }[] = [
    { label: 'Все', value: 'all' },
    { label: '🇵🇱 Польша', value: 'Польша' },
    { label: '🇩🇪 Германия', value: 'Германия' },
  ]

  return (
    <>
      <Nav />
      <main className="min-h-screen pt-24 pb-12 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-display text-4xl text-white mb-2">Доступные вакансии</h1>
          <p className="text-muted mb-6">Выберите подходящую вакансию и откликнитесь</p>

          {/* Filters */}
          <div className="flex gap-2 mb-8">
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

          {/* Vacancy list */}
          <div className="space-y-4">
            {filtered.map(v => (
              <VacancyCard key={v.id} vacancy={v} />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted">
              Нет вакансий для выбранного фильтра
            </div>
          )}
        </div>
      </main>
    </>
  )
}
