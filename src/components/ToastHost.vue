<script setup>
import { useToast } from '@/composables/useToast'

const { toasts } = useToast()

const styles = {
  success: { icon: 'check_circle', cls: 'bg-primary-container text-on-primary' },
  error: { icon: 'error', cls: 'bg-error text-on-error' },
  warn: { icon: 'warning', cls: 'bg-tertiary-container text-on-tertiary' },
  info: { icon: 'notifications_active', cls: 'bg-surface-container-lowest text-on-surface border border-primary-container' }
}
</script>

<template>
  <div class="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
    <TransitionGroup enter-from-class="opacity-0 translate-y-2" leave-to-class="opacity-0 translate-y-2" enter-active-class="transition-all duration-200" leave-active-class="transition-all duration-150">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg font-body-sm text-body-sm font-medium"
        :class="styles[toast.type]?.cls || styles.success.cls"
      >
        <span class="material-symbols-outlined text-[18px] shrink-0">{{ styles[toast.type]?.icon || 'info' }}</span>
        <span class="min-w-0">{{ toast.message }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>
