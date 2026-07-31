import axios from 'axios'
import Cookies from './cookies'

export const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://sweetcasa-production.up.railway.app'

const api = axios.create({ baseURL: BASE_URL })

api.interceptors.request.use((config) => {
  const token = Cookies.get('sc_admin_token')
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined') {
      const status = error.response?.status
      const code = error.response?.data?.code

      if (status === 401 || (status === 403 && (code === 'ACCOUNT_SUSPENDED' || code === 'ACCOUNT_NOT_FOUND'))) {
        Cookies.remove('sc_admin_token')
        window.localStorage.removeItem('sc_admin_profile')
        if (window.location.pathname !== '/login') {
          const suffix = code === 'ACCOUNT_SUSPENDED' ? '?suspended=1' : ''
          window.location.href = `/login${suffix}`
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api

export function apiErrorMessage(err: unknown, fallback = 'Something went wrong. Try again.'): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.error || fallback
  }
  return fallback
}
