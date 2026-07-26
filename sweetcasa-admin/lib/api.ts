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
    if (typeof window !== 'undefined' && error.response?.status === 401) {
      Cookies.remove('sc_admin_token')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
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
