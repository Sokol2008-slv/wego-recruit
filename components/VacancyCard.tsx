'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Vacancy } from '@/lib/supabase'

function CountryFlag({ country }: { country: string }) {
  const flag = country === 'Польша' ? '🇵🇱' : country === 'Германия' ? '🇩🇪' : '🌍'
  return <span className="text-lg">{flag}</span>
}

export default function VacancyCard({ vacancy, applied: initialApplied }: { vacancy: Vacancy; applied?: boolean }) {
  const [showModal, setShowModal] = useState(false)
  const [applied, setApplied] = useState(initialApplied || false)
  const [loading, setLoading] = useState(false)

  const handleApply = async () => {
    const token = localStorage.getItem('wego_token')

    if (!token) {
      // Не авторизован — перенаправить на регистрацию
      window.location.href = `/worker?redirect=/vacancies`
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ vacancyId: vacancy.id }),
      })

      const data = await res.json()

      if (res.ok) {
        setApplied(true)
        setShowModal(false)
      } else if (res.status === 409) {
        // Уже подавали
        setApplied(true)
        setShowModal(false)
      } else if (res.status === 401) {
        window.location.href = `/worker?redirect=/vacancies`
      } else {
        alert(data.error || 'Ошибка при отправке заявки')
      }
    } catch {
      alert('Ошибка соединения')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="bg-bg2 border border-border rounded-2xl p-5 hover:border-muted/50 transition-all duration-200">
        <div className="flex items-start justify-between mb-3">
          <div>
            <Link href={`/vacancies/${vacancy.id}`} className="text-lg font-semibold text-white hover:text-accent transition-colors">
              {vacancy.title}
            </Link>
            <p className="text-sm text-muted">{vacancy.company}</p>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted shrink-0">
            <CountryFlag country={vacancy.country} />
            <span>{vacancy.city}, {vacancy.country}</span>
          </div>
        </div>

        {vacancy.salary && (
          <div className="text-2xl font-bold text-accent mb-3">{vacancy.salary}</div>
        )}

        <div className="flex flex-wrap gap-2 mb-3">
          {vacancy.housing && (
            <span className="text-xs bg-success/15 text-success px-2.5 py-1 rounded-full">
              🏠 Жильё
            </span>
          )}
          {vacancy.schedule && (
            <span className="text-xs bg-bg3 text-muted px-2.5 py-1 rounded-full">
              🕐 {vacancy.schedule}
            </span>
          )}
          {vacancy.tags?.map(tag => (
            <span key={tag} className="text-xs bg-bg3 text-muted px-2.5 py-1 rounded-full">
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="text-muted">
            {vacancy.headcount > 0 && <span>{vacancy.headcount} мест</span>}
          </div>
          <button
            onClick={() => applied ? null : setShowModal(true)}
            disabled={applied}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${applied
                ? 'bg-success/20 text-success cursor-default'
                : 'bg-accent hover:bg-accent/90 text-white'
              }
            `}
          >
            {applied ? '✓ Заявка отправлена' : 'Подать заявку'}
          </button>
        </div>
      </div>

      {/* Модалка подтверждения */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-bg2 border border-border rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-white mb-2">Подтвердите заявку</h3>
            <p className="text-muted text-sm mb-6">
              Вы хотите подать заявку на вакансию <strong className="text-white">{vacancy.title}</strong> в {vacancy.company}?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border text-muted hover:text-white transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleApply}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-lg bg-accent hover:bg-accent/90 text-white font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Отправка...' : 'Да, подать заявку'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
