<script setup>
import { computed, onMounted, ref } from 'vue'
import apiClient from '@/api/client'
import { useToast } from '@/composables/useToast'
import SectionTabs from '@/components/SectionTabs.vue'

const toast = useToast()

const SERVER_ROOT = (import.meta.env.VITE_API_URL || 'http://localhost:8083/api/v1').replace(/\/api\/v\d+\/?$/, '')
function imageUrl(path) {
  if (!path) return null
  return path.startsWith('http') ? path : SERVER_ROOT + path
}

const TIER_OPTIONS = [
  { label: 'Bim Eco', value: 'eco' },
  { label: 'Bim Confort', value: 'confort' },
  { label: 'Bim Green', value: 'green' },
  { label: 'Bim Van', value: 'van' },
  { label: 'Moto Express', value: 'moto' }
]
function tierLabel(key) {
  return TIER_OPTIONS.find((t) => t.value === key)?.label ?? key
}

/* ── Chauffeurs ── */
const chauffeurs = ref([])
const chauffeursLoading = ref(false)
async function loadChauffeurs() {
  chauffeursLoading.value = true
  try {
    const { data } = await apiClient.get('/chauffeur', { params: { paginate: 'true', pageSize: 100 } })
    chauffeurs.value = data?.data ?? []
  } catch {
    toast.error('Impossible de charger les chauffeurs.')
  } finally {
    chauffeursLoading.value = false
  }
}
const onlineCount = computed(() => chauffeurs.value.filter((c) => c.isOnline).length)

const actionId = ref(null)
async function toggleOnline(row) {
  actionId.value = row.chauffeurId
  try {
    await apiClient.put(`/chauffeur/update/${row.chauffeurId}`, { isOnline: !row.isOnline })
    row.isOnline = !row.isOnline
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  } finally {
    actionId.value = null
  }
}
async function toggleActive(row) {
  actionId.value = row.chauffeurId
  try {
    const next = row.status === 'active' ? 'pending' : 'active'
    await apiClient.put(`/chauffeur/update/${row.chauffeurId}`, { status: next })
    row.status = next
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  } finally {
    actionId.value = null
  }
}
async function removeChauffeur(row) {
  if (!window.confirm(`Supprimer ce chauffeur (${row.plateNumber}) ?`)) return
  try {
    await apiClient.delete(`/chauffeur/delete/${row.chauffeurId}`)
    toast.success('Chauffeur supprimé.')
    await loadChauffeurs()
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  }
}

function emptyChauffeurForm() {
  return { userId: null, fullname: '', telephone: '', vehicleMake: '', vehicleModel: '', vehicleColor: '', plateNumber: '', vehicleTier: 'eco', seats: 4 }
}
const chauffeurDialog = ref(false)
const chauffeurSaving = ref(false)
const chauffeurForm = ref(emptyChauffeurForm())
const chauffeurImageFile = ref(null)
const chauffeurImagePreview = ref(null)
const chauffeurFileInput = ref(null)
const userSearch = ref('')
const userSuggestions = ref([])
const selectedUserLabel = ref('')

function openCreateChauffeur() {
  chauffeurForm.value = emptyChauffeurForm()
  chauffeurImageFile.value = null
  chauffeurImagePreview.value = null
  userSearch.value = ''
  userSuggestions.value = []
  selectedUserLabel.value = ''
  chauffeurDialog.value = true
}
let userSearchDebounce = null
function onUserSearchInput() {
  clearTimeout(userSearchDebounce)
  chauffeurForm.value.userId = null
  selectedUserLabel.value = ''
  userSearchDebounce = setTimeout(async () => {
    if (!userSearch.value) {
      userSuggestions.value = []
      return
    }
    try {
      const { data } = await apiClient.get('/auth/users', { params: { search: userSearch.value, paginate: 'true', pageSize: 10 } })
      userSuggestions.value = data?.data ?? []
    } catch {
      userSuggestions.value = []
    }
  }, 350)
}
function pickUser(u) {
  chauffeurForm.value.userId = u.id
  selectedUserLabel.value = `${u.username} (${u.email})`
  if (!chauffeurForm.value.telephone) chauffeurForm.value.telephone = u.telephone ?? ''
  userSuggestions.value = []
  userSearch.value = ''
}
function onChauffeurFileChange(event) {
  const file = event.target.files[0]
  if (!file) return
  chauffeurImageFile.value = file
  chauffeurImagePreview.value = URL.createObjectURL(file)
}
const canCreateChauffeur = computed(() => (!!chauffeurForm.value.userId || !!chauffeurForm.value.fullname.trim()) && !!chauffeurForm.value.plateNumber)

async function submitCreateChauffeur() {
  chauffeurSaving.value = true
  try {
    const fd = new FormData()
    Object.entries(chauffeurForm.value).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') fd.append(k, v)
    })
    if (chauffeurImageFile.value) fd.append('image', chauffeurImageFile.value)
    await apiClient.post('/chauffeur/admin-create', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    toast.success('Chauffeur ajouté.')
    chauffeurDialog.value = false
    await loadChauffeurs()
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  } finally {
    chauffeurSaving.value = false
  }
}

