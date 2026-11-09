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

function logout() {
  authStore.clearAuth()
  window.location.href = '/connexion'
}

// Le jeton d'accès expire au bout de 1 à 2 h : au lieu de déconnecter l'admin,
// on le renouvelle avec le refreshToken puis on rejoue la requête.
let refreshing = null

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const expired = error.response?.status === 401 && error.response?.data?.message === 'BEARER_TOKEN_EXPIRED'

    if (expired && !original._retry && authStore.refreshToken) {
      original._retry = true
      try {
        refreshing = refreshing || axios
          .post(`${BASE_URL}/auth/refresh-token`, { refreshToken: authStore.refreshToken })
          .finally(() => { refreshing = null })
        const { data } = await refreshing
        authStore.setToken(data.token)
        original.headers.Authorization = `Bearer ${data.token}`
        return apiClient(original)
      } catch (refreshError) {
        // Coupure réseau / serveur indisponible : on garde la session.
        const st = refreshError?.response?.status
        if (st === 401 || st === 403) logout()
        return Promise.reject(error)
      }
    }

    if (error.response?.status === 401) logout()
    return Promise.reject(error)
  }
)

export default apiClient
