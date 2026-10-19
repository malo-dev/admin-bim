<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import apiClient from '@/api/client'
import { useToast } from '@/composables/useToast'

const toast = useToast()

const searchInput = ref('')
const currentPage = ref(1)
const pageSize = ref(9)

const accounts = ref([])
const totalRecords = ref(0)
const loading = ref(false)

let searchDebounce = null
watch(searchInput, () => {
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    currentPage.value = 1
    loadAccounts()
  }, 400)
})

async function loadAccounts() {
  loading.value = true
  try {
    const { data } = await apiClient.get('/auth/admin-accounts', {
      params: { search: searchInput.value || undefined, page: currentPage.value, pageSize: pageSize.value, paginate: 'true' }
    })
    accounts.value = data?.data ?? []
    totalRecords.value = data?.pagination?.total ?? accounts.value.length
  } catch {
    toast.error('Impossible de charger les comptes administrateurs.')
  } finally {
    loading.value = false
  }
}

// Comptage par rôle sur l'ensemble des comptes admin (liste toujours restreinte).
const bimAdminsCount = ref(0)
const companyAdminsCount = ref(0)
async function loadCounts() {
  try {
    const { data } = await apiClient.get('/auth/admin-accounts', { params: { page: 1, pageSize: 1000, paginate: 'true' } })
    const all = data?.data ?? []
    bimAdminsCount.value = all.filter((a) => a.role?.some((r) => r.name === 'BIM')).length
    companyAdminsCount.value = all.filter((a) => a.role?.some((r) => r.name !== 'BIM')).length
  } catch {
    /* non bloquant */
  }
}

function goToPage(p) {
  if (p < 1 || p > totalPages.value) return
  currentPage.value = p
  loadAccounts()
}
const totalPages = computed(() => Math.max(1, Math.ceil(totalRecords.value / pageSize.value)))

onMounted(() => {
  loadAccounts()
  loadCounts()
})

function roleLabel(name) {
  return name === 'BIM' ? 'BIM Admin' : 'Admin Entreprise'
}
function formatDate(d) {
  return d ? new Date(d).toLocaleDateString('fr-FR') : '—'
}
function initials(name) {
  return name ? name[0].toUpperCase() : '?'
}
function companyRating(row) {
  return Number(row.company?.note ?? row.company?.rating ?? 0)
}

const actionId = ref(null)
async function toggleActive(row) {
  actionId.value = row.id
  try {
    await apiClient.put(`/auth/users/${row.id}/activate`)
    toast.success(`Compte ${row.isActive ? 'désactivé' : 'activé'}.`)
    await loadAccounts()
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  } finally {
    actionId.value = null
  }
}

async function toggleBlock(row) {
  actionId.value = row.id
  try {
    await apiClient.put(`/auth/users/${row.id}/block-user`)
    toast.success(`Compte ${row.isBlocked ? 'débloqué' : 'bloqué'}.`)
    await loadAccounts()
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  } finally {
    actionId.value = null
  }
}

async function removeAccount(row) {
  if (!window.confirm(`Supprimer définitivement le compte de « ${row.username} » ? Cette action est irréversible.`)) return
  actionId.value = row.id
  try {
    await apiClient.delete(`/auth/users/${row.id}`)
    toast.success('Compte supprimé.')
    await loadAccounts()
    await loadCounts()
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  } finally {
    actionId.value = null
  }
}

// ── Édition ──
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
    toast.success('Compte modifié avec succès.')
    editDialog.value = false
    await loadAccounts()
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  } finally {
    editSaving.value = false
  }
}

// ── Création ──
const createDialog = ref(false)
const createStep = ref('choice') // 'choice' | 'bim' | 'company'
const createSaving = ref(false)

function openCreateDialog() {
  createStep.value = 'choice'
  createDialog.value = true
}

const bimForm = ref({ username: '', email: '', password: '' })
async function submitBimAdmin() {
  createSaving.value = true
  try {
    await apiClient.post('/auth/create-bim-admin', bimForm.value)
    toast.success('Compte BIM Admin créé avec succès.')
    bimForm.value = { username: '', email: '', password: '' }
    createDialog.value = false
    await loadAccounts()
    await loadCounts()
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  } finally {
    createSaving.value = false
  }
}

const sectorOptions = ref([])
onMounted(async () => {
  try {
    const { data } = await apiClient.get('/sector', { params: { paginate: 'false' } })
    const list = Array.isArray(data) ? data : data?.data ?? []
    sectorOptions.value = list.map((s) => ({ label: s.name, value: s.businessId }))
  } catch {
    /* non bloquant */
  }
})