/* ── Tarifs & gammes ── */
const tiers = ref([])
const tiersLoading = ref(false)
async function loadTiers() {
  tiersLoading.value = true
  try {
    const { data } = await apiClient.get('/ride-tiers')
    tiers.value = (data?.data ?? data ?? []).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  } catch {
    toast.error('Impossible de charger les tarifs.')
  } finally {
    tiersLoading.value = false
  }
}
async function toggleTierActive(row) {
  try {
    await apiClient.put(`/ride-tiers/${row.tierKey}`, { active: !row.active })
    row.active = !row.active
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  }
}

function emptyTierForm() {
  return { tierKey: '', label: '', base: null, perKm: null, seats: 4, etaMin: 3 }
}
const tierDialog = ref(false)
const tierDialogMode = ref('create')
const tierSaving = ref(false)
const tierForm = ref(emptyTierForm())
function openCreateTier() {
  tierDialogMode.value = 'create'
  tierForm.value = emptyTierForm()
  tierDialog.value = true
}
function openEditTier(row) {
  tierDialogMode.value = 'edit'
  tierForm.value = { tierKey: row.tierKey, label: row.label, base: row.base, perKm: row.perKm, seats: row.seats, etaMin: row.etaMin }
  tierDialog.value = true
}
const canSubmitTier = computed(() => !!tierForm.value.tierKey && !!tierForm.value.label && tierForm.value.base !== null && tierForm.value.perKm !== null)
async function saveTier() {
  tierSaving.value = true
  try {
    const payload = { label: tierForm.value.label, base: tierForm.value.base, perKm: tierForm.value.perKm, seats: tierForm.value.seats, etaMin: tierForm.value.etaMin }
    if (tierDialogMode.value === 'create') {
      await apiClient.post('/ride-tiers', { tierKey: tierForm.value.tierKey, ...payload })
      toast.success('Gamme créée.')
    } else {
      await apiClient.put(`/ride-tiers/${tierForm.value.tierKey}`, payload)
      toast.success('Gamme modifiée.')
    }
    tierDialog.value = false
    await loadTiers()
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  } finally {
    tierSaving.value = false
  }
}
async function removeTier(row) {
  if (!window.confirm(`Supprimer la gamme « ${row.label} » ?`)) return
  try {
    await apiClient.delete(`/ride-tiers/${row.tierKey}`)
    toast.success('Gamme supprimée.')
    await loadTiers()
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  }
}

/* ── Matching & dispatch (courses) ── */
const STATUS_LABEL = { searching: 'En recherche', accepted: 'Acceptée', arriving: 'En approche', in_progress: 'En course', completed: 'Terminée', cancelled: 'Annulée' }
const rides = ref([])
const ridesLoading = ref(false)
const statusFilter = ref('')
async function loadRides() {
  ridesLoading.value = true
  try {
    const { data } = await apiClient.get('/ride/admin/all', { params: { status: statusFilter.value || undefined, pageSize: 30 } })
    rides.value = data?.data ?? []
  } catch {
    toast.error('Impossible de charger les courses.')
  } finally {
    ridesLoading.value = false
  }
}
const availableChauffeurs = ref([])
async function loadAvailableChauffeurs() {
  try {
    const { data } = await apiClient.get('/ride/admin/available-chauffeurs')
    availableChauffeurs.value = data?.data ?? []
  } catch {
    /* non bloquant */
  }
}
function fmt(n) {
  return Number(n ?? 0).toFixed(2)
}
function formatDateTime(d) {
  return d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'
}
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
const assignDialog = ref(false)
const assignTarget = ref(null)
const selectedChauffeurId = ref(null)
const assigning = ref(false)
const sortedAvailableChauffeurs = computed(() => {
  const pLat = assignTarget.value?.pickupLat != null ? Number(assignTarget.value.pickupLat) : null
  const pLng = assignTarget.value?.pickupLng != null ? Number(assignTarget.value.pickupLng) : null
  const withDistance = availableChauffeurs.value.map((c) => {
    const hasCoords = pLat != null && pLng != null && c.latitude != null && c.longitude != null
    const distanceKm = hasCoords ? haversineKm(pLat, pLng, Number(c.latitude), Number(c.longitude)) : null
    return { ...c, distanceKm }
  })
  return withDistance.sort((a, b) => {
    if (a.distanceKm == null) return 1
    if (b.distanceKm == null) return -1
    return a.distanceKm - b.distanceKm
  })
})
function proximityLabel(distanceKm) {
  if (distanceKm == null) return null
  if (distanceKm < 1.5) return 'Très proche'
  if (distanceKm < 5) return 'Proche'
  return 'Loin'
}
function openAssign(row) {
  assignTarget.value = row
  selectedChauffeurId.value = null
  assignDialog.value = true
}
async function confirmAssign() {
  if (!selectedChauffeurId.value || !assignTarget.value) return
  assigning.value = true
  try {
    await apiClient.post(`/ride/admin/${assignTarget.value.rideNumber}/assign`, { chauffeurId: selectedChauffeurId.value })
    toast.success("Chauffeur assigné — vous pouvez l'appeler pour confirmer.")
    assignDialog.value = false
    await Promise.all([loadRides(), loadAvailableChauffeurs()])
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  } finally {
    assigning.value = false
  }
}

