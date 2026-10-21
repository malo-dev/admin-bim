<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import apiClient from '@/api/client'
import { useToast } from '@/composables/useToast'

const toast = useToast()
const mainTab = ref('orders') // 'orders' | 'deliverers' | 'fidelity'

/* Entreprises (lookup pour filtres) */
const companyOptions = ref([])
async function loadCompanies() {
  try {
    const { data } = await apiClient.get('/company', { params: { paginate: 'false' } })
    const list = Array.isArray(data) ? data : data?.data ?? []
    companyOptions.value = list.map((c) => ({ label: c.name, value: c.companyId }))
  } catch {
    /* non bloquant */
  }
}

/* ── Commandes ── */
const ORDER_STATUS = [
  { label: 'En attente', value: 'pending' },
  { label: 'Confirmée', value: 'confirmed' },
  { label: 'Payée', value: 'paid' },
  { label: 'En traitement', value: 'processing' },
  { label: 'Expédiée', value: 'shipped' },
  { label: 'Livrée', value: 'delivered' },
  { label: 'Annulée', value: 'cancelled' }
]
const ORDER_STATUS_LABEL = Object.fromEntries(ORDER_STATUS.map((o) => [o.value, o.label]))

const orderSearch = ref('')
const orderCompanyId = ref('')
const orderStatus = ref('')
const orderCashOnly = ref(false)
const orderPage = ref(1)
const orderPageSize = ref(9)
const orders = ref([])
const ordersTotal = ref(0)
const ordersLoading = ref(false)

async function loadOrders() {
  ordersLoading.value = true
  try {
    const { data } = await apiClient.get('/order', {
      params: {
        search: orderSearch.value || undefined,
        companyId: orderCompanyId.value || undefined,
        status: orderStatus.value || undefined,
        paymentMethod: orderCashOnly.value ? 'cash' : undefined,
        page: orderPage.value,
        pageSize: orderPageSize.value,
        paginate: 'true'
      }
    })
    orders.value = data?.data ?? []
    ordersTotal.value = data?.total ?? orders.value.length
  } catch {
    toast.error('Impossible de charger les commandes.')
  } finally {
    ordersLoading.value = false
  }
}
let orderSearchDebounce = null
watch([orderSearch, orderCompanyId, orderStatus, orderCashOnly], () => {
  clearTimeout(orderSearchDebounce)
  orderSearchDebounce = setTimeout(() => {
    orderPage.value = 1
    loadOrders()
  }, 400)
})
const orderTotalPages = computed(() => Math.max(1, Math.ceil(ordersTotal.value / orderPageSize.value)))
function goToOrderPage(p) {
  if (p < 1 || p > orderTotalPages.value) return
  orderPage.value = p
  loadOrders()
}

function fmtAmount(amount, currency) {
  if (amount == null) return '—'
  const sym = currency?.symbol ?? currency?.code ?? 'EC'
  return `${Number(amount).toLocaleString('fr-FR')} ${sym}`
}
function formatDate(d) {
  return d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—'
}

const orderActionId = ref(null)
async function quickStatus(row, status) {
  orderActionId.value = row.orderId
  try {
    await apiClient.put(`/order/${row.orderId}`, { status })
    row.status = status
    toast.success(`Statut → ${ORDER_STATUS_LABEL[status]}`)
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  } finally {
    orderActionId.value = null
  }
}
async function removeOrder(row) {
  if (!window.confirm(`Supprimer la commande « ${row.orderNumber} » ?`)) return
  try {
    await apiClient.delete(`/order/${row.orderId}`)
    toast.success('Commande supprimée.')
    await loadOrders()
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  }
}

const orderEditDialog = ref(false)
const orderEditSaving = ref(false)
const orderEditForm = ref({ id: null, orderNumber: '', user: null, status: '', notes: '', shippingAddress: '', paymentMethod: '' })
function openEditOrder(row) {
  orderEditForm.value = {
    id: row.orderId,
    orderNumber: row.orderNumber ?? '',
    user: row.user ?? null,
    status: row.status,
    notes: row.notes ?? '',
    shippingAddress: row.shippingAddress ?? '',
    paymentMethod: row.paymentMethod ?? ''
  }
  orderEditDialog.value = true
}
async function saveOrderEdit() {
  orderEditSaving.value = true
  try {
    const { id, orderNumber, user, ...payload } = orderEditForm.value
    await apiClient.put(`/order/${id}`, payload)
    toast.success('Commande mise à jour.')
    orderEditDialog.value = false
    await loadOrders()
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  } finally {
    orderEditSaving.value = false
  }
}

