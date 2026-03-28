'use client'

import { useState } from 'react'

type Vacancy = {
  id: string
  title: string
  company: string
  country: string
  city: string
  salary: string
  housing: boolean
  tags: string[]
  headcount: number
  departure: string
}

function CountryFlag({ country }: { country: string }) {
  const flag = country === 'Польша' ? '🇵🇱' : country === 'Германия' ? '🇩🇪' : '🌍'
  return <span className="text-lg">{flag}</span>
}

export default function VacancyCard({ vacancy }: { vacancy: Vacancy }) {
  const [showModal, setShowModal] = useState(false)
  const [applied, setApplied] = useState(false)

  return (
    <>
      <div className="bg-bg2 border border-border rounded-2xl p-5 hover:border-muted/50 transition-all duration-200">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-white">{vacancy.title}</h3>
            <p className="text-sm text-muted">{vacancy.company}</p>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted">
            <CountryFlag country={vacancy.country} />
            <span>{vacancy.city}, {vacancy.country}</span>
          </div>
        </div>

        <div className="text-2xl font-bold text-accent mb-3">{vacancy.salary}</div>

        <div className="flex flex-wrap gap-2 mb-3">
          {vacancy.housing && (
            <span className="text-xs bg-success/15 text-success px-2.5 py-1 rounded-full">
              🏠 Жильё
            </span>
          )}
          {vacancy.tags.map(tag => (
            <span key={tag} className="text-xs bg-bg3 text-muted px-2.5 py-1 rounded-full">
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="text-muted">
            <span>{vacancy.headcount} мест</span>
            <span className="mx-2">·</span>
            <span>Выезд: {vacancy.departure}</span>
          </div>
          <button
            onClick={() => setShowModal(true)}
            disabled={applied}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${applied
                ? 'bg-success/20 text-success cursor-default'
                : 'bg-accent hover:bg-accent/90 text-white'
              }
            `}
          >
            {applied ? 'Отклик отправлен' : 'Откликнуться'}
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-bg2 border border-border rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-white mb-2">Подтвердите отклик</h3>
            <p className="text-muted text-sm mb-6">
              Вы хотите откликнуться на вакансию <strong className="text-white">{vacancy.title}</strong> в {vacancy.company}?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border text-muted hover:text-white transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  setApplied(true)
                  setShowModal(false)
                }}
                className="flex-1 px-4 py-2.5 rounded-lg bg-accent hover:bg-accent/90 text-white font-medium transition-colors"
              >
                Да, откликнуться
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
