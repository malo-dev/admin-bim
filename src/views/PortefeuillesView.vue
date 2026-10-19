<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import apiClient from '@/api/client'
import { useToast } from '@/composables/useToast'

const toast = useToast()

const searchInput = ref('')
const statusFilter = ref('')
const sortBy = ref('balance-desc')
const currentPage = ref(1)
const pageSize = ref(10)

const users = ref([])
const total = ref(0)
const loading = ref(false)

async function loadUsers() {
  loading.value = true
  try {
    const { data } = await apiClient.get('/auth/users', { params: { search: searchInput.value || undefined, page: currentPage.value, pageSize: pageSize.value, paginate: 'true' } })
    users.value = data?.data ?? []
    total.value = data?.pagination?.total ?? users.value.length
  } catch {
    toast.error('Impossible de charger les portefeuilles.')
  } finally {
    loading.value = false
  }
}
let searchDebounce = null
watch(searchInput, () => {
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    currentPage.value = 1
    loadUsers()
  }, 400)
})
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
function goToPage(p) {
  if (p < 1 || p > totalPages.value) return
  currentPage.value = p
  loadUsers()
}

function balanceOf(row) {
  return row.soldNumber ?? row.balance ?? row.wallet?.balance ?? 0
}
const filteredUsers = computed(() => {
  let list = users.value
  if (statusFilter.value === 'active') list = list.filter((u) => u.isActive && !u.isBlocked)
  else if (statusFilter.value === 'blocked') list = list.filter((u) => u.isBlocked)
  else if (statusFilter.value === 'inactive') list = list.filter((u) => !u.isActive)
  return [...list].sort((a, b) => {
    if (sortBy.value === 'balance-desc') return balanceOf(b) - balanceOf(a)
    if (sortBy.value === 'balance-asc') return balanceOf(a) - balanceOf(b)
    if (sortBy.value === 'name-asc') return (a.username ?? '').localeCompare(b.username ?? '')
    if (sortBy.value === 'recent') return new Date(b.createdAt) - new Date(a.createdAt)
    return 0
  })
})

