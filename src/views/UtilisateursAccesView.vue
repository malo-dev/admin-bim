<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import apiClient from '@/api/client'
import { useToast } from '@/composables/useToast'

const toast = useToast()

function toLocalDateStr(d) {
  if (!d) return undefined
  return d
}

const QUICK_PERIODS = [
  { label: "Aujourd'hui", value: 'today' },
  { label: 'Hier', value: 'yesterday' },
  { label: 'Semaine', value: 'week' },
  { label: 'Mois', value: 'month' }
]
const selectedQuickPeriod = ref('today')
const dateFrom = ref('')
const dateTo = ref('')

function fmtDateInput(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function applyQuickPeriod(period) {
  selectedQuickPeriod.value = period
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
applyQuickPeriod('today')

const searchInput = ref('')
const selectedCommerceId = ref('')
const commerceOptions = ref([])
const currentPage = ref(1)
const pageSize = ref(9)

const users = ref([])
const totalRecords = ref(0)
const loading = ref(false)

const stats = ref({ newUsers: null, totalBalance: null, totalRecharged: null })
const statsLoading = ref(false)

async function loadUsers() {
  loading.value = true
  try {
    const { data } = await apiClient.get('/auth/users', {
      params: {
        search: searchInput.value || undefined,
        commerceId: selectedCommerceId.value || undefined,
        createdAtFrom: toLocalDateStr(dateFrom.value),
        createdAtTo: toLocalDateStr(dateTo.value),
        page: currentPage.value,
        pageSize: pageSize.value
      }
    })
    users.value = data?.data ?? []
    totalRecords.value = data?.pagination?.total ?? users.value.length
  } catch {
    toast.error('Impossible de charger les utilisateurs.')
  } finally {
    loading.value = false
  }
}

async function loadStats() {
  statsLoading.value = true
  try {
    const { data } = await apiClient.get('/auth/users/balance-stats', {
      params: { createdAtFrom: toLocalDateStr(dateFrom.value), createdAtTo: toLocalDateStr(dateTo.value) }
    })
    stats.value = data ?? {}
  } catch {
    /* non bloquant */
  } finally {
    statsLoading.value = false
  }
}

async function loadCommerces() {
  try {
    const { data } = await apiClient.get('/commerce_track')
    const list = Array.isArray(data) ? data : data?.data ?? []
    commerceOptions.value = list.map((c) => ({ label: c.commerceName, value: c.commerceId }))
  } catch {
    /* non bloquant */
  }
}

let searchDebounce = null
watch([searchInput, selectedCommerceId], () => {
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    currentPage.value = 1
    loadUsers()
  }, 400)
})

watch([dateFrom, dateTo], () => {
  currentPage.value = 1
  loadUsers()
  loadStats()
})

onMounted(() => {
  loadUsers()
  loadStats()
  loadCommerces()
})

const totalPages = computed(() => Math.max(1, Math.ceil(totalRecords.value / pageSize.value)))
function goToPage(p) {
  if (p < 1 || p > totalPages.value) return
  currentPage.value = p
  loadUsers()
}

const activePercentage = computed(() => {
  if (users.value.length === 0) return 0
  return Math.round((users.value.filter((u) => u.isActive).length / users.value.length) * 100)
})

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString('fr-FR') : '—'
}
function initials(name) {
  return name ? name[0].toUpperCase() : '?'
}
function getBalance(row) {
  return row?.soldNumber ?? row?.balance ?? row?.wallet?.balance ?? null
}
function fmtEC(val) {
  if (val === undefined || val === null) return 'N/D'
  return Number(val).toLocaleString('fr-FR') + ' EC'
}
function getCommerceName(user) {
  if (!user.commerce) return null
  if (Array.isArray(user.commerce)) return user.commerce[0]?.commerceName ?? null
  return user.commerce.commerceName ?? null
}