const transportSectionTabs = [
  { key: 'drivers', label: 'Chauffeurs', icon: 'badge' },
  { key: 'pricing', label: 'Tarifs & gammes', icon: 'payments' },
  { key: 'dispatch', label: 'Matching & dispatch', icon: 'route' }
]
const transportSection = ref('drivers')

onMounted(() => {
  loadChauffeurs()
  loadTiers()
  loadRides()
  loadAvailableChauffeurs()
})
</script>

<template>
<div class="flex flex-col w-full">
<div class="px-space-lg pt-space-lg pb-space-md">
<div class="flex items-center gap-space-xs text-label-sm font-label-sm text-secondary mb-1.5">
<span>Gestion</span>
<span class="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
<span class="text-on-surface font-semibold">BIM Transport</span>
</div>
<div class="flex flex-col xl:flex-row xl:items-center justify-between gap-space-md">
<div>
<h1 class="font-headline-lg text-headline-lg text-on-surface tracking-tight flex items-center gap-2">
BIM Transport &amp; Mobilité Urbaine
<span class="w-2.5 h-2.5 rounded-full" :class="onlineCount > 0 ? 'bg-primary animate-pulse' : 'bg-error'"></span>
</h1>
<p class="font-body-sm text-body-sm text-secondary mt-0.5 max-w-3xl">Supervision en temps réel de la flotte, matching manuel des courses et configuration de la tarification en Ecoins (EC).</p>
</div>
</div>
<div class="mt-space-lg flex items-center gap-2 overflow-x-auto border-b border-surface-container-highest pb-0.5">
<RouterLink class="flex items-center gap-2 px-3 py-2 text-body-sm font-body-sm text-secondary hover:text-on-surface transition-colors whitespace-nowrap" to="/comptes">
<span class="material-symbols-outlined text-[18px]">group</span><span>Comptes</span>
</RouterLink>
<RouterLink class="flex items-center gap-2 px-3 py-2 text-body-sm font-body-sm text-secondary hover:text-on-surface transition-colors whitespace-nowrap" to="/utilisateurs-acces">
<span class="material-symbols-outlined text-[18px]">shield_person</span><span>Utilisateurs &amp; Accès</span>
</RouterLink>
<RouterLink class="flex items-center gap-2 px-3 py-2 text-body-sm font-body-sm text-secondary hover:text-on-surface transition-colors whitespace-nowrap" to="/entreprises">
<span class="material-symbols-outlined text-[18px]">storefront</span><span>Entreprises &amp; Commerce</span>
</RouterLink>
<RouterLink class="flex items-center gap-2 px-3 py-2 text-body-sm font-body-sm text-secondary hover:text-on-surface transition-colors whitespace-nowrap" to="/catalogue">
<span class="material-symbols-outlined text-[18px]">inventory_2</span><span>Catalogue Produits</span>
</RouterLink>
<a class="flex items-center gap-2 px-3.5 py-2 text-body-sm font-body-sm font-semibold text-primary border-b-2 border-primary -mb-0.5 whitespace-nowrap" href="#">
<span class="material-symbols-outlined text-[18px]">directions_car</span><span>BIM Transport</span>
<span class="ml-1 px-1.5 py-0.2 rounded-full text-label-sm font-label-sm bg-primary-fixed text-on-primary-fixed">{{ tiers.length }} gammes</span>
</a>
<RouterLink class="flex items-center gap-2 px-3 py-2 text-body-sm font-body-sm text-secondary hover:text-on-surface transition-colors whitespace-nowrap" to="/commandes">
<span class="material-symbols-outlined text-[18px]">local_shipping</span><span>Commandes &amp; Livraisons</span>
</RouterLink>
</div>
</div>