/* Stats globales */
const stats = ref({ newUsers: null, totalBalance: null, totalRecharged: null })
async function loadStats() {
  try {
    const { data } = await apiClient.get('/auth/users/balance-stats')
    stats.value = data ?? {}
  } catch {
    /* non bloquant */
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
function toFc(ec) {
  if (!cdfRate.value) return '—'
  return Math.round(Number(ec ?? 0) * cdfRate.value).toLocaleString('fr-FR') + ' FC'
}
function fmtEC(val) {
  if (val === undefined || val === null) return '—'
  return Number(val).toLocaleString('fr-FR') + ' EC'
}

function initials(name) {
  return name ? name[0].toUpperCase() : '?'
}
function profileType(row) {
  if (row.isAgent) return { label: 'Agent BIM', cls: 'bg-primary-fixed text-primary' }
  if (row.commerce) return { label: 'Commerçant', cls: 'bg-secondary-container text-on-secondary-fixed' }
  return { label: 'Particulier', cls: 'bg-surface-container text-secondary' }
}

/* Ajustement de solde */
const adjustDialog = ref(false)
const adjustTarget = ref(null)
const adjustValue = ref(null)
const adjusting = ref(false)
function openAdjust(row) {
  adjustTarget.value = row
  adjustValue.value = balanceOf(row)
  adjustDialog.value = true
}
async function submitAdjust() {
  if (adjustValue.value === null || adjustValue.value < 0) {
    toast.warn('Le solde doit être un nombre positif.')
    return
  }
  adjusting.value = true
  try {
    await apiClient.put(`/auth/users/${adjustTarget.value.id}/sold`, { soldNumber: adjustValue.value })
    toast.success(`Solde de ${adjustTarget.value.username} mis à jour → ${fmtEC(adjustValue.value)}.`)
    adjustDialog.value = false
    await loadUsers()
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  } finally {
    adjusting.value = false
  }
}

onMounted(() => {
  loadUsers()
  loadStats()
  loadCdfRate()
})
</script>

<template>
<div class="flex flex-col w-full">
<div class="bg-surface-container-lowest px-space-lg shadow-sm sticky top-16 z-20">
<div class="flex items-center gap-1 overflow-x-auto no-scrollbar py-2">
<RouterLink class="px-3 py-2 font-label-md text-label-md text-secondary hover:text-on-surface rounded-md whitespace-nowrap flex items-center gap-1.5 hover:bg-surface-container-low transition-colors" to="/transactions">
<span class="material-symbols-outlined text-[16px]">sync_alt</span><span>Transactions</span>
</RouterLink>
<RouterLink class="px-3 py-2 font-label-md text-label-md text-secondary hover:text-on-surface rounded-md whitespace-nowrap flex items-center gap-1.5 hover:bg-surface-container-low transition-colors" to="/recharges">
<span class="material-symbols-outlined text-[16px]">add_card</span><span>Recharges</span>
</RouterLink>
<a aria-current="page" class="px-3 py-2 font-label-md text-label-md font-semibold text-primary bg-primary-fixed/30 rounded-md whitespace-nowrap flex items-center gap-1.5 border-b-2 border-primary" href="#">
<span class="material-symbols-outlined text-[16px]">account_balance_wallet</span><span>Portefeuilles</span>
<span class="ml-1 px-1.5 py-0.2 bg-primary-container text-on-primary text-[10px] rounded-full font-bold">Live</span>
</a>
<RouterLink class="px-3 py-2 font-label-md text-label-md text-secondary hover:text-on-surface rounded-md whitespace-nowrap flex items-center gap-1.5 hover:bg-surface-container-low transition-colors" to="/statistiques">
<span class="material-symbols-outlined text-[16px]">bar_chart_4_bars</span><span>Statistiques financières</span>
</RouterLink>
</div>
</div>

<div class="p-space-lg space-y-space-lg max-w-[1600px] w-full mx-auto">
<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-space-md">
<div class="flex items-start gap-space-md">
<div class="w-11 h-11 rounded-xl bg-primary-fixed/50 flex items-center justify-center text-primary shrink-0"><span class="material-symbols-outlined text-[24px]">account_balance_wallet</span></div>
<div>
<div class="flex items-center gap-2.5">
<h1 class="font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">Portefeuilles Utilisateurs</h1>
<span class="inline-flex items-center px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold bg-primary-fixed text-primary">Temps réel</span>
</div>
<p class="font-body-sm text-body-sm text-secondary mt-0.5">Solde de chaque utilisateur et total cumulé des comptes enregistrés BIM NEXT.</p>
</div>
</div>
</div>

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-md">
<div class="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm">
<div class="flex items-center justify-between">
<span class="font-label-sm text-label-sm font-semibold text-secondary">Solde total — tous utilisateurs</span>
<div class="w-8 h-8 rounded-lg bg-primary-fixed/40 text-primary flex items-center justify-center"><span class="material-symbols-outlined text-[18px]">account_balance_wallet</span></div>
</div>
<div class="mt-3 flex items-baseline gap-2">
<span class="font-numeric-kpi text-numeric-kpi text-on-surface font-black tracking-tight">{{ fmtEC(stats.totalBalance) }}</span>
<span v-if="stats.totalBalance != null" class="font-label-sm text-label-sm text-secondary font-medium">≈ {{ toFc(stats.totalBalance) }}</span>
</div>
<div class="mt-2.5 flex items-center justify-between font-body-sm text-body-sm text-secondary border-t border-surface-container pt-2.5">
<span>{{ total }} comptes</span>
</div>
</div>
<div class="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm">
<div class="flex items-center justify-between">
<span class="font-label-sm text-label-sm font-semibold text-secondary">Nouveaux inscrits</span>
<div class="w-8 h-8 rounded-lg bg-secondary-container text-on-secondary-fixed flex items-center justify-center"><span class="material-symbols-outlined text-[18px]">person_add</span></div>
</div>
<div class="mt-3 flex items-baseline gap-2">
<span class="font-numeric-kpi text-numeric-kpi text-on-surface font-black tracking-tight">{{ stats.newUsers ?? '—' }}</span>
</div>
<div class="mt-2.5 flex items-center justify-between font-body-sm text-body-sm text-secondary border-t border-surface-container pt-2.5">
<span>Depuis l'origine</span>
</div>
</div>
<div class="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm">
<div class="flex items-center justify-between">
<span class="font-label-sm text-label-sm font-semibold text-secondary">Rechargé (cumulé)</span>
<div class="w-8 h-8 rounded-lg bg-tertiary-fixed text-tertiary-container flex items-center justify-center"><span class="material-symbols-outlined text-[18px]">arrow_outward</span></div>
</div>
<div class="mt-3 flex items-baseline gap-2">
<span class="font-numeric-kpi text-numeric-kpi text-on-surface font-black tracking-tight">{{ fmtEC(stats.totalRecharged) }}</span>
</div>
<div class="mt-2.5 flex items-center justify-between font-body-sm text-body-sm text-secondary border-t border-surface-container pt-2.5">
<span>1 EC = {{ cdfRate ? cdfRate.toLocaleString('fr-FR') : '—' }} FC</span>
</div>
</div>
</div>

<div class="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
<div class="p-space-md border-b border-surface-container flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
<div class="relative flex-1 max-w-md">
<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
<input v-model="searchInput" class="w-full h-10 pl-9 pr-space-md font-body-sm text-body-sm bg-surface-container-low rounded-lg text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" placeholder="Rechercher par nom, email ou identifiant..." type="text"/>
</div>
<div class="flex flex-wrap items-center gap-space-sm">
<select v-model="statusFilter" class="font-label-md text-label-md font-medium bg-surface-container-low text-on-surface rounded-lg py-2 px-3 focus:outline-none">
<option value="">Tous les statuts</option>
<option value="active">Actif uniquement</option>
<option value="blocked">Bloqué</option>
<option value="inactive">Inactif</option>
</select>
<select v-model="sortBy" class="font-label-md text-label-md font-medium bg-surface-container-low text-on-surface rounded-lg py-2 px-3 focus:outline-none">
<option value="balance-desc">Solde : Plus élevé d'abord</option>
<option value="balance-asc">Solde : Plus faible d'abord</option>
<option value="name-asc">Nom (A-Z)</option>
<option value="recent">Plus récent d'abord</option>
</select>
</div>
</div>

<div v-if="loading" class="p-space-lg space-y-space-sm">
<div v-for="n in 6" :key="n" class="h-12 rounded-lg bg-surface-container-low animate-pulse"></div>
</div>
<div v-else-if="filteredUsers.length === 0" class="text-center py-12 text-secondary">
<span class="material-symbols-outlined text-[40px] mb-2 block opacity-30">account_balance_wallet</span>
<p class="font-body-md text-body-md font-medium">Aucun utilisateur trouvé</p>
</div>
<div v-else class="overflow-x-auto">
<table class="w-full text-left border-collapse">
<thead>
<tr class="border-b border-surface-container bg-surface-container-low font-label-sm text-label-sm font-bold uppercase tracking-wider text-secondary">
<th class="py-3.5 pl-6 pr-3">Utilisateur / Compte</th>
<th class="px-4 py-3.5">N° compte</th>
<th class="px-4 py-3.5">Statut</th>
<th class="px-4 py-3.5 text-right">Solde (EC)</th>
<th class="px-4 py-3.5 text-right">Équivalent FC</th>
<th class="px-4 py-3.5 text-center">Profil</th>
<th class="py-3.5 pl-3 pr-6 text-right">Actions</th>
</tr>
</thead>
<tbody class="divide-y divide-surface-container font-body-sm text-body-sm">
<tr v-for="row in filteredUsers" :key="row.id" class="hover:bg-surface-container-low/60 transition-colors group">
<td class="py-3.5 pl-6 pr-3">
<div class="flex items-center gap-3">
<div class="w-9 h-9 rounded-full bg-primary-container text-on-primary font-bold flex items-center justify-center text-xs shrink-0">{{ initials(row.fullname || row.username) }}</div>
<div class="min-w-0">
<div class="font-bold text-on-surface truncate">{{ row.fullname || row.username }}</div>
<div class="font-label-sm text-label-sm text-secondary truncate">{{ row.email }}</div>
</div>
</div>
</td>
<td class="px-4 py-3.5"><div class="font-mono text-[11px] text-secondary bg-surface-container px-2 py-0.5 rounded w-max">{{ row.accountNumber ?? '—' }}</div></td>
<td class="px-4 py-3.5">
<span v-if="row.isBlocked" class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-semibold bg-error-container text-on-error-container"><span class="w-1.5 h-1.5 rounded-full bg-error"></span>Bloqué</span>
<span v-else-if="row.isActive" class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-semibold bg-primary-fixed text-primary"><span class="w-1.5 h-1.5 rounded-full bg-primary"></span>Actif</span>
<span v-else class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-semibold bg-surface-container text-secondary"><span class="w-1.5 h-1.5 rounded-full bg-outline"></span>Inactif</span>
</td>
<td class="px-4 py-3.5 text-right font-black text-on-surface text-body-md"><span class="text-primary font-bold">{{ Number(balanceOf(row)).toLocaleString('fr-FR') }}</span> EC</td>
<td class="px-4 py-3.5 text-right font-mono text-secondary">{{ toFc(balanceOf(row)) }}</td>
<td class="px-4 py-3.5 text-center"><span class="inline-flex items-center px-2 py-0.5 rounded font-label-sm text-[10px] font-medium" :class="profileType(row).cls">{{ profileType(row).label }}</span></td>
<td class="py-3.5 pl-3 pr-6 text-right">
<div class="flex items-center justify-end gap-1.5">
<button class="p-1.5 text-secondary hover:text-primary hover:bg-surface-container rounded-md transition-colors" title="Ajuster le solde" type="button" @click="openAdjust(row)">
<span class="material-symbols-outlined text-[18px]">edit</span>
</button>
</div>
</td>
</tr>
</tbody>
</table>
</div>

<div v-if="total > 0" class="px-space-lg py-space-md border-t border-surface-container flex flex-col sm:flex-row items-center justify-between gap-space-sm font-body-sm text-body-sm text-secondary">
<div>Page <span class="font-semibold text-on-surface">{{ currentPage }}</span> sur <span class="font-semibold text-on-surface">{{ totalPages }}</span> — {{ total }} comptes</div>
<div class="flex items-center gap-1">
<button class="px-2.5 py-1.5 rounded-lg bg-surface-container-low text-secondary hover:bg-surface-container disabled:opacity-50 transition-colors" :disabled="currentPage <= 1" type="button" @click="goToPage(currentPage - 1)"><span class="material-symbols-outlined text-[16px]">chevron_left</span></button>
<button class="px-3 py-1.5 rounded-lg bg-primary-container text-on-primary font-semibold shadow-xs" type="button">{{ currentPage }}</button>
<button class="px-2.5 py-1.5 rounded-lg bg-surface-container-low text-secondary hover:bg-surface-container disabled:opacity-50 transition-colors" :disabled="currentPage >= totalPages" type="button" @click="goToPage(currentPage + 1)"><span class="material-symbols-outlined text-[16px]">chevron_right</span></button>
</div>
</div>
</div>
</div>

<!-- Dialog Ajuster le solde -->
<div v-if="adjustDialog" class="fixed inset-0 z-[90] flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm p-4" @click.self="adjustDialog = false">
<div class="w-full max-w-sm bg-white rounded-2xl shadow-xl p-space-lg space-y-space-md">
<h2 class="font-headline-md text-headline-md font-bold text-on-surface">Ajuster le solde de {{ adjustTarget?.username }}</h2>
<p class="font-body-sm text-body-sm text-secondary">Solde actuel : <strong>{{ fmtEC(balanceOf(adjustTarget ?? {})) }}</strong></p>
<div>
<label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Nouveau solde (EC)</label>
<input v-model.number="adjustValue" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" min="0" type="number"/>
</div>
<p class="font-label-sm text-label-sm text-tertiary-container">Cette action remplace le solde actuel — ce n'est pas un ajout.</p>
<div class="flex justify-end gap-space-sm pt-space-sm">
<button class="h-10 px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm font-medium" type="button" :disabled="adjusting" @click="adjustDialog = false">Annuler</button>
<button class="h-10 px-space-md rounded-lg bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold disabled:opacity-60" type="button" :disabled="adjusting" @click="submitAdjust">{{ adjusting ? 'Enregistrement…' : 'Enregistrer' }}</button>
</div>
</div>
</div>
</div>
</template>
