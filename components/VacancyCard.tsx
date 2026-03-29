'use client'

import Link from 'next/link'
import type { Vacancy } from '@/lib/supabase'

function CountryFlag({ country }: { country: string }) {
  const flag = country === 'Польша' ? '🇵🇱' : country === 'Германия' ? '🇩🇪' : '🌍'
  return <span className="text-lg">{flag}</span>
}

export default function VacancyCard({ vacancy, applied, matching }: { vacancy: Vacancy; applied?: boolean; matching?: boolean }) {
  return (
    <div className={`bg-bg2 border rounded-2xl p-5 hover:border-muted/50 transition-all duration-200 ${matching ? 'border-green-500/40' : 'border-border'}`}>
      {matching && (
        <div className="mb-3">
          <span className="text-xs bg-green-500/15 text-green-400 px-2.5 py-1 rounded-full font-medium">
            Подходит вам
          </span>
        </div>
      )}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-white">{vacancy.title}</h3>
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

      <div className="flex flex-wrap gap-2 mb-4">
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

      <div className="flex items-center gap-3">
        <Link
          href={`/vacancies/${vacancy.id}`}
          className="inline-block px-5 py-2 rounded-lg bg-accent hover:bg-accent/90 text-white text-sm font-medium transition-colors"
        >
          Подробнее
        </Link>
        {applied && (
          <span className="text-xs text-success">✓ Заявка подана</span>
        )}
      </div>
    </div>
  )
}
