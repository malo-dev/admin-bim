<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import apiClient from '@/api/client'
import { useToast } from '@/composables/useToast'

const toast = useToast()

const TYPES = [
  { key: 'all', label: 'Tous', icon: 'list' },
  { key: 'Recharge', label: 'Recharges', icon: 'add_card' },
  { key: 'Transfert', label: 'Transferts', icon: 'sync_alt' },
  { key: 'Paiement', label: 'Paiements', icon: 'shopping_cart_checkout' },
  { key: 'transaction', label: 'Consultations', icon: 'visibility' }
]

const statusStyles = {
  réussi: { label: 'Réussi', badge: 'bg-primary-fixed/40 text-primary', dot: 'bg-primary' },
  échoué: { label: 'Échoué', badge: 'bg-error-container text-on-error-container', dot: 'bg-error' },
  'en attente': { label: 'En attente', badge: 'bg-tertiary-fixed text-tertiary-container', dot: 'bg-tertiary-container' },
  success: { label: 'Succès', badge: 'bg-primary-fixed/40 text-primary', dot: 'bg-primary' }
}
function styleFor(status) {
  return statusStyles[status] ?? { label: status ?? '—', badge: 'bg-surface-container text-secondary', dot: 'bg-outline' }
}
function iconFor(type) {
  return TYPES.find((t) => t.key === type)?.icon ?? 'receipt_long'
}

const activeType = ref('all')
const activeStatus = ref('all')
const search = ref('')
const period = ref('')
const PERIODS = [
  { label: 'Toute période', value: '' },
  { label: "Aujourd'hui", value: 'daily' },
  { label: '7 jours', value: 'weekly' },
  { label: '30 jours', value: 'monthly' }
]

const loading = ref(false)
const logs = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const totalPages = ref(1)

const counts = ref({ total: 0, réussi: 0, échoué: 0, 'en attente': 0 })

async function loadCounts() {
  try {
    const base = { paginate: 'true', pageSize: 1, period: period.value || undefined }
    const [all, ok, ko, pending] = await Promise.all([
      apiClient.get('/history', { params: base }),
      apiClient.get('/history', { params: { ...base, status: 'réussi' } }),
      apiClient.get('/history', { params: { ...base, status: 'échoué' } }),
      apiClient.get('/history', { params: { ...base, status: 'en attente' } })
    ])
    counts.value = {
      total: all.data?.total ?? 0,
      réussi: ok.data?.total ?? 0,
      échoué: ko.data?.total ?? 0,
      'en attente': pending.data?.total ?? 0
    }
  } catch {
    /* non bloquant */
  }
}

async function loadLogs() {
  loading.value = true
  try {
    const params = {
      paginate: 'true',
      page: page.value,
      pageSize,
      period: period.value || undefined,
      type: activeType.value === 'all' ? undefined : activeType.value,
      status: activeStatus.value === 'all' ? undefined : activeStatus.value,
      search: search.value || undefined
    }
    const { data } = await apiClient.get('/history', { params })
    logs.value = data?.data ?? []
    total.value = data?.total ?? 0
    totalPages.value = data?.totalPages ?? 1
  } catch {
    toast.error("Impossible de charger le journal d'activité.")
  } finally {
    loading.value = false
  }
}

let searchTimer = null
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    loadLogs()
  }, 350)
})
watch([activeType, activeStatus, period], () => {
  page.value = 1
  loadLogs()
  loadCounts()
})
watch(page, loadLogs)

/* Carnet d'acteurs — correspondance userId -> nom, construite à partir des comptes réels */
const actorMap = ref({})
async function loadActors() {
  try {
    const { data } = await apiClient.get('/auth/users', { params: { pageSize: 500 } })
    const map = {}
    for (const u of data?.data ?? []) map[u.id] = u.username
    actorMap.value = map
  } catch {
    /* best effort */
  }
}
function actorName(userId) {
  if (!userId) return 'Système'
  return actorMap.value[userId] ?? `Utilisateur #${userId}`
}

function formatDate(d) {
  if (!d) return '—'
  const date = new Date(d)
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) + ' à ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
function fmtAmount(n) {
  return n == null ? null : Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' EC'
}

const selectedLog = ref(null)