const companyForm = ref({
  company: { name: '', email: '', businessId: '', location: '', logo: '', description: '' },
  admin: { username: '', email: '', password: '' }
})
const canSubmitCompany = computed(
  () =>
    !!companyForm.value.company.name &&
    !!companyForm.value.company.email &&
    !!companyForm.value.admin.username &&
    !!companyForm.value.admin.email &&
    !!companyForm.value.admin.password
)

function resetCompanyForm() {
  companyForm.value = {
    company: { name: '', email: '', businessId: '', location: '', logo: '', description: '' },
    admin: { username: '', email: '', password: '' }
  }
}

async function submitCompanyAccount() {
  createSaving.value = true
  try {
    const c = companyForm.value.company
    const payload = {
      company: {
        name: c.name,
        email: c.email,
        ...(c.businessId && { businessId: c.businessId }),
        ...(c.location && { location: c.location }),
        ...(c.logo && { logo: c.logo }),
        ...(c.description && { description: c.description })
      },
      admin: { ...companyForm.value.admin }
    }
    const { data } = await apiClient.post('/auth/create-company-account', payload)
    toast.success(`Entreprise « ${data?.company?.name ?? c.name} » et administrateur créés avec succès.`)
    resetCompanyForm()
    createDialog.value = false
    await loadAccounts()
    await loadCounts()
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  } finally {
    createSaving.value = false
  }
}
</script>

<template>
<div class="flex flex-col w-full">
<div class="px-space-lg py-space-md max-w-[1600px] w-full mx-auto space-y-space-md">
<!-- Header Section -->
<div class="flex flex-col md:flex-row md:items-center justify-between gap-space-md bg-surface-container-lowest p-space-lg rounded-xl shadow-sm">
<div class="flex items-start gap-space-md">
<div class="w-12 h-12 rounded-xl bg-primary-container/10 text-primary-container flex items-center justify-center shrink-0">
<span class="material-symbols-outlined text-[28px]">manage_accounts</span>
</div>
<div>
<div class="flex items-center gap-space-xs">
<h1 class="font-headline-lg text-headline-lg text-on-surface tracking-tight">Gestion des Comptes</h1>
</div>
<p class="font-body-md text-body-md text-secondary mt-1">Administrateurs BIM, Entreprises partenaires et permissions d'accès système</p>
</div>
</div>
<div class="flex items-center gap-space-sm self-end md:self-auto">
<button class="h-10 px-space-md rounded-lg bg-primary-container text-on-primary font-body-sm text-body-sm font-medium hover:bg-primary transition-all flex items-center gap-1.5 shadow-sm" type="button" @click="openCreateDialog">
<span class="material-symbols-outlined text-[18px]">person_add</span>
<span>+ Créer un compte administrateur</span>
</button>
</div>
</div>

<!-- Quick Metrics Strip -->
<div class="grid grid-cols-2 md:grid-cols-3 gap-space-sm">
<div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex items-center justify-between">
<div>
<span class="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Total Comptes</span>
<div class="font-numeric-kpi text-numeric-kpi text-on-surface font-bold mt-0.5">{{ totalRecords }}</div>
</div>
<div class="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-primary">
<span class="material-symbols-outlined text-[22px]">badge</span>
</div>
</div>
<div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex items-center justify-between">
<div>
<span class="font-label-sm text-label-sm uppercase tracking-wider text-secondary">BIM Admins</span>
<div class="font-numeric-kpi text-numeric-kpi text-tertiary-container font-bold mt-0.5">{{ bimAdminsCount }}</div>
<span class="font-label-sm text-label-sm text-secondary">Pouvoir d'approbation</span>
</div>
<div class="w-10 h-10 rounded-lg bg-tertiary-fixed/30 flex items-center justify-center text-tertiary-container">
<span class="material-symbols-outlined text-[22px]">verified_user</span>
</div>
</div>
<div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex items-center justify-between">
<div>
<span class="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Admins Entreprise</span>
<div class="font-numeric-kpi text-numeric-kpi text-primary font-bold mt-0.5">{{ companyAdminsCount }}</div>
<span class="font-label-sm text-label-sm text-secondary">Délégués partenaires</span>
</div>
<div class="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary-container">
<span class="material-symbols-outlined text-[22px]">domain</span>
</div>
</div>
</div>

