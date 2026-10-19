<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import apiClient from '@/api/client'
import { useToast } from '@/composables/useToast'

const toast = useToast()
const mainTab = ref('transactions') // 'transactions' | 'retraits' | 'paiements'

function toLocalDateStr(d) {
  return d || undefined
}
function formatDate(d) {
  return d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—'
}
function fmt(amount) {
  return amount != null ? Number(amount).toLocaleString('fr-FR') : '—'
}

const TRX_TYPE_OPTIONS = [
  { label: 'Retrait', value: 'retrait' },
  { label: 'Recharge', value: 'recharge' },
  { label: 'Transfert', value: 'transfert' },
  { label: 'Paiement', value: 'paiement' }
]
const TRX_STATUS_OPTIONS = [
  { label: 'Réussi', value: 'réussi' },
  { label: 'Échoué', value: 'échoué' },
  { label: 'En attente', value: 'en attente' },
  { label: 'Annulé', value: 'annuler' }
]
const TRX_BADGE = { réussi: 'bg-primary-fixed text-primary', échoué: 'bg-error-container text-on-error-container', 'en attente': 'bg-tertiary-fixed text-tertiary-container', annuler: 'bg-surface-container text-secondary' }

/* Taux de change CDF */
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

/* ── Tab Transactions (ledger général) ── */
const trxSearch = ref('')
const trxType = ref('')
const trxStatus = ref('')
const trxDateFrom = ref('')
const trxDateTo = ref('')
const trxPage = ref(1)
const trxPageSize = ref(10)
const transactions = ref([])
const trxTotal = ref(0)
const trxTotalAmount = ref(null)
const trxLoading = ref(false)

async function loadTransactions() {
  trxLoading.value = true
  try {
    const { data } = await apiClient.get('/tsx', {
      params: { search: trxSearch.value || undefined, transactionType: trxType.value || undefined, status: trxStatus.value || undefined, createdAtFrom: toLocalDateStr(trxDateFrom.value), createdAtTo: toLocalDateStr(trxDateTo.value), page: trxPage.value, pageSize: trxPageSize.value, paginate: 'true' }
    })
    transactions.value = data?.data ?? []
    trxTotal.value = data?.total ?? transactions.value.length
    trxTotalAmount.value = data?.totalAmount ?? null
  } catch {
    toast.error('Impossible de charger les transactions.')
  } finally {
    trxLoading.value = false
  }
}
let trxDebounce = null
watch([trxSearch, trxType, trxStatus, trxDateFrom, trxDateTo], () => {
  clearTimeout(trxDebounce)
  trxDebounce = setTimeout(() => {
    trxPage.value = 1
    loadTransactions()
  }, 400)
})
const trxTotalPages = computed(() => Math.max(1, Math.ceil(trxTotal.value / trxPageSize.value)))

/* ── Tab Retraits ── */
const retraitSearch = ref('')
const retraitStatus = ref('')
const retraitPage = ref(1)
const retraitPageSize = ref(10)
const retraits = ref([])
const retraitTotal = ref(0)
const retraitLoading = ref(false)
async function loadRetraits() {
  retraitLoading.value = true
  try {
    const { data } = await apiClient.get('/tsx/admin/retraits', { params: { search: retraitSearch.value || undefined, status: retraitStatus.value || undefined, page: retraitPage.value, pageSize: retraitPageSize.value } })
    retraits.value = data?.data ?? []
    retraitTotal.value = data?.total ?? retraits.value.length
  } catch {
    toast.error('Impossible de charger les retraits.')
  } finally {
    retraitLoading.value = false
  }
}
let retraitDebounce = null
watch([retraitSearch, retraitStatus], () => {
  clearTimeout(retraitDebounce)
  retraitDebounce = setTimeout(() => {
    retraitPage.value = 1
    loadRetraits()
  }, 400)
})
const retraitTotalPages = computed(() => Math.max(1, Math.ceil(retraitTotal.value / retraitPageSize.value)))