function exportCsv() {
  const rows = users.value.map((u) => [u.fullname || u.username || '—', u.email || '—', u.accountNumber || '—', getBalance(u) ?? '', u.isActive ? 'Actif' : 'Inactif', formatDate(u.createdAt)])
  const header = ['Utilisateur', 'Email', 'N° compte', 'Solde (EC)', 'Statut', 'Créé le']
  const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `utilisateurs_${fmtDateInput(new Date())}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const actionId = ref(null)
async function toggleActive(row) {
  actionId.value = row.id
  try {
    await apiClient.put(`/auth/users/${row.id}/activate`)
    toast.success(`Compte ${row.isActive ? 'désactivé' : 'activé'}.`)
    await loadUsers()
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  } finally {
    actionId.value = null
  }
}

async function removeUser(row) {
  if (!window.confirm(`Supprimer définitivement le compte de « ${row.username} » ? Cette action est irréversible.`)) return
  actionId.value = row.id
  try {
    await apiClient.delete(`/auth/users/${row.id}`)
    toast.success('Utilisateur supprimé.')
    await loadUsers()
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  } finally {
    actionId.value = null
  }
}

// ── Modifier le profil ──
const editDialog = ref(false)
const editSaving = ref(false)
const editForm = ref({ id: null, username: '', email: '', fullname: '', telephone: '' })
function openEdit(row) {
  editForm.value = { id: row.id, username: row.username ?? '', email: row.email ?? '', fullname: row.fullname ?? '', telephone: row.telephone ?? '' }
  editDialog.value = true
}
async function saveEdit() {
  const { id, ...payload } = editForm.value
  editSaving.value = true
  try {
    await apiClient.put(`/auth/users/${id}/profile`, payload)
    toast.success('Profil mis à jour.')
    editDialog.value = false
    await loadUsers()
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  } finally {
    editSaving.value = false
  }
}

// ── Recharger (historique portefeuille → action de recharge directe) ──
const rechargeDialog = ref(false)
const rechargeSaving = ref(false)
const rechargeTarget = ref(null)
const rechargeAmount = ref(null)
function openRecharge(row) {
  rechargeTarget.value = row
  rechargeAmount.value = null
  rechargeDialog.value = true
}
async function submitRecharge() {
  if (!rechargeAmount.value || rechargeAmount.value <= 0) {
    toast.warn('Entrez un montant positif.')
    return
  }
  rechargeSaving.value = true
  try {
    await apiClient.post(`/auth/users/${rechargeTarget.value.id}/admin-recharge`, { amount: rechargeAmount.value })
    toast.success(`${rechargeAmount.value} EC ajoutés au compte de ${rechargeTarget.value.username}.`)
    rechargeDialog.value = false
    await loadUsers()
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  } finally {
    rechargeSaving.value = false
  }
}

// ── Réinitialiser le mot de passe ──
const resetDialog = ref(false)
const resetTarget = ref(null)
const resetLoading = ref(false)
const generatedPassword = ref('')
function openReset(row) {
  resetTarget.value = row
  generatedPassword.value = ''
  resetDialog.value = true
}
async function submitReset() {
  resetLoading.value = true
  try {
    const { data } = await apiClient.post(`/auth/users/${resetTarget.value.id}/admin-reset-password`)
    generatedPassword.value = data?.newPassword ?? data?.password ?? '(voir email)'
    toast.success('Nouveau mot de passe généré.')
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  } finally {
    resetLoading.value = false
  }
}
function copyPassword() {
  navigator.clipboard.writeText(generatedPassword.value)
  toast.success('Mot de passe copié.')
}

// ── Permissions / mot de passe de transaction ──
const pinDialog = ref(false)
const pinTarget = ref(null)
const pinValue = ref('')
const pinVisible = ref(false)
const pinLoading = ref(false)
const pinError = ref('')
async function openPin(row) {
  pinTarget.value = row
  pinValue.value = ''
  pinVisible.value = false
  pinError.value = ''
  pinDialog.value = true
  pinLoading.value = true
  try {
    const { data } = await apiClient.get(`/auth/users/${row.id}/transaction-password`)
    pinValue.value = data?.randomly ?? data?.transactionPassword ?? data?.pin ?? data?.password ?? ''
    if (!pinValue.value) pinError.value = 'Aucun mot de passe de transaction défini pour cet utilisateur.'
  } catch (err) {
    pinError.value = err?.response?.data?.message ?? 'Impossible de récupérer le mot de passe de transaction.'
  } finally {
    pinLoading.value = false
  }
}
function copyPin() {
  navigator.clipboard.writeText(pinValue.value)
  toast.success('Mot de passe de transaction copié.')
}
</script>

<template>
<div class="flex flex-col w-full">
<div class="px-space-lg py-space-md space-y-space-lg max-w-[1600px] w-full mx-auto">
<!-- En-tête de section -->
<div class="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md bg-surface-container-lowest p-space-lg rounded-xl shadow-sm">
<div class="space-y-1">
<div class="flex items-center gap-space-sm flex-wrap">
<div class="w-10 h-10 rounded-lg bg-surface-container-low text-primary flex items-center justify-center">
<span class="material-symbols-outlined text-[24px]">manage_accounts</span>
</div>
<div>
<h1 class="font-headline-lg text-headline-lg text-on-surface">Gestion des Utilisateurs &amp; Accès</h1>
<p class="font-body-sm text-body-sm text-secondary">Gouvernance, permissions d'accès et soldes des utilisateurs de la plateforme BIM</p>
</div>
</div>
</div>
<div class="flex items-center gap-space-sm flex-wrap">
<button class="inline-flex items-center gap-2 px-space-md h-10 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-body-sm font-medium transition-colors shadow-sm" type="button" @click="exportCsv">
<span class="material-symbols-outlined text-[18px] text-secondary">file_download</span>
<span>Exporter (CSV)</span>
</button>
</div>
</div>

<!-- Barre d'onglets -->
<div class="bg-surface-container-lowest rounded-xl shadow-sm px-space-md">
<div class="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth">
<RouterLink class="flex items-center gap-2 px-space-md py-3.5 font-body-sm text-body-sm text-secondary hover:text-on-surface whitespace-nowrap transition-colors" to="/comptes">
<span class="material-symbols-outlined text-[18px]">account_box</span>
<span>Comptes</span>
</RouterLink>
<RouterLink class="flex items-center gap-2 px-space-md py-3.5 font-headline-sm text-body-sm text-primary font-semibold whitespace-nowrap bg-surface-container-low rounded-lg transition-colors" to="/utilisateurs-acces">
<span class="material-symbols-outlined text-[18px]">group</span>
<span>Utilisateurs &amp; Accès</span>
<span class="w-2 h-2 rounded-full bg-primary"></span>
</RouterLink>
<RouterLink class="flex items-center gap-2 px-space-md py-3.5 font-body-sm text-body-sm text-secondary hover:text-on-surface whitespace-nowrap transition-colors" to="/entreprises">
<span class="material-symbols-outlined text-[18px]">apartment</span>
<span>Entreprises &amp; Partenaires</span>
</RouterLink>
<RouterLink class="flex items-center gap-2 px-space-md py-3.5 font-body-sm text-body-sm text-secondary hover:text-on-surface whitespace-nowrap transition-colors" to="/catalogue">
<span class="material-symbols-outlined text-[18px]">category</span>
<span>Catalogue Produits</span>
</RouterLink>
<RouterLink class="flex items-center gap-2 px-space-md py-3.5 font-body-sm text-body-sm text-secondary hover:text-on-surface whitespace-nowrap transition-colors" to="/transport">
<span class="material-symbols-outlined text-[18px]">directions_car</span>
<span>BIM Transport</span>
</RouterLink>
<RouterLink class="flex items-center gap-2 px-space-md py-3.5 font-body-sm text-body-sm text-secondary hover:text-on-surface whitespace-nowrap transition-colors" to="/commandes">
<span class="material-symbols-outlined text-[18px]">local_shipping</span>
<span>Commandes &amp; Livraisons</span>
</RouterLink>
<RouterLink class="flex items-center gap-2 px-space-md py-3.5 font-body-sm text-secondary hover:text-on-surface whitespace-nowrap transition-colors" to="/agents">
<span class="material-symbols-outlined text-[18px]">badge</span>
<span>Agents BIM</span>
</RouterLink>
<RouterLink class="flex items-center gap-2 px-space-md py-3.5 font-body-sm text-body-sm text-secondary hover:text-on-surface whitespace-nowrap transition-colors" to="/formation">
<span class="material-symbols-outlined text-[18px]">school</span>
<span>Formation</span>
</RouterLink>
</div>
</div>

<!-- Filtre par période & KPIs -->
<div class="space-y-space-md">
<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-sm bg-surface-container-lowest px-space-md py-2.5 rounded-xl shadow-sm">
<div class="flex items-center gap-2 text-secondary font-body-sm text-body-sm">
<span class="material-symbols-outlined text-[18px] text-primary">calendar_today</span>
<span class="font-medium text-on-surface">Période d'analyse :</span>
<span>{{ dateFrom === dateTo ? dateFrom : `${dateFrom} → ${dateTo}` }}</span>
</div>
<div class="inline-flex p-1 bg-surface-container-low rounded-lg gap-1 self-stretch sm:self-auto overflow-x-auto">
<button
  v-for="p in QUICK_PERIODS"
  :key="p.value"
  class="px-3 py-1 text-label-md font-label-md rounded transition-all"
  :class="selectedQuickPeriod === p.value ? 'bg-primary-container text-on-primary font-medium shadow-sm' : 'text-secondary hover:text-on-surface hover:bg-surface-container'"
  type="button"
  @click="applyQuickPeriod(p.value)"
>{{ p.label }}</button>
</div>
</div>

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
<div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
<div class="flex items-center justify-between">
<span class="font-body-sm text-body-sm text-secondary font-medium">Utilisateurs sur la période</span>
<div class="w-9 h-9 rounded-lg bg-surface-container-low text-primary flex items-center justify-center">
<span class="material-symbols-outlined text-[20px]">person_outline</span>
</div>
</div>
<div class="mt-3 flex items-baseline gap-2">
<span class="font-numeric-kpi text-numeric-kpi text-on-surface"><span v-if="statsLoading">…</span><span v-else>{{ stats.newUsers ?? totalRecords }}</span></span>
</div>
</div>
<div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
<div class="flex items-center justify-between">
<span class="font-body-sm text-body-sm text-secondary font-medium">Solde total — tous utilisateurs</span>
<div class="w-9 h-9 rounded-lg bg-surface-container-high text-primary flex items-center justify-center">
<span class="material-symbols-outlined text-[20px]">account_balance_wallet</span>
</div>
</div>
<div class="mt-3 flex items-baseline gap-2">
<span class="font-numeric-kpi text-numeric-kpi text-on-surface"><span v-if="statsLoading">…</span><span v-else>{{ fmtEC(stats.totalBalance) }}</span></span>
</div>
</div>
<div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
<div class="flex items-center justify-between">
<span class="font-body-sm text-body-sm text-secondary font-medium">Rechargé sur la période</span>
<div class="w-9 h-9 rounded-lg bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center">
<span class="material-symbols-outlined text-[20px]">arrow_outward</span>
</div>
</div>
<div class="mt-3 flex items-baseline gap-2">
<span class="font-numeric-kpi text-numeric-kpi text-on-surface"><span v-if="statsLoading">…</span><span v-else>{{ fmtEC(stats.totalRecharged) }}</span></span>
</div>
</div>
<div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
<div class="flex items-center justify-between">
<span class="font-body-sm text-body-sm text-secondary font-medium">Comptes actifs (page)</span>
<div class="w-9 h-9 rounded-lg bg-surface-container-low text-primary flex items-center justify-center">
<span class="material-symbols-outlined text-[20px]">verified_user</span>
</div>
</div>
<div class="mt-3 flex items-baseline gap-2">
<span class="font-numeric-kpi text-numeric-kpi text-on-surface">{{ activePercentage }}%</span>
</div>
</div>
</div>
</div>

<!-- Filtres Avancés et Recherche -->
<div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm space-y-space-md">
<div class="grid grid-cols-1 md:grid-cols-12 gap-space-sm items-center">
<div class="md:col-span-5 relative">
<span class="material-symbols-outlined absolute left-3 top-2.5 text-outline text-[18px]">search</span>
<input v-model="searchInput" class="w-full h-10 pl-9 pr-space-md rounded-lg bg-surface-container-low text-body-sm font-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Rechercher par nom, email, identifiant..." type="text"/>
</div>
<div class="md:col-span-3 relative">
<select v-model="selectedCommerceId" class="w-full h-10 px-space-sm rounded-lg bg-surface-container-low text-body-sm font-body-sm text-on-surface appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer">
<option value="">Tous les commerces</option>
<option v-for="c in commerceOptions" :key="c.value" :value="c.value">{{ c.label }}</option>
</select>
<span class="material-symbols-outlined absolute right-2.5 top-2.5 text-secondary text-[18px] pointer-events-none">expand_more</span>
</div>
<div class="md:col-span-4 flex items-center gap-1.5">
<input v-model="dateFrom" class="w-full h-10 px-space-sm rounded-lg bg-surface-container-low text-body-sm font-body-sm text-on-surface text-center focus:outline-none focus:ring-2 focus:ring-primary/20" type="date" @change="selectedQuickPeriod = null"/>
<span class="text-secondary text-body-sm">à</span>
<input v-model="dateTo" class="w-full h-10 px-space-sm rounded-lg bg-surface-container-low text-body-sm font-body-sm text-on-surface text-center focus:outline-none focus:ring-2 focus:ring-primary/20" type="date" @change="selectedQuickPeriod = null"/>
</div>
</div>
<div class="flex items-center justify-between text-label-md font-label-md text-secondary pt-1">
<div class="flex items-center gap-2">
<span class="inline-block w-2 h-2 rounded-full bg-primary-container"></span>
<span class="font-medium text-on-surface">{{ totalRecords }} utilisateurs répertoriés</span>
</div>
<button class="h-9 w-9 rounded-lg bg-surface-container-low text-secondary hover:text-on-surface hover:bg-surface-container transition-colors flex items-center justify-center" type="button" @click="loadUsers">
<span class="material-symbols-outlined text-[18px]" :class="{ 'animate-spin': loading }">refresh</span>
</button>
</div>
</div>

<!-- Loading -->
<div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-md">
<div v-for="n in 6" :key="n" class="h-48 rounded-xl bg-surface-container-lowest animate-pulse"></div>
</div>

<!-- Empty -->
<div v-else-if="users.length === 0" class="text-center py-12 text-secondary bg-surface-container-lowest rounded-xl">
<span class="material-symbols-outlined text-[40px] mb-2 block opacity-30">group_off</span>
<p class="font-body-md text-body-md font-medium">Aucun utilisateur trouvé</p>
</div>

<!-- Grille des Cartes Utilisateurs -->
<div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-md">
<div v-for="row in users" :key="row.id" class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
<div>
<div class="flex items-start justify-between gap-space-sm">
<div class="flex items-center gap-3 min-w-0">
<div class="w-10 h-10 rounded-lg bg-surface-container-high text-primary flex items-center justify-center font-headline-sm font-bold shrink-0">{{ initials(row.fullname || row.username) }}</div>
<div class="min-w-0">
<div class="font-headline-sm text-body-sm font-semibold text-on-surface truncate">{{ row.fullname || row.username }}</div>
<div class="font-label-sm text-label-sm text-secondary truncate max-w-[210px]" :title="row.email">{{ row.email }}</div>
</div>
</div>
<span class="inline-flex items-center px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-surface-container text-on-surface font-semibold shrink-0">
<span class="w-1.5 h-1.5 rounded-full mr-1.5" :class="row.isActive ? 'bg-primary-container' : 'bg-outline'"></span>{{ row.isActive ? 'Actif' : 'Inactif' }}
</span>
</div>
<div class="mt-space-md p-2.5 rounded-lg bg-surface-container-low flex items-center justify-between text-body-sm font-body-sm">
<div>
<div class="text-label-sm font-label-sm text-secondary">N° de compte</div>
<div class="font-mono text-body-sm font-medium text-on-surface">{{ row.accountNumber || '—' }}</div>
</div>
<div class="text-right">
<div class="text-label-sm font-label-sm text-secondary">Solde actuel</div>
<div class="font-headline-sm text-body-sm font-semibold text-primary">{{ fmtEC(getBalance(row)) }}</div>
</div>
</div>
<div class="mt-3 flex items-center justify-between font-label-sm text-label-sm text-secondary">
<span class="px-2 py-0.5 rounded bg-surface-container text-on-surface font-medium">{{ row.isBlocked ? 'Bloqué' : (getCommerceName(row) || 'Normal') }}</span>
<span>Créé le {{ formatDate(row.createdAt) }}</span>
</div>
</div>
<!-- Actions rapides de gouvernance -->
<div class="mt-space-md pt-space-sm flex items-center justify-between">
<div class="flex items-center gap-1">
<button class="w-8 h-8 rounded-lg bg-surface-container-low hover:bg-surface-container text-secondary hover:text-on-surface flex items-center justify-center transition-colors" title="Modifier l'utilisateur" type="button" @click="openEdit(row)">
<span class="material-symbols-outlined text-[16px]">edit</span>
</button>
<button class="w-8 h-8 rounded-lg bg-surface-container-low hover:bg-surface-container text-secondary hover:text-on-surface flex items-center justify-center transition-colors" title="Recharger le compte" type="button" @click="openRecharge(row)">
<span class="material-symbols-outlined text-[16px]">account_balance_wallet</span>
</button>
<button class="w-8 h-8 rounded-lg bg-surface-container-low hover:bg-surface-container text-secondary hover:text-on-surface flex items-center justify-center transition-colors" title="Réinitialiser le mot de passe" type="button" @click="openReset(row)">
<span class="material-symbols-outlined text-[16px]">key</span>
</button>
<button class="w-8 h-8 rounded-lg bg-surface-container-low hover:bg-surface-container text-primary flex items-center justify-center transition-colors" title="Mot de passe de transaction" type="button" @click="openPin(row)">
<span class="material-symbols-outlined text-[16px]">shield</span>
</button>
<button class="w-8 h-8 rounded-lg bg-surface-container-low hover:bg-surface-container text-secondary flex items-center justify-center transition-colors disabled:opacity-50" title="Activer / désactiver" type="button" :disabled="actionId === row.id" @click="toggleActive(row)">
<span class="material-symbols-outlined text-[16px]">power_settings_new</span>
</button>
</div>
<button class="w-8 h-8 rounded-lg bg-surface-container-low hover:bg-error-container text-error flex items-center justify-center transition-colors disabled:opacity-50" title="Supprimer définitivement" type="button" :disabled="actionId === row.id" @click="removeUser(row)">
<span class="material-symbols-outlined text-[16px]">delete</span>
</button>
</div>
</div>
</div>

<!-- Pagination -->
<div v-if="totalRecords > 0" class="flex flex-col sm:flex-row items-center justify-between gap-space-sm bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
<div class="text-body-sm font-body-sm text-secondary">
Page <span class="font-semibold text-on-surface">{{ currentPage }}</span> sur <span class="font-semibold text-on-surface">{{ totalPages }}</span> — {{ totalRecords }} utilisateurs
</div>
<div class="flex items-center gap-1">
<button class="h-9 px-3 rounded-lg bg-surface-container-low text-secondary hover:text-on-surface hover:bg-surface-container transition-colors inline-flex items-center gap-1 font-body-sm text-body-sm disabled:opacity-50" :disabled="currentPage <= 1" type="button" @click="goToPage(currentPage - 1)">
<span class="material-symbols-outlined text-[16px]">chevron_left</span><span>Précédent</span>
</button>
<button class="w-9 h-9 rounded-lg bg-primary-container text-on-primary font-semibold text-body-sm flex items-center justify-center shadow-sm" type="button">{{ currentPage }}</button>
<button class="h-9 px-3 rounded-lg bg-surface-container-low text-secondary hover:text-on-surface hover:bg-surface-container transition-colors inline-flex items-center gap-1 font-body-sm text-body-sm disabled:opacity-50" :disabled="currentPage >= totalPages" type="button" @click="goToPage(currentPage + 1)">
<span>Suivant</span><span class="material-symbols-outlined text-[16px]">chevron_right</span>
</button>
</div>
</div>
</div>

<!-- Dialog Modifier -->
<div v-if="editDialog" class="fixed inset-0 z-[90] flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm p-4" @click.self="editDialog = false">
<div class="w-full max-w-md bg-white rounded-2xl shadow-xl p-space-lg space-y-space-md">
<h2 class="font-headline-md text-headline-md font-bold text-on-surface">Modifier l'utilisateur</h2>
<div class="space-y-space-sm">
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Nom d'utilisateur</label><input v-model="editForm.username" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" type="text"/></div>
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Email</label><input v-model="editForm.email" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" type="email"/></div>
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Nom complet</label><input v-model="editForm.fullname" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" type="text"/></div>
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Téléphone</label><input v-model="editForm.telephone" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" type="text"/></div>
</div>
<div class="flex justify-end gap-space-sm pt-space-sm">
<button class="h-10 px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm font-medium" type="button" :disabled="editSaving" @click="editDialog = false">Annuler</button>
<button class="h-10 px-space-md rounded-lg bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold disabled:opacity-60" type="button" :disabled="editSaving" @click="saveEdit">{{ editSaving ? 'Enregistrement…' : 'Enregistrer' }}</button>
</div>
</div>
</div>

<!-- Dialog Recharger -->
<div v-if="rechargeDialog" class="fixed inset-0 z-[90] flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm p-4" @click.self="rechargeDialog = false">
<div class="w-full max-w-sm bg-white rounded-2xl shadow-xl p-space-lg space-y-space-md">
<h2 class="font-headline-md text-headline-md font-bold text-on-surface">Recharger le compte de {{ rechargeTarget?.username }}</h2>
<p class="font-body-sm text-body-sm text-secondary">Solde actuel : <strong>{{ fmtEC(getBalance(rechargeTarget ?? {})) }}</strong></p>
<div>
<label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Montant à ajouter (EC)</label>
<input v-model.number="rechargeAmount" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" min="1" placeholder="Ex: 50" type="number"/>
</div>
<p class="font-label-sm text-label-sm text-secondary">À la première recharge d'un utilisateur, 1 EC de frais d'abonnement est prélevé automatiquement. Utilisez au moins 2 EC pour une première recharge.</p>
<div class="flex justify-end gap-space-sm pt-space-sm">
<button class="h-10 px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm font-medium" type="button" :disabled="rechargeSaving" @click="rechargeDialog = false">Annuler</button>
<button class="h-10 px-space-md rounded-lg bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold disabled:opacity-60" type="button" :disabled="rechargeSaving || !rechargeAmount || rechargeAmount <= 0" @click="submitRecharge">{{ rechargeSaving ? 'Recharge…' : 'Recharger' }}</button>
</div>
</div>
</div>

<!-- Dialog Reset Password -->
<div v-if="resetDialog" class="fixed inset-0 z-[90] flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm p-4" @click.self="resetDialog = false">
<div class="w-full max-w-sm bg-white rounded-2xl shadow-xl p-space-lg space-y-space-md">
<h2 class="font-headline-md text-headline-md font-bold text-on-surface">Réinitialiser le mot de passe de {{ resetTarget?.username }}</h2>
<p class="font-body-sm text-body-sm text-secondary">Un nouveau mot de passe sera généré automatiquement.</p>
<div v-if="generatedPassword" class="space-y-1">
<label class="font-label-sm text-label-sm font-semibold text-secondary block">Nouveau mot de passe</label>
<div class="flex items-center gap-2">
<input :value="generatedPassword" class="h-10 flex-1 px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm font-mono" readonly type="text"/>
<button class="w-10 h-10 rounded-lg bg-surface-container-low text-secondary hover:text-primary flex items-center justify-center shrink-0" type="button" @click="copyPassword"><span class="material-symbols-outlined text-[18px]">content_copy</span></button>
</div>
</div>
<div class="flex justify-end gap-space-sm pt-space-sm">
<button class="h-10 px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm font-medium" type="button" @click="resetDialog = false">Fermer</button>
<button v-if="!generatedPassword" class="h-10 px-space-md rounded-lg bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold disabled:opacity-60" type="button" :disabled="resetLoading" @click="submitReset">{{ resetLoading ? 'Génération…' : 'Générer un nouveau mot de passe' }}</button>
</div>
</div>
</div>

<!-- Dialog Mot de passe de transaction -->
<div v-if="pinDialog" class="fixed inset-0 z-[90] flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm p-4" @click.self="pinDialog = false">
<div class="w-full max-w-sm bg-white rounded-2xl shadow-xl p-space-lg space-y-space-md">
<h2 class="font-headline-md text-headline-md font-bold text-on-surface">Mot de passe de transaction — {{ pinTarget?.username }}</h2>
<div v-if="pinLoading" class="flex items-center justify-center py-6 gap-2 text-secondary">
<span class="material-symbols-outlined animate-spin text-[22px]">progress_activity</span>
<span class="font-body-sm text-body-sm">Récupération en cours…</span>
</div>
<p v-else-if="pinError" class="font-body-sm text-body-sm px-3 py-2 rounded-lg bg-error-container text-on-error-container">{{ pinError }}</p>
<div v-else class="space-y-2">
<label class="font-label-sm text-label-sm font-semibold text-secondary block">Mot de passe de transaction</label>
<div class="flex items-center gap-2">
<input :value="pinVisible ? pinValue : pinValue.replace(/./g, '●')" class="h-10 flex-1 px-space-md rounded-lg bg-surface-container-low text-on-surface font-mono text-body-md tracking-widest" readonly type="text"/>
<button class="w-10 h-10 rounded-lg bg-surface-container-low text-secondary hover:text-primary flex items-center justify-center shrink-0" type="button" @click="pinVisible = !pinVisible"><span class="material-symbols-outlined text-[18px]">{{ pinVisible ? 'visibility_off' : 'visibility' }}</span></button>
<button class="w-10 h-10 rounded-lg bg-surface-container-low text-secondary hover:text-primary flex items-center justify-center shrink-0" type="button" @click="copyPin"><span class="material-symbols-outlined text-[18px]">content_copy</span></button>
</div>
<p class="font-label-sm text-label-sm text-tertiary-container">Information confidentielle — ne pas divulguer à des tiers.</p>
</div>
<div class="flex justify-end pt-space-sm">
<button class="h-10 px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm font-medium" type="button" @click="pinDialog = false">Fermer</button>
</div>
</div>
</div>
</div>
</template>
