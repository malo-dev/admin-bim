<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import apiClient from '@/api/client'
import { useToast } from '@/composables/useToast'

const toast = useToast()

const STATUS_TABS = [
  { label: 'En attente', value: 'pending' },
  { label: 'Approuvées', value: 'success' },
  { label: 'Rejetées', value: 'failed' },
  { label: 'Toutes', value: '' }
]
const statusFilter = ref('pending')

const QUICK_PERIODS = [
  { label: "Aujourd'hui", value: 'today' },
  { label: 'Hier', value: 'yesterday' },
  { label: 'Semaine', value: 'week' },
  { label: 'Mois', value: 'month' }
]
const quickPeriod = ref('')
const dateFrom = ref('')
const dateTo = ref('')

function fmtDateInput(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function applyQuickPeriod(period) {
  quickPeriod.value = period
  const today = new Date()
  if (period === 'today') {
    dateFrom.value = fmtDateInput(today)
    dateTo.value = fmtDateInput(today)
  } else if (period === 'yesterday') {
    const y = new Date(today)
    y.setDate(y.getDate() - 1)
    dateFrom.value = fmtDateInput(y)
    dateTo.value = fmtDateInput(y)
  } else if (period === 'week') {
    const start = new Date(today)
    const dow = (start.getDay() + 6) % 7
    start.setDate(start.getDate() - dow)
    dateFrom.value = fmtDateInput(start)
    dateTo.value = fmtDateInput(today)
  } else if (period === 'month') {
    dateFrom.value = fmtDateInput(new Date(today.getFullYear(), today.getMonth(), 1))
    dateTo.value = fmtDateInput(today)
  }
}

const searchInput = ref('')
const currentPage = ref(1)
const pageSize = ref(9)
const recharges = ref([])
const total = ref(0)
const totalAmount = ref(null)
const loading = ref(false)

async function loadRecharges() {
  loading.value = true
  try {
    const { data } = await apiClient.get('/tsx/admin/recharges', {
      params: { search: searchInput.value || undefined, status: statusFilter.value || undefined, startDate: dateFrom.value || undefined, endDate: dateTo.value || undefined, page: currentPage.value, pageSize: pageSize.value }
    })
    recharges.value = data?.data ?? (Array.isArray(data) ? data : [])
    total.value = data?.total ?? recharges.value.length
    totalAmount.value = data?.totalAmount ?? null
  } catch {
    toast.error('Impossible de charger les demandes de recharge.')
  } finally {
    loading.value = false
  }
}
let searchDebounce = null
watch([searchInput, statusFilter, dateFrom, dateTo], () => {
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    currentPage.value = 1
    loadRecharges()
  }, 400)
})
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
function goToPage(p) {
  if (p < 1 || p > totalPages.value) return
  currentPage.value = p
  loadRecharges()
}
const pendingCount = computed(() => recharges.value.filter((r) => r.status === 'pending').length)

