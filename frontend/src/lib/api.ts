import axios from 'axios'

// Use relative URLs so Vercel's middleware can rewrite /api/* to backend
const API_URL = import.meta.env.VITE_API_URL || '/api'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  signup: (data: { email: string; password: string; full_name?: string }) =>
    api.post('/auth/signup', data),
  
  verifyOtp: (data: { email: string; code: string }) =>
    api.post('/auth/verify-otp', data),
  
  resendOtp: (data: { email: string }) =>
    api.post('/auth/resend-otp', data),
  
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  
  auth0Verify: (data: { access_token: string }) =>
    api.post('/auth/auth0-verify', data),
  
  getMe: () => api.get('/auth/me'),
}

// Profile API
export const profileApi = {
  get: () => api.get('/profile'),
  update: (data: any) => api.put('/profile', data),
  addEducation: (data: any) => api.post('/profile/education', data),
  updateEducation: (index: number, data: any) => api.put(`/profile/education/${index}`, data),
  deleteEducation: (index: number) => api.delete(`/profile/education/${index}`),
  addExperience: (data: any) => api.post('/profile/experience', data),
  updateExperience: (index: number, data: any) => api.put(`/profile/experience/${index}`, data),
  deleteExperience: (index: number) => api.delete(`/profile/experience/${index}`),
  addSkill: (data: any) => api.post('/profile/skills', data),
  deleteSkill: (index: number) => api.delete(`/profile/skills/${index}`),
}

// Projects API
export const projectsApi = {
  list: () => api.get('/projects'),
  get: (id: string) => api.get(`/projects/${id}`),
  create: (data: any) => api.post('/projects', data),
  update: (id: string, data: any) => api.put(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
  toggleFeatured: (id: string) => api.post(`/projects/${id}/feature`),
}

// Resumes API
export const resumesApi = {
  list: () => api.get('/resumes'),
  get: (id: string) => api.get(`/resumes/${id}`),
  getPdf: (id: string) => api.get(`/resumes/${id}/pdf`, { responseType: 'blob' }),
  getPreview: (id: string) => api.get(`/resumes/${id}/preview`, { responseType: 'blob' }),
  getLatex: (id: string) => api.get(`/resumes/${id}/latex`, { responseType: 'text' }),
  generate: (data: { job_description: string; instructions?: string }) =>
    api.post('/resumes/generate', data),
  refine: (id: string, data: { message: string }) =>
    api.post(`/resumes/${id}/refine`, data),
  recompile: (id: string) => api.post(`/resumes/${id}/recompile`),
  delete: (id: string) => api.delete(`/resumes/${id}`),
}

// Jobs API
export const jobsApi = {
  search: (data: { query: string; location?: string; job_type?: string }) =>
    api.post('/jobs/search', data),
  getSaved: () => api.get('/jobs/saved'),
  generateResumeForJob: (id: string) => api.post(`/jobs/${id}/generate-resume`),
  delete: (id: string) => api.delete(`/jobs/${id}`),
}

export type QueueStatus = 'queued' | 'in_progress' | 'completed' | 'failed'

export interface TaskAcceptedResponse {
  job_id: string
  status: string
  status_message: string
}

export interface TaskStatusResponse<T = any> {
  job_id: string
  task_type?: string
  status: QueueStatus
  status_message: string
  result?: T
  error?: string
}

export const tasksApi = {
  getStatus: (id: string) => api.get<TaskStatusResponse>(`/tasks/${id}`),
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function waitForTaskCompletion<T = any>(
  jobId: string,
  options?: {
    intervalMs?: number
    timeoutMs?: number
    onStatusChange?: (status: QueueStatus, statusMessage: string) => void
  }
): Promise<T> {
  const intervalMs = options?.intervalMs ?? 1500
  const timeoutMs = options?.timeoutMs ?? 180000
  const startedAt = Date.now()

  while (Date.now() - startedAt <= timeoutMs) {
    const response = await tasksApi.getStatus(jobId)
    const task = response.data

    if (options?.onStatusChange) {
      options.onStatusChange(task.status, task.status_message)
    }

    if (task.status === 'completed') {
      return (task.result ?? {}) as T
    }

    if (task.status === 'failed') {
      throw new Error(task.error || task.status_message || 'Task failed')
    }

    await sleep(intervalMs)
  }

  throw new Error('Task timed out. Please try again.')
}

export default api
