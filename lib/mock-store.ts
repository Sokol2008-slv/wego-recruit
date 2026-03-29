// In-memory хранилище заявок (тестовый режим без Supabase)
// Данные живут пока сервер работает, при передеплое сбрасываются

export type MockApplication = {
  id: string
  created_at: string
  candidate_id: string
  vacancy_id: string
  status: 'pending' | 'approved' | 'rejected' | 'selected' | 'auto_rejected'
  employer_response_at?: string | null
  worker_selected_at?: string | null
}

// Глобальное хранилище (переживает между запросами на одном сервере)
const globalStore = globalThis as unknown as {
  __mockApplications?: MockApplication[]
}

if (!globalStore.__mockApplications) {
  globalStore.__mockApplications = []
}

export const mockApplications = globalStore.__mockApplications

export function addApplication(app: MockApplication) {
  mockApplications.push(app)
}

export function getApplicationsByCandidate(candidateId: string) {
  return mockApplications.filter(a => a.candidate_id === candidateId)
}

export function getApplicationById(id: string) {
  return mockApplications.find(a => a.id === id)
}

export function updateApplicationStatus(id: string, status: MockApplication['status']) {
  const app = mockApplications.find(a => a.id === id)
  if (app) {
    app.status = status
    if (status === 'approved' || status === 'rejected') {
      app.employer_response_at = new Date().toISOString()
    }
    if (status === 'selected') {
      app.worker_selected_at = new Date().toISOString()
    }
  }
  return app
}