<!-- Navigation Tabs -->
<div class="bg-surface-container-lowest rounded-xl shadow-sm overflow-x-auto">
<div class="flex items-center min-w-max px-space-md">
<RouterLink class="flex items-center gap-1.5 px-space-md py-3.5 font-body-sm text-body-sm font-semibold text-primary-container relative" to="/comptes">
<span class="material-symbols-outlined text-[18px]">group</span>
<span>Comptes</span>
<span class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-container"></span>
</RouterLink>
<RouterLink class="flex items-center gap-1.5 px-space-md py-3.5 font-body-sm text-body-sm font-medium text-secondary hover:text-on-surface transition-colors" to="/utilisateurs-acces">
<span class="material-symbols-outlined text-[18px]">person_check</span>
<span>Utilisateurs &amp; Accès</span>
</RouterLink>
<RouterLink class="flex items-center gap-1.5 px-space-md py-3.5 font-body-sm text-body-sm font-medium text-secondary hover:text-on-surface transition-colors" to="/entreprises">
<span class="material-symbols-outlined text-[18px]">storefront</span>
<span>Entreprises &amp; Commerce</span>
</RouterLink>
<RouterLink class="flex items-center gap-1.5 px-space-md py-3.5 font-body-sm text-body-sm font-medium text-secondary hover:text-on-surface transition-colors" to="/catalogue">
<span class="material-symbols-outlined text-[18px]">inventory_2</span>
<span>Catalogue Produits</span>
</RouterLink>
<RouterLink class="flex items-center gap-1.5 px-space-md py-3.5 font-body-sm text-body-sm font-medium text-secondary hover:text-on-surface transition-colors" to="/transport">
<span class="material-symbols-outlined text-[18px]">local_shipping</span>
<span>BIM Transport</span>
</RouterLink>
<RouterLink class="flex items-center gap-1.5 px-space-md py-3.5 font-body-sm text-body-sm font-medium text-secondary hover:text-on-surface transition-colors" to="/commandes">
<span class="material-symbols-outlined text-[18px]">shopping_cart</span>
<span>Commandes &amp; Livraisons</span>
</RouterLink>
<RouterLink class="flex items-center gap-1.5 px-space-md py-3.5 font-body-sm text-body-sm font-medium text-secondary hover:text-on-surface transition-colors" to="/agents">
<span class="material-symbols-outlined text-[18px]">support_agent</span>
<span>Agents BIM</span>
</RouterLink>
<RouterLink class="flex items-center gap-1.5 px-space-md py-3.5 font-body-sm text-body-sm font-medium text-secondary hover:text-on-surface transition-colors" to="/formation">
<span class="material-symbols-outlined text-[18px]">school</span>
<span>Formations</span>
</RouterLink>
</div>
</div>

<!-- Filter & Utility Toolbar -->
<div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-sm">
<div class="flex-1 flex flex-col sm:flex-row items-center gap-space-sm">
<div class="relative w-full sm:w-96">
<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
<input v-model="searchInput" class="h-10 w-full pl-9 pr-space-md rounded-lg bg-surface-container-low text-on-surface placeholder:text-outline font-body-sm text-body-sm focus:outline-none focus:bg-surface-container-lowest shadow-sm" placeholder="Rechercher par nom, email, identifiant..." type="text"/>
</div>
</div>
<div class="flex items-center justify-between lg:justify-end gap-space-sm">
<span class="font-body-sm text-body-sm text-secondary font-medium">
<span class="font-semibold text-on-surface">{{ totalRecords }}</span> comptes répertoriés
</span>
<button class="h-10 w-10 rounded-lg bg-surface-container-low text-secondary hover:text-on-surface hover:bg-surface-container transition-colors flex items-center justify-center shadow-sm" title="Actualiser la liste" type="button" @click="loadAccounts">
<span class="material-symbols-outlined text-[18px]" :class="{ 'animate-spin': loading }">refresh</span>
</button>
</div>
</div>

<!-- Loading -->
<div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
<div v-for="n in 6" :key="n" class="h-44 rounded-xl bg-surface-container-lowest animate-pulse"></div>
</div>

<!-- Empty -->
<div v-else-if="accounts.length === 0" class="text-center py-12 text-secondary bg-surface-container-lowest rounded-xl">
<span class="material-symbols-outlined text-[40px] mb-2 block opacity-30">group_off</span>
<p class="font-body-md text-body-md font-medium">Aucun compte trouvé</p>
</div>