/* ── Livreurs ── */
const LIVREUR_STATUS_LABEL = { pending: 'En attente', accepted: 'Accepté', rejected: 'Refusé', active: 'Actif' }
const NEXT_ACTIONS = {
  pending: [
    { status: 'accepted', label: 'Accepter', icon: 'check' },
    { status: 'rejected', label: 'Refuser', icon: 'close' }
  ],
  accepted: [
    { status: 'active', label: 'Engager', icon: 'send' },
    { status: 'rejected', label: 'Refuser', icon: 'close' }
  ],
  active: [{ status: 'rejected', label: 'Désactiver', icon: 'block' }]
}
const livreurs = ref([])
const livreursLoading = ref(false)
async function loadLivreurs() {
  livreursLoading.value = true
  try {
    const { data } = await apiClient.get('/livreur/admin/all', { params: { pageSize: 100 } })
    livreurs.value = data?.data ?? []
  } catch {
    toast.error('Impossible de charger les livreurs.')
  } finally {
    livreursLoading.value = false
  }
}
const livreurStats = computed(() => ({
  total: livreurs.value.length,
  pending: livreurs.value.filter((l) => l.status === 'pending').length,
  active: livreurs.value.filter((l) => l.status === 'active').length,
  online: livreurs.value.filter((l) => l.isOnline).length
}))
const livreurUpdating = ref(null)
async function changeLivreurStatus(row, status) {
  livreurUpdating.value = row.livreurId
  try {
    const { data } = await apiClient.put(`/livreur/admin/${row.livreurId}/status`, { status })
    row.status = status
    toast.success(`Statut → ${LIVREUR_STATUS_LABEL[status]}`)
    if (data?.plainPassword) toast.success(`Mot de passe envoyé par email : ${data.plainPassword}`)
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  } finally {
    livreurUpdating.value = null
  }
}

const livreurDialog = ref(false)
const livreurSaving = ref(false)
const livreurForm = ref({ username: '', email: '', telephone: '', companyId: '', motivation: '' })
function openCreateLivreur() {
  livreurForm.value = { username: '', email: '', telephone: '', companyId: '', motivation: '' }
  livreurDialog.value = true
}
async function submitCreateLivreur() {
  if (!livreurForm.value.username || !livreurForm.value.email || !livreurForm.value.telephone) {
    toast.warn('Nom, email et téléphone sont obligatoires.')
    return
  }
  livreurSaving.value = true
  try {
    const { data } = await apiClient.post('/livreur/admin/create', { ...livreurForm.value, companyId: livreurForm.value.companyId || null })
    toast.success('Livreur créé — identifiants envoyés par email.')
    if (data?.plainPassword) toast.success(`${livreurForm.value.email} → ${data.plainPassword}`)
    livreurDialog.value = false
    await loadLivreurs()
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  } finally {
    livreurSaving.value = false
  }
}

/* ── Fidélité & consommation ── */
const consumptionSearch = ref('')
const consumptionBonusFilter = ref('')
const consumptionPage = ref(1)
const consumptionPageSize = ref(9)
const consumptions = ref([])
const consumptionsTotal = ref(0)
const consumptionsLoading = ref(false)
async function loadConsumptions() {
  consumptionsLoading.value = true
  try {
    const { data } = await apiClient.get('/consumption', { params: { search: consumptionSearch.value || undefined, isBonus: consumptionBonusFilter.value || undefined, page: consumptionPage.value, pageSize: consumptionPageSize.value, paginate: 'true' } })
    consumptions.value = data?.data ?? []
    consumptionsTotal.value = data?.total ?? consumptions.value.length
  } catch {
    toast.error('Impossible de charger les fiches de consommation.')
  } finally {
    consumptionsLoading.value = false
  }
}
let consumptionDebounce = null
watch([consumptionSearch, consumptionBonusFilter], () => {
  clearTimeout(consumptionDebounce)
  consumptionDebounce = setTimeout(() => {
    consumptionPage.value = 1
    loadConsumptions()
  }, 400)
})
const consumptionTotalPages = computed(() => Math.max(1, Math.ceil(consumptionsTotal.value / consumptionPageSize.value)))
function goToConsumptionPage(p) {
  if (p < 1 || p > consumptionTotalPages.value) return
  consumptionPage.value = p
  loadConsumptions()
}
const bonusCount = computed(() => consumptions.value.filter((c) => c.isBonus).length)

onMounted(() => {
  loadCompanies()
  loadOrders()
  loadLivreurs()
  loadConsumptions()
})
</script>

<template>
<div class="flex flex-col w-full">
<div class="px-space-lg py-space-md flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
<div class="flex flex-col gap-space-xs">
<div class="flex items-center gap-space-xs text-secondary font-label-md">
<span>Gestion</span>
<span class="material-symbols-outlined text-[14px]">chevron_right</span>
<span class="text-primary font-semibold">Commandes &amp; Livraisons</span>
</div>
<div class="flex items-center gap-space-sm mt-1">
<div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><span class="material-symbols-outlined text-[24px]">local_shipping</span></div>
<div>
<h1 class="font-headline-lg text-headline-lg text-on-surface tracking-tight">Commandes &amp; Livraisons BIM</h1>
<p class="font-body-sm text-body-sm text-secondary">Supervision des commandes, dispatch des livreurs partenaires et suivi du programme de fidélité.</p>
</div>
</div>
</div>
</div>

