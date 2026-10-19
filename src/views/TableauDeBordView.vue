<script setup>
import { computed, onMounted, ref } from 'vue'
import apiClient from '@/api/client'
import { socketStore } from '@/stores/socket'

const periods = [
  { label: 'Tout', value: '' },
  { label: "Aujourd'hui", value: 'daily' },
  { label: 'Cette semaine', value: 'weekly' },
  { label: 'Ce mois', value: 'monthly' },
  { label: 'Ce trimestre', value: 'quarterly', extraClass: 'hidden sm:inline-block' },
  { label: 'Cette année', value: 'annual', extraClass: 'hidden md:inline-block' }
]
const activePeriod = ref('')

const stats = ref(null)
const statsLoading = ref(false)
const statsError = ref(false)

async function loadStats() {
  statsLoading.value = true
  statsError.value = false
  try {
    const { data } = await apiClient.get('/auth/dashboard-stats', {
      params: activePeriod.value ? { period: activePeriod.value } : {}
    })
    stats.value = data
  } catch {
    statsError.value = true
  } finally {
    statsLoading.value = false
  }
}

const cdfRate = ref(null)
async function loadCdfRate() {
  try {
    const { data } = await apiClient.get('/currency')
    const cdf = (data?.data ?? []).find((c) => c.code === 'CDF')
    if (cdf?.rate) cdfRate.value = Number(cdf.rate)
  } catch {
    /* non bloquant */
  }
}

const pendingRecharges = ref([])
const pendingTotal = ref(0)
const pendingLoading = ref(false)
const actionId = ref(null)

async function loadPending() {
  pendingLoading.value = true
  try {
    const { data } = await apiClient.get('/tsx/admin/recharges', { params: { status: 'pending', pageSize: 5 } })
    pendingRecharges.value = data?.data ?? []
    pendingTotal.value = data?.total ?? pendingRecharges.value.length
  } catch {
    pendingRecharges.value = []
  } finally {
    pendingLoading.value = false
  }
}

