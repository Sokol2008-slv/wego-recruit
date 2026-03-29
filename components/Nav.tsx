'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/useAuth'
import NotificationBell from '@/components/NotificationBell'

export default function Nav() {
  const { isLoggedIn, name, logout } = useAuth()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-bg/80 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-display text-3xl text-white tracking-wide">
          <span className="text-cherry">WE</span><span className="text-accent">GO</span>
        </Link>

        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            <>
              <Link
                href="/vacancies"
                className="text-sm text-muted hover:text-white transition-colors"
              >
                Вакансии
              </Link>
              <Link
                href="/dashboard"
                className="text-sm text-muted hover:text-white transition-colors"
              >
                Мои заявки
              </Link>
              <NotificationBell />
              <div className="flex items-center gap-2">
                <span className="text-xs text-accent">{name}</span>
                <button
                  onClick={logout}
                  className="text-xs text-muted hover:text-white transition-colors"
                >
                  Выйти
                </button>
              </div>
            </>
          ) : (
            <Link
              href="/worker"
              className="px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              Регистрация
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
