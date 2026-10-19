import axios from 'axios'
import { authStore } from '@/stores/auth'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8083/api/v1'

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000
})

apiClient.interceptors.request.use((config) => {
  if (authStore.token) config.headers.Authorization = `Bearer ${authStore.token}`
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      authStore.clearAuth()
      window.location.href = '/connexion'
    }
    return Promise.reject(error)
  }
)

export default apiClient
