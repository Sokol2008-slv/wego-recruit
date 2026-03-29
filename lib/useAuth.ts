'use client'

import { useState, useEffect } from 'react'

type AuthState = {
  token: string | null
  candidateId: string | null
  name: string | null
  isLoggedIn: boolean
}

export function useAuth(): AuthState & { logout: () => void } {
  const [auth, setAuth] = useState<AuthState>({
    token: null,
    candidateId: null,
    name: null,
    isLoggedIn: false,
  })

  useEffect(() => {
    const token = localStorage.getItem('wego_token')
    const candidateId = localStorage.getItem('wego_candidate_id')
    const name = localStorage.getItem('wego_name')

    if (token && candidateId) {
      setAuth({ token, candidateId, name, isLoggedIn: true })
      // Also set cookie for middleware
      document.cookie = `wego_token=${token}; path=/; max-age=${30 * 24 * 60 * 60}`
    }
  }, [])

  const logout = () => {
    localStorage.removeItem('wego_token')
    localStorage.removeItem('wego_candidate_id')
    localStorage.removeItem('wego_name')
    document.cookie = 'wego_token=; path=/; max-age=0'
    setAuth({ token: null, candidateId: null, name: null, isLoggedIn: false })
  }

  return { ...auth, logout }
}

// Helper: сохранить данные после регистрации
export function saveAuth(token: string, candidateId: string, name: string) {
  localStorage.setItem('wego_token', token)
  localStorage.setItem('wego_candidate_id', candidateId)
  localStorage.setItem('wego_name', name)
  document.cookie = `wego_token=${token}; path=/; max-age=${30 * 24 * 60 * 60}`
}