<div class="px-space-lg bg-surface-container-lowest shadow-sm overflow-x-auto">
<div class="flex items-center gap-space-xs min-w-max">
<RouterLink class="inline-flex items-center gap-space-xs px-space-md py-3 font-body-sm text-secondary hover:text-on-surface transition-colors" to="/comptes">
<span class="material-symbols-outlined text-[18px]">group</span><span>Comptes</span>
</RouterLink>
<RouterLink class="inline-flex items-center gap-space-xs px-space-md py-3 font-body-sm text-secondary hover:text-on-surface transition-colors" to="/entreprises">
<span class="material-symbols-outlined text-[18px]">storefront</span><span>Entreprises &amp; Commerce</span>
</RouterLink>
<RouterLink class="inline-flex items-center gap-space-xs px-space-md py-3 font-body-sm text-secondary hover:text-on-surface transition-colors" to="/catalogue">
<span class="material-symbols-outlined text-[18px]">inventory_2</span><span>Catalogue Produits</span>
</RouterLink>
<RouterLink class="inline-flex items-center gap-space-xs px-space-md py-3 font-body-sm text-secondary hover:text-on-surface transition-colors" to="/transport">
<span class="material-symbols-outlined text-[18px]">commute</span><span>BIM Transport</span>
</RouterLink>
<a class="inline-flex items-center gap-space-xs px-space-md py-3 font-body-sm font-semibold text-primary bg-primary-fixed/20 shadow-[inset_0_-2px_0_0_#1e40af] transition-all" href="#">
<span class="material-symbols-outlined text-[18px]">shopping_cart_checkout</span><span>Commandes &amp; Livraisons</span>
<span class="ml-1 px-1.5 py-0.5 rounded-full bg-primary-container text-on-primary font-label-sm text-[10px] leading-tight">{{ ordersTotal }}</span>
</a>
<RouterLink class="inline-flex items-center gap-space-xs px-space-md py-3 font-body-sm text-secondary hover:text-on-surface transition-colors" to="/agents">
<span class="material-symbols-outlined text-[18px]">badge</span><span>Agents BIM</span>
</RouterLink>
</div>
</div>

<div class="px-space-lg py-space-lg space-y-space-lg">
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
<div class="p-space-md bg-surface-container-lowest rounded-xl shadow-sm flex flex-col justify-between">
<div class="flex items-center justify-between">
<span class="font-body-sm text-secondary">Total Commandes</span>
<div class="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary"><span class="material-symbols-outlined text-[18px]">shopping_bag</span></div>
</div>
<div class="mt-2 font-numeric-kpi text-numeric-kpi text-on-surface">{{ ordersTotal }}</div>
</div>
<div class="p-space-md bg-surface-container-lowest rounded-xl shadow-sm flex flex-col justify-between">
<div class="flex items-center justify-between">
<span class="font-body-sm text-secondary">Livreurs actifs</span>
<div class="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary"><span class="material-symbols-outlined text-[18px]">two_wheeler</span></div>
</div>
<div class="mt-2 font-numeric-kpi text-numeric-kpi text-on-surface">{{ livreurStats.active }} <span class="font-body-sm text-body-sm text-secondary">/ {{ livreurStats.total }}</span></div>
</div>
<div class="p-space-md bg-surface-container-lowest rounded-xl shadow-sm flex flex-col justify-between">
<div class="flex items-center justify-between">
<span class="font-body-sm text-secondary">Livreurs en ligne</span>
<div class="w-8 h-8 rounded-lg bg-primary-fixed flex items-center justify-center text-primary"><span class="material-symbols-outlined text-[18px]">sensors</span></div>
</div>
<div class="mt-2 font-numeric-kpi text-numeric-kpi text-primary">{{ livreurStats.online }}</div>
</div>
<div class="p-space-md bg-surface-container-lowest rounded-xl shadow-sm flex flex-col justify-between">
<div class="flex items-center justify-between">
<span class="font-body-sm text-secondary">Produits offerts (fidélité)</span>
<div class="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary"><span class="material-symbols-outlined text-[18px]">loyalty</span></div>
</div>
<div class="mt-2 font-numeric-kpi text-numeric-kpi text-on-surface">{{ bonusCount }}</div>
</div>
</div>