<div class="px-space-lg mb-space-lg">
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md">
<div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between">
<div class="flex items-center justify-between">
<span class="font-body-sm text-body-sm text-secondary">Chauffeurs en ligne</span>
<div class="w-8 h-8 rounded-lg flex items-center justify-center" :class="onlineCount > 0 ? 'bg-primary-fixed text-primary' : 'bg-error-container text-on-error-container'">
<span class="material-symbols-outlined text-[18px]">{{ onlineCount > 0 ? 'directions_car' : 'car_crash' }}</span>
</div>
</div>
<div class="mt-3 flex items-baseline gap-2">
<span class="font-numeric-kpi text-numeric-kpi text-on-surface">{{ onlineCount }}</span>
<span class="font-body-sm text-body-sm text-secondary">/ {{ chauffeurs.length }} inscrits</span>
</div>
</div>
<div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between">
<div class="flex items-center justify-between">
<span class="font-body-sm text-body-sm text-secondary">Gammes actives</span>
<div class="w-8 h-8 rounded-lg bg-surface-container-high text-primary flex items-center justify-center"><span class="material-symbols-outlined text-[18px]">commute</span></div>
</div>
<div class="mt-3 flex items-baseline gap-2">
<span class="font-numeric-kpi text-numeric-kpi text-primary-container">{{ tiers.filter((t) => t.active).length }}</span>
<span class="font-body-sm text-body-sm text-secondary">/ {{ tiers.length }} configurées</span>
</div>
</div>
<div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between">
<div class="flex items-center justify-between">
<span class="font-body-sm text-body-sm text-secondary">Chauffeurs disponibles</span>
<div class="w-8 h-8 rounded-lg bg-secondary-container text-on-secondary-fixed flex items-center justify-center"><span class="material-symbols-outlined text-[18px]">how_to_reg</span></div>
</div>
<div class="mt-3 flex items-baseline gap-2">
<span class="font-numeric-kpi text-numeric-kpi text-on-surface">{{ availableChauffeurs.length }}</span>
<span class="font-body-sm text-body-sm text-secondary">pour dispatch</span>
</div>
</div>
<div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between">
<div class="flex items-center justify-between">
<span class="font-body-sm text-body-sm text-secondary">Courses en recherche</span>
<div class="w-8 h-8 rounded-lg bg-surface-container text-secondary flex items-center justify-center"><span class="material-symbols-outlined text-[18px]">route</span></div>
</div>
<div class="mt-3 flex items-baseline gap-2">
<span class="font-numeric-kpi text-numeric-kpi text-on-surface">{{ rides.filter((r) => r.status === 'searching').length }}</span>
<span class="font-body-sm text-body-sm text-secondary">en attente d'assignation</span>
</div>
</div>
</div>
</div>

<div class="px-space-lg space-y-space-xl pb-space-xl">
<SectionTabs v-model="transportSection" :tabs="transportSectionTabs" />

<!-- SECTION 1: Chauffeurs -->
<section v-show="transportSection === 'drivers'" class="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
<div class="p-space-md bg-surface-container-low/40 flex flex-col md:flex-row md:items-center justify-between gap-space-md">
<div class="flex items-start gap-3">
<div class="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"><span class="material-symbols-outlined text-[22px]">directions_car</span></div>
<div>
<h2 class="font-headline-sm text-headline-sm text-on-surface">Chauffeurs BIM Transport</h2>
<p class="font-body-sm text-body-sm text-secondary mt-0.5">Chauffeurs disponibles pour le matching manuel des courses.</p>
</div>
</div>
<button class="h-9 px-3.5 rounded-lg bg-primary-container text-on-primary text-body-sm font-body-sm font-medium shadow-sm hover:bg-primary transition-all flex items-center gap-1.5" type="button" @click="openCreateChauffeur">
<span class="material-symbols-outlined text-[18px]">person_add</span><span>+ Ajouter un chauffeur</span>
</button>
</div>

