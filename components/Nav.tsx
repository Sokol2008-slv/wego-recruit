'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/useAuth'
import NotificationBell from '@/components/NotificationBell'

export default function Nav() {
  const { isLoggedIn, name, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  // Close menu on route change (link click)
  const closeMenu = () => setMenuOpen(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-bg/80 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-display text-3xl text-white tracking-wide">
          <span className="text-cherry">WE</span><span className="text-accent">GO</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-4">
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

        {/* Mobile: notification bell + hamburger */}
        <div className="flex sm:hidden items-center gap-2" ref={menuRef}>
          {isLoggedIn && <NotificationBell />}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 text-muted hover:text-white transition-colors"
            aria-label="Menu"
          >
            {menuOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>

          {/* Mobile dropdown */}
          {menuOpen && (
            <div className="absolute top-16 right-0 left-0 bg-bg/95 backdrop-blur-md border-b border-border px-4 py-4 space-y-3">
              {isLoggedIn ? (
                <>
                  <Link
                    href="/vacancies"
                    onClick={closeMenu}
                    className="block text-sm text-muted hover:text-white transition-colors py-2"
                  >
                    Вакансии
                  </Link>
                  <Link
                    href="/dashboard"
                    onClick={closeMenu}
                    className="block text-sm text-muted hover:text-white transition-colors py-2"
                  >
                    Мои заявки
                  </Link>
                  <div className="flex items-center justify-between py-2 border-t border-border mt-2 pt-3">
                    <span className="text-xs text-accent">{name}</span>
                    <button
                      onClick={() => { logout(); closeMenu() }}
                      className="text-xs text-muted hover:text-white transition-colors"
                    >
                      Выйти
                    </button>
                  </div>
                </>
              ) : (
                <Link
                  href="/worker"
                  onClick={closeMenu}
                  className="block w-full text-center px-3 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
                >
                  Регистрация
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