<div class="flex items-center gap-2 bg-surface-container-low p-1 rounded-xl w-fit">
<button class="px-space-md py-1.5 rounded-lg font-body-sm font-semibold transition-all flex items-center gap-2" :class="mainTab === 'orders' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-secondary hover:text-on-surface'" type="button" @click="mainTab = 'orders'">
<span class="material-symbols-outlined text-[18px]">receipt_long</span><span>Commandes</span>
</button>
<button class="px-space-md py-1.5 rounded-lg font-body-sm font-semibold transition-all flex items-center gap-2" :class="mainTab === 'deliverers' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-secondary hover:text-on-surface'" type="button" @click="mainTab = 'deliverers'">
<span class="material-symbols-outlined text-[18px]">sports_motorsports</span><span>Flotte Livreurs</span>
</button>
<button class="px-space-md py-1.5 rounded-lg font-body-sm font-semibold transition-all flex items-center gap-2" :class="mainTab === 'fidelity' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-secondary hover:text-on-surface'" type="button" @click="mainTab = 'fidelity'">
<span class="material-symbols-outlined text-[18px]">card_membership</span><span>Fiches Fidélité</span>
</button>
</div>

<!-- TAB 1: COMMANDES -->
<div v-show="mainTab === 'orders'" class="space-y-space-md">
<div class="p-space-md bg-surface-container-lowest rounded-xl shadow-sm space-y-space-sm">
<div class="grid grid-cols-1 md:grid-cols-12 gap-space-sm">
<div class="md:col-span-5 relative flex items-center">
<span class="material-symbols-outlined absolute left-3 text-outline text-[18px]">search</span>
<input v-model="orderSearch" class="w-full h-10 pl-9 pr-space-md rounded-lg bg-surface font-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="N° commande, adresse, notes..." type="text"/>
</div>
<div class="md:col-span-3">
<select v-model="orderCompanyId" class="w-full h-10 px-space-sm rounded-lg bg-surface font-body-sm text-on-surface focus:outline-none">
<option value="">Toutes les entreprises</option>
<option v-for="c in companyOptions" :key="c.value" :value="c.value">{{ c.label }}</option>
</select>
</div>
<div class="md:col-span-4">
<select v-model="orderStatus" class="w-full h-10 px-space-sm rounded-lg bg-surface font-body-sm text-on-surface focus:outline-none">
<option value="">Tous les statuts</option>
<option v-for="s in ORDER_STATUS" :key="s.value" :value="s.value">{{ s.label }}</option>
</select>
</div>
</div>
<div class="flex items-center justify-between pt-1">
<label class="flex items-center gap-1.5 cursor-pointer">
<input v-model="orderCashOnly" type="checkbox" class="w-4 h-4 rounded accent-primary"/>
<span class="font-label-md text-secondary flex items-center gap-1">
<span class="material-symbols-outlined text-[16px] text-primary">payments</span>
Payées en espèces uniquement
</span>
</label>
<span class="font-label-md text-secondary"><strong class="text-primary font-semibold">{{ ordersTotal }}</strong> commande(s) répertoriée(s)</span>
</div>
</div>