<!-- Cards Grid (3 Columns) -->
<div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
<div v-for="row in accounts" :key="row.id" class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between group">
<div>
<div class="flex items-start justify-between gap-space-sm">
<div class="flex items-center gap-space-sm min-w-0">
<div class="w-10 h-10 rounded-full bg-primary-fixed text-primary font-headline-sm text-headline-sm flex items-center justify-center font-bold shrink-0">{{ initials(row.username) }}</div>
<div class="min-w-0">
<div class="font-headline-sm text-headline-sm text-on-surface truncate">{{ row.username }}</div>
<div class="font-body-sm text-body-sm text-secondary truncate">{{ row.email }}</div>
</div>
</div>
<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold shrink-0" :class="row.isActive ? 'bg-surface-container text-primary' : 'bg-surface-container text-secondary'">
<span class="w-1.5 h-1.5 rounded-full" :class="row.isActive ? 'bg-primary-container' : 'bg-outline'"></span>
{{ row.isActive ? 'Actif' : 'Inactif' }}
</span>
</div>
<div class="flex items-center gap-space-xs mt-3.5 flex-wrap">
<span
  v-for="r in row.role"
  :key="r.id"
  class="px-2 py-0.5 rounded-md font-label-sm text-label-sm font-semibold flex items-center gap-1"
  :class="r.name === 'BIM' ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant' : 'bg-secondary-container text-on-secondary-fixed-variant'"
>
<span class="material-symbols-outlined text-[14px]">{{ r.name === 'BIM' ? 'shield_person' : 'corporate_fare' }}</span>
{{ roleLabel(r.name) }}
</span>
<span v-if="row.isBlocked" class="px-2 py-0.5 rounded-md bg-error-container text-on-error-container font-label-sm text-label-sm font-medium">Bloqué</span>
<span v-else class="px-2 py-0.5 rounded-md bg-surface-container-low text-secondary font-label-sm text-label-sm font-medium">Normal</span>
</div>
<div v-if="row.role?.some((r) => r.name !== 'BIM')" class="flex items-center gap-1 text-outline mt-3">
<span class="material-symbols-outlined text-[16px]" :style="companyRating(row) > 0 ? { color: 'var(--p-tertiary-container)' } : undefined">star_rate</span>
<span class="font-body-sm text-body-sm font-semibold text-on-surface">{{ companyRating(row) > 0 ? companyRating(row).toFixed(1) : 'Aucun avis enregistré' }}</span>
</div>
</div>
<div class="mt-space-md pt-space-sm flex items-center justify-between bg-surface-container-low/60 -mx-space-md -mb-space-md px-space-md py-space-sm rounded-b-xl">
<div class="flex items-center gap-1 text-secondary font-label-sm text-label-sm">
<span class="material-symbols-outlined text-[14px]">calendar_today</span>
<span>Créé le {{ formatDate(row.createdAt) }}</span>
</div>
<div class="flex items-center gap-1">
<button class="w-8 h-8 rounded-lg bg-surface-container-lowest text-secondary hover:text-primary hover:bg-surface-container transition-colors flex items-center justify-center shadow-sm" title="Éditer le compte" type="button" @click="openEdit(row)">
<span class="material-symbols-outlined text-[16px]">edit</span>
</button>
<button class="w-8 h-8 rounded-lg bg-surface-container-lowest text-secondary hover:text-primary-container hover:bg-surface-container transition-colors flex items-center justify-center shadow-sm disabled:opacity-50" title="Changer l'état d'activité" type="button" :disabled="actionId === row.id" @click="toggleActive(row)">
<span class="material-symbols-outlined text-[16px]">power_settings_new</span>
</button>
<button class="w-8 h-8 rounded-lg bg-surface-container-lowest text-secondary hover:text-tertiary-container hover:bg-tertiary-fixed/40 transition-colors flex items-center justify-center shadow-sm disabled:opacity-50" title="Restreindre / Bloquer" type="button" :disabled="actionId === row.id" @click="toggleBlock(row)">
<span class="material-symbols-outlined text-[16px]">block</span>
</button>
<button class="w-8 h-8 rounded-lg bg-surface-container-lowest text-secondary hover:text-error hover:bg-error-container/40 transition-colors flex items-center justify-center shadow-sm disabled:opacity-50" title="Supprimer définitivement" type="button" :disabled="actionId === row.id" @click="removeAccount(row)">
<span class="material-symbols-outlined text-[16px]">delete</span>
</button>
</div>
</div>
</div>
</div>