<div class="p-space-md">
<div v-if="chauffeursLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
<div v-for="n in 3" :key="n" class="h-48 rounded-xl bg-surface-container-low animate-pulse"></div>
</div>
<div v-else-if="chauffeurs.length === 0" class="p-space-xl flex flex-col items-center justify-center text-center">
<span class="material-symbols-outlined text-outline text-[48px] mb-space-sm opacity-40">local_taxi</span>
<h3 class="font-headline-sm text-headline-sm text-on-surface">Aucun chauffeur — le matching ne trouvera personne</h3>
<p class="font-body-sm text-body-sm text-secondary mt-1.5">Enrôlez des chauffeurs partenaires pour activer le dispatch.</p>
</div>
<div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
<div v-for="row in chauffeurs" :key="row.chauffeurId" class="bg-surface-container-low/60 rounded-xl p-space-md shadow-xs flex flex-col gap-space-sm">
<div class="flex items-center gap-space-sm">
<img v-if="imageUrl(row.avatarUrl)" :src="imageUrl(row.avatarUrl)" alt="" class="w-10 h-10 rounded-full object-cover shrink-0"/>
<div v-else class="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-secondary shrink-0"><span class="material-symbols-outlined text-[20px]">person</span></div>
<div class="flex-1 min-w-0">
<div class="font-headline-sm text-body-sm font-semibold text-on-surface truncate">{{ row.user?.username ?? row.fullname ?? `Chauffeur #${row.chauffeurId}` }}</div>
<div class="font-label-sm text-label-sm text-secondary truncate">{{ row.telephone }}</div>
</div>
<span class="px-2 py-0.5 rounded text-label-sm font-label-sm bg-surface-container text-primary font-semibold shrink-0">{{ tierLabel(row.vehicleTier) }}</span>
</div>
<div v-if="row.accessCode" class="flex items-center justify-between gap-2 rounded-lg bg-primary-fixed/50 px-2.5 py-1.5">
<span class="font-label-sm text-label-sm text-secondary">Code d'accès</span>
<span class="font-mono font-bold text-body-sm text-primary tracking-wider">{{ row.accessCode }}</span>
</div>
<div class="flex items-center justify-between gap-2 font-body-sm text-body-sm">
<span>{{ row.vehicleMake }} {{ row.vehicleModel }} <span class="text-secondary">· {{ row.vehicleColor }}</span></span>
<span class="px-2 py-0.5 rounded bg-surface-container text-secondary font-label-sm text-label-sm">{{ row.plateNumber }}</span>
</div>
<div class="font-label-sm text-label-sm text-secondary">⭐ {{ Number(row.rating ?? 5).toFixed(2) }} ({{ row.totalRides ?? 0 }} courses)</div>
<div class="flex items-center justify-between gap-2 pt-2 border-t border-surface-container">
<label class="flex items-center gap-1.5 cursor-pointer select-none" :class="{ 'opacity-50': actionId === row.chauffeurId }">
<input :checked="!!row.isOnline" class="sr-only peer" type="checkbox" :disabled="actionId === row.chauffeurId" @change="toggleOnline(row)"/>
<div class="w-7 h-4 bg-surface-container rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-3 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-3 after:w-3 after:transition-all relative"></div>
<span class="font-label-sm text-label-sm text-secondary">En ligne</span>
</label>
<label class="flex items-center gap-1.5 cursor-pointer select-none" :class="{ 'opacity-50': actionId === row.chauffeurId }">
<input :checked="row.status === 'active'" class="sr-only peer" type="checkbox" :disabled="actionId === row.chauffeurId" @change="toggleActive(row)"/>
<div class="w-7 h-4 bg-surface-container rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-3 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-3 after:w-3 after:transition-all relative"></div>
<span class="font-label-sm text-label-sm text-secondary">Actif</span>
</label>
<button class="w-8 h-8 rounded-lg text-secondary hover:text-error hover:bg-error-container/30 flex items-center justify-center transition-colors" title="Supprimer" type="button" @click="removeChauffeur(row)">
<span class="material-symbols-outlined text-[18px]">delete</span>
</button>
</div>
</div>
</div>
</div>
</section>

<!-- SECTION 2: Tarifs & gammes -->
<section v-show="transportSection === 'pricing'" class="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg">
<div class="flex flex-col md:flex-row md:items-center justify-between gap-space-md mb-space-lg pb-space-sm border-b border-surface-container">
<div>
<div class="flex items-center gap-2">
<div class="w-7 h-7 rounded-md bg-secondary-container text-on-secondary-fixed flex items-center justify-center"><span class="material-symbols-outlined text-[18px]">attach_money</span></div>
<h2 class="font-headline-sm text-headline-sm text-on-surface">Tarifs BIM Transport</h2>
</div>
<p class="font-body-sm text-body-sm text-secondary mt-1">Prix de base et prix au kilomètre par gamme de véhicule (en EC).</p>
</div>
<button class="h-9 px-3.5 rounded-lg bg-primary-container text-on-primary text-body-sm font-body-sm font-medium shadow-sm hover:bg-primary transition-all flex items-center gap-1.5 shrink-0" type="button" @click="openCreateTier">
<span class="material-symbols-outlined text-[18px]">add_circle</span><span>+ Ajouter une gamme</span>
</button>
</div>

