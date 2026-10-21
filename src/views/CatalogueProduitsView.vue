<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import apiClient from '@/api/client'
import { useToast } from '@/composables/useToast'

const toast = useToast()
const activeTab = ref('all') // 'all' | 'highlight'

const SERVER_ROOT = (import.meta.env.VITE_API_URL || 'http://localhost:8083/api/v1').replace(/\/api\/v\d+\/?$/, '')
function imageUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  return SERVER_ROOT + path
}

/* Compression d'image (< 300 Ko) */
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

/* Entreprises & devises (pour filtres + formulaires) */
const companyOptions = ref([])
const currencyOptions = ref([])
async function loadLookups() {
  try {
    const { data } = await apiClient.get('/company', { params: { paginate: 'false' } })
    const list = Array.isArray(data) ? data : data?.data ?? []
    companyOptions.value = list.map((c) => ({ label: c.name, value: c.companyId, sector: c.category?.name ?? '' }))
  } catch {
    /* non bloquant */
  }
  try {
    const { data } = await apiClient.get('/currency', { params: { paginate: 'false' } })
    const list = Array.isArray(data) ? data : data?.data ?? []
    currencyOptions.value = list.map((c) => ({ label: `${c.code} — ${c.name}`, value: c.currencyId, symbol: c.symbol }))
  } catch {
    /* non bloquant */
  }
}
function currencySymbol(currencyId) {
  return currencyOptions.value.find((c) => c.value === currencyId)?.symbol ?? ''
}
function companyNameOf(companyId) {
  return companyOptions.value.find((c) => c.value === companyId)?.label ?? '—'
}

/* Liste principale (paginée) */
const searchInput = ref('')
const selectedCompanyId = ref('')
const currentPage = ref(1)
const pageSize = ref(9)
const products = ref([])
const totalRecords = ref(0)
const productsLoading = ref(false)

async function loadProducts() {
  productsLoading.value = true
  try {
    const { data } = await apiClient.get('/product', {
      params: { search: searchInput.value || undefined, companyId: selectedCompanyId.value || undefined, page: currentPage.value, pageSize: pageSize.value, paginate: 'true' }
    })
    products.value = data?.data ?? []
    totalRecords.value = data?.total ?? products.value.length
  } catch {
    toast.error('Impossible de charger les produits.')
  } finally {
    productsLoading.value = false
  }
}
let searchDebounce = null
watch([searchInput, selectedCompanyId], () => {
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    currentPage.value = 1
    loadProducts()
  }, 400)
})
const totalPages = computed(() => Math.max(1, Math.ceil(totalRecords.value / pageSize.value)))
function goToPage(p) {
  if (p < 1 || p > totalPages.value) return
  currentPage.value = p
  loadProducts()
}

/* Catalogue complet (non paginé) pour les KPIs et la mise en avant */
const allProducts = ref([])
async function loadAllProducts() {
  try {
    const { data } = await apiClient.get('/product', { params: { paginate: 'false', pageSize: 1000 } })
    allProducts.value = data?.data ?? []
  } catch {
    /* non bloquant */
  }
}