/* ── Tab Paiements ── */
const paiementSearch = ref('')
const paiementPage = ref(1)
const paiementPageSize = ref(10)
const paiements = ref([])
const paiementTotal = ref(0)
const paiementLoading = ref(false)
async function loadPaiements() {
  paiementLoading.value = true
  try {
    const { data } = await apiClient.get('/tsx/admin/paiements', { params: { search: paiementSearch.value || undefined, page: paiementPage.value, pageSize: paiementPageSize.value } })
    paiements.value = data?.data ?? []
    paiementTotal.value = data?.total ?? paiements.value.length
  } catch {
    toast.error('Impossible de charger les paiements.')
  } finally {
    paiementLoading.value = false
  }
}
let paiementDebounce = null
watch(paiementSearch, () => {
  clearTimeout(paiementDebounce)
  paiementDebounce = setTimeout(() => {
    paiementPage.value = 1
    loadPaiements()
  }, 400)
})
const paiementTotalPages = computed(() => Math.max(1, Math.ceil(paiementTotal.value / paiementPageSize.value)))

onMounted(() => {
  loadCdfRate()
  loadTransactions()
  loadRetraits()
  loadPaiements()
})
</script>

<template>
<div class="flex flex-col w-full">
<div class="px-space-lg py-space-md space-y-space-md max-w-[1600px] mx-auto w-full">
<div class="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pb-space-sm">
<div class="flex items-center gap-space-sm">
<div class="w-10 h-10 rounded-xl bg-primary-container text-on-primary flex items-center justify-center shadow-sm"><span class="material-symbols-outlined text-[24px]">account_balance_wallet</span></div>
<div>
<div class="flex items-center gap-space-xs">
<h1 class="font-headline-lg text-headline-lg text-on-surface tracking-tight">Finance &amp; Transactions</h1>
<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container font-label-sm text-label-sm text-primary font-semibold"><span class="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>Live Feed</span>
</div>
<p class="font-body-sm text-body-sm text-secondary">Suivi des flux de trésorerie, retraits et paiements marchands</p>
</div>
</div>
<div class="flex items-center gap-space-sm px-space-md py-1.5 rounded-xl bg-surface-container-lowest shadow-sm">
<span class="material-symbols-outlined text-[18px] text-primary">currency_exchange</span>
<span class="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-semibold">Taux officiel</span>
<div class="font-headline-sm text-body-md font-bold text-on-surface tracking-tight">1 EC = <span class="text-primary">{{ cdfRate ? cdfRate.toLocaleString('fr-FR') : '—' }} FC</span></div>
</div>
</div>

<div class="grid grid-cols-2 md:grid-cols-4 gap-space-md">
<div class="p-space-md bg-surface-container-lowest rounded-xl shadow-sm flex items-center justify-between">
<div>
<div class="font-label-sm text-label-sm text-secondary uppercase font-semibold">Transactions</div>
<div class="font-numeric-kpi text-numeric-kpi text-on-surface mt-1">{{ trxTotal }}</div>
</div>
<div class="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary"><span class="material-symbols-outlined text-[20px]">sync_alt</span></div>
</div>
<div class="p-space-md bg-surface-container-lowest rounded-xl shadow-sm flex items-center justify-between">
<div>
<div class="font-label-sm text-label-sm text-secondary uppercase font-semibold">Volume (page)</div>
<div class="font-numeric-kpi text-numeric-kpi text-on-surface mt-1">{{ fmt(trxTotalAmount) }} <span class="text-label-md font-headline-sm text-secondary">EC</span></div>
</div>
<div class="w-10 h-10 rounded-xl bg-secondary-container/40 flex items-center justify-center text-primary-container"><span class="material-symbols-outlined text-[20px]">payments</span></div>
</div>
<div class="p-space-md bg-surface-container-lowest rounded-xl shadow-sm flex items-center justify-between">
<div>
<div class="font-label-sm text-label-sm text-secondary uppercase font-semibold">Retraits</div>
<div class="font-numeric-kpi text-numeric-kpi text-on-surface mt-1">{{ retraitTotal }}</div>
</div>
<div class="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-secondary"><span class="material-symbols-outlined text-[20px]">outbox</span></div>
</div>
<div class="p-space-md bg-surface-container-lowest rounded-xl shadow-sm flex items-center justify-between">
<div>
<div class="font-label-sm text-label-sm text-secondary uppercase font-semibold">Paiements</div>
<div class="font-numeric-kpi text-numeric-kpi text-on-surface mt-1">{{ paiementTotal }}</div>
</div>
<div class="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary"><span class="material-symbols-outlined text-[20px]">shopping_cart_checkout</span></div>
</div>
</div>