<!-- Pagination -->
<div v-if="totalRecords > 0" class="flex flex-col sm:flex-row items-center justify-between gap-space-md bg-surface-container-lowest p-space-md rounded-xl shadow-sm text-secondary">
<div class="font-body-sm text-body-sm">
Page <span class="font-semibold text-on-surface">{{ currentPage }}</span> sur <span class="font-semibold text-on-surface">{{ totalPages }}</span> — {{ totalRecords }} administrateurs
</div>
<div class="flex items-center gap-1">
<button class="w-9 h-9 rounded-lg bg-surface-container-low text-secondary flex items-center justify-center hover:bg-surface-container transition-colors disabled:opacity-50" :disabled="currentPage <= 1" type="button" @click="goToPage(currentPage - 1)">
<span class="material-symbols-outlined text-[18px]">chevron_left</span>
</button>
<button class="w-9 h-9 rounded-lg bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold flex items-center justify-center shadow-sm" type="button">{{ currentPage }}</button>
<button class="w-9 h-9 rounded-lg bg-surface-container-low text-secondary flex items-center justify-center hover:bg-surface-container transition-colors disabled:opacity-50" :disabled="currentPage >= totalPages" type="button" @click="goToPage(currentPage + 1)">
<span class="material-symbols-outlined text-[18px]">chevron_right</span>
</button>
</div>
</div>
</div>

<!-- Edit Dialog -->
<div v-if="editDialog" class="fixed inset-0 z-[90] flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm p-4" @click.self="editDialog = false">
<div class="w-full max-w-md bg-white rounded-2xl shadow-xl p-space-lg space-y-space-md">
<h2 class="font-headline-md text-headline-md font-bold text-on-surface">Modifier le compte</h2>
<div class="space-y-space-sm">
<div>
<label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Nom d'utilisateur</label>
<input v-model="editForm.username" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" type="text"/>
</div>
<div>
<label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Email</label>
<input v-model="editForm.email" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" type="email"/>
</div>
<div>
<label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Nom complet</label>
<input v-model="editForm.fullname" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" type="text"/>
</div>
<div>
<label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Téléphone</label>
<input v-model="editForm.telephone" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" type="text"/>
</div>
</div>
<div class="flex justify-end gap-space-sm pt-space-sm">
<button class="h-10 px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm font-medium" type="button" :disabled="editSaving" @click="editDialog = false">Annuler</button>
<button class="h-10 px-space-md rounded-lg bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold disabled:opacity-60" type="button" :disabled="editSaving" @click="saveEdit">{{ editSaving ? 'Enregistrement…' : 'Enregistrer' }}</button>
</div>
</div>
</div>

<!-- Create Account Dialog -->
<div v-if="createDialog" class="fixed inset-0 z-[90] flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm p-4" @click.self="createDialog = false">
<div class="w-full bg-white rounded-2xl shadow-xl p-space-lg space-y-space-md overflow-y-auto max-h-[90vh]" :class="createStep === 'choice' ? 'max-w-sm' : 'max-w-lg'">
<h2 class="font-headline-md text-headline-md font-bold text-on-surface">
{{ createStep === 'choice' ? 'Créer un compte' : createStep === 'bim' ? 'Compte BIM Admin' : 'Compte Entreprise' }}
</h2>

<!-- Étape 1 : choix -->
<div v-if="createStep === 'choice'" class="space-y-space-sm">
<p class="font-body-sm text-body-sm text-secondary">Quel type de compte voulez-vous créer ?</p>
<button type="button" class="w-full p-space-md rounded-xl flex items-center gap-space-sm text-left border border-surface-container hover:border-primary transition-colors" @click="createStep = 'bim'">
<div class="w-11 h-11 rounded-xl bg-tertiary-fixed flex items-center justify-center shrink-0 text-tertiary-container">
<span class="material-symbols-outlined text-[22px]">shield_person</span>
</div>
<div class="flex-1 min-w-0">
<div class="font-headline-sm text-body-md font-semibold text-on-surface">Compte BIM Admin</div>
<div class="font-label-sm text-label-sm text-secondary">Gère utilisateurs, commandes et tout l'espace Gestion</div>
</div>
<span class="material-symbols-outlined text-secondary">chevron_right</span>
</button>
<button type="button" class="w-full p-space-md rounded-xl flex items-center gap-space-sm text-left border border-surface-container hover:border-primary transition-colors" @click="createStep = 'company'">
<div class="w-11 h-11 rounded-xl bg-primary-container/10 flex items-center justify-center shrink-0 text-primary-container">
<span class="material-symbols-outlined text-[22px]">domain</span>
</div>
<div class="flex-1 min-w-0">
<div class="font-headline-sm text-body-md font-semibold text-on-surface">Compte Entreprise</div>
<div class="font-label-sm text-label-sm text-secondary">Crée une nouvelle entreprise et son administrateur</div>
</div>
<span class="material-symbols-outlined text-secondary">chevron_right</span>
</button>
</div>

