'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

type NotificationItem = {
  id: string
  type: 'approved' | 'rejected' | 'selected' | 'auto_rejected' | 'meeting_scheduled'
  title: string
  vacancyTitle: string
}

const NOTIFICATION_CONFIG: Record<string, { icon: string; label: string; color: string; bg: string }> = {
  approved: { icon: '\u2705', label: 'Заявка одобрена', color: 'text-green-400', bg: 'bg-green-400/15' },
  rejected: { icon: '\u274C', label: 'Заявка отклонена', color: 'text-red-400', bg: 'bg-red-400/15' },
  selected: { icon: '\uD83D\uDCC4', label: 'Документы на проверке', color: 'text-blue-400', bg: 'bg-blue-400/15' },
  auto_rejected: { icon: '\u274C', label: 'Автоматически отклонено', color: 'text-red-400', bg: 'bg-red-400/15' },
  meeting_scheduled: { icon: '\uD83D\uDCC5', label: 'Встреча назначена', color: 'text-blue-400', bg: 'bg-blue-400/15' },
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unseenCount, setUnseenCount] = useState(0)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const checkNotifications = useCallback(async () => {
    const token = localStorage.getItem('wego_token')
    if (!token) return

    try {
      const res = await fetch('/api/applications', {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      const apps = data.applications || []

      // Build notifications from non-pending statuses
      const items: NotificationItem[] = apps
        .filter((a: { status: string }) => a.status !== 'pending')
        .map((a: { id: string; status: string; vacancy?: { title?: string } }) => ({
          id: a.id,
          type: a.status as NotificationItem['type'],
          title: NOTIFICATION_CONFIG[a.status]?.label || a.status,
          vacancyTitle: a.vacancy?.title || 'Вакансия',
        }))

      setNotifications(items)

      // Compare with seen statuses
      const seenRaw = localStorage.getItem('wego_seen_statuses')
      const seen: Record<string, string> = seenRaw ? JSON.parse(seenRaw) : {}
      let count = 0
      for (const item of items) {
        if (seen[item.id] !== item.type) {
          count++
        }
      }
      setUnseenCount(count)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    checkNotifications()
    const interval = setInterval(checkNotifications, 10000)
    return () => clearInterval(interval)
  }, [checkNotifications])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleOpen = () => {
    setOpen(prev => !prev)
    if (!open) {
      // Mark all as seen
      const seen: Record<string, string> = {}
      for (const item of notifications) {
        seen[item.id] = item.type
      }
      localStorage.setItem('wego_seen_statuses', JSON.stringify(seen))
      setUnseenCount(0)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative p-1.5 text-muted hover:text-white transition-colors"
        aria-label="Уведомления"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unseenCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {unseenCount > 9 ? '9+' : unseenCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-bg2 border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <span className="text-sm font-medium text-white">Уведомления</span>
          </div>
          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-center text-muted text-sm">
              Нет уведомлений
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {notifications.map(item => {
                const config = NOTIFICATION_CONFIG[item.type] || NOTIFICATION_CONFIG.approved
                return (
                  <div
                    key={item.id}
                    className="px-4 py-3 border-b border-border/50 last:border-b-0 hover:bg-bg3/50 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <span className={`text-sm ${config.bg} ${config.color} px-1.5 py-0.5 rounded`}>
                        {config.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium ${config.color}`}>{config.label}</p>
                        <p className="text-xs text-muted truncate">{item.vacancyTitle}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