function fmtAmount(row) {
  return Number(row.amount ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' EC'
}

async function approve(row) {
  const id = row.id ?? row.tsxId
  actionId.value = id
  try {
    await apiClient.patch(`/tsx/admin/recharges/${id}/approve`)
    await loadPending()
  } catch {
    /* le solde de pendingTotal reste inchangé en cas d'échec */
  } finally {
    actionId.value = null
  }
}

async function reject(row) {
  const id = row.id ?? row.tsxId
  actionId.value = id
  try {
    await apiClient.patch(`/tsx/admin/recharges/${id}/reject`, { reason: 'Refusé depuis le tableau de bord' })
    await loadPending()
  } catch {
    /* le solde de pendingTotal reste inchangé en cas d'échec */
  } finally {
    actionId.value = null
  }
}

const refreshing = ref(false)
async function refresh() {
  refreshing.value = true
  await Promise.all([loadStats(), loadPending(), loadCdfRate()])
  refreshing.value = false
}

onMounted(() => {
  loadStats()
  loadPending()
  loadCdfRate()
})

function formatNumber(n) {
  if (n === undefined || n === null) return '—'
  return Number(n).toLocaleString('fr-FR')
}

const kpis = computed(() => {
  const s = stats.value
  return [
    { label: 'Utilisateurs totaux', value: s?.totalUsers, icon: 'group', sub: s ? `${formatNumber(s.activeUsers)} actifs` : '' },
    { label: "Inscrits aujourd'hui", value: s?.usersToday, icon: 'person_add', sub: s ? `${formatNumber(s.blockedUsers)} bloqués` : '' },
    { label: 'Transactions globales', value: s?.totalTransactions, icon: 'swap_horiz', sub: 'Toutes périodes' },
    { label: 'Commandes & Services', value: s?.totalOrders, icon: 'shopping_bag', sub: s ? `${formatNumber(s.ordersCompleted)} livrées · ${formatNumber(s.ordersPending)} en cours` : '' }
  ]
})
</script>

<template>
<div class="flex flex-col w-full">
<div class="p-space-lg space-y-space-lg max-w-[1600px] mx-auto w-full">
<!-- Header Block -->
<div class="flex flex-col xl:flex-row xl:items-center justify-between gap-space-md">
<div>
<div class="flex items-center gap-space-xs mb-1">
<span class="inline-flex items-center justify-center w-2 h-2 rounded-full bg-primary animate-ping"></span>
<span class="font-label-sm text-label-sm text-secondary uppercase tracking-widest font-semibold">Console Centrale • BIM NEXT</span>
</div>
<h1 class="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">Tableau de bord général</h1>
<p class="font-body-md text-body-md text-secondary">Vue d'ensemble en temps réel de l'écosystème BIM NEXT, métriques financières et flux opérationnels.</p>
</div>
<div class="flex flex-wrap items-center gap-space-sm">
<!-- Time Filter Controls -->
<div class="inline-flex p-1 rounded-xl bg-surface-container-low shadow-sm">
<button
  v-for="period in periods"
  :key="period.label"
  class="px-3 py-1.5 rounded-lg font-label-md text-label-md font-semibold transition-all"
  :class="[period.extraClass, activePeriod === period.value ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-secondary hover:text-on-surface']"
  type="button"
  @click="activePeriod = period.value; loadStats()"
>{{ period.label }}</button>
</div>
<!-- Action Tools -->
<div class="flex items-center gap-space-xs">
<button class="h-9 w-9 flex items-center justify-center rounded-lg bg-surface-container-lowest text-secondary hover:text-primary shadow-sm hover:shadow transition-all" title="Rafraîchir les données" type="button" @click="refresh">
<span class="material-symbols-outlined text-[19px]" :class="{ 'animate-spin': refreshing }">refresh</span>
</button>
</div>
</div>
</div>

<p v-if="statsError" class="px-4 py-3 rounded-xl bg-error-container text-on-error-container font-body-sm text-body-sm">
Impossible de charger les statistiques. Vérifiez la connexion au serveur.
</p>

<!-- Primary KPI Matrix (4 Columns) -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
<div v-for="kpi in kpis" :key="kpi.label" class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
<div class="flex items-start justify-between">
<div>
<span class="font-label-sm text-label-sm uppercase font-semibold tracking-wider text-secondary">{{ kpi.label }}</span>
<div class="font-numeric-kpi text-numeric-kpi text-on-surface font-bold mt-1 tracking-tight">
<span v-if="statsLoading">…</span><span v-else>{{ formatNumber(kpi.value) }}</span>
</div>
</div>
<div class="w-10 h-10 rounded-lg bg-primary-container/10 flex items-center justify-center text-primary-container">
<span class="material-symbols-outlined text-[22px]">{{ kpi.icon }}</span>
</div>
</div>
<div class="mt-4 flex items-center justify-between pt-2">
<span class="px-2 py-0.5 rounded-full bg-surface-container text-secondary font-label-sm text-label-sm font-medium">{{ kpi.sub }}</span>
</div>
</div>
</div>

<!-- Secondary Synthetics Row (3 Columns) -->
<div class="grid grid-cols-1 md:grid-cols-3 gap-space-md">
<div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm hover:shadow-md transition-all flex items-center justify-between">
<div class="flex items-center gap-space-md">
<div class="w-11 h-11 rounded-xl bg-surface-container flex items-center justify-center text-primary">
<span class="material-symbols-outlined text-[24px]">corporate_fare</span>
</div>
<div>
<span class="font-label-sm text-label-sm text-secondary font-medium block">Entreprises partenaires</span>
<div class="flex items-baseline gap-2">
<span class="font-headline-md text-headline-md text-on-surface font-bold">{{ formatNumber(stats?.totalCompanies) }}</span>
<span class="font-label-sm text-label-sm text-secondary font-normal">Enregistrées</span>
</div>
</div>
</div>
</div>
<div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm hover:shadow-md transition-all flex items-center justify-between">
<div class="flex items-center gap-space-md">
<div class="w-11 h-11 rounded-xl bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed">
<span class="material-symbols-outlined text-[24px]">dashboard_customize</span>
</div>
<div>
<span class="font-label-sm text-label-sm text-secondary font-medium block">Secteurs d'activité</span>
<div class="flex items-baseline gap-2">
<span class="font-headline-md text-headline-md text-on-surface font-bold">{{ formatNumber(stats?.totalSectors) }}</span>
<span class="font-label-sm text-label-sm text-secondary font-normal">Branches marchandes</span>
</div>
</div>
</div>
</div>
<div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm hover:shadow-md transition-all flex items-center justify-between">
<div class="flex items-center gap-space-md">
<div class="w-11 h-11 rounded-xl bg-surface-container flex items-center justify-center text-primary relative">
<span class="material-symbols-outlined text-[24px]">wifi_tethering</span>
<span class="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary animate-ping"></span>
</div>
<div>
<span class="font-label-sm text-label-sm text-secondary font-medium block">Utilisateurs en direct</span>
<div class="flex items-baseline gap-2">
<span class="font-headline-md text-headline-md text-on-surface font-bold">{{ socketStore.onlineCount }}</span>
<span class="font-label-sm text-label-sm text-secondary font-normal">Connexion(s) active(s)</span>
</div>
</div>
</div>
<div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm font-semibold">
<span class="w-1.5 h-1.5 rounded-full bg-primary"></span>
<span>Live feed</span>
</div>
</div>
</div>

<!-- Main Operational Workspace: Queue & Live Feed -->
<div class="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
<!-- Left Column: Demandes de recharge en attente (8 cols) -->
<div class="lg:col-span-8 space-y-space-md">
<div class="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm">
<!-- Queue Header -->
<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-md">
<div class="flex items-center gap-space-sm">
<div class="w-9 h-9 rounded-lg bg-tertiary-fixed text-on-tertiary-fixed-variant flex items-center justify-center font-bold">
<span class="material-symbols-outlined text-[20px]">currency_exchange</span>
</div>
<div>
<div class="flex items-center gap-2">
<h2 class="font-headline-md text-headline-md font-bold text-on-surface tracking-tight">Demandes de recharge en attente</h2>
<span v-if="pendingTotal > 0" class="px-2.5 py-0.5 rounded-full bg-tertiary-container text-on-tertiary font-label-sm text-label-sm font-semibold">{{ pendingTotal }} en attente</span>
</div>
<p class="font-body-sm text-body-sm text-secondary mt-0.5">Approuvez ou rejetez rapidement les demandes de recharge depuis le tableau de bord.</p>
</div>
</div>
<RouterLink class="inline-flex items-center gap-1 font-label-md text-label-md text-primary font-semibold hover:underline" to="/recharges">
<span>Voir tout</span>
<span class="material-symbols-outlined text-[16px]">arrow_forward</span>
</RouterLink>
</div>

<!-- Loading -->
<div v-if="pendingLoading" class="flex justify-center py-6">
<span class="material-symbols-outlined animate-spin text-primary text-[26px]">progress_activity</span>
</div>

<!-- Empty -->
<div v-else-if="pendingRecharges.length === 0" class="text-center py-8 text-secondary">
<span class="material-symbols-outlined text-[32px] mb-2 block text-primary">check_circle</span>
<p class="font-body-sm text-body-sm font-medium">Aucune recharge en attente</p>
</div>

<!-- Pending Records Interactive Stack -->
<TransitionGroup v-else tag="div" class="space-y-space-sm pt-2" leave-active-class="transition-all duration-300 ease-in" leave-to-class="opacity-0 translate-x-5">
<div v-for="row in pendingRecharges" :key="row.id ?? row.tsxId" class="p-space-md rounded-xl bg-surface-container-low hover:bg-surface-container transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
<div class="flex items-center gap-space-md min-w-0">
<div class="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-primary font-bold text-[14px] shrink-0">{{ (row.user?.username ?? '?')[0]?.toUpperCase() }}</div>
<div class="min-w-0">
<div class="flex items-center gap-2">
<span class="font-headline-sm text-body-md font-semibold text-on-surface truncate">{{ row.user?.username ?? '—' }}</span>
<span class="px-1.5 py-0.2 rounded bg-surface-container-highest text-secondary font-label-sm text-[10px]">ID #{{ row.user?.id }}</span>
</div>
<div class="font-body-sm text-body-sm text-secondary truncate">{{ row.user?.email }}</div>
</div>
</div>
<div class="flex items-center justify-between sm:justify-end gap-space-lg shrink-0">
<div class="text-left sm:text-right">
<div class="font-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">{{ fmtAmount(row) }}</div>
<div class="font-label-sm text-label-sm text-secondary">{{ row.paymentMethod ?? '—' }}</div>
</div>
<div class="flex items-center gap-1.5">
<button class="w-9 h-9 rounded-lg bg-surface-container-lowest text-on-surface-variant hover:bg-primary-container hover:text-on-primary transition-all flex items-center justify-center shadow-sm disabled:opacity-50" title="Valider la recharge" type="button" :disabled="actionId === (row.id ?? row.tsxId)" @click="approve(row)">
<span class="material-symbols-outlined text-[20px]">check</span>
</button>
<button class="w-9 h-9 rounded-lg bg-surface-container-lowest text-on-surface-variant hover:bg-error hover:text-on-error transition-all flex items-center justify-center shadow-sm disabled:opacity-50" title="Rejeter" type="button" :disabled="actionId === (row.id ?? row.tsxId)" @click="reject(row)">
<span class="material-symbols-outlined text-[20px]">close</span>
</button>
</div>
</div>
</div>
</TransitionGroup>

<!-- Bottom Footer Quick Links -->
<div v-if="pendingTotal > pendingRecharges.length" class="pt-space-md mt-space-sm text-center">
<RouterLink class="font-body-sm text-body-sm text-primary font-semibold hover:text-primary-container inline-flex items-center gap-1 transition-colors" to="/recharges">
<span>Voir toutes les demandes en instance</span>
<span class="material-symbols-outlined text-[16px]">chevron_right</span>
</RouterLink>
</div>
</div>

<!-- Taux de change EC → CDF (réel) -->
<div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex items-center justify-between">
<div class="space-y-1">
<span class="font-label-sm text-label-sm text-secondary font-semibold uppercase">Taux de change instantané</span>
<div class="font-headline-sm text-headline-sm font-bold text-on-surface">
<span v-if="cdfRate">1 EC = {{ formatNumber(cdfRate) }} FC</span>
<span v-else class="text-secondary font-body-sm text-body-sm">Taux non configuré</span>
</div>
</div>
<div class="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-primary shrink-0">
<span class="material-symbols-outlined text-[26px]">price_change</span>
</div>
</div>
</div>

<!-- Right Column: Live Audit Feed & Active Sessions (4 cols) -->
<div class="lg:col-span-4 space-y-space-md">
<!-- Live Connected Admins -->
<div class="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm">
<div class="flex items-center justify-between pb-space-sm mb-space-sm">
<div class="flex items-center gap-2">
<span class="material-symbols-outlined text-primary text-[20px]">admin_panel_settings</span>
<h3 class="font-headline-sm text-body-lg font-bold text-on-surface">Utilisateurs en ligne</h3>
</div>
<span class="px-2 py-0.5 rounded-full bg-surface-container text-primary font-label-sm text-label-sm font-bold">{{ socketStore.onlineCount }} actif(s)</span>
</div>
<div v-if="socketStore.onlineUsers.length === 0" class="text-center py-6 text-secondary font-body-sm text-body-sm">
Aucun utilisateur connecté
</div>
<div v-else class="space-y-2 max-h-56 overflow-y-auto pr-1">
<div v-for="data in socketStore.onlineUsers" :key="data.userId" class="p-space-sm rounded-xl bg-surface-container-low flex items-center justify-between">
<div class="flex items-center gap-space-sm min-w-0">
<div class="w-9 h-9 rounded-full bg-surface-container-highest flex items-center justify-center text-primary font-bold text-sm shrink-0">{{ (data.username ?? '?')[0]?.toUpperCase() }}</div>
<div class="min-w-0">
<div class="flex items-center gap-1.5">
<span class="font-headline-sm text-body-sm font-semibold text-on-surface truncate">{{ data.username ?? '—' }}</span>
<span class="font-label-sm text-label-sm text-secondary">#{{ data.userId }}</span>
</div>
<div class="font-label-sm text-label-sm text-secondary">Depuis {{ new Date(data.connectedAt).toLocaleTimeString('fr-FR') }}</div>
</div>
</div>
<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-lowest text-primary font-label-sm text-label-sm font-semibold shadow-sm">
<span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
<span>En ligne</span>
</span>
</div>
</div>
</div>

<!-- Real-Time Activity Log -->
<div class="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm">
<div class="flex items-center justify-between pb-space-sm mb-space-sm">
<div>
<h3 class="font-headline-sm text-body-lg font-bold text-on-surface">Activité de connexion</h3>
<p class="font-body-sm text-body-sm text-secondary">Événements récents en temps réel</p>
</div>
<span class="px-2 py-0.5 rounded-full bg-surface-container text-primary font-label-sm text-label-sm font-semibold">Temps réel</span>
</div>
<div v-if="socketStore.connectionLog.length === 0" class="text-center text-secondary py-6 font-body-sm text-body-sm">
Aucune activité détectée depuis l'ouverture de session admin.
</div>
<div v-else class="space-y-2 max-h-72 overflow-y-auto pr-1">
<div v-for="(entry, i) in socketStore.connectionLog.slice(0, 30)" :key="i" class="flex items-center gap-3 px-3 py-2 rounded-lg font-body-sm text-body-sm" :class="entry.event === 'online' ? 'bg-primary-container/10' : 'bg-error-container/40'">
<span class="w-2 h-2 rounded-full shrink-0" :class="entry.event === 'online' ? 'bg-primary' : 'bg-error'"></span>
<span class="flex-1 min-w-0">
<span class="font-semibold" :class="entry.event === 'online' ? 'text-primary' : 'text-error'">User #{{ entry.userId }}</span>
<span class="text-secondary ml-1">{{ entry.event === 'online' ? 'vient de se connecter' : 'vient de se déconnecter' }}</span>
</span>
<span class="font-label-sm text-label-sm text-secondary shrink-0">{{ new Date(entry.time).toLocaleTimeString('fr-FR') }}</span>
</div>
</div>
</div>

<!-- Quick System Status Badge Card -->
<div class="bg-surface-container-low rounded-xl p-space-md flex items-center justify-between">
<div class="flex items-center gap-space-sm">
<span class="w-3 h-3 rounded-full bg-primary-container animate-pulse"></span>
<div>
<div class="font-headline-sm text-body-sm font-bold text-on-surface">Système BIM {{ socketStore.isConnected ? 'opérationnel' : 'en reconnexion…' }}</div>
</div>
</div>
</div>
</div>
</div>

<!-- Platform Footer Meta -->
<div class="pt-space-md pb-space-lg flex flex-col sm:flex-row items-center justify-between text-secondary font-label-sm text-label-sm gap-space-sm">
<div class="flex items-center gap-space-xs">
<span>BIM NEXT Platform</span>
<span>•</span>
<span>Propulsé par <strong class="text-primary font-semibold">Business Investment Meeting (BIM)</strong></span>
</div>
<div>
<span>Dernière actualisation : {{ new Date().toLocaleString('fr-FR') }}</span>
</div>
</div>
</div>
</div>
</template>
