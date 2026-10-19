<script setup>
import { computed, onMounted, ref } from 'vue'
import apiClient from '@/api/client'
import { useToast } from '@/composables/useToast'

const toast = useToast()

const recharges = ref([])
const total = ref(0)
const totalAmount = ref(null)
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(9)

async function loadPending() {
  loading.value = true
  try {
    const { data } = await apiClient.get('/tsx/admin/recharges', { params: { status: 'pending', page: currentPage.value, pageSize: pageSize.value } })
    recharges.value = data?.data ?? (Array.isArray(data) ? data : [])
    total.value = data?.total ?? recharges.value.length
    totalAmount.value = data?.totalAmount ?? null
  } catch {
    toast.error('Impossible de charger les demandes de recharge.')
  } finally {
    loading.value = false
  }
}
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
function goToPage(p) {
  if (p < 1 || p > totalPages.value) return
  currentPage.value = p
  loadPending()
}

function rowId(row) {
  return row.transactionRechargeId ?? row.id ?? row.tsxId
}
function initials(name) {
  return name ? name[0].toUpperCase() : '?'
}
function fmtDate(d) {
  return d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
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

const actionId = ref(null)
async function approve(row) {
  actionId.value = rowId(row)
  try {
    await apiClient.patch(`/tsx/admin/recharges/${rowId(row)}/approve`)
    toast.success(`${row.amount} EC crédité à ${row.user?.username ?? "l'utilisateur"}.`)
    await loadPending()
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  } finally {
    actionId.value = null
  }
}
async function reject(row) {
  if (!window.confirm(`Rejeter la demande de recharge de ${row.user?.username ?? 'cet utilisateur'} ?`)) return
  actionId.value = rowId(row)
  try {
    await apiClient.patch(`/tsx/admin/recharges/${rowId(row)}/reject`, { reason: 'Rejeté lors du rapprochement mobile money' })
    toast.success('Demande rejetée — utilisateur notifié.')
    await loadPending()
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  } finally {
    actionId.value = null
  }
}

/* Drawer de rapprochement / vérification FlexPay */
const verification = ref(null)
const verifying = ref(false)
const verifyResult = ref(null)
function openVerificationModal(row) {
  verification.value = row
  verifyResult.value = null
}
function closeVerificationModal() {
  verification.value = null
  verifyResult.value = null
}
async function runVerification() {
  if (!verification.value?.reference) {
    toast.warn("Cette demande n'a pas de référence FlexPay à vérifier.")
    return
  }
  verifying.value = true
  try {
    const { data } = await apiClient.post('/tsx/recharge/verify', { reference: verification.value.reference })
    verifyResult.value = data
  } catch (err) {
    verifyResult.value = { status: 'error', message: err?.response?.data?.message ?? "Impossible de vérifier — ce n'est peut-être pas une recharge FlexPay automatique." }
  } finally {
    verifying.value = false
  }
}
async function approveFromModal() {
  if (!verification.value) return
  await approve(verification.value)
  closeVerificationModal()
}

onMounted(() => {
  loadPending()
  loadCdfRate()
})
</script>

<template>
<div class="flex flex-col w-full">
<div class="bg-surface-container-lowest px-space-lg shadow-sm">
<div class="flex items-center justify-between overflow-x-auto py-space-xs scrollbar-none">
<nav class="flex items-center gap-space-xs whitespace-nowrap min-w-max">
<RouterLink class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container-low transition-all font-body-sm text-body-sm font-medium" to="/transactions">
<span class="material-symbols-outlined text-[18px]">sync_alt</span><span>Transactions</span>
</RouterLink>
<RouterLink class="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold shadow-sm shadow-primary/20" to="/recharges">
<span class="material-symbols-outlined text-[18px]">add_circle</span><span>Recharges</span>
<span class="ml-1 px-1.5 py-0.5 rounded-full bg-surface-container-lowest text-primary font-label-sm text-label-sm font-bold">{{ total }}</span>
</RouterLink>
<RouterLink class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container-low transition-all font-body-sm text-body-sm font-medium" to="/portefeuilles">
<span class="material-symbols-outlined text-[18px]">account_balance_wallet</span><span>Portefeuilles</span>
</RouterLink>
<RouterLink class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container-low transition-all font-body-sm text-body-sm font-medium" to="/statistiques">
<span class="material-symbols-outlined text-[18px]">query_stats</span><span>Statistiques financières</span>
</RouterLink>
</nav>
<div class="hidden xl:flex items-center gap-2 pl-4">
<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-surface-container text-secondary font-label-sm text-label-sm">
<span class="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>Gateway M-Pesa &amp; Orange : Live
</span>
</div>
</div>
</div>

<div class="p-space-lg space-y-space-lg max-w-[1600px] w-full mx-auto">
<div class="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
<div class="flex items-center gap-3">
<div class="w-10 h-10 rounded-xl bg-primary-container text-on-primary flex items-center justify-center shadow-sm"><span class="material-symbols-outlined text-[24px]">payments</span></div>
<div>
<div class="flex items-center gap-space-sm">
<h1 class="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">Rapprochement Mobile Money</h1>
<span class="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-fixed font-label-md text-label-md font-bold flex items-center gap-1">
<span class="w-2 h-2 rounded-full bg-primary"></span>{{ total }} en attente
</span>
</div>
<p class="font-body-sm text-body-sm text-secondary mt-0.5">Vérifiez chaque demande auprès de FlexPay avant de créditer le portefeuille utilisateur.</p>
</div>
</div>
<button class="w-9 h-9 flex items-center justify-center rounded-lg bg-surface-container-lowest text-secondary hover:text-on-surface hover:bg-surface-container shadow-sm transition-all" title="Rafraîchir les flux" type="button" @click="loadPending">
<span class="material-symbols-outlined text-[20px]" :class="{ 'animate-spin': loading }">sync</span>
</button>
</div>

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-md">
<div class="bg-surface-container-lowest rounded-xl p-4 shadow-sm relative overflow-hidden">
<div class="flex items-center justify-between mb-2">
<span class="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-semibold">Volume en instance</span>
<span class="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-primary"><span class="material-symbols-outlined text-[16px]">pending_actions</span></span>
</div>
<div class="font-numeric-kpi text-numeric-kpi text-on-surface font-bold">{{ totalAmount != null ? Number(totalAmount).toLocaleString('fr-FR') : '—' }} <span class="font-headline-sm text-body-md font-semibold text-primary">EC</span></div>
<div class="font-body-sm text-label-sm text-secondary mt-1">{{ total }} dossier(s)</div>
</div>
<div class="bg-surface-container-lowest rounded-xl p-4 shadow-sm relative overflow-hidden">
<div class="flex items-center justify-between mb-2">
<span class="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-semibold">Taux de conversion</span>
<span class="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-primary"><span class="material-symbols-outlined text-[16px]">currency_exchange</span></span>
</div>
<div class="font-numeric-kpi text-numeric-kpi text-on-surface font-bold">1 EC = {{ cdfRate ? cdfRate.toLocaleString('fr-FR') : '—' }} FC</div>
</div>
<div class="bg-surface-container-lowest rounded-xl p-4 shadow-sm relative overflow-hidden">
<div class="flex items-center justify-between mb-2">
<span class="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-semibold">Page</span>
<span class="w-7 h-7 rounded-lg bg-surface-container-low flex items-center justify-center text-primary-container"><span class="material-symbols-outlined text-[16px]">layers</span></span>
</div>
<div class="font-numeric-kpi text-numeric-kpi text-on-surface font-bold">{{ currentPage }} / {{ totalPages }}</div>
</div>
</div>

<div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
<div v-for="n in 6" :key="n" class="h-72 rounded-xl bg-surface-container-lowest animate-pulse"></div>
</div>
<div v-else-if="recharges.length === 0" class="bg-surface-container-lowest rounded-xl p-space-xl text-center text-secondary">
<span class="material-symbols-outlined text-[40px] mb-2 block opacity-30">task_alt</span>
<p class="font-body-md text-body-md font-medium">Aucune demande en attente de rapprochement</p>
</div>
<div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
<div v-for="row in recharges" :key="rowId(row)" class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden">
<div class="absolute top-0 left-0 w-1 h-full bg-tertiary-container"></div>
<div>
<div class="flex items-start justify-between gap-2 mb-3">
<div class="flex items-center gap-3">
<div class="w-10 h-10 rounded-full bg-secondary-container text-primary font-headline-sm text-headline-sm font-bold flex items-center justify-center shrink-0">{{ initials(row.user?.username) }}</div>
<div class="min-w-0">
<h3 class="font-headline-sm text-headline-sm text-on-surface font-semibold truncate">{{ row.user?.username ?? '—' }}</h3>
<div class="font-body-sm text-label-sm text-secondary truncate">{{ row.user?.email ?? '—' }}</div>
</div>
</div>
<span class="px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-bold whitespace-nowrap">En attente</span>
</div>
<div class="p-3 rounded-lg bg-surface-container-low mb-3 flex items-baseline justify-between">
<span class="font-label-sm text-label-sm text-secondary font-semibold uppercase tracking-wider">Montant</span>
<div class="text-right">
<div class="font-numeric-kpi text-numeric-kpi text-on-surface font-bold leading-tight">{{ Number(row.amount ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) }} <span class="text-primary font-semibold text-headline-sm">EC</span></div>
<div v-if="row.currency === 'CDF'" class="font-label-sm text-label-sm text-secondary font-medium">{{ Number(row.convertedAmount ?? 0).toLocaleString('fr-FR') }} FC</div>
</div>
</div>
<div class="space-y-1.5 mb-4 font-body-sm text-label-sm text-secondary">
<div class="flex items-center justify-between">
<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">smartphone</span> Moyen :</span>
<span class="font-semibold text-on-surface">{{ row.telephone ?? row.paymentMethod ?? '—' }}</span>
</div>
<div class="flex items-center justify-between">
<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">receipt_long</span> Réf. :</span>
<span class="font-mono text-outline font-medium text-[11px] truncate max-w-[170px]">{{ row.reference ?? '—' }}</span>
</div>
<div class="flex items-center justify-between text-outline">
<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">schedule</span> Reçu le :</span>
<span class="font-medium">{{ fmtDate(row.createdAt) }}</span>
</div>
</div>
</div>
<div class="flex items-center gap-2 pt-2">
<button class="flex-1 h-9 px-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-primary font-body-sm text-body-sm font-semibold flex items-center justify-center gap-1 transition-all" type="button" @click="openVerificationModal(row)">
<span class="material-symbols-outlined text-[16px]">search_check</span><span>Vérifier</span>
</button>
<button class="flex-1 h-9 px-2 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-body-sm text-body-sm font-semibold flex items-center justify-center gap-1 shadow-sm transition-all disabled:opacity-50" type="button" :disabled="actionId === rowId(row)" @click="approve(row)">
<span class="material-symbols-outlined text-[16px]">check_circle</span><span>Approuver</span>
</button>
<button class="w-9 h-9 rounded-lg bg-error-container hover:bg-error hover:text-on-error text-on-error-container flex items-center justify-center transition-all disabled:opacity-50" title="Rejeter la demande" type="button" :disabled="actionId === rowId(row)" @click="reject(row)">
<span class="material-symbols-outlined text-[18px]">close</span>
</button>
</div>
</div>
</div>

<div v-if="total > 0" class="flex flex-col sm:flex-row items-center justify-between gap-4 py-space-sm bg-surface-container-lowest p-4 rounded-xl shadow-sm">
<div class="font-body-sm text-body-sm text-secondary">Page <strong class="text-on-surface">{{ currentPage }}</strong> sur <strong class="text-on-surface">{{ totalPages }}</strong> — {{ total }} demandes</div>
<div class="flex items-center gap-1.5">
<button class="h-9 w-9 rounded-lg bg-surface-container-low text-secondary hover:text-on-surface hover:bg-surface-container font-body-sm text-body-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center" :disabled="currentPage <= 1" type="button" @click="goToPage(currentPage - 1)"><span class="material-symbols-outlined text-[18px]">chevron_left</span></button>
<button class="h-9 w-9 rounded-lg bg-primary-container text-on-primary font-body-sm text-body-sm font-bold shadow-xs">{{ currentPage }}</button>
<button class="h-9 w-9 rounded-lg bg-surface-container-low text-secondary hover:text-on-surface hover:bg-surface-container font-body-sm text-body-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center" :disabled="currentPage >= totalPages" type="button" @click="goToPage(currentPage + 1)"><span class="material-symbols-outlined text-[18px]">chevron_right</span></button>
</div>
</div>
</div>

<!-- Drawer de vérification -->
<div v-if="verification" class="fixed inset-0 z-50">
<div class="absolute inset-0 bg-inverse-surface/40 backdrop-blur-xs transition-opacity" @click="closeVerificationModal"></div>
<div class="absolute right-0 top-0 bottom-0 w-full max-w-lg bg-surface-container-lowest shadow-2xl flex flex-col z-10">
<div class="p-space-lg flex items-center justify-between bg-surface-container-low">
<div class="flex items-center gap-2.5">
<span class="material-symbols-outlined text-primary text-[24px]">verified_user</span>
<div>
<h2 class="font-headline-sm text-headline-sm text-on-surface font-bold">Rapprochement Mobile Money</h2>
<span class="font-label-sm text-label-sm text-secondary">Vérification directe auprès de FlexPay</span>
</div>
</div>
<button class="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-secondary hover:text-on-surface" @click="closeVerificationModal">
<span class="material-symbols-outlined text-[20px]">close</span>
</button>
</div>
<div class="p-space-lg flex-1 overflow-y-auto space-y-space-md">
<div class="p-4 rounded-xl bg-surface-container-low space-y-2.5">
<div class="flex justify-between text-body-sm"><span class="text-secondary">Bénéficiaire :</span><span class="font-semibold text-on-surface font-headline-sm">{{ verification.user?.username ?? '—' }}</span></div>
<div class="flex justify-between text-body-sm"><span class="text-secondary">Montant :</span><span class="font-bold text-primary font-numeric-kpi text-[20px]">{{ Number(verification.amount ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) }} EC</span></div>
<div class="flex justify-between text-body-sm"><span class="text-secondary">Moyen de paiement :</span><span class="font-semibold text-on-surface">{{ verification.telephone ?? verification.paymentMethod ?? '—' }}</span></div>
<div class="flex justify-between text-body-sm"><span class="text-secondary">Référence FlexPay :</span><span class="font-mono text-outline text-[12px]">{{ verification.reference ?? '—' }}</span></div>
</div>

<div v-if="verifying" class="flex items-center justify-center gap-2 py-space-md text-secondary">
<span class="material-symbols-outlined animate-spin text-[22px]">progress_activity</span><span class="font-body-sm text-body-sm">Interrogation de FlexPay…</span>
</div>
<div v-else-if="verifyResult" class="p-3 rounded-xl flex items-center gap-3" :class="verifyResult.status === 'success' || verifyResult.status === 'already_done' ? 'bg-primary-fixed/50' : verifyResult.status === 'error' ? 'bg-error-container/60' : 'bg-tertiary-fixed/60'">
<span class="material-symbols-outlined text-[22px]" :class="verifyResult.status === 'success' || verifyResult.status === 'already_done' ? 'text-primary' : verifyResult.status === 'error' ? 'text-error' : 'text-tertiary-container'">{{ verifyResult.status === 'success' || verifyResult.status === 'already_done' ? 'check_circle' : verifyResult.status === 'error' ? 'error' : 'hourglass_empty' }}</span>
<div class="font-body-sm text-body-sm">
<span class="font-semibold block text-on-surface">{{ { success: 'Paiement confirmé par FlexPay', already_done: 'Déjà crédité', cancelled: 'Refusé par FlexPay', pending: "Pas encore confirmé par FlexPay", error: 'Vérification impossible' }[verifyResult.status] ?? 'Statut inconnu' }}</span>
<span v-if="verifyResult.solde != null">Solde actuel : {{ Number(verifyResult.solde).toLocaleString('fr-FR') }} EC</span>
<span v-else-if="verifyResult.message">{{ verifyResult.message }}</span>
</div>
</div>
<button v-else class="w-full h-10 rounded-lg bg-surface-container text-primary font-body-sm text-body-sm font-semibold hover:bg-surface-container-high transition-colors flex items-center justify-center gap-1.5" type="button" @click="runVerification">
<span class="material-symbols-outlined text-[18px]">sync</span><span>Lancer la vérification FlexPay</span>
</button>
</div>
<div class="p-space-md bg-surface-container-low flex items-center gap-3">
<button class="flex-1 h-10 rounded-lg bg-surface-container-lowest text-secondary hover:text-on-surface font-body-sm text-body-sm font-medium" @click="closeVerificationModal">Fermer</button>
<button class="flex-1 h-10 rounded-lg bg-primary-container text-on-primary hover:bg-primary font-body-sm text-body-sm font-bold shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50" type="button" :disabled="actionId === rowId(verification)" @click="approveFromModal">
<span class="material-symbols-outlined text-[18px]">check_circle</span><span>Valider &amp; Créditer</span>
</button>
</div>
</div>
</div>
</div>
</template>