<div class="bg-surface-container-lowest rounded-xl shadow-sm px-space-md pt-2">
<div class="flex items-center gap-space-xs overflow-x-auto no-scrollbar">
<button class="flex items-center gap-2 py-3 px-space-md relative font-body-sm text-body-sm font-semibold transition-colors" :class="mainTab === 'transactions' ? 'text-primary' : 'text-secondary hover:text-on-surface'" type="button" @click="mainTab = 'transactions'">
<span class="material-symbols-outlined text-[18px]">sync_alt</span><span>Transactions</span>
<span class="px-2 py-0.5 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm font-bold">{{ trxTotal }}</span>
<span v-if="mainTab === 'transactions'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"></span>
</button>
<RouterLink class="flex items-center gap-2 py-3 px-space-md font-body-sm text-body-sm font-medium text-secondary hover:text-on-surface transition-colors" to="/recharges">
<span class="material-symbols-outlined text-[18px]">add_card</span><span>Recharges</span>
</RouterLink>
<button class="flex items-center gap-2 py-3 px-space-md relative font-body-sm text-body-sm font-semibold transition-colors" :class="mainTab === 'retraits' ? 'text-primary' : 'text-secondary hover:text-on-surface'" type="button" @click="mainTab = 'retraits'">
<span class="material-symbols-outlined text-[18px]">outbox</span><span>Retraits</span>
<span class="px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-semibold">{{ retraitTotal }}</span>
<span v-if="mainTab === 'retraits'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"></span>
</button>
<button class="flex items-center gap-2 py-3 px-space-md relative font-body-sm text-body-sm font-semibold transition-colors" :class="mainTab === 'paiements' ? 'text-primary' : 'text-secondary hover:text-on-surface'" type="button" @click="mainTab = 'paiements'">
<span class="material-symbols-outlined text-[18px]">shopping_cart_checkout</span><span>Paiements</span>
<span class="px-2 py-0.5 rounded-full bg-surface-container text-secondary font-label-sm text-label-sm">{{ paiementTotal }}</span>
<span v-if="mainTab === 'paiements'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"></span>
</button>
<RouterLink class="flex items-center gap-2 py-3 px-space-md font-body-sm text-body-sm font-medium text-secondary hover:text-on-surface transition-colors" to="/portefeuilles">
<span class="material-symbols-outlined text-[18px]">account_balance_wallet</span><span>Portefeuilles &amp; Soldes</span>
</RouterLink>
<RouterLink class="flex items-center gap-2 py-3 px-space-md font-body-sm text-body-sm font-medium text-secondary hover:text-on-surface transition-colors" to="/statistiques">
<span class="material-symbols-outlined text-[18px]">bar_chart_4_bars</span><span>Statistiques financières</span>
</RouterLink>
</div>
</div>

<!-- TAB TRANSACTIONS -->
<div v-show="mainTab === 'transactions'" class="space-y-space-md">
<div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-space-sm">
<div class="flex flex-col xl:flex-row xl:items-center justify-between gap-space-md">
<div class="relative flex-1">
<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
<input v-model="trxSearch" class="w-full h-10 pl-10 pr-space-md rounded-xl bg-surface-container-low font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Rechercher par utilisateur, email, description..." type="text"/>
</div>
<div class="flex flex-wrap items-center gap-space-sm">
<select v-model="trxType" class="h-10 pl-3 pr-8 rounded-xl bg-surface-container-low font-body-sm text-body-sm text-on-surface focus:outline-none">
<option value="">Tous les types</option>
<option v-for="t in TRX_TYPE_OPTIONS" :key="t.value" :value="t.value">{{ t.label }}</option>
</select>
<select v-model="trxStatus" class="h-10 pl-3 pr-8 rounded-xl bg-surface-container-low font-body-sm text-body-sm text-on-surface focus:outline-none">
<option value="">Tous les statuts</option>
<option v-for="s in TRX_STATUS_OPTIONS" :key="s.value" :value="s.value">{{ s.label }}</option>
</select>
</div>
</div>
<div class="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pt-space-xs">
<div class="flex flex-wrap items-center gap-1.5">
<div class="flex items-center gap-1.5 bg-surface-container-low px-2 py-1 rounded-xl">
<span class="font-label-sm text-label-sm text-secondary">Du</span>
<input v-model="trxDateFrom" class="w-28 h-7 text-center font-body-sm text-label-md rounded bg-surface-container-lowest text-on-surface focus:outline-none" type="date"/>
<span class="font-label-sm text-label-sm text-secondary">Au</span>
<input v-model="trxDateTo" class="w-28 h-7 text-center font-body-sm text-label-md rounded bg-surface-container-lowest text-on-surface focus:outline-none" type="date"/>
</div>
</div>
<div class="flex items-center gap-space-sm text-right">
<div class="font-label-sm text-label-sm text-secondary">Résultats : <span class="font-semibold text-on-surface">{{ trxTotal }}</span> flux</div>
<div class="h-3 w-px bg-outline-variant"></div>
<div class="font-label-sm text-label-sm text-secondary">Volume page : <span class="font-semibold text-primary">{{ fmt(trxTotalAmount) }} EC</span></div>
</div>
</div>
</div>