function rowId(row) {
  return row.transactionRechargeId ?? row.id ?? row.tsxId
}
function fmtAmount(row) {
  return Number(row.amount ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' EC'
}
function fmtDate(d) {
  return d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
}
const STATUS_LABEL = { pending: 'En attente', success: 'Approuvée', failed: 'Rejetée' }
const STATUS_BADGE = { pending: 'bg-tertiary-fixed text-tertiary-container', success: 'bg-primary-fixed text-primary', failed: 'bg-error-container text-on-error-container' }
function initials(name) {
  return name ? name[0].toUpperCase() : '?'
}

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

const actionId = ref(null)
async function approve(row) {
  if (!window.confirm(`Approuver la recharge de ${fmtAmount(row)} pour ${row.user?.username ?? row.user?.email ?? 'cet utilisateur'} ? Cette action créditera immédiatement son compte.`)) return
  actionId.value = rowId(row)
  try {
    await apiClient.patch(`/tsx/admin/recharges/${rowId(row)}/approve`)
    toast.success(`${fmtAmount(row)} crédité.`)
    await loadRecharges()
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  } finally {
    actionId.value = null
  }
}

const rejectDialog = ref(false)
const rejectReason = ref('')
const rejectTarget = ref(null)
const rejecting = ref(false)
function openReject(row) {
  rejectTarget.value = row
  rejectReason.value = ''
  rejectDialog.value = true
}
async function submitReject() {
  rejecting.value = true
  actionId.value = rowId(rejectTarget.value)
  try {
    await apiClient.patch(`/tsx/admin/recharges/${rowId(rejectTarget.value)}/reject`, { reason: rejectReason.value.trim() || "Demande refusée par l'administrateur" })
    toast.success(`Notification envoyée à ${rejectTarget.value.user?.email ?? "l'utilisateur"}.`)
    rejectDialog.value = false
    await loadRecharges()
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  } finally {
    rejecting.value = false
    actionId.value = null
  }
}

async function reverse(row) {
  if (!window.confirm(`Annuler l'approbation de ${fmtAmount(row)} pour ${row.user?.username ?? 'cet utilisateur'} ? Ce montant sera retiré de son compte.`)) return
  actionId.value = rowId(row)
  try {
    await apiClient.patch(`/tsx/admin/recharges/${rowId(row)}/reverse`)
    toast.success(`${fmtAmount(row)} retiré du compte.`)
    await loadRecharges()
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  } finally {
    actionId.value = null
  }
}

async function verify(row) {
  if (!row.reference) {
    toast.warn("Cette demande n'a pas de référence FlexPay.")
    return
  }
  actionId.value = rowId(row)
  try {
    const { data } = await apiClient.post('/tsx/recharge/verify', { reference: row.reference })
    const soldeTxt = data?.solde != null ? ` — solde actuel : ${Number(data.solde).toLocaleString('fr-FR')} EC` : ''
    const MSG = {
      already_done: `Ce paiement était déjà crédité.${soldeTxt}`,
      success: `FlexPay confirme le paiement — compte crédité.${soldeTxt}`,
      cancelled: 'FlexPay indique que ce paiement a été refusé/annulé.',
      pending: "FlexPay n'a pas encore confirmé ce paiement, réessayez plus tard."
    }
    toast.success(MSG[data?.status] ?? data?.message ?? 'Statut inconnu.')
    await loadRecharges()
  } catch (err) {
    toast.error(err?.response?.data?.message ?? "Impossible de vérifier — ce n'est peut-être pas une recharge FlexPay automatique.")
  } finally {
    actionId.value = null
  }
}

onMounted(() => {
  loadRecharges()
  loadCdfRate()
})
</script>

<template>
<div class="flex flex-col w-full">
<div class="bg-surface-container-lowest px-space-lg pt-space-lg shadow-sm">
<div class="flex flex-col md:flex-row md:items-center justify-between gap-space-md mb-space-md">
<div class="flex items-center gap-space-sm">
<div class="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-primary-container"><span class="material-symbols-outlined text-[22px]" style="font-variation-settings: 'FILL' 1;">account_balance_wallet</span></div>
<div>
<div class="flex items-center gap-space-xs">
<span class="font-headline-sm text-headline-sm text-secondary">Finance &amp; Support</span>
<span class="text-outline text-label-sm">/</span>
<span class="font-headline-sm text-headline-sm text-on-surface font-semibold">Trésorerie des Utilisateurs</span>
</div>
<p class="font-body-sm text-body-sm text-secondary">Arbitrage des entrées financières, flux mobile money et validation des crédits EC</p>
</div>
</div>
</div>
<div class="flex items-center gap-space-xs overflow-x-auto no-scrollbar pt-1">
<RouterLink class="px-space-md py-3 font-label-md text-label-md text-secondary hover:text-on-surface transition-colors whitespace-nowrap flex items-center gap-1.5" to="/transactions">
<span class="material-symbols-outlined text-[18px]">swap_horiz</span><span>Transactions</span>
</RouterLink>
<a class="px-space-md py-3 font-label-md text-label-md text-primary-container font-semibold whitespace-nowrap flex items-center gap-1.5 bg-surface-container-low rounded-t-lg" href="#">
<span class="material-symbols-outlined text-[18px]" style="font-variation-settings: 'FILL' 1;">add_card</span><span>Recharges</span>
<span class="px-1.5 py-0.5 rounded-full bg-primary-container text-on-primary text-[10px] font-bold">{{ total }}</span>
</a>
<RouterLink class="px-space-md py-3 font-label-md text-label-md text-secondary hover:text-on-surface transition-colors whitespace-nowrap flex items-center gap-1.5" to="/portefeuilles">
<span class="material-symbols-outlined text-[18px]">account_balance_wallet</span><span>Portefeuilles</span>
</RouterLink>
<RouterLink class="px-space-md py-3 font-label-md text-label-md text-secondary hover:text-on-surface transition-colors whitespace-nowrap flex items-center gap-1.5" to="/statistiques">
<span class="material-symbols-outlined text-[18px]">query_stats</span><span>Statistiques financières</span>
</RouterLink>
<RouterLink class="px-space-md py-3 font-label-md text-label-md text-secondary hover:text-on-surface transition-colors whitespace-nowrap flex items-center gap-1.5" to="/recharges/rapprochement">
<span class="material-symbols-outlined text-[18px]">fact_check</span><span>Rapprochement</span>
</RouterLink>
</div>
</div>

<div class="px-space-lg py-space-lg space-y-space-lg max-w-[1600px] w-full mx-auto">
<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
<div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between">
<div class="flex items-center justify-between mb-space-sm">
<span class="font-label-md text-label-md uppercase tracking-wider text-secondary font-semibold">Total en attente</span>
<span class="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary-container"><span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' 1;">pending_actions</span></span>
</div>
<div class="flex items-baseline gap-2">
<span class="font-numeric-kpi text-numeric-kpi text-on-surface font-bold">{{ statusFilter === 'pending' ? total : pendingCount }}</span>
<span v-if="statusFilter === 'pending' && totalAmount != null" class="font-headline-sm text-headline-sm text-primary-container font-semibold">{{ Number(totalAmount).toLocaleString('fr-FR') }} EC</span>
</div>
</div>
<div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between">
<div class="flex items-center justify-between mb-space-sm">
<span class="font-label-md text-label-md uppercase tracking-wider text-secondary font-semibold">Résultats filtrés</span>
<span class="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-primary"><span class="material-symbols-outlined text-[20px]">task_alt</span></span>
</div>
<div class="flex items-baseline gap-2">
<span class="font-numeric-kpi text-numeric-kpi text-on-surface font-bold">{{ total }}</span>
<span v-if="totalAmount != null" class="font-headline-sm text-headline-sm text-secondary font-medium">{{ Number(totalAmount).toLocaleString('fr-FR') }} EC</span>
</div>
</div>
<div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between">
<div class="flex items-center justify-between mb-space-sm">
<span class="font-label-md text-label-md uppercase tracking-wider text-secondary font-semibold">Taux officiel</span>
<span class="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-secondary"><span class="material-symbols-outlined text-[20px]">currency_exchange</span></span>
</div>
<div class="flex items-baseline gap-2">
<span class="font-headline-sm text-headline-sm text-on-surface font-bold">1 EC = {{ cdfRate ? cdfRate.toLocaleString('fr-FR') : '—' }} FC</span>
</div>
</div>
<div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between">
<div class="flex items-center justify-between mb-space-sm">
<span class="font-label-md text-label-md uppercase tracking-wider text-secondary font-semibold">Page</span>
<span class="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-primary"><span class="material-symbols-outlined text-[20px]">layers</span></span>
</div>
<div class="flex items-baseline gap-2">
<span class="font-numeric-kpi text-numeric-kpi text-on-surface font-bold">{{ currentPage }} / {{ totalPages }}</span>
</div>
</div>
</div>

<div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm space-y-space-md">
<div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-space-md pb-space-xs">
<div class="flex items-center gap-space-xs flex-wrap">
<button v-for="s in STATUS_TABS" :key="s.value" class="px-space-md py-1.5 rounded-lg font-label-md text-label-md font-semibold transition-colors" :class="statusFilter === s.value ? 'bg-primary-container text-on-primary shadow-sm' : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant font-medium'" type="button" @click="statusFilter = s.value">{{ s.label }}</button>
</div>
<div class="flex items-center gap-space-xs flex-wrap w-full lg:w-auto">
<div class="inline-flex p-1 bg-surface-container rounded-lg">
<button v-for="p in QUICK_PERIODS" :key="p.value" class="px-space-sm py-1 rounded font-label-sm text-label-sm transition-colors" :class="quickPeriod === p.value ? 'bg-surface-container-lowest text-on-surface font-semibold shadow-xs' : 'text-secondary hover:text-on-surface font-medium'" type="button" @click="applyQuickPeriod(p.value)">{{ p.label }}</button>
</div>
<div class="flex items-center gap-1 text-secondary text-body-sm bg-surface-container-low px-space-sm py-1.5 rounded-lg">
<input v-model="dateFrom" class="bg-transparent font-body-sm text-body-sm text-on-surface focus:outline-none w-28" type="date" @change="quickPeriod = ''"/>
<span class="font-label-sm text-label-sm text-outline">→</span>
<input v-model="dateTo" class="bg-transparent font-body-sm text-body-sm text-on-surface focus:outline-none w-28" type="date" @change="quickPeriod = ''"/>
</div>
</div>
</div>
<div class="flex flex-col sm:flex-row items-center justify-between gap-space-md pt-2">
<div class="relative w-full sm:max-w-xl">
<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
<input v-model="searchInput" class="w-full h-10 pl-10 pr-space-md rounded-lg bg-surface-container-low text-on-surface placeholder:text-outline font-body-sm text-body-sm focus:outline-none" placeholder="Rechercher par nom, téléphone, référence..." type="text"/>
</div>
<div class="flex items-center justify-between sm:justify-end gap-space-md w-full sm:w-auto">
<span class="font-label-md text-label-md text-secondary"><strong class="text-on-surface">{{ total }}</strong> demandes trouvées <template v-if="totalAmount != null">• Total : <strong class="text-primary-container">{{ Number(totalAmount).toLocaleString('fr-FR') }} EC</strong></template></span>
<button class="p-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-secondary hover:text-on-surface transition-colors" title="Actualiser le flux" type="button" @click="loadRecharges">
<span class="material-symbols-outlined text-[18px]" :class="{ 'animate-spin': loading }">refresh</span>
</button>
</div>
</div>
</div>

<div class="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
<div class="lg:col-span-9 space-y-space-md">
<div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-md">
<div v-for="n in 6" :key="n" class="h-56 rounded-xl bg-surface-container-lowest animate-pulse"></div>
</div>
<div v-else-if="recharges.length === 0" class="bg-surface-container-lowest rounded-xl p-space-xl text-center text-secondary">
<span class="material-symbols-outlined text-[40px] mb-2 block opacity-30">inbox</span>
<p class="font-body-md text-body-md font-medium">Aucune demande trouvée</p>
</div>
<div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-md">
<div v-for="row in recharges" :key="rowId(row)" class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
<div class="absolute top-0 left-0 right-0 h-1" :class="row.status === 'pending' ? 'bg-primary-container' : row.status === 'failed' ? 'bg-error' : 'bg-primary'"></div>
<div>
<div class="flex items-start justify-between gap-2 mb-space-sm">
<div class="flex items-center gap-space-xs">
<div class="w-9 h-9 rounded-full bg-surface-container-high text-primary-container font-headline-sm text-body-sm font-bold flex items-center justify-center">{{ initials(row.user?.username) }}</div>
<div>
<h4 class="font-headline-sm text-body-sm font-semibold text-on-surface leading-tight">{{ row.user?.username ?? '—' }}</h4>
<span class="font-label-sm text-label-sm text-secondary truncate block max-w-[150px]">{{ row.user?.email ?? '—' }}</span>
</div>
</div>
<span class="px-2 py-0.5 rounded-full font-label-sm text-label-sm font-bold shrink-0" :class="STATUS_BADGE[row.status] ?? 'bg-surface-container text-secondary'">{{ STATUS_LABEL[row.status] ?? row.status }}</span>
</div>
<div class="p-space-sm rounded-lg bg-surface-container-low mb-space-sm space-y-1">
<div class="flex items-center justify-between text-body-sm">
<span class="text-secondary font-label-sm text-label-sm">Moyen :</span>
<span class="font-semibold text-on-surface font-body-sm text-body-sm">{{ row.telephone ?? row.paymentMethod ?? '—' }}</span>
</div>
<div class="flex items-center justify-between text-body-sm">
<span class="text-secondary font-label-sm text-label-sm">Référence :</span>
<span class="font-mono text-xs font-semibold text-primary">{{ row.reference ?? '—' }}</span>
</div>
<div class="flex items-center justify-between text-body-sm">
<span class="text-secondary font-label-sm text-label-sm">Horodatage :</span>
<span class="text-secondary font-body-sm text-body-sm">{{ fmtDate(row.createdAt) }}</span>
</div>
</div>
<div class="flex items-baseline justify-between mb-space-md">
<span class="font-label-md text-label-md uppercase tracking-wider text-secondary">Montant</span>
<div class="text-right">
<span class="font-headline-lg text-headline-lg text-on-surface font-bold">{{ fmtAmount(row) }}</span>
<span v-if="row.currency === 'CDF'" class="block font-label-sm text-label-sm text-secondary">{{ Number(row.convertedAmount ?? 0).toLocaleString('fr-FR') }} FC</span>
</div>
</div>
</div>
<div class="space-y-space-xs pt-2">
<template v-if="row.status === 'pending'">
<button class="w-full py-1.5 px-space-sm rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm flex items-center justify-center gap-1 transition-colors disabled:opacity-50" type="button" :disabled="actionId === rowId(row)" @click="verify(row)">
<span class="material-symbols-outlined text-[16px] text-primary">sync</span><span>Vérifier avec FlexPay</span>
</button>
<div class="grid grid-cols-2 gap-space-xs">
<button class="py-2 px-space-sm rounded-lg bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md font-semibold flex items-center justify-center gap-1 transition-all shadow-sm disabled:opacity-50" type="button" :disabled="actionId === rowId(row)" @click="approve(row)">
<span class="material-symbols-outlined text-[16px]">check</span><span>Valider</span>
</button>
<button class="py-2 px-space-sm rounded-lg bg-surface-container-low hover:bg-error-container text-tertiary font-label-md text-label-md font-semibold flex items-center justify-center gap-1 transition-colors disabled:opacity-50" type="button" :disabled="actionId === rowId(row)" @click="openReject(row)">
<span class="material-symbols-outlined text-[16px]">close</span><span>Rejeter</span>
</button>
</div>
</template>
<button v-else-if="row.status === 'success'" class="w-full py-2 px-space-sm rounded-lg bg-surface-container-low hover:bg-error-container text-error font-label-md text-label-md font-semibold flex items-center justify-center gap-1 transition-colors disabled:opacity-50" type="button" :disabled="actionId === rowId(row)" @click="reverse(row)">
<span class="material-symbols-outlined text-[16px]">undo</span><span>Désapprouver</span>
</button>
</div>
</div>
</div>

<div v-if="total > 0" class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-space-md">
<div class="text-secondary font-body-sm text-body-sm">Page <strong class="text-on-surface">{{ currentPage }}</strong> sur <strong class="text-on-surface">{{ totalPages }}</strong> — {{ total }} demandes</div>
<div class="flex items-center gap-1">
<button class="w-8 h-8 rounded-lg bg-surface-container text-secondary hover:bg-surface-container-high flex items-center justify-center disabled:opacity-40 transition-colors" :disabled="currentPage <= 1" type="button" @click="goToPage(currentPage - 1)"><span class="material-symbols-outlined text-[18px]">chevron_left</span></button>
<button class="w-8 h-8 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md font-semibold flex items-center justify-center shadow-xs" type="button">{{ currentPage }}</button>
<button class="w-8 h-8 rounded-lg bg-surface-container text-secondary hover:bg-surface-container-high flex items-center justify-center disabled:opacity-40 transition-colors" :disabled="currentPage >= totalPages" type="button" @click="goToPage(currentPage + 1)"><span class="material-symbols-outlined text-[18px]">chevron_right</span></button>
</div>
</div>
</div>

<div class="lg:col-span-3 space-y-space-md">
<div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm space-y-space-md">
<div class="flex items-center gap-space-xs text-primary font-headline-sm text-body-lg font-semibold"><span class="material-symbols-outlined text-[20px]">currency_exchange</span><span>Règles de Conversion</span></div>
<div class="p-space-sm rounded-lg bg-surface-container-low space-y-2">
<div class="flex items-center justify-between text-body-sm"><span class="text-secondary">Taux officiel garanti</span><span class="font-bold text-on-surface">1 EC = {{ cdfRate ? cdfRate.toLocaleString('fr-FR') : '—' }} FC</span></div>
</div>
<p class="font-body-sm text-body-sm text-secondary">Tout crédit approuvé est instantanément transféré dans le portefeuille utilisateur BIM NEXT.</p>
</div>
<div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm space-y-space-sm">
<div class="flex items-center gap-space-xs text-on-surface font-headline-sm text-body-md font-semibold"><span class="material-symbols-outlined text-[20px] text-primary">security</span><span>Vérification des paiements</span></div>
<div class="space-y-space-xs text-body-sm">
<div class="flex items-start gap-2"><span class="material-symbols-outlined text-[16px] text-primary mt-0.5">check_circle</span><span class="text-secondary">Le bouton « Vérifier avec FlexPay » interroge directement la passerelle avant de créditer.</span></div>
<div class="flex items-start gap-2"><span class="material-symbols-outlined text-[16px] text-primary mt-0.5">check_circle</span><span class="text-secondary">Une recharge approuvée peut être désapprouvée pour retirer le montant du compte.</span></div>
</div>
</div>
</div>
</div>
</div>

<!-- Dialog Rejeter -->
<div v-if="rejectDialog" class="fixed inset-0 z-[90] flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm p-4" @click.self="rejectDialog = false">
<div class="w-full max-w-md bg-white rounded-2xl shadow-xl p-space-lg space-y-space-md">
<h2 class="font-headline-md text-headline-md font-bold text-on-surface">Rejeter la demande de recharge</h2>
<div v-if="rejectTarget" class="rounded-xl bg-error-container/40 p-space-md flex justify-between items-start">
<div>
<p class="font-bold text-on-surface">{{ rejectTarget.user?.username ?? '—' }}</p>
<p class="font-label-sm text-label-sm text-secondary">{{ rejectTarget.user?.email }}</p>
</div>
<p class="font-bold text-error text-headline-sm">{{ fmtAmount(rejectTarget) }}</p>
</div>
<div>
<label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Motif du rejet</label>
<textarea v-model="rejectReason" class="w-full px-space-md py-2 rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" placeholder="Ex: Justificatif insuffisant, montant non reconnu..." rows="3"></textarea>
<p class="font-label-sm text-label-sm text-tertiary-container mt-1">L'utilisateur recevra une notification push et un email avec ce motif.</p>
</div>
<div class="flex justify-end gap-space-sm pt-space-sm">
<button class="h-10 px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm font-medium" type="button" :disabled="rejecting" @click="rejectDialog = false">Annuler</button>
<button class="h-10 px-space-md rounded-lg bg-error text-on-error font-body-sm text-body-sm font-semibold disabled:opacity-60" type="button" :disabled="rejecting" @click="submitReject">{{ rejecting ? 'Rejet…' : 'Rejeter la demande' }}</button>
</div>
</div>
</div>
</div>
</template>