<div v-if="ordersLoading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-md">
<div v-for="n in 6" :key="n" class="h-56 rounded-xl bg-surface-container-lowest animate-pulse"></div>
</div>
<div v-else-if="orders.length === 0" class="text-center py-12 text-secondary bg-surface-container-lowest rounded-xl">
<span class="material-symbols-outlined text-[40px] mb-2 block opacity-30">shopping_bag</span>
<p class="font-body-md text-body-md font-medium">Aucune commande trouvée</p>
</div>
<div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-md">
<div v-for="row in orders" :key="row.orderId" class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-space-sm">
<div>
<div class="flex items-start justify-between">
<div>
<span class="font-body-sm font-bold text-on-surface tracking-tight">{{ row.orderNumber }}</span>
<div class="text-secondary font-label-sm flex items-center gap-1 mt-0.5"><span class="material-symbols-outlined text-[14px]">calendar_today</span><span>{{ formatDate(row.createdAt) }}</span></div>
</div>
<div class="flex flex-col items-end gap-1">
<span class="px-2 py-0.5 rounded font-label-sm font-semibold" :class="row.status === 'delivered' || row.status === 'paid' ? 'bg-primary-fixed text-primary' : row.status === 'cancelled' ? 'bg-error-container text-on-error-container' : 'bg-tertiary-fixed text-tertiary-container'">{{ ORDER_STATUS_LABEL[row.status] ?? row.status }}</span>
<span v-if="row.paymentMethod === 'cash'" class="px-2 py-0.5 rounded font-label-sm font-semibold bg-secondary-container text-on-secondary-fixed flex items-center gap-0.5">
<span class="material-symbols-outlined text-[12px]">payments</span>Espèces
</span>
</div>
</div>
<div v-if="row.user" class="mt-space-sm p-space-xs rounded-lg bg-surface-container-low/60 flex items-center gap-space-sm">
<div class="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-semibold text-xs shrink-0">{{ (row.user.username ?? '?')[0]?.toUpperCase() }}</div>
<div class="min-w-0 flex-1">
<div class="font-body-sm font-semibold text-on-surface truncate">{{ row.user.username }}</div>
<div class="font-label-sm text-secondary truncate">{{ row.user.email }}</div>
</div>
</div>
<div v-if="row.company?.name" class="mt-2"><span class="px-2 py-0.5 rounded-full bg-surface-container text-primary font-label-sm font-medium">{{ row.company.name }}</span></div>
<div v-if="row.product" class="mt-space-sm space-y-1">
<div class="flex items-center justify-between text-secondary font-label-sm"><span>Article :</span><span class="font-medium text-on-surface">{{ fmtAmount(row.product.price, row.product.currency) }}</span></div>
<p class="font-body-sm text-on-surface font-medium bg-surface-container-lowest rounded py-1">{{ row.product.name }}</p>
</div>
<div v-if="row.livreur?.user" class="mt-space-sm flex items-center gap-2 font-label-sm text-secondary">
<span class="w-2 h-2 rounded-full shrink-0" :class="row.livreur.isOnline ? 'bg-primary' : 'bg-outline'"></span>
<span>{{ row.livreur.user.username }}</span>
</div>
</div>
<div class="pt-space-xs flex items-center justify-between">
<span class="font-numeric-kpi text-[22px] font-bold text-primary">{{ fmtAmount(row.totalAmount, row.product?.currency) }}</span>
<div class="flex items-center gap-1.5">
<button v-if="row.status === 'pending'" class="w-8 h-8 rounded-full bg-surface-container text-primary flex items-center justify-center hover:bg-primary hover:text-on-primary transition-all disabled:opacity-50" title="Confirmer" type="button" :disabled="orderActionId === row.orderId" @click="quickStatus(row, 'confirmed')">
<span class="material-symbols-outlined text-[16px]">check</span>
</button>
<button v-if="!['cancelled', 'delivered'].includes(row.status)" class="w-8 h-8 rounded-full bg-surface-container text-tertiary-container flex items-center justify-center hover:bg-tertiary-container hover:text-on-tertiary transition-all disabled:opacity-50" title="Annuler" type="button" :disabled="orderActionId === row.orderId" @click="quickStatus(row, 'cancelled')">
<span class="material-symbols-outlined text-[16px]">close</span>
</button>
<button class="w-8 h-8 rounded-full bg-surface-container text-secondary flex items-center justify-center hover:bg-surface-container-high transition-all" title="Éditer" type="button" @click="openEditOrder(row)">
<span class="material-symbols-outlined text-[16px]">edit</span>
</button>
<button class="w-8 h-8 rounded-full bg-surface-container text-error flex items-center justify-center hover:bg-error-container hover:text-on-error-container transition-all" title="Supprimer" type="button" @click="removeOrder(row)">
<span class="material-symbols-outlined text-[16px]">delete</span>
</button>
</div>
</div>
</div>
</div>

<div v-if="ordersTotal > 0" class="p-space-md bg-surface-container-lowest rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
<span class="font-label-md text-secondary">Page <strong class="text-on-surface">{{ orderPage }}</strong> sur <strong class="text-on-surface">{{ orderTotalPages }}</strong></span>
<div class="flex items-center gap-1">
<button class="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-secondary hover:bg-surface-container-high transition-colors disabled:opacity-40" :disabled="orderPage <= 1" type="button" @click="goToOrderPage(orderPage - 1)"><span class="material-symbols-outlined text-[16px]">chevron_left</span></button>
<button class="w-8 h-8 rounded-lg bg-primary text-on-primary font-body-sm font-medium">{{ orderPage }}</button>
<button class="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-secondary hover:bg-surface-container-high transition-colors disabled:opacity-40" :disabled="orderPage >= orderTotalPages" type="button" @click="goToOrderPage(orderPage + 1)"><span class="material-symbols-outlined text-[16px]">chevron_right</span></button>
</div>
</div>
</div>

<!-- TAB 2: LIVREURS -->
<div v-show="mainTab === 'deliverers'" class="space-y-space-md">
<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm p-space-md bg-surface-container-lowest rounded-xl shadow-sm">
<div class="flex items-center gap-space-sm">
<div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><span class="material-symbols-outlined text-[24px]">electric_moped</span></div>
<div>
<h2 class="font-headline-md text-headline-md text-on-surface">Livreurs Partenaires &amp; Flotte</h2>
<p class="font-body-sm text-body-sm text-secondary">Candidatures et gestion active des livreurs BIM.</p>
</div>
</div>
<button class="inline-flex items-center gap-space-xs h-9 px-space-md rounded-lg bg-primary-container text-on-primary hover:bg-primary font-body-sm font-medium shadow-sm transition-all" type="button" @click="openCreateLivreur">
<span class="material-symbols-outlined text-[18px]">add</span><span>+ Créer un livreur</span>
</button>
</div>