<!-- Étape BIM Admin -->
<div v-else-if="createStep === 'bim'" class="space-y-space-sm">
<div>
<label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Nom d'utilisateur</label>
<input v-model="bimForm.username" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" placeholder="ex: john_bim" type="text"/>
</div>
<div>
<label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Email</label>
<input v-model="bimForm.email" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" placeholder="admin@bimreseau.com" type="email"/>
</div>
<div>
<label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Mot de passe</label>
<input v-model="bimForm.password" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" placeholder="Mot de passe fort" type="password"/>
</div>
<div class="flex justify-between gap-space-sm pt-space-sm">
<button class="h-10 px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm font-medium" type="button" @click="createStep = 'choice'">Retour</button>
<div class="flex gap-space-sm">
<button class="h-10 px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm font-medium" type="button" :disabled="createSaving" @click="createDialog = false">Annuler</button>
<button class="h-10 px-space-md rounded-lg bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold disabled:opacity-60" type="button" :disabled="createSaving || !bimForm.username || !bimForm.email || !bimForm.password" @click="submitBimAdmin">{{ createSaving ? 'Création…' : 'Créer le compte' }}</button>
</div>
</div>
</div>

<!-- Étape Entreprise -->
<div v-else class="space-y-space-md">
<div>
<p class="font-label-sm text-label-sm font-semibold text-primary uppercase tracking-wide mb-space-sm">Informations de l'entreprise</p>
<div class="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
<div>
<label class="font-label-sm text-label-sm text-secondary block mb-1">Nom *</label>
<input v-model="companyForm.company.name" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" placeholder="Ex: Acme SARL" type="text"/>
</div>
<div>
<label class="font-label-sm text-label-sm text-secondary block mb-1">Email *</label>
<input v-model="companyForm.company.email" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" placeholder="contact@entreprise.com" type="email"/>
</div>
<div>
<label class="font-label-sm text-label-sm text-secondary block mb-1">Secteur</label>
<select v-model="companyForm.company.businessId" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none">
<option value="">Choisir un secteur</option>
<option v-for="s in sectorOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
</select>
</div>
<div>
<label class="font-label-sm text-label-sm text-secondary block mb-1">Localisation</label>
<input v-model="companyForm.company.location" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" placeholder="Ex: Kinshasa" type="text"/>
</div>
</div>
</div>
<div class="h-px bg-surface-container"></div>
<div>
<p class="font-label-sm text-label-sm font-semibold text-primary uppercase tracking-wide mb-space-sm">Administrateur de l'entreprise</p>
<div class="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
<div>
<label class="font-label-sm text-label-sm text-secondary block mb-1">Nom d'utilisateur *</label>
<input v-model="companyForm.admin.username" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" placeholder="Ex: john_doe" type="text"/>
</div>
<div>
<label class="font-label-sm text-label-sm text-secondary block mb-1">Email *</label>
<input v-model="companyForm.admin.email" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" placeholder="admin@entreprise.com" type="email"/>
</div>
</div>
<div class="mt-space-sm">
<label class="font-label-sm text-label-sm text-secondary block mb-1">Mot de passe *</label>
<input v-model="companyForm.admin.password" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" placeholder="Mot de passe sécurisé" type="password"/>
</div>
</div>
<div class="flex justify-between gap-space-sm pt-space-sm">
<button class="h-10 px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm font-medium" type="button" @click="createStep = 'choice'">Retour</button>
<div class="flex gap-space-sm">
<button class="h-10 px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm font-medium" type="button" :disabled="createSaving" @click="createDialog = false">Annuler</button>
<button class="h-10 px-space-md rounded-lg bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold disabled:opacity-60" type="button" :disabled="createSaving || !canSubmitCompany" @click="submitCompanyAccount">{{ createSaving ? 'Création…' : "Créer l'entreprise" }}</button>
</div>
</div>
</div>
</div>
</div>
</div>
</template>
