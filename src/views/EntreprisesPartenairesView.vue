<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import apiClient from '@/api/client'
import { useToast } from '@/composables/useToast'
import SectionTabs from '@/components/SectionTabs.vue'

const toast = useToast()

const sectionTabs = [
  { key: 'partners', label: 'Partenaires', icon: 'storefront' },
  { key: 'sectors', label: "Secteurs d'activité", icon: 'account_tree' },
  { key: 'commerces', label: 'Commerces & Branches', icon: 'hub' }
]
const section = ref('partners')

/* Compression d'image (logo entreprise) */
async function compressImage(file, maxBytes = 300 * 1024) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      let { width, height } = img
      const MAX_DIM = 1200
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      let quality = 0.85
      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (blob.size <= maxBytes || quality <= 0.15) {
              resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
            } else {
              quality -= 0.1
              tryCompress()
            }
          },
          'image/jpeg',
          quality
        )
      }
      tryCompress()
    }
    img.src = url
  })
}

/* Secteurs */
const sectors = ref([])
const sectorsLoading = ref(false)
async function loadSectors() {
  sectorsLoading.value = true
  try {
    const { data } = await apiClient.get('/sector')
    sectors.value = data?.data ?? []
  } catch {
    toast.error('Impossible de charger les secteurs.')
  } finally {
    sectorsLoading.value = false
  }
}
const sectorOptions = computed(() => sectors.value.map((s) => ({ label: s.name, value: s.businessId })))

const sectorDialog = ref(false)
const sectorSaving = ref(false)
const sectorForm = ref({ id: null, name: '', description: '' })
function openCreateSector() {
  sectorForm.value = { id: null, name: '', description: '' }
  sectorDialog.value = true
}
function openEditSector(row) {
  sectorForm.value = { id: row.businessId, name: row.name ?? '', description: row.description ?? '' }
  sectorDialog.value = true
}
async function saveSector() {
  sectorSaving.value = true
  try {
    const payload = { name: sectorForm.value.name, description: sectorForm.value.description || undefined }
    if (sectorForm.value.id) {
      await apiClient.put(`/sector/update/${sectorForm.value.id}`, payload)
      toast.success('Secteur modifié.')
    } else {
      await apiClient.post('/sector/create', [payload])
      toast.success('Secteur créé.')
    }
    sectorDialog.value = false
    await loadSectors()
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  } finally {
    sectorSaving.value = false
  }
}
async function removeSector(row) {
  if (!window.confirm(`Supprimer le secteur « ${row.name} » ?`)) return
  try {
    await apiClient.delete(`/sector/delete/${row.businessId}`)
    toast.success('Secteur supprimé.')
    await loadSectors()
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  }
}

/* Entreprises */
const searchInput = ref('')
const currentPage = ref(1)
const pageSize = ref(9)
const companies = ref([])
const totalRecords = ref(0)
const companiesLoading = ref(false)

async function loadCompanies() {
  companiesLoading.value = true
  try {
    const { data } = await apiClient.get('/company', { params: { search: searchInput.value || undefined, page: currentPage.value, pageSize: pageSize.value } })
    companies.value = data?.data ?? []
    totalRecords.value = data?.total ?? companies.value.length
  } catch {
    toast.error('Impossible de charger les entreprises.')
  } finally {
    companiesLoading.value = false
  }
}
let searchDebounce = null
watch(searchInput, () => {
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    currentPage.value = 1
    loadCompanies()
  }, 400)
})
const totalPages = computed(() => Math.max(1, Math.ceil(totalRecords.value / pageSize.value)))
function goToPage(p) {
  if (p < 1 || p > totalPages.value) return
  currentPage.value = p
  loadCompanies()
}

function initials(name) {
  return name ? name[0].toUpperCase() : '?'
}
function formatDate(d) {
  return d ? new Date(d).toLocaleDateString('fr-FR') : '—'
}
function companyRating(row) {
  return Number(row.note ?? row.rating ?? row.averageRating ?? 0)
}
function reviewCount(row) {
  return row._count?.reviews ?? row.reviewCount ?? row.avisCount ?? row.reviews?.length ?? 0
}

const companyDialog = ref(false)
const companyDialogMode = ref('create')
const companySaving = ref(false)
const companyForm = ref({ id: null, name: '', email: '', description: '', location: '', businessId: '' })
const logoFile = ref(null)
const logoPreview = ref(null)
const logoInput = ref(null)