<div class="grid grid-cols-2 sm:grid-cols-4 gap-space-sm">
<div class="p-space-sm bg-surface-container-lowest rounded-xl shadow-sm flex items-center gap-space-sm">
<div class="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center text-primary"><span class="material-symbols-outlined text-[20px]">group</span></div>
<div><div class="font-headline-md text-headline-md font-bold text-on-surface">{{ livreurStats.total }}</div><div class="font-label-sm text-secondary">Total inscrits</div></div>
</div>
<div class="p-space-sm bg-surface-container-lowest rounded-xl shadow-sm flex items-center gap-space-sm">
<div class="w-9 h-9 rounded-lg bg-surface-container-low flex items-center justify-center text-secondary"><span class="material-symbols-outlined text-[20px]">schedule</span></div>
<div><div class="font-headline-md text-headline-md font-bold text-secondary">{{ livreurStats.pending }}</div><div class="font-label-sm text-secondary">En attente</div></div>
</div>
<div class="p-space-sm bg-surface-container-lowest rounded-xl shadow-sm flex items-center gap-space-sm">
<div class="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center text-primary"><span class="material-symbols-outlined text-[20px]">verified</span></div>
<div><div class="font-headline-md text-headline-md font-bold text-on-surface">{{ livreurStats.active }}</div><div class="font-label-sm text-secondary">Actifs</div></div>
</div>
<div class="p-space-sm bg-surface-container-lowest rounded-xl shadow-sm flex items-center gap-space-sm">
<div class="w-9 h-9 rounded-lg bg-primary-fixed flex items-center justify-center text-primary"><span class="material-symbols-outlined text-[20px]">sensors</span></div>
<div><div class="font-headline-md text-headline-md font-bold text-primary">{{ livreurStats.online }}</div><div class="font-label-sm text-secondary">En ligne</div></div>
</div>
</div>

<div v-if="livreursLoading" class="grid grid-cols-1 md:grid-cols-2 gap-space-md">
<div v-for="n in 2" :key="n" class="h-48 rounded-xl bg-surface-container-lowest animate-pulse"></div>
</div>
<div v-else-if="livreurs.length === 0" class="text-center py-12 text-secondary bg-surface-container-lowest rounded-xl">
<span class="material-symbols-outlined text-[40px] mb-2 block opacity-30">local_shipping</span>
<p class="font-body-md text-body-md font-medium">Aucun livreur trouvé</p>
</div>
<div v-else class="grid grid-cols-1 md:grid-cols-2 gap-space-md">
<div v-for="row in livreurs" :key="row.livreurId" class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-space-md">
<div class="flex items-start justify-between">
<div class="flex items-center gap-space-sm">
<div class="w-11 h-11 rounded-lg bg-surface-container-high flex items-center justify-center text-primary font-bold text-base shrink-0">{{ (row.user?.username ?? '?')[0]?.toUpperCase() }}</div>
<div>
<div class="flex items-center gap-2">
<h3 class="font-headline-sm text-body-md font-bold text-on-surface">{{ row.user?.username ?? '—' }}</h3>
<span class="px-2 py-0.5 rounded-full font-label-sm font-semibold" :class="row.status === 'active' ? 'bg-primary-fixed text-primary' : row.status === 'rejected' ? 'bg-error-container text-on-error-container' : 'bg-tertiary-fixed text-tertiary-container'">{{ LIVREUR_STATUS_LABEL[row.status] ?? row.status }}</span>
</div>
<div class="font-label-sm text-secondary mt-0.5">{{ row.user?.email }}</div>
</div>
</div>
<span class="inline-flex items-center gap-1 font-label-sm px-2 py-1 rounded" :class="row.isOnline ? 'bg-surface-container text-primary' : 'bg-surface-container text-secondary'">
<span class="w-2 h-2 rounded-full" :class="row.isOnline ? 'bg-primary animate-pulse' : 'bg-outline'"></span>{{ row.isOnline ? 'En ligne' : 'Hors ligne' }}
</span>
</div>
<div class="grid grid-cols-2 gap-space-sm bg-surface-container-low p-space-sm rounded-lg">
<div><span class="font-label-sm text-secondary block">Numéro Contact</span><span class="font-body-sm font-medium text-on-surface">{{ row.telephone ?? '—' }}</span></div>
<div><span class="font-label-sm text-secondary block">Entreprise assignée</span><span class="inline-block mt-0.5 px-2 py-0.5 rounded bg-surface-container text-primary font-label-sm font-semibold">{{ row.company?.name ?? 'BIM (toutes)' }}</span></div>
<div><span class="font-label-sm text-secondary block">Évaluation client</span>
<div class="flex items-center gap-1 mt-0.5"><span class="material-symbols-outlined text-[16px] text-outline">star</span><span class="font-body-sm font-semibold text-on-surface">{{ Number(row.rating ?? 0).toFixed(2) }}</span><span class="font-label-sm text-secondary">({{ row.ratingCount ?? 0 }})</span></div>
</div>
<div><span class="font-label-sm text-secondary block">Date d'enregistrement</span><span class="font-body-sm text-secondary">{{ formatDate(row.createdAt) }}</span></div>
</div>
<div class="flex items-center justify-end gap-1 pt-1">
<button v-for="action in NEXT_ACTIONS[row.status] ?? []" :key="action.status" class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-primary hover:text-on-primary text-primary font-body-sm font-medium transition-colors disabled:opacity-50" type="button" :disabled="livreurUpdating === row.livreurId" @click="changeLivreurStatus(row, action.status)">
<span class="material-symbols-outlined text-[16px]">{{ action.icon }}</span><span>{{ action.label }}</span>
</button>
<span v-if="!(NEXT_ACTIONS[row.status] ?? []).length" class="font-label-sm text-secondary italic">Aucune action</span>
</div>
</div>
</div>
</div>