function sectorNameOf(p) {
  return (p.company?.category?.name ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}
const santeCount = computed(() => allProducts.value.filter((p) => sectorNameOf(p).includes('sante')).length)
const energieCount = computed(() => allProducts.value.filter((p) => sectorNameOf(p).includes('carburant') || sectorNameOf(p).includes('gaz') || sectorNameOf(p).includes('energie')).length)
const recommendedCount = computed(() => allProducts.value.filter((p) => p.isRecommended).length)

function isSupermarche(p) {
  const sector = sectorNameOf(p)
  const co = (p.company?.name ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  return sector.includes('supermarche') || sector.includes('epicerie') || co.includes('supermarche') || co.includes('epicerie')
}
const supermarcheProducts = computed(() => allProducts.value.filter(isSupermarche))

const recSearch = ref('')
const filteredRec = computed(() => {
  const q = recSearch.value.toLowerCase()
  return q ? allProducts.value.filter((p) => (p.name ?? '').toLowerCase().includes(q) || (p.company?.name ?? '').toLowerCase().includes(q)) : allProducts.value
})
const upsellSearch = ref('')
const filteredUpsell = computed(() => {
  const q = upsellSearch.value.toLowerCase()
  return q ? supermarcheProducts.value.filter((p) => (p.name ?? '').toLowerCase().includes(q) || (p.company?.name ?? '').toLowerCase().includes(q)) : supermarcheProducts.value
})

const togglingId = ref(null)
async function toggleRecommended(row) {
  togglingId.value = row.productId
  try {
    await apiClient.put(`/product/update/${row.productId}`, { isRecommended: !row.isRecommended })
    row.isRecommended = !row.isRecommended
    toast.success(row.isRecommended ? 'Affiché dans « Articles Recommandés ».' : 'Retiré des recommandations.')
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  } finally {
    togglingId.value = null
  }
}
const togglingUpsId = ref(null)
async function toggleUpselling(row) {
  togglingUpsId.value = row.productId
  try {
    await apiClient.put(`/product/update/${row.productId}`, { isUpselling: !row.isUpselling })
    row.isUpselling = !row.isUpselling
    toast.success(row.isUpselling ? 'Ajouté au panier upselling.' : 'Retiré du panier upselling.')
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  } finally {
    togglingUpsId.value = null
  }
}

function emptyForm() {
  return { name: '', price: null, description: '', qty: null, currencyId: '', companyId: '', unityMesure: '', expiredAt: '', warning: '', TVA: null, threshold: null, reduction: null }
}
function formatDate(d) {
  return d ? new Date(d).toLocaleDateString('fr-FR') : '—'
}
function initials(name) {
  return name ? name[0].toUpperCase() : '?'
}

/* Créer / Modifier */
const productDialog = ref(false)
const productDialogMode = ref('create')
const productSaving = ref(false)
const productForm = ref(emptyForm())
const imageFile = ref(null)
const imagePreview = ref(null)
const fileInput = ref(null)

function openCreate() {
  productDialogMode.value = 'create'
  productForm.value = emptyForm()
  imageFile.value = null
  imagePreview.value = null
  productDialog.value = true
}
function openEdit(row) {
  productDialogMode.value = 'edit'
  productForm.value = {
    id: row.productId,
    name: row.name ?? '',
    price: row.price ?? null,
    description: row.description ?? '',
    qty: row.qty ?? null,
    currencyId: row.currencyId ?? '',
    companyId: row.companyId ?? '',
    unityMesure: row.unityMesure ?? '',
    expiredAt: row.expiredAt ? row.expiredAt.slice(0, 10) : '',
    warning: row.Warning ?? row.warning ?? '',
    TVA: row.TVA ?? null,
    threshold: row.threshold ?? null,
    reduction: row.reduction ?? null
  }
  imageFile.value = null
  imagePreview.value = imageUrl(row.imageUrl)
  productDialog.value = true
}
async function onFileChange(event) {
  const file = event.target.files[0]
  if (!file) return
  imageFile.value = await compressImage(file)
  imagePreview.value = URL.createObjectURL(imageFile.value)
}
async function saveProduct() {
  const f = productForm.value
  const missing = []
  if (!f.name) missing.push('le nom')
  if (f.price === null || f.price === '') missing.push('le prix')
  if (!f.description) missing.push('la description')
  if (f.qty === null || f.qty === '') missing.push('la quantité')
  if (!f.currencyId) missing.push('la devise')
  if (!f.companyId) missing.push("l'entreprise")
  if (missing.length) {
    toast.warn(`Champs obligatoires manquants : ${missing.join(', ')}.`)
    return
  }
  productSaving.value = true
  try {
    const basePayload = {
      name: f.name,
      price: f.price,
      description: f.description,
      qty: f.qty,
      currencyId: f.currencyId,
      companyId: f.companyId,
      unityMesure: f.unityMesure || '',
      expiredAt: f.expiredAt || null,
      warning: f.warning || '',
      TVA: f.TVA ?? '',
      threshold: f.threshold ?? '',
      reduction: f.reduction ?? ''
    }
    if (productDialogMode.value === 'create') {
      const { data } = await apiClient.post('/product/create', [basePayload])
      const newId = data?.data?.[0]?.productId
      if (imageFile.value && newId) {
        const fd = new FormData()
        fd.append('image', imageFile.value)
        await apiClient.put(`/product/update/${newId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      }
      toast.success('Produit créé.')
    } else {
      if (imageFile.value) {
        const fd = new FormData()
        Object.entries(basePayload).forEach(([k, v]) => {
          if (v !== null && v !== undefined && v !== '') fd.append(k, v)
        })
        fd.append('image', imageFile.value)
        await apiClient.put(`/product/update/${f.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      } else {
        await apiClient.put(`/product/update/${f.id}`, basePayload)
      }
      toast.success('Produit modifié.')
    }
    productDialog.value = false
    await Promise.all([loadProducts(), loadAllProducts()])
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  } finally {
    productSaving.value = false
  }
}

async function removeProduct(row) {
  if (!window.confirm(`Supprimer le produit « ${row.name} » ?`)) return
  try {
    await apiClient.delete(`/product/delete/${row.productId}`)
    toast.success('Produit supprimé.')
    await Promise.all([loadProducts(), loadAllProducts()])
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  }
}

onMounted(() => {
  loadLookups()
  loadProducts()
  loadAllProducts()
})
</script>

<template>
<div class="flex flex-col w-full">
<div class="px-space-lg pt-space-lg pb-space-md">
<div class="flex items-center gap-space-xs text-outline font-label-sm text-label-sm mb-1.5">
<span>Gestion</span>
<span class="material-symbols-outlined text-[14px]">chevron_right</span>
<span class="text-on-surface font-semibold">Catalogue Produits &amp; Services</span>
</div>
<div class="flex flex-col md:flex-row md:items-center justify-between gap-space-md pb-space-lg">
<div class="space-y-0.5">
<h1 class="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold flex items-center gap-space-sm">
<span class="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center shadow-sm">
<span class="material-symbols-outlined text-[24px]">inventory_2</span>
</span>
Catalogue &amp; Services BIM NEXT
</h1>
<p class="font-body-md text-body-md text-secondary">Gestion centrale des offres santé, énergie, télécoms, hôtellerie et pilotage de la mise en avant sur l'app mobile BIM.</p>
</div>
<div class="flex items-center gap-space-sm">
<button v-if="activeTab === 'all'" class="inline-flex items-center gap-space-xs px-4 py-2 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-sm hover:bg-primary-container hover:shadow-md transition-all active:scale-[0.98]" type="button" @click="openCreate">
<span class="material-symbols-outlined text-[18px]">add_box</span>
<span>Ajouter un produit</span>
</button>
</div>
</div>
<div class="flex items-center gap-1 overflow-x-auto pb-1 bg-surface-container-lowest rounded-xl p-1.5 shadow-sm">
<RouterLink class="px-3 py-2 rounded-lg font-body-sm text-body-sm text-secondary hover:text-on-surface hover:bg-surface-container flex items-center gap-2 whitespace-nowrap transition-colors" to="/comptes">
<span class="material-symbols-outlined text-[18px]">person</span><span>Comptes</span>
</RouterLink>
<RouterLink class="px-3 py-2 rounded-lg font-body-sm text-body-sm text-secondary hover:text-on-surface hover:bg-surface-container flex items-center gap-2 whitespace-nowrap transition-colors" to="/utilisateurs-acces">
<span class="material-symbols-outlined text-[18px]">key</span><span>Utilisateurs &amp; Accès</span>
</RouterLink>
<RouterLink class="px-3 py-2 rounded-lg font-body-sm text-body-sm text-secondary hover:text-on-surface hover:bg-surface-container flex items-center gap-2 whitespace-nowrap transition-colors" to="/entreprises">
<span class="material-symbols-outlined text-[18px]">domain</span><span>Entreprises &amp; Commerce</span>
</RouterLink>
<RouterLink class="px-3.5 py-2 rounded-lg font-headline-sm text-body-sm bg-primary text-on-primary flex items-center gap-2 whitespace-nowrap shadow-sm" to="/catalogue">
<span class="material-symbols-outlined text-[18px]">layers</span><span>Catalogue Produits</span>
<span class="px-1.5 py-0.2 rounded-full text-[10px] bg-primary-fixed text-on-primary-fixed font-bold">{{ totalRecords }}</span>
</RouterLink>
<RouterLink class="px-3 py-2 rounded-lg font-body-sm text-body-sm text-secondary hover:text-on-surface hover:bg-surface-container flex items-center gap-2 whitespace-nowrap transition-colors" to="/transport">
<span class="material-symbols-outlined text-[18px]">local_taxi</span><span>BIM Transport</span>
</RouterLink>
<RouterLink class="px-3 py-2 rounded-lg font-body-sm text-body-sm text-secondary hover:text-on-surface hover:bg-surface-container flex items-center gap-2 whitespace-nowrap transition-colors" to="/commandes">
<span class="material-symbols-outlined text-[18px]">shopping_cart_checkout</span><span>Commandes &amp; Livraisons</span>
</RouterLink>
</div>
</div>

<div class="px-space-lg space-y-space-lg pb-space-xl">
<!-- KPI Metrics Matrix -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
<div class="p-4 rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
<div class="flex items-center justify-between mb-3">
<span class="font-label-md text-label-md text-secondary uppercase font-semibold">Total Références</span>
<span class="w-8 h-8 rounded-lg bg-surface-container text-primary flex items-center justify-center"><span class="material-symbols-outlined text-[18px]">dataset</span></span>
</div>
<div class="font-numeric-kpi text-numeric-kpi text-on-surface font-bold leading-tight">{{ allProducts.length }}</div>
</div>
<div class="p-4 rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
<div class="flex items-center justify-between mb-3">
<span class="font-label-md text-label-md text-secondary uppercase font-semibold">Packages Santé BIM</span>
<span class="w-8 h-8 rounded-lg bg-primary-fixed text-primary flex items-center justify-center"><span class="material-symbols-outlined text-[18px]">health_and_safety</span></span>
</div>
<div class="font-numeric-kpi text-numeric-kpi text-on-surface font-bold leading-tight">{{ santeCount }}</div>
</div>
<div class="p-4 rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
<div class="flex items-center justify-between mb-3">
<span class="font-label-md text-label-md text-secondary uppercase font-semibold">Carburants &amp; Énergie</span>
<span class="w-8 h-8 rounded-lg bg-secondary-container text-secondary flex items-center justify-center"><span class="material-symbols-outlined text-[18px]">local_gas_station</span></span>
</div>
<div class="font-numeric-kpi text-numeric-kpi text-on-surface font-bold leading-tight">{{ energieCount }}</div>
</div>
<div class="p-4 rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
<div class="flex items-center justify-between mb-3">
<span class="font-label-md text-label-md text-secondary uppercase font-semibold">À la Une / App Mobile</span>
<span class="w-8 h-8 rounded-lg bg-tertiary-fixed text-on-tertiary-fixed-variant flex items-center justify-center"><span class="material-symbols-outlined text-[18px]">star</span></span>
</div>
<div class="flex items-end justify-between">
<div class="font-numeric-kpi text-numeric-kpi text-on-surface font-bold leading-tight">{{ recommendedCount }} <span class="font-headline-sm text-body-md text-secondary font-normal">actif(s)</span></div>
<button class="px-2.5 py-1 text-label-sm font-semibold rounded-lg bg-surface-container hover:bg-primary hover:text-on-primary text-primary transition-colors flex items-center gap-1" type="button" @click="activeTab = 'highlight'">
<span>Configurer</span><span class="material-symbols-outlined text-[14px]">arrow_forward</span>
</button>
</div>
</div>
</div>

<!-- Tabs -->
<div class="flex items-center gap-1 bg-surface-container-lowest rounded-xl p-1.5 shadow-sm w-fit">
<button class="px-3.5 py-2 rounded-lg font-body-sm text-body-sm font-semibold flex items-center gap-2 transition-colors" :class="activeTab === 'all' ? 'bg-primary text-on-primary' : 'text-secondary hover:text-on-surface'" type="button" @click="activeTab = 'all'">
<span class="material-symbols-outlined text-[18px]">apps</span><span>Tous les produits</span>
</button>
<button class="px-3.5 py-2 rounded-lg font-body-sm text-body-sm font-semibold flex items-center gap-2 transition-colors" :class="activeTab === 'highlight' ? 'bg-primary text-on-primary' : 'text-secondary hover:text-on-surface'" type="button" @click="activeTab = 'highlight'">
<span class="material-symbols-outlined text-[18px]">star</span><span>Mise en avant</span>
</button>
</div>

<!-- Tous les produits -->
<div v-show="activeTab === 'all'" class="bg-surface-container-lowest rounded-xl shadow-sm p-space-md space-y-space-md">
<div class="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-sm">
<div class="relative flex-1">
<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
<input v-model="searchInput" class="w-full h-10 pl-10 pr-4 rounded-lg bg-surface-container-low text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" placeholder="Rechercher par nom de produit..." type="text"/>
</div>
<div class="flex flex-wrap items-center gap-2">
<select v-model="selectedCompanyId" class="h-10 pl-3 pr-8 rounded-lg bg-surface-container-low text-body-sm font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer">
<option value="">Toutes les entreprises</option>
<option v-for="c in companyOptions" :key="c.value" :value="c.value">{{ c.label }}</option>
</select>
<div class="h-10 px-3 flex items-center rounded-lg bg-surface-container font-label-md text-label-md text-secondary font-semibold">{{ totalRecords }} produit(s)</div>
</div>
</div>

<div v-if="productsLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
<div v-for="n in 6" :key="n" class="h-64 rounded-xl bg-surface-container-low animate-pulse"></div>
</div>
<div v-else-if="products.length === 0" class="text-center py-12 text-secondary">
<span class="material-symbols-outlined text-[40px] mb-2 block opacity-30">inventory_2</span>
<p class="font-body-md text-body-md font-medium">Aucun produit trouvé</p>
</div>
<div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
<div v-for="row in products" :key="row.productId" class="group rounded-xl bg-surface-container-low p-space-md shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
<div>
<div class="flex items-start gap-space-sm mb-3">
<img v-if="imageUrl(row.imageUrl)" :src="imageUrl(row.imageUrl)" alt="" class="w-16 h-16 rounded-lg object-cover flex-shrink-0 bg-surface-container"/>
<div v-else class="w-16 h-16 rounded-lg bg-surface-container flex items-center justify-center font-headline-lg font-bold text-primary flex-shrink-0">{{ initials(row.name) }}</div>
<div class="flex-1 min-w-0">
<div class="flex items-center gap-1.5 flex-wrap">
<span v-if="row.company?.name" class="px-2 py-0.5 rounded text-[11px] font-semibold bg-primary-fixed text-on-primary-fixed">{{ row.company.name }}</span>
<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-surface-container-lowest text-secondary">{{ row.qty }} {{ row.unityMesure || 'u.' }}</span>
</div>
<h3 class="font-headline-sm text-headline-sm font-bold text-on-surface mt-1 truncate">{{ row.name }}</h3>
<p v-if="row.description" class="font-body-sm text-body-sm text-secondary line-clamp-1 mt-0.5">{{ row.description }}</p>
</div>
</div>
<div class="p-2.5 rounded-lg bg-surface-container-lowest flex items-center justify-between mb-4">
<div>
<span class="font-label-sm text-label-sm text-outline block">Tarif</span>
<span class="font-headline-md text-headline-md font-bold text-primary">{{ Number(row.price ?? 0).toFixed(2) }} <span class="font-label-md text-body-sm font-medium text-secondary">{{ row.currency?.code ?? currencySymbol(row.currencyId) }}</span></span>
</div>
<div class="text-right">
<span class="font-label-sm text-label-sm text-outline block">Expiration</span>
<span class="font-label-md text-body-sm font-semibold text-on-surface">{{ formatDate(row.expiredAt) }}</span>
</div>
</div>
</div>
<div class="pt-3 border-t border-surface-container flex items-center justify-between">
<span class="font-label-sm text-label-sm" :class="row.isRecommended ? 'text-tertiary-container font-semibold' : 'text-secondary'">
<span class="material-symbols-outlined text-[14px] align-middle">{{ row.isRecommended ? 'star' : 'star_border' }}</span>
{{ row.isRecommended ? 'Recommandé' : 'Non recommandé' }}
</span>
<div class="flex items-center gap-1">
<button class="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:text-primary hover:bg-surface-container transition-colors" title="Modifier le produit" type="button" @click="openEdit(row)">
<span class="material-symbols-outlined text-[18px]">edit</span>
</button>
<button class="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:text-error hover:bg-error-container transition-colors" title="Supprimer" type="button" @click="removeProduct(row)">
<span class="material-symbols-outlined text-[18px]">delete</span>
</button>
</div>
</div>
</div>
</div>

<div v-if="totalRecords > 0" class="pt-space-md border-t border-surface-container flex flex-col sm:flex-row items-center justify-between gap-space-sm">
<div class="font-body-sm text-body-sm text-secondary">Page <span class="font-semibold text-on-surface">{{ currentPage }}</span> sur <span class="font-semibold text-on-surface">{{ totalPages }}</span></div>
<div class="flex items-center gap-1">
<button class="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:bg-surface-container transition-colors disabled:opacity-40" :disabled="currentPage <= 1" type="button" @click="goToPage(currentPage - 1)"><span class="material-symbols-outlined text-[18px]">chevron_left</span></button>
<button class="w-8 h-8 rounded-lg flex items-center justify-center bg-primary text-on-primary font-semibold text-body-sm shadow-sm" type="button">{{ currentPage }}</button>
<button class="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:bg-surface-container transition-colors disabled:opacity-40" :disabled="currentPage >= totalPages" type="button" @click="goToPage(currentPage + 1)"><span class="material-symbols-outlined text-[18px]">chevron_right</span></button>
</div>
</div>
</div>

<!-- Mise en avant -->
<div v-show="activeTab === 'highlight'" class="space-y-space-lg">
<div class="space-y-space-sm">
<div class="flex items-center gap-space-sm flex-wrap">
<span class="material-symbols-outlined text-tertiary-container text-[20px]">star</span>
<h2 class="font-headline-sm text-headline-sm text-on-surface font-bold">Articles Recommandés</h2>
<span class="px-2 py-0.5 rounded-full text-label-sm font-semibold bg-tertiary-fixed text-on-tertiary-fixed-variant">{{ allProducts.filter((p) => p.isRecommended).length }} actif(s)</span>
<p class="font-body-sm text-body-sm text-secondary ml-auto">Ces produits apparaissent dans « Articles Recommandés » sur l'accueil de l'app BIM</p>
</div>
<div class="bg-surface-container-lowest rounded-xl shadow-sm p-space-md">
<div class="flex items-center gap-space-sm mb-space-md">
<div class="relative flex-1">
<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
<input v-model="recSearch" class="w-full h-10 pl-9 pr-4 rounded-lg bg-surface-container-low text-body-sm text-on-surface placeholder:text-outline focus:outline-none" placeholder="Rechercher un produit, une entreprise..." type="text"/>
</div>
<span class="font-label-sm text-label-sm text-secondary whitespace-nowrap">{{ allProducts.length }} produit(s)</span>
</div>
<div v-if="filteredRec.length === 0" class="text-center py-10 text-secondary font-body-sm text-body-sm">Aucun produit trouvé</div>
<div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-space-sm">
<div v-for="row in filteredRec" :key="row.productId" class="rounded-xl p-space-sm flex flex-col gap-space-sm border" :class="row.isRecommended ? 'border-tertiary-container/50 bg-tertiary-fixed/30' : 'border-surface-container'">
<div class="flex items-center gap-space-sm">
<img v-if="imageUrl(row.imageUrl)" :src="imageUrl(row.imageUrl)" alt="" class="w-11 h-11 rounded-lg object-cover bg-surface-container-low shrink-0"/>
<div v-else class="w-11 h-11 rounded-lg bg-surface-container-low flex items-center justify-center text-primary font-bold shrink-0">{{ initials(row.name) }}</div>
<div class="min-w-0">
<p class="font-body-sm text-body-sm font-bold text-on-surface truncate">{{ row.name }}</p>
<p class="font-label-sm text-label-sm text-secondary truncate">{{ row.company?.name ?? '—' }}</p>
<p class="font-label-sm text-label-sm font-semibold text-primary">{{ Number(row.price ?? 0).toFixed(2) }} EC</p>
</div>
</div>
<div class="flex items-center justify-between pt-space-sm border-t border-surface-container">
<span class="font-label-sm text-label-sm font-medium" :class="row.isRecommended ? 'text-tertiary-container' : 'text-secondary'">{{ row.isRecommended ? 'Recommandé' : 'Non recommandé' }}</span>
<label class="relative inline-flex items-center cursor-pointer" :class="{ 'opacity-50': togglingId === row.productId }">
<input :checked="!!row.isRecommended" class="sr-only peer" type="checkbox" :disabled="togglingId === row.productId" @change="toggleRecommended(row)"/>
<div class="w-8 h-4 bg-surface-container rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-3 after:w-3 after:transition-all relative"></div>
</label>
</div>
</div>
</div>
</div>
</div>

<div class="space-y-space-sm">
<div class="flex items-center gap-space-sm flex-wrap">
<span class="material-symbols-outlined text-primary text-[20px]">add_shopping_cart</span>
<h2 class="font-headline-sm text-headline-sm text-on-surface font-bold">Ventes croisées Supermarché</h2>
<span class="px-2 py-0.5 rounded-full text-label-sm font-semibold bg-primary-fixed text-primary">{{ supermarcheProducts.filter((p) => p.isUpselling).length }} actif(s)</span>
<p class="font-body-sm text-body-sm text-secondary ml-auto">Affichés dans « Complétez votre panier » — secteur Supermarché uniquement</p>
</div>
<div class="bg-surface-container-lowest rounded-xl shadow-sm p-space-md">
<div class="flex items-center gap-space-sm mb-space-md">
<div class="relative flex-1">
<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
<input v-model="upsellSearch" class="w-full h-10 pl-9 pr-4 rounded-lg bg-surface-container-low text-body-sm text-on-surface placeholder:text-outline focus:outline-none" placeholder="Rechercher un produit supermarché..." type="text"/>
</div>
<span class="font-label-sm text-label-sm text-secondary whitespace-nowrap">{{ supermarcheProducts.length }} produit(s)</span>
</div>
<div v-if="supermarcheProducts.length === 0" class="text-center py-10 text-secondary font-body-sm text-body-sm">Aucune entreprise Supermarché trouvée</div>
<div v-else-if="filteredUpsell.length === 0" class="text-center py-10 text-secondary font-body-sm text-body-sm">Aucun résultat pour cette recherche</div>
<div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-space-sm">
<div v-for="row in filteredUpsell" :key="row.productId" class="rounded-xl p-space-sm flex flex-col gap-space-sm border" :class="row.isUpselling ? 'border-primary/40 bg-primary-fixed/20' : 'border-surface-container'">
<div class="flex items-center gap-space-sm">
<img v-if="imageUrl(row.imageUrl)" :src="imageUrl(row.imageUrl)" alt="" class="w-11 h-11 rounded-lg object-cover bg-surface-container-low shrink-0"/>
<div v-else class="w-11 h-11 rounded-lg bg-surface-container-low flex items-center justify-center text-primary font-bold shrink-0">{{ initials(row.name) }}</div>
<div class="min-w-0">
<p class="font-body-sm text-body-sm font-bold text-on-surface truncate">{{ row.name }}</p>
<p class="font-label-sm text-label-sm text-secondary truncate">{{ row.company?.name ?? '—' }}</p>
<p class="font-label-sm text-label-sm font-semibold text-primary">{{ Number(row.price ?? 0).toFixed(2) }} EC</p>
</div>
</div>
<div class="flex items-center justify-between pt-space-sm border-t border-surface-container">
<span class="font-label-sm text-label-sm font-medium" :class="row.isUpselling ? 'text-primary' : 'text-secondary'">{{ row.isUpselling ? 'Dans le panier' : 'Non affiché' }}</span>
<label class="relative inline-flex items-center cursor-pointer" :class="{ 'opacity-50': togglingUpsId === row.productId }">
<input :checked="!!row.isUpselling" class="sr-only peer" type="checkbox" :disabled="togglingUpsId === row.productId" @change="toggleUpselling(row)"/>
<div class="w-8 h-4 bg-surface-container rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-3 after:w-3 after:transition-all relative"></div>
</label>
</div>
</div>
</div>
</div>
</div>
</div>
</div>

<!-- Dialog Produit -->
<div v-if="productDialog" class="fixed inset-0 z-[90] flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm p-4" @click.self="productDialog = false">
<div class="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-space-lg space-y-space-md overflow-y-auto max-h-[90vh]">
<h2 class="font-headline-md text-headline-md font-bold text-on-surface">{{ productDialogMode === 'create' ? 'Nouveau produit' : 'Modifier le produit' }}</h2>

<div>
<label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Image du produit</label>
<div class="flex items-center gap-space-sm">
<img v-if="imagePreview" :src="imagePreview" alt="" class="w-16 h-16 rounded-lg object-cover"/>
<div v-else class="w-16 h-16 rounded-lg bg-surface-container-low flex items-center justify-center text-secondary"><span class="material-symbols-outlined text-[24px] opacity-50">image</span></div>
<input ref="fileInput" accept="image/*" class="hidden" type="file" @change="onFileChange"/>
<button class="h-9 px-space-sm rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm font-medium" type="button" @click="fileInput.click()">Choisir une image</button>
</div>
</div>

<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Nom du produit *</label><input v-model="productForm.name" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" type="text"/></div>

<div class="grid grid-cols-2 gap-space-sm">
<div>
<label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Entreprise *</label>
<select v-model="productForm.companyId" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none">
<option value="">Choisir une entreprise</option>
<option v-for="c in companyOptions" :key="c.value" :value="c.value">{{ c.label }}</option>
</select>
</div>
<div>
<label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Devise *</label>
<select v-model="productForm.currencyId" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none">
<option value="">Choisir une devise</option>
<option v-for="c in currencyOptions" :key="c.value" :value="c.value">{{ c.label }}</option>
</select>
</div>
</div>

<div class="grid grid-cols-3 gap-space-sm">
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Prix *</label><input v-model.number="productForm.price" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" type="number"/></div>
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Quantité *</label><input v-model.number="productForm.qty" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" type="number"/></div>
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Unité</label><input v-model="productForm.unityMesure" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" placeholder="Nuit, Kg, Litre..." type="text"/></div>
</div>

<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Description *</label><textarea v-model="productForm.description" class="w-full px-space-md py-2 rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" rows="2"></textarea></div>

<div class="grid grid-cols-3 gap-space-sm">
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Date d'expiration</label><input v-model="productForm.expiredAt" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" type="date"/></div>
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Seuil d'alerte stock</label><input v-model.number="productForm.threshold" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" type="number"/></div>
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Réduction (%)</label><input v-model.number="productForm.reduction" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" type="number"/></div>
</div>

<div class="grid grid-cols-2 gap-space-sm">
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">TVA (%)</label><input v-model.number="productForm.TVA" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" type="number"/></div>
</div>

<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Avertissement / Conditions</label><textarea v-model="productForm.warning" class="w-full px-space-md py-2 rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" rows="2"></textarea></div>

<div class="flex justify-end gap-space-sm pt-space-sm">
<button class="h-10 px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm font-medium" type="button" :disabled="productSaving" @click="productDialog = false">Annuler</button>
<button class="h-10 px-space-md rounded-lg bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold disabled:opacity-60" type="button" :disabled="productSaving" @click="saveProduct">{{ productSaving ? 'Enregistrement…' : 'Enregistrer' }}</button>
</div>
</div>
</div>
</div>
</template>
