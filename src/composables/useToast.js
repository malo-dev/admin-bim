import { reactive } from 'vue'

const toasts = reactive([])
let nextId = 1

function pushToast(type, message) {
  const id = nextId++
  toasts.push({ id, type, message })
  setTimeout(() => {
    const i = toasts.findIndex((t) => t.id === id)
    if (i !== -1) toasts.splice(i, 1)
  }, 4000)
}

export function useToast() {
  return {
    toasts,
    success: (message) => pushToast('success', message),
    error: (message) => pushToast('error', message),
    warn: (message) => pushToast('warn', message),
    info: (message) => pushToast('info', message)
  }
}