<div class="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
<div v-if="trxLoading" class="p-space-lg space-y-space-sm">
<div v-for="n in 5" :key="n" class="h-10 rounded-lg bg-surface-container-low animate-pulse"></div>
</div>
<div v-else-if="transactions.length === 0" class="text-center py-12 text-secondary">
<span class="material-symbols-outlined text-[40px] mb-2 block opacity-30">sync_alt</span>
<p class="font-body-md text-body-md font-medium">Aucune transaction trouvée</p>
</div>
<div v-else class="overflow-x-auto">
<table class="w-full text-left border-collapse">
<thead>
<tr class="bg-surface-container-low text-secondary font-label-md text-label-md uppercase tracking-wider">
<th class="py-3.5 px-space-md font-semibold">Utilisateur</th>
<th class="py-3.5 px-space-md font-semibold">Type</th>
<th class="py-3.5 px-space-md font-semibold">Description</th>
<th class="py-3.5 px-space-md font-semibold text-right">Montant</th>
<th class="py-3.5 px-space-md font-semibold">Date</th>
<th class="py-3.5 px-space-md font-semibold text-center">Statut</th>
</tr>
</thead>
<tbody class="divide-y divide-surface-container-low text-body-sm">
<tr v-for="row in transactions" :key="row.id" class="hover:bg-surface-container-low/60 transition-colors">
<td class="py-3 px-space-md">
<div v-if="row.user" class="min-w-0">
<div class="font-headline-sm text-body-sm font-semibold text-on-surface truncate">{{ row.user.username }}</div>
<div class="font-label-sm text-label-sm text-secondary truncate">{{ row.user.email }}</div>
</div>
<span v-else class="text-secondary">—</span>
</td>
<td class="py-3 px-space-md"><span class="px-2 py-0.5 rounded-full bg-surface-container text-on-surface font-label-sm text-label-sm font-bold capitalize">{{ row.transactionType }}</span></td>
<td class="py-3 px-space-md"><p class="text-on-surface line-clamp-2">{{ row.description || '—' }}</p></td>
<td class="py-3 px-space-md text-right font-headline-sm text-body-md font-bold text-on-surface">{{ fmt(row.amount) }} EC</td>
<td class="py-3 px-space-md text-secondary whitespace-nowrap">{{ formatDate(row.createdAt) }}</td>
<td class="py-3 px-space-md text-center"><span class="inline-flex items-center px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-semibold capitalize" :class="TRX_BADGE[row.status] ?? 'bg-surface-container text-secondary'">{{ row.status }}</span></td>
</tr>
</tbody>
</table>
</div>
<div v-if="trxTotal > 0" class="px-space-md py-space-sm bg-surface-container-low flex items-center justify-between gap-space-sm">
<span class="font-label-sm text-label-sm text-secondary">Page {{ trxPage }} sur {{ trxTotalPages }} — {{ trxTotal }} écritures</span>
<div class="flex items-center gap-1">
<button class="w-8 h-8 rounded-lg bg-surface-container-lowest text-secondary hover:text-on-surface flex items-center justify-center disabled:opacity-40 transition-colors" :disabled="trxPage <= 1" type="button" @click="trxPage--; loadTransactions()"><span class="material-symbols-outlined text-[18px]">chevron_left</span></button>
<button class="w-8 h-8 rounded-lg bg-primary text-on-primary font-headline-sm text-label-md flex items-center justify-center" type="button">{{ trxPage }}</button>
<button class="w-8 h-8 rounded-lg bg-surface-container-lowest text-secondary hover:text-on-surface flex items-center justify-center disabled:opacity-40 transition-colors" :disabled="trxPage >= trxTotalPages" type="button" @click="trxPage++; loadTransactions()"><span class="material-symbols-outlined text-[18px]">chevron_right</span></button>
</div>
</div>
</div>
</div>