<div v-if="tiersLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
<div v-for="n in 3" :key="n" class="h-56 rounded-xl bg-surface-container-low animate-pulse"></div>
</div>
<div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
<div v-for="row in tiers" :key="row.tierKey" class="rounded-xl p-space-md shadow-xs flex flex-col justify-between transition-all" :class="row.active ? 'bg-surface-container-low/60' : 'bg-surface-container-low/40 opacity-85 hover:opacity-100'">
<div>
<div class="flex items-start justify-between">
<div>
<h3 class="font-headline-sm text-headline-sm text-on-surface leading-tight">{{ row.label }}</h3>
<span class="px-1.5 py-0.2 rounded text-label-sm font-label-sm bg-surface-container text-primary font-semibold">{{ row.tierKey }}</span>
</div>
<label class="relative inline-flex items-center cursor-pointer">
<input :checked="!!row.active" class="sr-only peer" type="checkbox" @change="toggleTierActive(row)"/>
<div class="w-11 h-6 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container relative"></div>
</label>
</div>
<div class="mt-4 p-space-sm bg-surface-container-lowest rounded-lg space-y-2">
<div class="flex items-center justify-between text-body-sm font-body-sm">
<span class="text-secondary">Prix de base :</span>
<span class="font-semibold text-primary">{{ fmt(row.base) }} EC</span>
</div>
<div class="h-px bg-surface-container-low"></div>
<div class="flex items-center justify-between text-body-sm font-body-sm">
<span class="text-secondary">Prix / km :</span>
<span class="font-semibold text-primary">{{ fmt(row.perKm) }} EC</span>
</div>
</div>
<div class="mt-3 flex flex-wrap items-center gap-1.5">
<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-label-sm font-label-sm bg-surface-container text-on-surface">
<span class="material-symbols-outlined text-[14px] text-secondary">airline_seat_recline_normal</span>{{ row.seats }} places
</span>
<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-label-sm font-label-sm bg-surface-container text-on-surface">
<span class="material-symbols-outlined text-[14px] text-secondary">timer</span>{{ row.etaMin }} min ETA
</span>
</div>
</div>
<div class="mt-4 pt-3 border-t border-surface-container flex items-center justify-between">
<span class="inline-flex items-center gap-1 text-label-sm font-label-sm" :class="row.active ? 'text-primary font-medium' : 'text-secondary'">
<span class="w-2 h-2 rounded-full" :class="row.active ? 'bg-primary-container' : 'bg-outline'"></span>{{ row.active ? 'Gamme active' : 'Gamme en veille' }}
</span>
<div class="flex items-center gap-1">
<button class="w-8 h-8 rounded-lg text-secondary hover:text-primary hover:bg-surface-container flex items-center justify-center transition-colors" title="Modifier le tarif" type="button" @click="openEditTier(row)">
<span class="material-symbols-outlined text-[18px]">edit</span>
</button>
<button class="w-8 h-8 rounded-lg text-secondary hover:text-error hover:bg-error-container/30 flex items-center justify-center transition-colors" title="Supprimer la gamme" type="button" @click="removeTier(row)">
<span class="material-symbols-outlined text-[18px]">delete</span>
</button>
</div>
</div>
</div>
<button class="border-2 border-dashed border-surface-container-highest rounded-xl p-space-md flex flex-col items-center justify-center text-center hover:border-primary/40 hover:bg-surface-container/20 transition-all cursor-pointer min-h-[200px]" type="button" @click="openCreateTier">
<div class="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-primary mb-2"><span class="material-symbols-outlined text-[24px]">add</span></div>
<span class="font-headline-sm text-body-md font-semibold text-on-surface">Créer une nouvelle gamme</span>
</button>
</div>
</section>

<!-- SECTION 3: Matching & dispatch -->
<section v-show="transportSection === 'dispatch'" class="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg">
<div class="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md mb-space-md pb-space-sm border-b border-surface-container">
<div>
<div class="flex items-center gap-2">
<div class="w-7 h-7 rounded-md bg-primary-fixed flex items-center justify-center text-primary"><span class="material-symbols-outlined text-[18px]">hub</span></div>
<h2 class="font-headline-sm text-headline-sm text-on-surface">Courses &amp; assignation manuelle</h2>
</div>
<p class="font-body-sm text-body-sm text-secondary mt-1">Suivi des réservations — assignez un chauffeur disponible puis appelez-le pour confirmer.</p>
</div>
<select v-model="statusFilter" class="h-9 px-3 rounded-lg bg-surface-container-low text-body-sm font-body-sm text-on-surface focus:outline-none" @change="loadRides">
<option value="">Tous les statuts</option>
<option v-for="(label, value) in STATUS_LABEL" :key="value" :value="value">{{ label }}</option>
</select>
</div>

<div v-if="ridesLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
<div v-for="n in 3" :key="n" class="h-44 rounded-xl bg-surface-container-low animate-pulse"></div>
</div>
<div v-else-if="rides.length === 0" class="text-center py-12 text-secondary">
<span class="material-symbols-outlined text-[40px] mb-2 block opacity-30">route</span>
<p class="font-body-md text-body-md font-medium">Aucune course trouvée</p>
</div>
<div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
<div v-for="row in rides" :key="row.rideId" class="bg-surface-container-low/60 rounded-xl p-space-md shadow-xs flex flex-col gap-space-sm">
<div class="flex items-start justify-between gap-2">
<div class="min-w-0">
<div class="font-body-sm text-body-sm font-semibold text-on-surface truncate">{{ row.passenger?.username ?? '—' }}</div>
<div class="font-label-sm text-label-sm text-secondary truncate">{{ row.passenger?.telephone ?? row.passenger?.email ?? '—' }}</div>
</div>
<span class="px-2 py-0.5 rounded-full text-label-sm font-label-sm shrink-0" :class="row.status === 'completed' ? 'bg-primary-fixed text-primary' : row.status === 'cancelled' ? 'bg-error-container text-on-error-container' : 'bg-secondary-container text-on-secondary-fixed'">{{ STATUS_LABEL[row.status] ?? row.status }}</span>
</div>
<div class="flex flex-col gap-1 font-label-sm text-label-sm">
<div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-primary shrink-0"></span><span class="truncate">{{ row.pickupAddress }}</span></div>
<div class="flex items-center gap-2"><span class="material-symbols-outlined text-[14px] text-secondary">location_on</span><span class="truncate">{{ row.destinationAddress }}</span></div>
</div>
<div class="flex items-center justify-between gap-2 font-label-sm text-label-sm text-secondary">
<span>{{ tierLabel(row.vehicleTier) }} · {{ fmt(row.distanceKm) }} km</span>
<span class="font-semibold text-body-sm text-on-surface">{{ fmt(row.finalFare ?? row.estimatedFare) }} EC</span>
</div>
<div v-if="row.chauffeur" class="flex items-center justify-between gap-2 rounded-lg bg-surface-container-lowest px-2.5 py-1.5">
<div class="min-w-0">
<div class="font-label-sm text-label-sm font-medium truncate">{{ row.chauffeur.user?.username ?? 'Chauffeur' }}</div>
<div class="font-label-sm text-label-sm text-secondary truncate">{{ row.chauffeur.user?.telephone ?? row.chauffeur.telephone ?? '—' }}</div>
</div>
<a v-if="row.chauffeur.user?.telephone ?? row.chauffeur.telephone" :href="`tel:${row.chauffeur.user?.telephone ?? row.chauffeur.telephone}`" class="w-8 h-8 rounded-full bg-primary-fixed text-primary flex items-center justify-center shrink-0">
<span class="material-symbols-outlined text-[16px]">call</span>
</a>
</div>
<button v-else-if="row.status === 'searching'" class="h-9 rounded-lg bg-surface-container text-primary font-body-sm text-body-sm font-semibold hover:bg-primary hover:text-on-primary transition-colors flex items-center justify-center gap-1.5" type="button" @click="openAssign(row)">
<span class="material-symbols-outlined text-[18px]">person_add</span><span>Assigner un chauffeur</span>
</button>
<div class="font-label-sm text-label-sm text-secondary pt-2 border-t border-surface-container">{{ formatDateTime(row.createdAt) }}</div>
</div>
</div>
</section>
</div>