function openCreateCompany() {
  companyDialogMode.value = 'create'
  companyForm.value = { id: null, name: '', email: '', description: '', location: '', businessId: '' }
  logoFile.value = null
  logoPreview.value = null
  companyDialog.value = true
}
function openEditCompany(row) {
  companyDialogMode.value = 'edit'
  companyForm.value = {
    id: row.companyId,
    name: row.name ?? '',
    email: row.email ?? '',
    description: row.description ?? '',
    location: row.location ?? '',
    businessId: row.businessId ?? ''
  }
  logoFile.value = null
  logoPreview.value = row.logo ?? null
  companyDialog.value = true
}
async function onLogoChange(event) {
  const file = event.target.files[0]
  if (!file) return
  logoFile.value = await compressImage(file)
  logoPreview.value = URL.createObjectURL(logoFile.value)
}
const canSubmitCompany = computed(() => !!companyForm.value.name && !!companyForm.value.email)

async function saveCompany() {
  companySaving.value = true
  try {
    const f = companyForm.value
    if (companyDialogMode.value === 'create') {
      const payload = { name: f.name, email: f.email, ...(f.description && { description: f.description }), ...(f.location && { location: f.location }), ...(f.businessId && { businessId: f.businessId }) }
      const { data } = await apiClient.post('/company/create', [payload])
      const newId = data?.data?.[0]?.companyId
      if (logoFile.value && newId) {
        const fd = new FormData()
        fd.append('logo', logoFile.value)
        await apiClient.put(`/company/update/${newId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      }
      toast.success('Entreprise créée.')
    } else {
      let payload
      if (logoFile.value) {
        payload = new FormData()
        payload.append('name', f.name)
        payload.append('email', f.email)
        if (f.description) payload.append('description', f.description)
        if (f.location) payload.append('location', f.location)
        if (f.businessId) payload.append('businessId', String(f.businessId))
        payload.append('logo', logoFile.value)
        await apiClient.put(`/company/update/${f.id}`, payload, { headers: { 'Content-Type': 'multipart/form-data' } })
      } else {
        payload = { name: f.name, email: f.email, description: f.description, location: f.location, businessId: f.businessId || null }
        await apiClient.put(`/company/update/${f.id}`, payload)
      }
      toast.success('Entreprise modifiée.')
    }
    companyDialog.value = false
    await loadCompanies()
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  } finally {
    companySaving.value = false
  }
}

async function removeCompany(row) {
  if (!window.confirm(`Supprimer définitivement « ${row.name} » et toutes ses données ?`)) return
  try {
    await apiClient.delete(`/company/delete/${row.companyId}`)
    toast.success('Entreprise supprimée.')
    await loadCompanies()
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  }
}

const addAdminDialog = ref(false)
const addAdminSaving = ref(false)
const addAdminForm = ref({ companyId: null, companyName: '', username: '', email: '', password: '' })
const showAdminPassword = ref(false)
function openAddAdmin(row) {
  addAdminForm.value = { companyId: row.companyId, companyName: row.name, username: '', email: '', password: '' }
  showAdminPassword.value = false
  addAdminDialog.value = true
}
async function submitAddAdmin() {
  addAdminSaving.value = true
  try {
    const { data } = await apiClient.post('/auth/add-company-admin', { companyId: addAdminForm.value.companyId, username: addAdminForm.value.username, email: addAdminForm.value.email, password: addAdminForm.value.password })
    toast.success(`${data?.admin?.username ?? addAdminForm.value.username} ajouté comme admin de ${data?.company?.name ?? addAdminForm.value.companyName}.`)
    addAdminDialog.value = false
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  } finally {
    addAdminSaving.value = false
  }
}

/* Commerces & Branches */
const commerces = ref([])
const commercesLoading = ref(false)
async function loadCommerces() {
  commercesLoading.value = true
  try {
    const { data } = await apiClient.get('/commerce_track')
    commerces.value = data?.data ?? []
  } catch {
    toast.error('Impossible de charger les commerces.')
  } finally {
    commercesLoading.value = false
  }
}
const commerceOptions = computed(() => commerces.value.map((c) => ({ label: c.commerceName, value: c.commerceId })))

const commerceDialog = ref(false)
const commerceSaving = ref(false)
const commerceDialogMode = ref('create')
const commerceForm = ref({ id: null, commerceName: '', commerceEmail: '', username: '', email: '', password: '' })
function openCreateCommerce() {
  commerceDialogMode.value = 'create'
  commerceForm.value = { id: null, commerceName: '', commerceEmail: '', username: '', email: '', password: '' }
  commerceDialog.value = true
}
function openEditCommerce(row) {
  commerceDialogMode.value = 'edit'
  commerceForm.value = { id: row.commerceId, commerceName: row.commerceName ?? '', commerceEmail: row.commerceEmail ?? '', username: '', email: '', password: '' }
  commerceDialog.value = true
}
async function saveCommerce() {
  commerceSaving.value = true
  try {
    if (commerceDialogMode.value === 'create') {
      const payload = { commerceName: commerceForm.value.commerceName, commerceEmail: commerceForm.value.commerceEmail }
      if (commerceForm.value.username && commerceForm.value.email && commerceForm.value.password) {
        payload.username = commerceForm.value.username
        payload.email = commerceForm.value.email
        payload.password = commerceForm.value.password
      }
      await apiClient.post('/auth/create-commerce-account', payload)
      toast.success('Commerce créé.')
    } else {
      await apiClient.put(`/commerce_track/update/${commerceForm.value.id}`, { commerceName: commerceForm.value.commerceName, commerceEmail: commerceForm.value.commerceEmail })
      toast.success('Commerce modifié.')
    }
    commerceDialog.value = false
    await loadCommerces()
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  } finally {
    commerceSaving.value = false
  }
}
async function removeCommerce(row) {
  if (!window.confirm(`Supprimer le commerce « ${row.commerceName} » ?`)) return
  try {
    await apiClient.delete(`/commerce_track/delete/${row.commerceId}`)
    toast.success('Commerce supprimé.')
    await loadCommerces()
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  }
}

const branches = ref([])
const branchesLoading = ref(false)
async function loadBranches() {
  branchesLoading.value = true
  try {
    const { data } = await apiClient.get('/branch_track')
    branches.value = data?.data ?? []
  } catch {
    toast.error('Impossible de charger les branches.')
  } finally {
    branchesLoading.value = false
  }
}
function commerceNameOf(commerceId) {
  return commerces.value.find((c) => c.commerceId === commerceId)?.commerceName ?? '—'
}

const branchDialog = ref(false)
const branchSaving = ref(false)
const branchDialogMode = ref('create')
const branchForm = ref({ id: null, branchTrackName: '', branchTrackEmail: '', commerceId: '' })
function openCreateBranch() {
  branchDialogMode.value = 'create'
  branchForm.value = { id: null, branchTrackName: '', branchTrackEmail: '', commerceId: '' }
  branchDialog.value = true
}
function openEditBranch(row) {
  branchDialogMode.value = 'edit'
  branchForm.value = { id: row.branchTrackId, branchTrackName: row.branchTrackName ?? '', branchTrackEmail: row.branchTrackEmail ?? '', commerceId: row.commerceId ?? '' }
  branchDialog.value = true
}
async function saveBranch() {
  branchSaving.value = true
  try {
    const payload = { branchTrackName: branchForm.value.branchTrackName, branchTrackEmail: branchForm.value.branchTrackEmail, commerceId: branchForm.value.commerceId || null }
    if (branchDialogMode.value === 'create') {
      await apiClient.post('/branch_track/create', payload)
      toast.success('Branche créée.')
    } else {
      await apiClient.put(`/branch_track/update/${branchForm.value.id}`, payload)
      toast.success('Branche modifiée.')
    }
    branchDialog.value = false
    await loadBranches()
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  } finally {
    branchSaving.value = false
  }
}
async function removeBranch(row) {
  if (!window.confirm(`Supprimer la branche « ${row.branchTrackName} » ?`)) return
  try {
    await apiClient.delete(`/branch_track/delete/${row.branchTrackId}`)
    toast.success('Branche supprimée.')
    await loadBranches()
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  }
}

onMounted(() => {
  loadCompanies()
  loadSectors()
  loadCommerces()
  loadBranches()
})
</script>

<template>
<div class="flex flex-col w-full">
<div class="bg-surface-container-lowest shadow-[0_1px_3px_rgba(15,23,42,0.04)] px-space-lg">
<div class="flex items-center gap-space-xs overflow-x-auto no-scrollbar pt-space-xs">
<RouterLink class="flex items-center gap-space-xs px-space-md py-3 text-secondary font-label-md text-label-md hover:text-on-surface hover:bg-surface-container-low rounded-t-lg transition-colors whitespace-nowrap" to="/comptes">
<span class="material-symbols-outlined text-[18px]">group</span><span>Comptes</span>
</RouterLink>
<RouterLink class="flex items-center gap-space-xs px-space-md py-3 text-secondary font-label-md text-label-md hover:text-on-surface hover:bg-surface-container-low rounded-t-lg transition-colors whitespace-nowrap" to="/utilisateurs-acces">
<span class="material-symbols-outlined text-[18px]">badge</span><span>Utilisateurs &amp; Accès</span>
</RouterLink>
<RouterLink class="flex items-center gap-space-xs px-space-md py-3 text-primary-container font-label-md text-label-md bg-surface-container-low font-semibold rounded-t-lg shadow-sm whitespace-nowrap" to="/entreprises">
<span class="material-symbols-outlined text-[18px]">apartment</span><span>Entreprises &amp; Commerce</span>
<span class="ml-1 px-2 py-0.5 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm">{{ totalRecords }}</span>
</RouterLink>
<RouterLink class="flex items-center gap-space-xs px-space-md py-3 text-secondary font-label-md text-label-md hover:text-on-surface hover:bg-surface-container-low rounded-t-lg transition-colors whitespace-nowrap" to="/catalogue">
<span class="material-symbols-outlined text-[18px]">inventory_2</span><span>Catalogue Produits</span>
</RouterLink>
<RouterLink class="flex items-center gap-space-xs px-space-md py-3 text-secondary font-label-md text-label-md hover:text-on-surface hover:bg-surface-container-low rounded-t-lg transition-colors whitespace-nowrap" to="/transport">
<span class="material-symbols-outlined text-[18px]">directions_bus</span><span>BIM Transport</span>
</RouterLink>
<RouterLink class="flex items-center gap-space-xs px-space-md py-3 text-secondary font-label-md text-label-md hover:text-on-surface hover:bg-surface-container-low rounded-t-lg transition-colors whitespace-nowrap" to="/commandes">
<span class="material-symbols-outlined text-[18px]">shopping_bag</span><span>Commandes &amp; Livraisons</span>
</RouterLink>
</div>
</div>

<div class="px-space-lg py-space-lg flex flex-col md:flex-row md:items-center justify-between gap-space-md">
<div class="space-y-1">
<div class="flex items-center gap-2 text-primary-container">
<span class="material-symbols-outlined text-[20px]">corporate_fare</span>
<span class="font-label-sm text-label-sm uppercase tracking-wider font-semibold text-secondary">Supervision du Réseau Partenaire</span>
</div>
<h2 class="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">Entreprises &amp; Partenaires</h2>
<p class="font-body-md text-body-md text-secondary max-w-3xl">Supervision des entreprises partenaires BIM, réseaux marchands, points de vente et secteurs d'activité.</p>
</div>
</div>

<div class="px-space-lg pb-space-lg grid grid-cols-1 sm:grid-cols-2 gap-space-md">
<div class="p-space-md rounded-xl bg-surface-container-lowest shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col justify-between">
<div class="flex items-start justify-between">
<span class="font-body-sm text-body-sm text-secondary font-medium">Total Entreprises</span>
<div class="w-9 h-9 rounded-lg bg-primary-fixed flex items-center justify-center text-primary-container"><span class="material-symbols-outlined text-[20px]">domain</span></div>
</div>
<div class="mt-space-md"><span class="font-numeric-kpi text-numeric-kpi text-on-surface">{{ totalRecords }}</span></div>
</div>
<div class="p-space-md rounded-xl bg-surface-container-lowest shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col justify-between">
<div class="flex items-start justify-between">
<span class="font-body-sm text-body-sm text-secondary font-medium">Secteurs Déployés</span>
<div class="w-9 h-9 rounded-lg bg-secondary-container flex items-center justify-center text-secondary"><span class="material-symbols-outlined text-[20px]">category</span></div>
</div>
<div class="mt-space-md"><span class="font-numeric-kpi text-numeric-kpi text-on-surface">{{ sectors.length }}</span></div>
</div>
</div>

<div class="px-space-lg mb-space-md">
<SectionTabs v-model="section" :tabs="sectionTabs" />
</div>

<!-- Partenaires -->
<div v-show="section === 'partners'" class="px-space-lg mb-space-lg space-y-space-md">
<div class="bg-surface-container-lowest p-space-md rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-md">
<div class="relative flex-1">
<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
<input v-model="searchInput" class="w-full h-10 pl-10 pr-4 rounded-lg bg-surface-container-low font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Rechercher par nom, email, ville..." type="text"/>
</div>
<div class="flex items-center gap-space-sm shrink-0">
<span class="font-label-sm text-label-sm font-semibold text-primary">{{ totalRecords }} entreprise(s)</span>
<button class="flex items-center gap-2 px-space-md h-10 rounded-lg bg-primary-container text-on-primary hover:bg-primary shadow-sm font-label-md text-label-md font-semibold transition-colors" type="button" @click="openCreateCompany">
<span class="material-symbols-outlined text-[18px]">add_business</span><span>+ Ajouter</span>
</button>
</div>
</div>

<div v-if="companiesLoading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-md">
<div v-for="n in 6" :key="n" class="h-48 rounded-xl bg-surface-container-lowest animate-pulse"></div>
</div>
<div v-else-if="companies.length === 0" class="text-center py-12 text-secondary bg-surface-container-lowest rounded-xl">
<span class="material-symbols-outlined text-[40px] mb-2 block opacity-30">domain_disabled</span>
<p class="font-body-md text-body-md font-medium">Aucune entreprise trouvée</p>
</div>
<div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-md">
<div v-for="row in companies" :key="row.companyId" class="bg-surface-container-lowest rounded-xl p-space-md shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:shadow-md transition-all flex flex-col justify-between group">
<div>
<div class="flex items-start justify-between gap-space-sm mb-space-sm">
<div class="flex items-center gap-space-sm min-w-0">
<img v-if="row.logo" :src="row.logo" alt="" class="w-12 h-12 rounded-xl object-cover shrink-0 shadow-inner"/>
<div v-else class="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center text-primary-container shrink-0 font-headline-sm font-bold">{{ initials(row.name) }}</div>
<div class="min-w-0">
<h3 class="font-headline-sm text-body-md font-bold text-on-surface truncate group-hover:text-primary transition-colors">{{ row.name }}</h3>
<p class="font-body-sm text-label-sm text-secondary truncate">{{ row.email }}</p>
</div>
</div>
<span v-if="row.category" class="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-fixed font-label-sm text-label-sm font-bold shrink-0">{{ row.category.name }}</span>
</div>
<div class="py-space-xs space-y-1.5 font-body-sm text-body-sm text-secondary">
<div v-if="row.location" class="flex items-center gap-1.5 text-on-surface">
<span class="material-symbols-outlined text-[16px] text-outline">location_on</span><span class="font-medium">{{ row.location }}</span>
</div>
<div class="flex items-center justify-between pt-1">
<span class="px-2 py-0.5 rounded bg-surface-container-low text-primary-container font-label-sm text-label-sm font-semibold">{{ row.products?.length ?? 0 }} produit(s)</span>
<div class="flex items-center gap-1 text-outline font-label-sm text-label-sm">
<span class="material-symbols-outlined text-[14px]">star</span>
<span>{{ companyRating(row) > 0 ? companyRating(row).toFixed(1) : 'Aucun avis' }}</span>
<span v-if="reviewCount(row) > 0" class="text-secondary">({{ reviewCount(row) }})</span>
</div>
</div>
</div>
</div>
<div class="mt-space-md pt-space-sm bg-surface-container-low -mx-space-md -mb-space-md p-space-sm rounded-b-xl flex items-center justify-between">
<span class="font-label-sm text-label-sm text-secondary">Créée le {{ formatDate(row.createdAt) }}</span>
<div class="flex items-center gap-1">
<button class="w-7 h-7 rounded bg-surface-container-lowest hover:bg-primary-container hover:text-on-primary text-secondary flex items-center justify-center transition-colors" title="Attribuer compte utilisateur" type="button" @click="openAddAdmin(row)">
<span class="material-symbols-outlined text-[16px]">person_add</span>
</button>
<button class="w-7 h-7 rounded bg-surface-container-lowest hover:bg-surface-variant text-secondary flex items-center justify-center transition-colors" title="Modifier fiche" type="button" @click="openEditCompany(row)">
<span class="material-symbols-outlined text-[16px]">edit</span>
</button>
<button class="w-7 h-7 rounded bg-surface-container-lowest hover:bg-error-container hover:text-error text-secondary flex items-center justify-center transition-colors" title="Supprimer" type="button" @click="removeCompany(row)">
<span class="material-symbols-outlined text-[16px]">delete</span>
</button>
</div>
</div>
</div>
</div>

<div v-if="totalRecords > 0" class="flex flex-col sm:flex-row items-center justify-between gap-space-sm bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
<div class="font-body-sm text-body-sm text-secondary">Page <span class="font-semibold text-on-surface">{{ currentPage }}</span> sur <span class="font-semibold text-on-surface">{{ totalPages }}</span></div>
<div class="flex items-center gap-1">
<button class="w-9 h-9 rounded-lg bg-surface-container-low text-secondary flex items-center justify-center hover:bg-surface-container transition-colors disabled:opacity-50" :disabled="currentPage <= 1" type="button" @click="goToPage(currentPage - 1)"><span class="material-symbols-outlined text-[18px]">chevron_left</span></button>
<button class="w-9 h-9 rounded-lg bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold flex items-center justify-center shadow-sm" type="button">{{ currentPage }}</button>
<button class="w-9 h-9 rounded-lg bg-surface-container-low text-secondary flex items-center justify-center hover:bg-surface-container transition-colors disabled:opacity-50" :disabled="currentPage >= totalPages" type="button" @click="goToPage(currentPage + 1)"><span class="material-symbols-outlined text-[18px]">chevron_right</span></button>
</div>
</div>
</div>

<!-- Secteurs d'activité -->
<div v-show="section === 'sectors'" class="px-space-lg mb-space-lg space-y-space-md">
<div class="flex items-center justify-between">
<span class="font-label-sm text-label-sm font-semibold text-primary">{{ sectors.length }} secteur(s)</span>
<button class="flex items-center gap-2 px-space-md h-10 rounded-lg bg-primary-container text-on-primary hover:bg-primary shadow-sm font-label-md text-label-md font-semibold transition-colors" type="button" @click="openCreateSector">
<span class="material-symbols-outlined text-[18px]">add</span><span>+ Ajouter un secteur</span>
</button>
</div>
<div v-if="sectorsLoading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-md">
<div v-for="n in 6" :key="n" class="h-28 rounded-xl bg-surface-container-lowest animate-pulse"></div>
</div>
<div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-md">
<div v-for="s in sectors" :key="s.businessId" class="bg-surface-container-lowest rounded-xl p-space-md shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col justify-between gap-space-sm">
<div>
<div class="flex items-center justify-between gap-space-sm">
<h3 class="font-headline-sm text-body-md font-bold text-on-surface truncate">{{ s.name }}</h3>
<span class="px-2 py-0.5 rounded bg-surface-container-low text-primary-container font-label-sm text-label-sm font-semibold shrink-0">{{ s.companies?.length ?? 0 }} entreprise(s)</span>
</div>
<p v-if="s.description" class="font-body-sm text-body-sm text-secondary mt-1 line-clamp-2">{{ s.description }}</p>
</div>
<div class="flex items-center justify-end gap-1 pt-1">
<button class="w-7 h-7 rounded bg-surface-container-low hover:bg-surface-variant text-secondary flex items-center justify-center transition-colors" title="Modifier" type="button" @click="openEditSector(s)"><span class="material-symbols-outlined text-[16px]">edit</span></button>
<button class="w-7 h-7 rounded bg-surface-container-low hover:bg-error-container hover:text-error text-secondary flex items-center justify-center transition-colors" title="Supprimer" type="button" @click="removeSector(s)"><span class="material-symbols-outlined text-[16px]">delete</span></button>
</div>
</div>
</div>
</div>

<!-- Commerces & Branches -->
<div v-show="section === 'commerces'" class="px-space-lg mb-space-lg space-y-space-lg">
<div class="space-y-space-md">
<div class="flex items-center justify-between">
<h3 class="font-headline-sm text-headline-sm font-bold text-on-surface">Commerces ({{ commerces.length }})</h3>
<button class="flex items-center gap-2 px-space-md h-10 rounded-lg bg-primary-container text-on-primary hover:bg-primary shadow-sm font-label-md text-label-md font-semibold transition-colors" type="button" @click="openCreateCommerce">
<span class="material-symbols-outlined text-[18px]">add</span><span>+ Ajouter un commerce</span>
</button>
</div>
<div v-if="commercesLoading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-md">
<div v-for="n in 3" :key="n" class="h-24 rounded-xl bg-surface-container-lowest animate-pulse"></div>
</div>
<div v-else-if="commerces.length === 0" class="text-center py-8 text-secondary bg-surface-container-lowest rounded-xl font-body-sm text-body-sm">Aucun commerce enregistré</div>
<div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-md">
<div v-for="c in commerces" :key="c.commerceId" class="bg-surface-container-lowest rounded-xl p-space-md shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex items-center justify-between gap-space-sm">
<div class="min-w-0">
<div class="font-headline-sm text-body-sm font-semibold text-on-surface truncate">{{ c.commerceName }}</div>
<div class="font-label-sm text-label-sm text-secondary truncate">{{ c.commerceEmail }}</div>
</div>
<div class="flex items-center gap-1 shrink-0">
<button class="w-7 h-7 rounded bg-surface-container-low hover:bg-surface-variant text-secondary flex items-center justify-center transition-colors" title="Modifier" type="button" @click="openEditCommerce(c)"><span class="material-symbols-outlined text-[16px]">edit</span></button>
<button class="w-7 h-7 rounded bg-surface-container-low hover:bg-error-container hover:text-error text-secondary flex items-center justify-center transition-colors" title="Supprimer" type="button" @click="removeCommerce(c)"><span class="material-symbols-outlined text-[16px]">delete</span></button>
</div>
</div>
</div>
</div>

<div class="space-y-space-md">
<div class="flex items-center justify-between">
<h3 class="font-headline-sm text-headline-sm font-bold text-on-surface">Branches ({{ branches.length }})</h3>
<button class="flex items-center gap-2 px-space-md h-10 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container shadow-sm font-label-md text-label-md font-medium transition-colors" type="button" @click="openCreateBranch">
<span class="material-symbols-outlined text-[18px]">add</span><span>+ Ajouter une branche</span>
</button>
</div>
<div v-if="branchesLoading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-md">
<div v-for="n in 3" :key="n" class="h-24 rounded-xl bg-surface-container-lowest animate-pulse"></div>
</div>
<div v-else-if="branches.length === 0" class="text-center py-8 text-secondary bg-surface-container-lowest rounded-xl font-body-sm text-body-sm">Aucune branche enregistrée</div>
<div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-md">
<div v-for="b in branches" :key="b.branchTrackId" class="bg-surface-container-lowest rounded-xl p-space-md shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex items-center justify-between gap-space-sm">
<div class="min-w-0">
<div class="font-headline-sm text-body-sm font-semibold text-on-surface truncate">{{ b.branchTrackName }}</div>
<div class="font-label-sm text-label-sm text-secondary truncate">{{ b.branchTrackEmail }}</div>
<div class="font-label-sm text-label-sm text-primary-container">{{ commerceNameOf(b.commerceId) }}</div>
</div>
<div class="flex items-center gap-1 shrink-0">
<button class="w-7 h-7 rounded bg-surface-container-low hover:bg-surface-variant text-secondary flex items-center justify-center transition-colors" title="Modifier" type="button" @click="openEditBranch(b)"><span class="material-symbols-outlined text-[16px]">edit</span></button>
<button class="w-7 h-7 rounded bg-surface-container-low hover:bg-error-container hover:text-error text-secondary flex items-center justify-center transition-colors" title="Supprimer" type="button" @click="removeBranch(b)"><span class="material-symbols-outlined text-[16px]">delete</span></button>
</div>
</div>
</div>
</div>
</div>

<!-- Dialog Entreprise -->
<div v-if="companyDialog" class="fixed inset-0 z-[90] flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm p-4" @click.self="companyDialog = false">
<div class="w-full max-w-lg bg-white rounded-2xl shadow-xl p-space-lg space-y-space-md overflow-y-auto max-h-[90vh]">
<h2 class="font-headline-md text-headline-md font-bold text-on-surface">{{ companyDialogMode === 'create' ? 'Nouvelle entreprise' : "Modifier l'entreprise" }}</h2>
<div class="grid grid-cols-2 gap-space-sm">
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Nom *</label><input v-model="companyForm.name" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" type="text"/></div>
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Email *</label><input v-model="companyForm.email" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" type="email"/></div>
</div>
<div class="grid grid-cols-2 gap-space-sm">
<div>
<label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Secteur</label>
<select v-model="companyForm.businessId" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none">
<option value="">Choisir un secteur</option>
<option v-for="s in sectorOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
</select>
</div>
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Ville / Localisation</label><input v-model="companyForm.location" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" type="text"/></div>
</div>
<div>
<label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Logo</label>
<div class="flex items-center gap-space-sm">
<img v-if="logoPreview" :src="logoPreview" alt="" class="w-14 h-14 rounded-xl object-cover"/>
<div v-else class="w-14 h-14 rounded-xl bg-surface-container-low flex items-center justify-center text-secondary"><span class="material-symbols-outlined text-[22px] opacity-50">domain</span></div>
<input ref="logoInput" accept="image/*" class="hidden" type="file" @change="onLogoChange"/>
<button class="h-9 px-space-sm rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm font-medium" type="button" @click="logoInput.click()">Choisir un logo</button>
</div>
</div>
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Description</label><textarea v-model="companyForm.description" class="w-full px-space-md py-2 rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" rows="2"></textarea></div>
<div class="flex justify-end gap-space-sm pt-space-sm">
<button class="h-10 px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm font-medium" type="button" :disabled="companySaving" @click="companyDialog = false">Annuler</button>
<button class="h-10 px-space-md rounded-lg bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold disabled:opacity-60" type="button" :disabled="companySaving || !canSubmitCompany" @click="saveCompany">{{ companySaving ? 'Enregistrement…' : 'Enregistrer' }}</button>
</div>
</div>
</div>

<!-- Dialog Ajouter admin -->
<div v-if="addAdminDialog" class="fixed inset-0 z-[90] flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm p-4" @click.self="addAdminDialog = false">
<div class="w-full max-w-sm bg-white rounded-2xl shadow-xl p-space-lg space-y-space-md">
<h2 class="font-headline-md text-headline-md font-bold text-on-surface">Ajouter un admin — {{ addAdminForm.companyName }}</h2>
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Nom d'utilisateur *</label><input v-model="addAdminForm.username" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" type="text"/></div>
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Email *</label><input v-model="addAdminForm.email" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" type="email"/></div>
<div>
<label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Mot de passe *</label>
<div class="relative">
<input v-model="addAdminForm.password" class="h-10 w-full px-space-md pr-10 rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" :type="showAdminPassword ? 'text' : 'password'"/>
<button class="absolute right-2 top-1/2 -translate-y-1/2 text-secondary" type="button" @click="showAdminPassword = !showAdminPassword"><span class="material-symbols-outlined text-[18px]">{{ showAdminPassword ? 'visibility_off' : 'visibility' }}</span></button>
</div>
</div>
<div class="flex justify-end gap-space-sm pt-space-sm">
<button class="h-10 px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm font-medium" type="button" :disabled="addAdminSaving" @click="addAdminDialog = false">Annuler</button>
<button class="h-10 px-space-md rounded-lg bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold disabled:opacity-60" type="button" :disabled="addAdminSaving || !addAdminForm.username || !addAdminForm.email || !addAdminForm.password" @click="submitAddAdmin">{{ addAdminSaving ? 'Création…' : "Créer l'admin" }}</button>
</div>
</div>
</div>

<!-- Dialog Secteur -->
<div v-if="sectorDialog" class="fixed inset-0 z-[90] flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm p-4" @click.self="sectorDialog = false">
<div class="w-full max-w-sm bg-white rounded-2xl shadow-xl p-space-lg space-y-space-md">
<h2 class="font-headline-md text-headline-md font-bold text-on-surface">{{ sectorForm.id ? 'Modifier le secteur' : 'Nouveau secteur' }}</h2>
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Nom *</label><input v-model="sectorForm.name" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" type="text"/></div>
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Description</label><textarea v-model="sectorForm.description" class="w-full px-space-md py-2 rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" rows="2"></textarea></div>
<div class="flex justify-end gap-space-sm pt-space-sm">
<button class="h-10 px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm font-medium" type="button" :disabled="sectorSaving" @click="sectorDialog = false">Annuler</button>
<button class="h-10 px-space-md rounded-lg bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold disabled:opacity-60" type="button" :disabled="sectorSaving || !sectorForm.name" @click="saveSector">{{ sectorSaving ? 'Enregistrement…' : 'Enregistrer' }}</button>
</div>
</div>
</div>

<!-- Dialog Commerce -->
<div v-if="commerceDialog" class="fixed inset-0 z-[90] flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm p-4" @click.self="commerceDialog = false">
<div class="w-full max-w-sm bg-white rounded-2xl shadow-xl p-space-lg space-y-space-md">
<h2 class="font-headline-md text-headline-md font-bold text-on-surface">{{ commerceDialogMode === 'create' ? 'Nouveau commerce' : 'Modifier le commerce' }}</h2>
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Nom du commerce *</label><input v-model="commerceForm.commerceName" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" type="text"/></div>
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Email du commerce *</label><input v-model="commerceForm.commerceEmail" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" type="email"/></div>
<template v-if="commerceDialogMode === 'create'">
<p class="font-label-sm text-label-sm text-secondary">Optionnel : créer un compte gestionnaire pour ce commerce</p>
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Nom d'utilisateur</label><input v-model="commerceForm.username" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" type="text"/></div>
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Email de connexion</label><input v-model="commerceForm.email" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" type="email"/></div>
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Mot de passe</label><input v-model="commerceForm.password" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" type="password"/></div>
</template>
<div class="flex justify-end gap-space-sm pt-space-sm">
<button class="h-10 px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm font-medium" type="button" :disabled="commerceSaving" @click="commerceDialog = false">Annuler</button>
<button class="h-10 px-space-md rounded-lg bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold disabled:opacity-60" type="button" :disabled="commerceSaving || !commerceForm.commerceName || !commerceForm.commerceEmail" @click="saveCommerce">{{ commerceSaving ? 'Enregistrement…' : 'Enregistrer' }}</button>
</div>
</div>
</div>

<!-- Dialog Branche -->
<div v-if="branchDialog" class="fixed inset-0 z-[90] flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm p-4" @click.self="branchDialog = false">
<div class="w-full max-w-sm bg-white rounded-2xl shadow-xl p-space-lg space-y-space-md">
<h2 class="font-headline-md text-headline-md font-bold text-on-surface">{{ branchDialogMode === 'create' ? 'Nouvelle branche' : 'Modifier la branche' }}</h2>
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Nom de la branche *</label><input v-model="branchForm.branchTrackName" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" type="text"/></div>
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Email de la branche *</label><input v-model="branchForm.branchTrackEmail" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" type="email"/></div>
<div>
<label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Commerce parent</label>
<select v-model="branchForm.commerceId" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none">
<option value="">Aucun</option>
<option v-for="c in commerceOptions" :key="c.value" :value="c.value">{{ c.label }}</option>
</select>
</div>
<div class="flex justify-end gap-space-sm pt-space-sm">
<button class="h-10 px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm font-medium" type="button" :disabled="branchSaving" @click="branchDialog = false">Annuler</button>
<button class="h-10 px-space-md rounded-lg bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold disabled:opacity-60" type="button" :disabled="branchSaving || !branchForm.branchTrackName || !branchForm.branchTrackEmail" @click="saveBranch">{{ branchSaving ? 'Enregistrement…' : 'Enregistrer' }}</button>
</div>
</div>
</div>
</div>
</template>