<!-- TAB RETRAITS -->
<div v-show="mainTab === 'retraits'" class="space-y-space-md">
<div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col lg:flex-row lg:items-center gap-space-sm">
<div class="relative flex-1">
<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
<input v-model="retraitSearch" class="w-full h-10 pl-10 pr-space-md rounded-xl bg-surface-container-low font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none" placeholder="Rechercher..." type="text"/>
</div>
<select v-model="retraitStatus" class="h-10 pl-3 pr-8 rounded-xl bg-surface-container-low font-body-sm text-body-sm text-on-surface focus:outline-none">
<option value="">Tous les statuts</option>
<option v-for="s in TRX_STATUS_OPTIONS" :key="s.value" :value="s.value">{{ s.label }}</option>
</select>
</div>

<div class="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
<div v-if="retraitLoading" class="p-space-lg space-y-space-sm">
<div v-for="n in 5" :key="n" class="h-10 rounded-lg bg-surface-container-low animate-pulse"></div>
</div>
<div v-else-if="retraits.length === 0" class="text-center py-12 text-secondary">
<span class="material-symbols-outlined text-[40px] mb-2 block opacity-30">outbox</span>
<p class="font-body-md text-body-md font-medium">Aucun retrait trouvé</p>
</div>
<div v-else class="overflow-x-auto">
<table class="w-full text-left border-collapse">
<thead>
<tr class="bg-surface-container-low text-secondary font-label-md text-label-md uppercase tracking-wider">
<th class="py-3.5 px-space-md font-semibold">Demandeur</th>
<th class="py-3.5 px-space-md font-semibold text-right">Montant</th>
<th class="py-3.5 px-space-md font-semibold text-right">Frais (transaction / agent)</th>
<th class="py-3.5 px-space-md font-semibold">Agent cible</th>
<th class="py-3.5 px-space-md font-semibold">Date</th>
<th class="py-3.5 px-space-md font-semibold text-center">Statut</th>
</tr>
</thead>
<tbody class="divide-y divide-surface-container-low text-body-sm">
<tr v-for="row in retraits" :key="row.id" class="hover:bg-surface-container-low/60 transition-colors">
<td class="py-3 px-space-md">
<div v-if="row.sender" class="min-w-0">
<div class="font-headline-sm text-body-sm font-semibold text-on-surface truncate">{{ row.sender.username }}</div>
<div class="font-label-sm text-label-sm text-secondary truncate">{{ row.sender.email }}</div>
</div>
<span v-else class="text-secondary">ID: {{ row.id }}</span>
</td>
<td class="py-3 px-space-md text-right">
<div class="font-headline-sm text-body-md font-bold text-on-surface">{{ fmt(row.amount) }} EC</div>
<div v-if="row.currency === 'CDF'" class="font-label-sm text-label-sm text-primary">{{ fmt(row.convertedAmount) }} FC</div>
</td>
<td class="py-3 px-space-md text-right font-label-sm text-label-sm text-secondary">{{ fmt(row.fraisTransaction) }} EC / {{ fmt(row.fraisAgent) }} EC</td>
<td class="py-3 px-space-md font-mono text-label-sm text-secondary">{{ row.targetId ?? '—' }}</td>
<td class="py-3 px-space-md text-secondary whitespace-nowrap">{{ formatDate(row.createdAt) }}</td>
<td class="py-3 px-space-md text-center"><span class="inline-flex items-center px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-semibold capitalize" :class="TRX_BADGE[row.status] ?? 'bg-surface-container text-secondary'">{{ row.status }}</span></td>
</tr>
</tbody>
</table>
</div>
<div v-if="retraitTotal > 0" class="px-space-md py-space-sm bg-surface-container-low flex items-center justify-between gap-space-sm">
<span class="font-label-sm text-label-sm text-secondary">Page {{ retraitPage }} sur {{ retraitTotalPages }} — {{ retraitTotal }} retraits</span>
<div class="flex items-center gap-1">
<button class="w-8 h-8 rounded-lg bg-surface-container-lowest text-secondary hover:text-on-surface flex items-center justify-center disabled:opacity-40 transition-colors" :disabled="retraitPage <= 1" type="button" @click="retraitPage--; loadRetraits()"><span class="material-symbols-outlined text-[18px]">chevron_left</span></button>
<button class="w-8 h-8 rounded-lg bg-primary text-on-primary font-headline-sm text-label-md flex items-center justify-center" type="button">{{ retraitPage }}</button>
<button class="w-8 h-8 rounded-lg bg-surface-container-lowest text-secondary hover:text-on-surface flex items-center justify-center disabled:opacity-40 transition-colors" :disabled="retraitPage >= retraitTotalPages" type="button" @click="retraitPage++; loadRetraits()"><span class="material-symbols-outlined text-[18px]">chevron_right</span></button>
</div>
</div>
</div>
</div>

