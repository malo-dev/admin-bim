import { reactive, computed } from 'vue'

// Pas de Pinia dans ce projet (volontairement minimal) — un simple état
// réactif partagé suffit pour un jeton + un profil admin.
const STORAGE_TOKEN = 'bim_admin_token'
const STORAGE_USER = 'bim_admin_user'
const STORAGE_REFRESH = 'bim_admin_refresh_token'

function readUser() {
  try {
    const raw = localStorage.getItem(STORAGE_USER)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const state = reactive({
  token: localStorage.getItem(STORAGE_TOKEN) || null,
  refreshToken: localStorage.getItem(STORAGE_REFRESH) || null,
  user: readUser()
})

export const BIM_ADMIN_ROLE = 'BIM'

export const authStore = reactive({
  get token() {
    return state.token
  },
  get refreshToken() {
    return state.refreshToken
  },
  get user() {
    return state.user
  },
  isAuthenticated: computed(() => !!state.token),
  isBimAdmin: computed(() => state.user?.role === BIM_ADMIN_ROLE),

  setAuth(response) {
    state.token = response.token
    state.user = {
      userId: response.userId,
      email: response.email,
      role: response.role ?? null
    }
    localStorage.setItem(STORAGE_TOKEN, response.token)
    state.refreshToken = response.refreshToken || null
    if (response.refreshToken) localStorage.setItem(STORAGE_REFRESH, response.refreshToken)
    localStorage.setItem(STORAGE_USER, JSON.stringify(state.user))
  },

  setToken(token) {
    state.token = token
    localStorage.setItem(STORAGE_TOKEN, token)
  },

  clearAuth() {
    state.token = null
    state.user = null
    localStorage.removeItem(STORAGE_TOKEN)
    state.refreshToken = null
    localStorage.removeItem(STORAGE_REFRESH)
    localStorage.removeItem(STORAGE_USER)
  }
})
