<script setup>
/**
 * Accueil après connexion : « Que voulez-vous gérer ? » (plein écran, sans
 * menu latéral). Une carte par espace (src/spaces.js) : un clic ouvre l'espace,
 * dont le menu ne montre ensuite que ses propres pages.
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import apiClient from '@/api/client'
import { authStore } from '@/stores/auth'
import { socketStore } from '@/stores/socket'
import ToastHost from '@/components/ToastHost.vue'
import { SPACES } from '@/spaces'

const router = useRouter()

function logout() {
  socketStore.disconnect()
  authStore.clearAuth()
  router.push('/connexion')
}

const search = ref('')
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const spaces = computed(() => {
  const q = norm(search.value.trim())
  if (!q) return SPACES
  return SPACES.filter((s) => norm(`${s.label} ${s.text} ${s.pages.map((p) => p.label).join(' ')}`).includes(q))
})

const badges = ref({})
onMounted(async () => {
  try {
    const { data } = await apiClient.get('/tsx/admin/recharges', { params: { status: 'pending', pageSize: 1 } })
    badges.value = { recharges: Number(data?.total ?? 0) }
  } catch {
    /* non bloquant */
  }
})

const hello = computed(() => (new Date().getHours() < 18 ? 'Bonjour' : 'Bonsoir'))
const open = (s) => router.push(s.pages[0].to)
</script>

<template>
<div class="min-h-full bg-surface">
<!-- En-tête simple : pas de menu latéral sur cette page -->
<header class="h-16 px-space-lg flex items-center justify-between bg-surface-container-lowest shadow-sm">
  <div class="flex items-center gap-space-sm">
    <span class="w-9 h-9 rounded-xl bg-primary text-on-primary font-bold flex items-center justify-center">B.</span>
    <span class="font-headline-sm text-headline-sm font-bold text-on-surface">BIM NEXT <span class="font-normal text-secondary">Admin</span></span>
  </div>
  <button type="button" class="h-10 px-space-sm rounded-lg flex items-center gap-2 text-body-sm font-semibold text-error hover:bg-error-container/60 transition-colors" @click="logout">
    <span class="material-symbols-outlined text-[19px]">logout</span><span class="hidden sm:inline">Se déconnecter</span>
  </button>
</header>

<div class="max-w-6xl mx-auto px-space-lg pt-space-lg pb-space-xl space-y-space-lg">
  <div class="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
    <div>
      <p class="font-body-md text-body-md text-secondary">{{ hello }}{{ authStore.user?.email ? `, ${authStore.user.email}` : '' }}</p>
      <h1 class="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">Que voulez-vous gérer ?</h1>
      <p class="mt-1 font-body-sm text-body-sm text-secondary">Choisissez un espace : vous ne verrez que ce qui le concerne.</p>
    </div>
    <div class="relative w-full md:w-80">
      <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
      <input v-model="search" class="w-full h-11 pl-10 pr-4 rounded-xl bg-surface-container-lowest shadow-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Rechercher un espace…" type="text" aria-label="Rechercher un espace"/>
    </div>
  </div>

  <div v-if="spaces.length === 0" class="text-center py-12 text-secondary">Aucun espace ne correspond à « {{ search }} ».</div>

  <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-md">
    <article v-for="s in spaces" :key="s.key"
      class="group flex flex-col rounded-2xl bg-surface-container-lowest shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden">
      <button type="button" class="flex-1 text-left p-space-md flex items-start gap-space-sm focus-visible:ring-2 focus-visible:ring-primary/30" @click="open(s)">
        <span class="w-12 h-12 rounded-xl bg-primary-fixed text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-on-primary transition-colors">
          <span class="material-symbols-outlined text-[24px]">{{ s.icon }}</span>
        </span>
        <span class="flex-1 min-w-0">
          <span class="flex items-center gap-2">
            <span class="font-headline-sm text-headline-sm font-bold text-on-surface">{{ s.label }}</span>
            <span v-if="s.badgeKey && badges[s.badgeKey]" class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-error text-on-error" :title="`${badges[s.badgeKey]} en attente`">{{ badges[s.badgeKey] }}</span>
          </span>
          <span class="block mt-1 font-body-sm text-body-sm text-secondary">{{ s.text }}</span>
        </span>
        <span class="material-symbols-outlined text-outline text-[20px] self-center group-hover:text-primary transition-colors">arrow_forward</span>
      </button>
      <!-- Raccourcis vers chaque page de l'espace -->
      <div v-if="s.pages.length > 1" class="px-space-md pb-space-md flex flex-wrap gap-2">
        <button v-for="p in s.pages" :key="p.to" type="button" @click="router.push(p.to)"
          class="h-8 px-3 rounded-full bg-surface-container-low hover:bg-primary-fixed text-body-sm text-on-surface-variant hover:text-primary flex items-center gap-1.5 transition-colors">
          <span class="material-symbols-outlined text-[16px]">{{ p.icon }}</span>{{ p.label }}
        </button>
      </div>
    </article>
  </div>
</div>
<ToastHost />
</div>
</template>