function exportLogs() {
  if (!logs.value.length) return
  const header = ['Référence', 'Date', 'Type', 'Action', 'Acteur', 'Montant', 'Statut', 'Description']
  const rows = logs.value.map((l) => [
    l.historyId,
    formatDate(l.createdAt ?? l.date),
    l.type,
    l.action,
    actorName(l.userId),
    l.amount ?? '',
    l.status,
    (l.description ?? '').replace(/"/g, "'")
  ])
  const csv = [header, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `logs-activite-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
  toast.success(`Journal exporté (${logs.value.length} entrées de cette page).`)
}

onMounted(() => {
  loadLogs()
  loadCounts()
  loadActors()
})
</script>

<template>
  <div class="p-space-lg space-y-space-lg max-w-[1600px] mx-auto w-full">
    <!-- En-tête -->
    <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-space-md">
      <div>
        <div class="flex items-center gap-space-xs mb-1">
          <span class="material-symbols-outlined text-[16px] text-primary">history_toggle_off</span>
          <span class="font-label-sm text-label-sm text-secondary uppercase tracking-widest font-semibold">Système &amp; Support</span>
        </div>
        <h1 class="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">Logs d'activité</h1>
        <p class="font-body-md text-body-md text-secondary">Journal des recharges, transferts, paiements et consultations enregistrés par la plateforme.</p>
      </div>
      <button
        class="h-9 px-space-md flex items-center gap-1.5 rounded-lg bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold shadow-sm hover:opacity-95 transition-all self-start xl:self-auto disabled:opacity-50"
        type="button"
        :disabled="!logs.length"
        @click="exportLogs"
      >
        <span class="material-symbols-outlined text-[18px]">file_download</span>
        <span>Exporter la page (CSV)</span>
      </button>
    </div>

    <!-- Indicateurs -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
      <div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex items-start justify-between">
        <div>
          <span class="font-label-sm text-label-sm uppercase font-semibold tracking-wider text-secondary">Événements</span>
          <div class="font-numeric-kpi text-numeric-kpi text-on-surface font-bold mt-1">{{ counts.total }}</div>
        </div>
        <div class="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
          <span class="material-symbols-outlined text-[22px]">receipt_long</span>
        </div>
      </div>
      <div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex items-start justify-between">
        <div>
          <span class="font-label-sm text-label-sm uppercase font-semibold tracking-wider text-secondary">Réussis</span>
          <div class="font-numeric-kpi text-numeric-kpi text-primary font-bold mt-1">{{ counts.réussi }}</div>
        </div>
        <div class="w-10 h-10 rounded-lg bg-primary-fixed/40 flex items-center justify-center text-primary">
          <span class="material-symbols-outlined text-[22px]">task_alt</span>
        </div>
      </div>
      <div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex items-start justify-between">
        <div>
          <span class="font-label-sm text-label-sm uppercase font-semibold tracking-wider text-secondary">Échoués</span>
          <div class="font-numeric-kpi text-numeric-kpi text-error font-bold mt-1">{{ counts.échoué }}</div>
        </div>
        <div class="w-10 h-10 rounded-lg bg-error-container flex items-center justify-center text-on-error-container">
          <span class="material-symbols-outlined text-[22px]">gpp_bad</span>
        </div>
      </div>
      <div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex items-start justify-between">
        <div>
          <span class="font-label-sm text-label-sm uppercase font-semibold tracking-wider text-secondary">En attente</span>
          <div class="font-numeric-kpi text-numeric-kpi text-on-surface font-bold mt-1">{{ counts['en attente'] }}</div>
        </div>
        <div class="w-10 h-10 rounded-lg bg-tertiary-fixed flex items-center justify-center text-tertiary-container">
          <span class="material-symbols-outlined text-[22px]">hourglass_empty</span>
        </div>
      </div>
    </div>

    <!-- Journal -->
    <div class="bg-surface-container-lowest rounded-2xl shadow-sm">
      <!-- Filtres -->
      <div class="p-space-md flex flex-col lg:flex-row lg:items-center justify-between gap-space-sm">
        <div class="inline-flex p-1 rounded-xl bg-surface-container-low overflow-x-auto no-scrollbar">
          <button
            v-for="t in TYPES"
            :key="t.key"
            type="button"
            class="px-3 py-1.5 rounded-lg font-label-md text-label-md font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap"
            :class="activeType === t.key ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-secondary hover:text-on-surface'"
            @click="activeType = t.key"
          >
            <span class="material-symbols-outlined text-[16px]">{{ t.icon }}</span>
            {{ t.label }}
          </button>
        </div>
        <div class="flex items-center gap-space-sm">
          <select
            v-model="period"
            class="h-9 pl-3 pr-8 rounded-lg bg-surface-container-low font-body-sm text-body-sm text-on-surface border-0 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option v-for="p in PERIODS" :key="p.value" :value="p.value">{{ p.label }}</option>
          </select>
          <select
            v-model="activeStatus"
            class="h-9 pl-3 pr-8 rounded-lg bg-surface-container-low font-body-sm text-body-sm text-on-surface border-0 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">Tous les statuts</option>
            <option value="réussi">Réussi</option>
            <option value="échoué">Échoué</option>
            <option value="en attente">En attente</option>
          </select>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
            <input
              v-model="search"
              class="h-9 pl-9 pr-space-md rounded-lg bg-surface-container-low font-body-sm text-body-sm text-on-surface placeholder:text-outline w-64 border-0 focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Action, description..."
              type="text"
            />
          </div>
        </div>
      </div>

      <!-- Tableau -->
      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead>
            <tr class="bg-surface-container-low font-label-sm text-label-sm uppercase tracking-wider text-secondary">
              <th class="py-3 pl-space-lg pr-3 font-semibold">Horodatage</th>
              <th class="px-3 py-3 font-semibold">Événement</th>
              <th class="px-3 py-3 font-semibold">Acteur</th>
              <th class="px-3 py-3 font-semibold text-right">Montant</th>
              <th class="px-3 py-3 font-semibold">Statut</th>
              <th class="py-3 pl-3 pr-space-lg font-semibold text-right">Réf.</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="6" class="py-space-xl text-center font-body-sm text-body-sm text-secondary">Chargement...</td>
            </tr>
            <tr
              v-for="log in logs"
              v-else
              :key="log.historyId"
              class="border-t border-surface-container hover:bg-surface-container-low cursor-pointer transition-colors"
              @click="selectedLog = log"
            >
              <td class="py-3 pl-space-lg pr-3 whitespace-nowrap font-body-sm text-body-sm text-on-surface font-mono">{{ formatDate(log.createdAt ?? log.date) }}</td>
              <td class="px-3 py-3">
                <div class="flex items-center gap-space-sm">
                  <div class="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0">
                    <span class="material-symbols-outlined text-[18px]">{{ iconFor(log.type) }}</span>
                  </div>
                  <div class="min-w-0">
                    <div class="font-body-sm text-body-sm font-semibold text-on-surface">{{ log.action || log.type }}</div>
                    <div class="font-body-sm text-body-sm text-secondary truncate max-w-md">{{ log.description || '—' }}</div>
                  </div>
                </div>
              </td>
              <td class="px-3 py-3 font-body-sm text-body-sm text-on-surface whitespace-nowrap">{{ actorName(log.userId) }}</td>
              <td class="px-3 py-3 font-body-sm text-body-sm text-on-surface font-mono text-right whitespace-nowrap">{{ fmtAmount(log.amount) ?? '—' }}</td>
              <td class="px-3 py-3">
                <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold" :class="styleFor(log.status).badge">
                  <span class="w-1.5 h-1.5 rounded-full" :class="styleFor(log.status).dot"></span>
                  {{ styleFor(log.status).label }}
                </span>
              </td>
              <td class="py-3 pl-3 pr-space-lg text-right font-label-sm text-label-sm text-outline font-mono whitespace-nowrap">HIS-{{ log.historyId }}</td>
            </tr>
            <tr v-if="!loading && !logs.length">
              <td colspan="6" class="py-space-xl text-center font-body-sm text-body-sm text-secondary">
                <span class="material-symbols-outlined text-[32px] text-outline block mb-1">search_off</span>
                Aucun événement ne correspond à ces filtres.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="px-space-lg py-space-md flex flex-col sm:flex-row items-center justify-between gap-space-sm font-label-sm text-label-sm text-secondary">
        <span>{{ logs.length }} événement(s) affiché(s) sur {{ total }}</span>
        <div class="flex items-center gap-space-sm" v-if="totalPages > 1">
          <button class="px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-surface-container disabled:opacity-40" type="button" :disabled="page <= 1" @click="page--">Préc.</button>
          <span>Page {{ page }} / {{ totalPages }}</span>
          <button class="px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-surface-container disabled:opacity-40" type="button" :disabled="page >= totalPages" @click="page++">Suiv.</button>
        </div>
      </div>
    </div>

    <!-- Détail d'un événement -->
    <div v-if="selectedLog" class="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm p-4" @click.self="selectedLog = null">
      <div class="w-full max-w-lg bg-surface-container-lowest rounded-2xl shadow-xl">
        <div class="p-space-lg flex items-start justify-between">
          <div class="flex items-center gap-space-sm">
            <div class="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
              <span class="material-symbols-outlined text-[22px]">{{ iconFor(selectedLog.type) }}</span>
            </div>
            <div>
              <h3 class="font-headline-sm text-headline-sm text-on-surface">{{ selectedLog.action || selectedLog.type }}</h3>
              <p class="font-label-sm text-label-sm text-secondary font-mono">HIS-{{ selectedLog.historyId }}</p>
            </div>
          </div>
          <button class="w-8 h-8 rounded-lg text-secondary hover:bg-surface-container flex items-center justify-center" type="button" @click="selectedLog = null">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <dl class="px-space-lg pb-space-lg grid grid-cols-3 gap-y-space-sm font-body-sm text-body-sm">
          <dt class="text-secondary">Description</dt>
          <dd class="col-span-2 text-on-surface">{{ selectedLog.description || '—' }}</dd>
          <dt class="text-secondary">Acteur</dt>
          <dd class="col-span-2 text-on-surface font-semibold">{{ actorName(selectedLog.userId) }}</dd>
          <dt class="text-secondary">Horodatage</dt>
          <dd class="col-span-2 text-on-surface font-mono">{{ formatDate(selectedLog.createdAt ?? selectedLog.date) }}</dd>
          <dt class="text-secondary" v-if="selectedLog.amount != null">Montant</dt>
          <dd class="col-span-2 text-on-surface font-mono" v-if="selectedLog.amount != null">{{ fmtAmount(selectedLog.amount) }}</dd>
          <dt class="text-secondary">Type</dt>
          <dd class="col-span-2 text-on-surface">{{ selectedLog.type }}</dd>
          <dt class="text-secondary">Statut</dt>
          <dd class="col-span-2">
            <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold" :class="styleFor(selectedLog.status).badge">
              {{ styleFor(selectedLog.status).label }}
            </span>
          </dd>
        </dl>
      </div>
    </div>
  </div>
</template>