<!-- Dialog Nouveau chauffeur -->
<div v-if="chauffeurDialog" class="fixed inset-0 z-[90] flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm p-4" @click.self="chauffeurDialog = false">
<div class="w-full max-w-md bg-white rounded-2xl shadow-xl p-space-lg space-y-space-md overflow-y-auto max-h-[90vh]">
<h2 class="font-headline-md text-headline-md font-bold text-on-surface">Nouveau chauffeur</h2>
<div>
<label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Photo du véhicule / chauffeur</label>
<div class="flex items-center gap-space-sm">
<img v-if="chauffeurImagePreview" :src="chauffeurImagePreview" alt="" class="w-16 h-16 rounded-lg object-cover"/>
<div v-else class="w-16 h-16 rounded-lg bg-surface-container-low flex items-center justify-center text-secondary"><span class="material-symbols-outlined text-[24px] opacity-50">image</span></div>
<input ref="chauffeurFileInput" accept="image/*" class="hidden" type="file" @change="onChauffeurFileChange"/>
<button class="h-9 px-space-sm rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm font-medium" type="button" @click="chauffeurFileInput.click()">Choisir une image</button>
</div>
</div>
<div class="relative">
<label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Compte BIM existant (optionnel)</label>
<input v-model="userSearch" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" :placeholder="selectedUserLabel || 'Rechercher par nom ou email...'" type="text" @input="onUserSearchInput"/>
<div v-if="userSuggestions.length" class="absolute z-10 mt-1 w-full bg-white rounded-lg shadow-lg border border-surface-container overflow-hidden">
<button v-for="u in userSuggestions" :key="u.id" class="w-full text-left px-space-md py-2 hover:bg-surface-container-low flex flex-col" type="button" @click="pickUser(u)">
<span class="font-body-sm text-body-sm font-medium text-on-surface">{{ u.username }}</span>
<span class="font-label-sm text-label-sm text-secondary">{{ u.email }}</span>
</button>
</div>
<p class="font-label-sm text-label-sm text-secondary mt-1">Sans compte lié, remplissez le nom ci-dessous — un code d'accès personnel sera généré.</p>
</div>
<div v-if="!chauffeurForm.userId"><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Nom complet du chauffeur *</label><input v-model="chauffeurForm.fullname" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" placeholder="Jean Mukendi" type="text"/></div>
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Téléphone</label><input v-model="chauffeurForm.telephone" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" placeholder="+243..." type="text"/></div>
<div class="grid grid-cols-2 gap-space-sm">
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Marque</label><input v-model="chauffeurForm.vehicleMake" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" placeholder="Toyota..." type="text"/></div>
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Modèle</label><input v-model="chauffeurForm.vehicleModel" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" placeholder="Corolla..." type="text"/></div>
</div>
<div class="grid grid-cols-2 gap-space-sm">
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Couleur</label><input v-model="chauffeurForm.vehicleColor" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" type="text"/></div>
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Plaque *</label><input v-model="chauffeurForm.plateNumber" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" placeholder="AA-123-BB" type="text"/></div>
</div>
<div class="grid grid-cols-2 gap-space-sm">
<div>
<label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Gamme</label>
<select v-model="chauffeurForm.vehicleTier" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none">
<option v-for="t in TIER_OPTIONS" :key="t.value" :value="t.value">{{ t.label }}</option>
</select>
</div>
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Places</label><input v-model.number="chauffeurForm.seats" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" type="number"/></div>
</div>
<div class="flex justify-end gap-space-sm pt-space-sm">
<button class="h-10 px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm font-medium" type="button" :disabled="chauffeurSaving" @click="chauffeurDialog = false">Annuler</button>
<button class="h-10 px-space-md rounded-lg bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold disabled:opacity-60" type="button" :disabled="chauffeurSaving || !canCreateChauffeur" @click="submitCreateChauffeur">{{ chauffeurSaving ? 'Création…' : 'Créer' }}</button>
</div>
</div>
</div>

