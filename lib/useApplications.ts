'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Vacancy } from './supabase'
import { useAuth } from './useAuth'

export type LocalApplication = {
  id: string
  created_at: string
  vacancy_id: string
  status: 'pending' | 'approved' | 'rejected' | 'selected' | 'auto_rejected'
  vacancy?: Vacancy | null
}

const STORAGE_KEY = 'wego_applications'

function loadApps(): LocalApplication[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function saveApps(apps: LocalApplication[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(apps))
}

export function useApplications() {
  const { token, isLoggedIn } = useAuth()
  const [applications, setApplications] = useState<LocalApplication[]>([])
  const [loaded, setLoaded] = useState(false)

  // Загрузить из localStorage
  useEffect(() => {
    setApplications(loadApps())
    setLoaded(true)
  }, [])

  // Проверить обновления статусов с сервера (если Supabase подключён)
  useEffect(() => {
    if (!isLoggedIn || !token) return

    fetch('/api/applications', {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.applications && data.applications.length > 0) {
          // Сервер вернул реальные данные — используем их
          const serverApps: LocalApplication[] = data.applications.map((a: any) => ({
            id: a.id,
            created_at: a.created_at,
            vacancy_id: a.vacancy_id,
            status: a.status,
            vacancy: a.vacancy,
          }))
          setApplications(serverApps)
          saveApps(serverApps)
        }
      })
      .catch(() => {})
  }, [isLoggedIn, token])

  // Подать заявку
  const apply = useCallback(async (vacancy: Vacancy): Promise<boolean> => {
    if (!token) return false

    // Проверить дубликат
    const existing = loadApps().find(a => a.vacancy_id === vacancy.id)
    if (existing) return false

    // Отправить на сервер (для Telegram-уведомления)
    const res = await fetch('/api/applications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ vacancyId: vacancy.id }),
    })

    if (!res.ok && res.status !== 409) return false

    const data = await res.json()

    // Сохранить локально
    const newApp: LocalApplication = {
      id: data.application?.id || `app-${Date.now()}`,
      created_at: new Date().toISOString(),
      vacancy_id: vacancy.id,
      status: 'pending',
      vacancy,
    }

    const updated = [...loadApps().filter(a => a.vacancy_id !== vacancy.id), newApp]
    saveApps(updated)
    setApplications(updated)

    return true
  }, [token])

  // Проверить, подана ли заявка на вакансию
  const hasApplied = useCallback((vacancyId: string): boolean => {
    return loadApps().some(a => a.vacancy_id === vacancyId)
  }, [])

  // Обновить статус (из Telegram callback — через polling)
  const refreshStatuses = useCallback(async () => {
    if (!token) return

    const res = await fetch('/api/applications', {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    const data = await res.json()

    if (data.applications && data.applications.length > 0) {
      const serverApps: LocalApplication[] = data.applications.map((a: any) => ({
        id: a.id,
        created_at: a.created_at,
        vacancy_id: a.vacancy_id,
        status: a.status,
        vacancy: a.vacancy,
      }))

      // Мержим: серверные статусы имеют приоритет
      const localApps = loadApps()
      const merged = localApps.map(local => {
        const server = serverApps.find(s => s.id === local.id)
        return server || local
      })

      saveApps(merged)
      setApplications(merged)
    }
  }, [token])

  const pending = applications.filter(a => a.status === 'pending')
  const approved = applications.filter(a => a.status === 'approved' || a.status === 'selected')
  const rejected = applications.filter(a => a.status === 'rejected' || a.status === 'auto_rejected')

  return {
    applications,
    pending,
    approved,
    rejected,
    apply,
    hasApplied,
    refreshStatuses,
    loaded,
  }
}