<!-- TAB PAIEMENTS -->
<div v-show="mainTab === 'paiements'" class="space-y-space-md">
<div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm">
<div class="relative flex-1">
<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
<input v-model="paiementSearch" class="w-full h-10 pl-10 pr-space-md rounded-xl bg-surface-container-low font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none" placeholder="Rechercher..." type="text"/>
</div>
</div>

<div class="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
<div v-if="paiementLoading" class="p-space-lg space-y-space-sm">
<div v-for="n in 5" :key="n" class="h-10 rounded-lg bg-surface-container-low animate-pulse"></div>
</div>
<div v-else-if="paiements.length === 0" class="text-center py-12 text-secondary">
<span class="material-symbols-outlined text-[40px] mb-2 block opacity-30">shopping_cart_checkout</span>
<p class="font-body-md text-body-md font-medium">Aucun paiement trouvé</p>
</div>
<div v-else class="overflow-x-auto">
<table class="w-full text-left border-collapse">
<thead>
<tr class="bg-surface-container-low text-secondary font-label-md text-label-md uppercase tracking-wider">
<th class="py-3.5 px-space-md font-semibold">Payeur</th>
<th class="py-3.5 px-space-md font-semibold">Entreprise</th>
<th class="py-3.5 px-space-md font-semibold">Produit</th>
<th class="py-3.5 px-space-md font-semibold text-right">Montant</th>
<th class="py-3.5 px-space-md font-semibold">Date</th>
</tr>
</thead>
<tbody class="divide-y divide-surface-container-low text-body-sm">
<tr v-for="row in paiements" :key="row.id" class="hover:bg-surface-container-low/60 transition-colors">
<td class="py-3 px-space-md">
<div v-if="row.payer" class="min-w-0">
<div class="font-headline-sm text-body-sm font-semibold text-on-surface truncate">{{ row.payer.username }}</div>
<div class="font-label-sm text-label-sm text-secondary truncate">{{ row.payer.email }}</div>
</div>
<span v-else class="text-secondary">—</span>
</td>
<td class="py-3 px-space-md"><span v-if="row.company?.name" class="px-2 py-0.5 rounded-full bg-surface-container text-on-surface font-label-sm text-label-sm font-bold">{{ row.company.name }}</span><span v-else class="text-secondary">—</span></td>
<td class="py-3 px-space-md">{{ row.product?.name ?? '—' }}</td>
<td class="py-3 px-space-md text-right font-headline-sm text-body-md font-bold text-on-surface">{{ fmt(row.amount) }} EC</td>
<td class="py-3 px-space-md text-secondary whitespace-nowrap">{{ formatDate(row.createdAt) }}</td>
</tr>
</tbody>
</table>
</div>
<div v-if="paiementTotal > 0" class="px-space-md py-space-sm bg-surface-container-low flex items-center justify-between gap-space-sm">
<span class="font-label-sm text-label-sm text-secondary">Page {{ paiementPage }} sur {{ paiementTotalPages }} — {{ paiementTotal }} paiements</span>
<div class="flex items-center gap-1">
<button class="w-8 h-8 rounded-lg bg-surface-container-lowest text-secondary hover:text-on-surface flex items-center justify-center disabled:opacity-40 transition-colors" :disabled="paiementPage <= 1" type="button" @click="paiementPage--; loadPaiements()"><span class="material-symbols-outlined text-[18px]">chevron_left</span></button>
<button class="w-8 h-8 rounded-lg bg-primary text-on-primary font-headline-sm text-label-md flex items-center justify-center" type="button">{{ paiementPage }}</button>
<button class="w-8 h-8 rounded-lg bg-surface-container-lowest text-secondary hover:text-on-surface flex items-center justify-center disabled:opacity-40 transition-colors" :disabled="paiementPage >= paiementTotalPages" type="button" @click="paiementPage++; loadPaiements()"><span class="material-symbols-outlined text-[18px]">chevron_right</span></button>
</div>
</div>
</div>
</div>
</div>
</div>
</template>