<!-- Dialog Gamme -->
<div v-if="tierDialog" class="fixed inset-0 z-[90] flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm p-4" @click.self="tierDialog = false">
<div class="w-full max-w-sm bg-white rounded-2xl shadow-xl p-space-lg space-y-space-md">
<h2 class="font-headline-md text-headline-md font-bold text-on-surface">{{ tierDialogMode === 'create' ? 'Nouvelle gamme' : 'Modifier la gamme' }}</h2>
<div v-if="tierDialogMode === 'create'"><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Clé (ex: eco, van) *</label><input v-model="tierForm.tierKey" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" type="text"/></div>
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Nom affiché *</label><input v-model="tierForm.label" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" placeholder="Bim Eco" type="text"/></div>
<div class="grid grid-cols-2 gap-space-sm">
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Prix de base (EC) *</label><input v-model.number="tierForm.base" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" type="number"/></div>
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Prix / km (EC) *</label><input v-model.number="tierForm.perKm" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" type="number"/></div>
</div>
<div class="grid grid-cols-2 gap-space-sm">
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Places</label><input v-model.number="tierForm.seats" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" type="number"/></div>
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">ETA (min)</label><input v-model.number="tierForm.etaMin" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" type="number"/></div>
</div>
<div class="flex justify-end gap-space-sm pt-space-sm">
<button class="h-10 px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm font-medium" type="button" :disabled="tierSaving" @click="tierDialog = false">Annuler</button>
<button class="h-10 px-space-md rounded-lg bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold disabled:opacity-60" type="button" :disabled="tierSaving || !canSubmitTier" @click="saveTier">{{ tierSaving ? 'Enregistrement…' : 'Enregistrer' }}</button>
</div>
</div>
</div>

<!-- Dialog Assigner chauffeur -->
<div v-if="assignDialog" class="fixed inset-0 z-[90] flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm p-4" @click.self="assignDialog = false">
<div class="w-full max-w-sm bg-white rounded-2xl shadow-xl p-space-lg space-y-space-md">
<h2 class="font-headline-md text-headline-md font-bold text-on-surface">Assigner un chauffeur</h2>
<p class="font-body-sm text-body-sm text-secondary">Choisissez un chauffeur disponible, trié du plus proche au plus loin — appelez-le ensuite pour confirmer.</p>
<div v-if="sortedAvailableChauffeurs.length === 0" class="text-center py-6 text-secondary font-body-sm text-body-sm">Aucun chauffeur disponible pour le moment.</div>
<div v-else class="space-y-space-sm max-h-80 overflow-y-auto">
<div v-for="c in sortedAvailableChauffeurs" :key="c.chauffeurId" class="flex items-center justify-between gap-2 rounded-lg border p-space-sm cursor-pointer" :class="selectedChauffeurId === c.chauffeurId ? 'border-primary bg-primary-fixed/30' : 'border-surface-container'" @click="selectedChauffeurId = c.chauffeurId">
<div class="min-w-0">
<div class="flex items-center gap-1.5 flex-wrap">
<span class="font-body-sm text-body-sm font-medium truncate">{{ c.user?.username ?? 'Chauffeur' }}</span>
<span class="px-1.5 py-0.2 rounded text-[10px] font-semibold" :class="c.isOnline ? 'bg-primary-fixed text-primary' : 'bg-surface-container text-secondary'">{{ c.isOnline ? 'En ligne' : 'Hors ligne' }}</span>
<span v-if="proximityLabel(c.distanceKm)" class="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-secondary-container text-on-secondary-fixed">{{ proximityLabel(c.distanceKm) }}</span>
</div>
<div class="font-label-sm text-label-sm text-secondary">
{{ c.user?.telephone ?? c.telephone ?? '—' }} · {{ tierLabel(c.vehicleTier) }} · ⭐ {{ Number(c.rating ?? 5).toFixed(1) }}
<template v-if="c.distanceKm != null"> · {{ c.distanceKm.toFixed(1) }} km</template>
</div>
</div>
<input :checked="selectedChauffeurId === c.chauffeurId" class="shrink-0" type="radio"/>
</div>
</div>
<div class="flex justify-end gap-space-sm pt-space-sm">
<button class="h-10 px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm font-medium" type="button" @click="assignDialog = false">Annuler</button>
<button class="h-10 px-space-md rounded-lg bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold disabled:opacity-60" type="button" :disabled="!selectedChauffeurId || assigning" @click="confirmAssign">{{ assigning ? 'Assignation…' : 'Assigner' }}</button>
</div>
</div>
</div>
</div>
</template>
