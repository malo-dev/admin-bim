import { reactive } from 'vue'
import { io } from 'socket.io-client'
import { authStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'

const toast = useToast()

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8083/api/v1'
const SOCKET_URL = API_URL.replace(/\/api\/v\d+\/?$/, '')

let socket = null

const state = reactive({
  isConnected: false,
  onlineUsers: [],
  connectionLog: [],
  activityFeed: [],
  unreadActivity: 0
})

const ACTIVITY_META = {
  recharge: { icon: 'add_card', to: '/recharges' },
  retrait: { icon: 'outbox', to: '/transactions' },
  transfert: { icon: 'sync_alt', to: '/transactions' },
  paiement: { icon: 'shopping_cart_checkout', to: '/transactions' },
  commande: { icon: 'local_shipping', to: '/commandes' }
}

let nextActivityId = 1
function notifyBrowser(title, body) {
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    new Notification(title, { body, icon: '/favicon.ico' })
  } catch {
    /* API Notification indisponible ou bloquée : pas bloquant */
  }
}

export const socketStore = reactive({
  get isConnected() {
    return state.isConnected
  },
  get onlineUsers() {
    return state.onlineUsers
  },
  get connectionLog() {
    return state.connectionLog
  },
  get onlineCount() {
    return state.onlineUsers.length
  },
  get activityFeed() {
    return state.activityFeed
  },
  get unreadActivity() {
    return state.unreadActivity
  },

  markActivityRead() {
    state.unreadActivity = 0
    for (const item of state.activityFeed) item.unread = false
  },

  notificationPermission() {
    return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
  },

  async requestNotificationPermission() {
    if (typeof Notification === 'undefined') return 'unsupported'
    try {
      return await Notification.requestPermission()
    } catch {
      return 'denied'
    }
  },

  connect() {
    if (socket?.connected) return
    socket = io(SOCKET_URL, {
      auth: { token: authStore.token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000
    })

    socket.on('connect', () => {
      state.isConnected = true
      socket.emit('join_admin')
      const adminId = authStore.user?.userId
      if (adminId) socket.emit('join', String(adminId))
    })

    socket.on('connect_error', () => {
      state.isConnected = false
    })

    socket.on('disconnect', () => {
      state.isConnected = false
    })

    socket.on('online_users', (users) => {
      state.onlineUsers = users
    })

    socket.on('user:online', ({ userId, username, connectedAt }) => {
      state.connectionLog.unshift({ userId, username, event: 'online', time: connectedAt })
      if (state.connectionLog.length > 200) state.connectionLog.pop()
    })

    socket.on('user:offline', ({ userId, username }) => {
      state.connectionLog.unshift({ userId, username, event: 'offline', time: new Date().toISOString() })
      if (state.connectionLog.length > 200) state.connectionLog.pop()
    })

    socket.on('admin:activity', (payload) => {
      const meta = ACTIVITY_META[payload.kind] || { icon: 'notifications', to: '/logs' }
      state.activityFeed.unshift({
        id: nextActivityId++,
        kind: payload.kind,
        icon: meta.icon,
        to: meta.to,
        title: payload.title,
        text: payload.message,
        time: payload.createdAt || new Date().toISOString(),
        unread: true
      })
      if (state.activityFeed.length > 50) state.activityFeed.pop()
      state.unreadActivity++
      toast.info(`${payload.title} — ${payload.message}`)
      notifyBrowser(payload.title, payload.message)
    })
  },

  disconnect() {
    socket?.disconnect()
    socket = null
    state.isConnected = false
    state.onlineUsers = []
  }
})