<!-- TAB 3: FIDÉLITÉ -->
<div v-show="mainTab === 'fidelity'" class="space-y-space-md">
<div class="p-space-md bg-surface-container-lowest rounded-xl shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
<div class="flex items-center gap-space-sm">
<div class="w-10 h-10 rounded-lg bg-primary-fixed flex items-center justify-center text-primary"><span class="material-symbols-outlined text-[24px]">verified_user</span></div>
<div>
<h2 class="font-headline-md text-headline-md text-on-surface">Fiches de Consommation &amp; Programme Fidélité</h2>
<p class="font-body-sm text-body-sm text-secondary">Après 10 achats d'un même produit, le 11ème est offert automatiquement.</p>
</div>
</div>
</div>

<div class="p-space-md bg-surface-container-lowest rounded-xl shadow-sm flex flex-wrap items-center gap-space-sm">
<div class="relative flex-1 min-w-[220px]">
<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
<input v-model="consumptionSearch" class="w-full h-10 pl-9 pr-space-md rounded-lg bg-surface-container-low font-body-sm text-on-surface placeholder:text-outline focus:outline-none" placeholder="Rechercher par utilisateur..." type="text"/>
</div>
<select v-model="consumptionBonusFilter" class="h-10 px-space-sm rounded-lg bg-surface-container-low font-body-sm text-on-surface focus:outline-none">
<option value="">Tout</option>
<option value="false">Achats payants</option>
<option value="true">Produits offerts (bonus)</option>
</select>
<span class="font-label-md text-secondary ml-auto">{{ consumptionsTotal }} fiche(s)</span>
</div>

<div v-if="consumptionsLoading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-md">
<div v-for="n in 6" :key="n" class="h-40 rounded-xl bg-surface-container-lowest animate-pulse"></div>
</div>
<div v-else-if="consumptions.length === 0" class="text-center py-12 text-secondary bg-surface-container-lowest rounded-xl">
<span class="material-symbols-outlined text-[40px] mb-2 block opacity-30">verified_user</span>
<p class="font-body-md text-body-md font-medium">Aucune fiche de consommation pour le moment</p>
</div>
<div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-md">
<div v-for="row in consumptions" :key="row.id" class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-space-sm">
<div class="flex items-center gap-space-sm">
<div class="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold shrink-0">{{ (row.signatureName ?? row.user?.username ?? '?')[0]?.toUpperCase() }}</div>
<div class="flex-1 min-w-0">
<div class="font-body-sm font-semibold text-on-surface truncate">{{ row.signatureName ?? row.user?.username ?? '—' }}</div>
<div class="font-label-sm text-secondary">{{ formatDate(row.consumedAt) }}</div>
</div>
<span class="px-2 py-0.5 rounded-full font-label-sm font-semibold shrink-0" :class="row.isBonus ? 'bg-tertiary-fixed text-tertiary-container' : 'bg-surface-container text-secondary'">{{ row.isBonus ? 'Offert (bonus)' : 'Achat payant' }}</span>
</div>
<div class="flex items-center gap-space-sm">
<div class="min-w-0">
<div class="font-body-sm font-medium truncate">{{ row.product?.name ?? '—' }}</div>
<div v-if="row.company?.name" class="font-label-sm text-secondary truncate">{{ row.company.name }}</div>
</div>
</div>
<div class="flex items-center justify-between pt-2 border-t border-surface-container">
<span class="font-body-sm text-secondary">{{ row.quantity }} {{ row.unityMesure || '' }}</span>
<span class="font-semibold font-body-sm text-on-surface">{{ Number(row.totalPaid ?? 0).toFixed(2) }} EC</span>
</div>
</div>
</div>

<div v-if="consumptionsTotal > 0" class="p-space-md bg-surface-container-lowest rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
<span class="font-label-md text-secondary">Page <strong class="text-on-surface">{{ consumptionPage }}</strong> sur <strong class="text-on-surface">{{ consumptionTotalPages }}</strong></span>
<div class="flex items-center gap-1">
<button class="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-secondary hover:bg-surface-container-high transition-colors disabled:opacity-40" :disabled="consumptionPage <= 1" type="button" @click="goToConsumptionPage(consumptionPage - 1)"><span class="material-symbols-outlined text-[16px]">chevron_left</span></button>
<button class="w-8 h-8 rounded-lg bg-primary text-on-primary font-body-sm font-medium">{{ consumptionPage }}</button>
<button class="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-secondary hover:bg-surface-container-high transition-colors disabled:opacity-40" :disabled="consumptionPage >= consumptionTotalPages" type="button" @click="goToConsumptionPage(consumptionPage + 1)"><span class="material-symbols-outlined text-[16px]">chevron_right</span></button>
</div>
</div>
</div>
</div>

<!-- Dialog Éditer commande -->
<div v-if="orderEditDialog" class="fixed inset-0 z-[90] flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm p-4" @click.self="orderEditDialog = false">
<div class="w-full max-w-md bg-white rounded-2xl shadow-xl p-space-lg space-y-space-md">
<h2 class="font-headline-md text-headline-md font-bold text-on-surface">Modifier la commande</h2>
<div v-if="orderEditForm.user" class="flex items-center gap-space-sm p-space-sm rounded-lg bg-surface-container-low">
<div class="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold text-sm shrink-0">{{ (orderEditForm.user.username ?? '?')[0]?.toUpperCase() }}</div>
<div class="min-w-0 flex-1">
<p class="font-body-sm text-body-sm font-semibold text-on-surface truncate">{{ orderEditForm.user.username ?? '—' }}</p>
<p class="font-label-sm text-label-sm text-secondary truncate">{{ orderEditForm.user.email ?? '—' }}</p>
</div>
<span class="font-label-sm text-label-sm text-outline shrink-0">#{{ orderEditForm.orderNumber }}</span>
</div>
<div>
<label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Statut</label>
<select v-model="orderEditForm.status" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none">
<option v-for="s in ORDER_STATUS" :key="s.value" :value="s.value">{{ s.label }}</option>
</select>
</div>
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Méthode de paiement</label><input v-model="orderEditForm.paymentMethod" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" placeholder="BIM Pay, Espèces..." type="text"/></div>
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Adresse de livraison</label><textarea v-model="orderEditForm.shippingAddress" class="w-full px-space-md py-2 rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" rows="2"></textarea></div>
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Notes internes</label><textarea v-model="orderEditForm.notes" class="w-full px-space-md py-2 rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" rows="2"></textarea></div>
<div class="flex justify-end gap-space-sm pt-space-sm">
<button class="h-10 px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm font-medium" type="button" :disabled="orderEditSaving" @click="orderEditDialog = false">Annuler</button>
<button class="h-10 px-space-md rounded-lg bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold disabled:opacity-60" type="button" :disabled="orderEditSaving" @click="saveOrderEdit">{{ orderEditSaving ? 'Enregistrement…' : 'Enregistrer' }}</button>
</div>
</div>
</div>

<!-- Dialog Créer livreur -->
<div v-if="livreurDialog" class="fixed inset-0 z-[90] flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm p-4" @click.self="livreurDialog = false">
<div class="w-full max-w-md bg-white rounded-2xl shadow-xl p-space-lg space-y-space-md">
<h2 class="font-headline-md text-headline-md font-bold text-on-surface">Créer un livreur directement</h2>
<p class="font-body-sm text-body-sm text-secondary">Le compte BIM NEXT sera créé si l'email n'existe pas encore. Les identifiants seront envoyés par email.</p>
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Nom d'utilisateur *</label><input v-model="livreurForm.username" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" placeholder="Jean Dupont" type="text"/></div>
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Email *</label><input v-model="livreurForm.email" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" type="email"/></div>
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Téléphone *</label><input v-model="livreurForm.telephone" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" placeholder="+243..." type="text"/></div>
<div>
<label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Entreprise associée</label>
<select v-model="livreurForm.companyId" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none">
<option value="">BIM (aucune entreprise spécifique)</option>
<option v-for="c in companyOptions" :key="c.value" :value="c.value">{{ c.label }}</option>
</select>
</div>
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Motivation (optionnel)</label><textarea v-model="livreurForm.motivation" class="w-full px-space-md py-2 rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" rows="2"></textarea></div>
<div class="flex justify-end gap-space-sm pt-space-sm">
<button class="h-10 px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm font-medium" type="button" :disabled="livreurSaving" @click="livreurDialog = false">Annuler</button>
<button class="h-10 px-space-md rounded-lg bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold disabled:opacity-60" type="button" :disabled="livreurSaving" @click="submitCreateLivreur">{{ livreurSaving ? 'Création…' : 'Créer & Activer' }}</button>
</div>
</div>
</div>
</div>
</template>
