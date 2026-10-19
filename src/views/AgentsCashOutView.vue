<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import apiClient from '@/api/client'
import { useToast } from '@/composables/useToast'
import SectionTabs from '@/components/SectionTabs.vue'

const toast = useToast()

const agentSectionTabs = [
  { key: 'network', label: "Réseau d'agents", icon: 'storefront' },
  { key: 'rules', label: 'Barème & réglementation', icon: 'gavel' }
]
const agentSection = ref('network')

const searchInput = ref('')
const currentPage = ref(1)
const pageSize = ref(9)
const agents = ref([])
const totalRecords = ref(0)
const loading = ref(false)

async function loadAgents() {
  loading.value = true
  try {
    const { data } = await apiClient.get('/agent/admin/list', { params: { search: searchInput.value || undefined, page: currentPage.value, pageSize: pageSize.value } })
    agents.value = data?.data ?? []
    totalRecords.value = data?.total ?? agents.value.length
  } catch {
    toast.error('Impossible de charger les agents.')
  } finally {
    loading.value = false
  }
}
let searchDebounce = null
watch(searchInput, () => {
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    currentPage.value = 1
    loadAgents()
  }, 400)
})
const totalPages = computed(() => Math.max(1, Math.ceil(totalRecords.value / pageSize.value)))
function goToPage(p) {
  if (p < 1 || p > totalPages.value) return
  currentPage.value = p
  loadAgents()
}

const activeAgents = computed(() => agents.value.filter((a) => !a.isBlocked).length)
const blockedAgents = computed(() => agents.value.filter((a) => a.isBlocked).length)
const todayTotal = computed(() => agents.value.reduce((acc, a) => acc + Number(a.todaySum ?? 0), 0).toFixed(2))

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString('fr-FR') : '—'
}
function initials(name) {
  return name ? name[0].toUpperCase() : '?'
}

const actionId = ref(null)
const ACTION_LABEL = { block: 'bloqué', unblock: 'débloqué', remove: 'retiré' }
async function toggleAgent(row, action) {
  const CONFIRM_MSG = {
    block: `Bloquer ${row.username} ? Il ne pourra plus traiter de retraits.`,
    unblock: `Débloquer ${row.username} ?`,
    remove: `Retirer le statut agent de ${row.username} ? L'utilisateur restera dans le système mais perdra l'accès à l'espace agent.`
  }
  if (!window.confirm(CONFIRM_MSG[action])) return
  actionId.value = row.id
  try {
    await apiClient.put(`/agent/admin/${row.id}/toggle`, { action })
    toast.success(`Agent ${ACTION_LABEL[action]} avec succès.`)
    await loadAgents()
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  } finally {
    actionId.value = null
  }
}

const createDialog = ref(false)
const creating = ref(false)
const createForm = ref({ username: '', email: '', telephone: '' })
const createdCreds = ref(null)
function openCreate() {
  createForm.value = { username: '', email: '', telephone: '' }
  createdCreds.value = null
  createDialog.value = true
}
async function submitCreate() {
  if (!createForm.value.username || !createForm.value.email || !createForm.value.telephone) {
    toast.warn('Nom, email et téléphone sont obligatoires.')
    return
  }
  creating.value = true
  try {
    const { data } = await apiClient.post('/agent/admin/create', createForm.value)
    createdCreds.value = { plainPassword: data?.plainPassword, accountNumber: data?.user?.accountNumber, email: createForm.value.email, username: createForm.value.username }
    toast.success('Agent créé — identifiants envoyés par email.')
    await loadAgents()
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  } finally {
    creating.value = false
  }
}
function closeCreate() {
  createDialog.value = false
  createdCreds.value = null
}

onMounted(loadAgents)
</script>

<template>
<div class="flex flex-col w-full">
<div class="px-space-lg py-space-md max-w-[1600px] w-full mx-auto space-y-space-lg">
<div class="space-y-space-md">
<div class="flex items-center gap-space-sm">
<div class="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-primary"><span class="material-symbols-outlined text-[20px]">settings_suggest</span></div>
<div>
<h1 class="font-headline-lg text-headline-lg text-on-surface">Gestion</h1>
<p class="font-body-sm text-body-sm text-secondary">Comptes, utilisateurs, entreprises, catalogue, commandes et réseau d'agents de retrait</p>
</div>
</div>
<div class="flex items-center gap-1 overflow-x-auto pb-1 bg-surface-container-low p-1.5 rounded-xl shadow-sm">
<RouterLink class="flex items-center gap-2 px-3 py-2 rounded-lg text-secondary hover:text-on-surface font-body-sm text-body-sm font-medium transition-colors whitespace-nowrap" to="/comptes">
<span class="material-symbols-outlined text-[18px]">group</span><span>Comptes</span>
</RouterLink>
<RouterLink class="flex items-center gap-2 px-3 py-2 rounded-lg text-secondary hover:text-on-surface font-body-sm text-body-sm font-medium transition-colors whitespace-nowrap" to="/entreprises">
<span class="material-symbols-outlined text-[18px]">domain</span><span>Entreprises &amp; Commerce</span>
</RouterLink>
<RouterLink class="flex items-center gap-2 px-3 py-2 rounded-lg text-secondary hover:text-on-surface font-body-sm text-body-sm font-medium transition-colors whitespace-nowrap" to="/catalogue">
<span class="material-symbols-outlined text-[18px]">inventory_2</span><span>Catalogue Produits</span>
</RouterLink>
<RouterLink class="flex items-center gap-2 px-3 py-2 rounded-lg text-secondary hover:text-on-surface font-body-sm text-body-sm font-medium transition-colors whitespace-nowrap" to="/commandes">
<span class="material-symbols-outlined text-[18px]">local_shipping</span><span>Commandes &amp; Livraisons</span>
</RouterLink>
<RouterLink class="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold shadow-sm whitespace-nowrap" to="/agents">
<span class="material-symbols-outlined text-[18px]">badge</span><span>Agents BIM</span>
</RouterLink>
</div>
</div>

<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md pt-space-xs">
<div class="flex items-center gap-space-sm">
<div class="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center text-primary shadow-sm"><span class="material-symbols-outlined text-[26px]">badge</span></div>
<div>
<h2 class="font-headline-lg text-headline-lg text-on-surface flex items-center gap-2">Agents BIM <span class="px-2 py-0.5 rounded-full bg-surface-container font-label-sm text-label-sm text-primary font-semibold">Réseau Cash-Out</span></h2>
<p class="font-body-sm text-body-sm text-secondary">Supervision opérationnelle et points de retrait cash BIM NEXT</p>
</div>
</div>
<button class="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-container hover:bg-primary text-on-primary shadow-md font-body-sm text-body-sm font-semibold transition-all" type="button" @click="openCreate">
<span class="material-symbols-outlined text-[18px]">person_add</span><span>+ Créer un agent</span>
</button>
</div>

<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
<div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
<div class="flex items-center justify-between">
<span class="font-body-sm text-body-sm text-secondary font-medium">Total agents</span>
<div class="w-9 h-9 rounded-lg bg-surface-container-low flex items-center justify-center text-primary"><span class="material-symbols-outlined text-[20px]">group</span></div>
</div>
<div class="mt-space-sm font-numeric-kpi text-numeric-kpi text-on-surface">{{ totalRecords }}</div>
</div>
<div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
<div class="flex items-center justify-between">
<span class="font-body-sm text-body-sm text-secondary font-medium">Actifs</span>
<div class="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-primary-container"><span class="material-symbols-outlined text-[20px]">check_circle</span></div>
</div>
<div class="mt-space-sm font-numeric-kpi text-numeric-kpi text-on-surface">{{ activeAgents }}</div>
</div>
<div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
<div class="flex items-center justify-between">
<span class="font-body-sm text-body-sm text-secondary font-medium">Bloqués</span>
<div class="w-9 h-9 rounded-lg bg-error-container flex items-center justify-center text-error"><span class="material-symbols-outlined text-[20px]">block</span></div>
</div>
<div class="mt-space-sm font-numeric-kpi text-numeric-kpi text-on-surface">{{ blockedAgents }}</div>
</div>
<div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
<div class="flex items-center justify-between">
<span class="font-body-sm text-body-sm text-secondary font-medium">Retraits aujourd'hui</span>
<div class="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center text-primary"><span class="material-symbols-outlined text-[20px]">south_west</span></div>
</div>
<div class="mt-space-sm font-numeric-kpi text-numeric-kpi text-on-surface flex items-baseline gap-1">{{ todayTotal }} <span class="font-label-md text-label-md font-semibold text-secondary">EC</span></div>
</div>
</div>

<SectionTabs v-model="agentSection" :tabs="agentSectionTabs" />

<!-- Réseau d'agents -->
<div v-show="agentSection === 'network'" class="space-y-space-md">
<div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
<div class="relative flex-1">
<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
<input v-model="searchInput" class="w-full h-10 pl-11 pr-space-md rounded-lg bg-surface font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Nom, email, numéro de compte..." type="text"/>
</div>
<div class="px-3 py-2 rounded-lg bg-surface-container-low font-label-sm text-label-sm font-semibold text-primary">{{ totalRecords }} agent(s) répertorié(s)</div>
</div>

<div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-md">
<div v-for="n in 3" :key="n" class="h-48 rounded-xl bg-surface-container-lowest animate-pulse"></div>
</div>
<div v-else-if="agents.length === 0" class="text-center py-12 text-secondary bg-surface-container-lowest rounded-xl">
<span class="material-symbols-outlined text-[40px] mb-2 block opacity-30">badge</span>
<p class="font-body-md text-body-md font-medium">Aucun agent trouvé</p>
</div>
<div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-md">
<div v-for="row in agents" :key="row.id" class="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm hover:shadow-md transition-shadow space-y-space-md">
<div class="flex items-start justify-between gap-space-sm">
<div class="flex items-center gap-space-sm">
<div class="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center text-primary font-headline-md font-bold shrink-0">{{ initials(row.username) }}</div>
<div>
<div class="flex items-center gap-2">
<h3 class="font-headline-sm text-body-md text-on-surface font-bold">{{ row.username }}</h3>
<span class="px-2 py-0.5 rounded-full font-label-sm font-semibold" :class="row.isBlocked ? 'bg-error-container text-on-error-container' : 'bg-surface-container text-primary'">{{ row.isBlocked ? 'Bloqué' : 'Actif' }}</span>
</div>
<div class="font-label-sm text-secondary truncate">{{ row.email }}</div>
</div>
</div>
</div>
<div class="flex items-center justify-between font-body-sm text-body-sm text-secondary">
<span>{{ row.telephone ?? '—' }}</span>
<span class="px-2 py-0.5 rounded bg-surface-container-high font-label-sm text-label-sm font-bold text-on-surface">{{ row.accountNumber ?? '—' }}</span>
</div>
<div class="grid grid-cols-2 gap-space-sm p-space-sm rounded-xl bg-surface-container-low">
<div>
<div class="font-label-sm text-label-sm text-secondary font-medium">Commission cumulée</div>
<div class="mt-0.5 font-headline-sm text-headline-sm text-primary font-bold">{{ Number(row.soldNumber ?? 0).toFixed(2) }} EC</div>
</div>
<div>
<div class="font-label-sm text-label-sm text-secondary font-medium">Aujourd'hui</div>
<div class="mt-0.5 font-headline-sm text-headline-sm text-on-surface font-semibold">{{ Number(row.todaySum ?? 0).toFixed(2) }} EC</div>
<div class="font-label-sm text-label-sm text-secondary">{{ row.todayCount ?? 0 }} retrait(s)</div>
</div>
</div>
<div class="flex items-center justify-between font-label-sm text-label-sm text-secondary">
<span>Créé le {{ formatDate(row.createdAt) }}</span>
</div>
<div class="flex items-center justify-end gap-1.5 pt-space-sm border-t border-surface-container">
<button v-if="!row.isBlocked" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-error-container text-error hover:bg-error hover:text-on-error font-body-sm text-body-sm font-semibold transition-colors disabled:opacity-50" type="button" :disabled="actionId === row.id" @click="toggleAgent(row, 'block')">
<span class="material-symbols-outlined text-[18px]">block</span><span>Bloquer</span>
</button>
<button v-else class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container text-primary hover:bg-primary hover:text-on-primary font-body-sm text-body-sm font-semibold transition-colors disabled:opacity-50" type="button" :disabled="actionId === row.id" @click="toggleAgent(row, 'unblock')">
<span class="material-symbols-outlined text-[18px]">lock_open</span><span>Débloquer</span>
</button>
<button class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-container text-secondary hover:text-on-surface font-body-sm text-body-sm font-medium transition-colors disabled:opacity-50" title="Retirer le statut agent" type="button" :disabled="actionId === row.id" @click="toggleAgent(row, 'remove')">
<span class="material-symbols-outlined text-[18px]">person_remove</span>
</button>
</div>
</div>
</div>

<div v-if="totalRecords > 0" class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
<span class="font-label-md text-secondary">Page <strong class="text-on-surface">{{ currentPage }}</strong> sur <strong class="text-on-surface">{{ totalPages }}</strong></span>
<div class="flex items-center gap-1">
<button class="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-secondary hover:bg-surface-container-high transition-colors disabled:opacity-40" :disabled="currentPage <= 1" type="button" @click="goToPage(currentPage - 1)"><span class="material-symbols-outlined text-[16px]">chevron_left</span></button>
<button class="w-8 h-8 rounded-lg bg-primary text-on-primary font-body-sm font-medium">{{ currentPage }}</button>
<button class="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-secondary hover:bg-surface-container-high transition-colors disabled:opacity-40" :disabled="currentPage >= totalPages" type="button" @click="goToPage(currentPage + 1)"><span class="material-symbols-outlined text-[16px]">chevron_right</span></button>
</div>
</div>
</div>

<!-- Barème & réglementation -->
<div v-show="agentSection === 'rules'" class="grid grid-cols-1 lg:grid-cols-3 gap-space-lg">
<div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-space-md">
<div class="flex items-center gap-2"><span class="material-symbols-outlined text-primary text-[22px]">percent</span><h4 class="font-headline-sm text-headline-sm text-on-surface font-bold">Barème Commission Retrait</h4></div>
<div class="p-2.5 rounded-lg bg-surface flex justify-between items-center font-body-sm text-body-sm"><span class="text-secondary">Tous retraits</span><span class="font-semibold text-on-surface">0,5 % par retrait</span></div>
<div class="p-2.5 rounded-lg bg-surface-container-low font-label-sm text-label-sm text-secondary">Taux fixe actuel appliqué automatiquement par le système. Les commissions sont créditées directement sur le portefeuille de l'agent à chaque retrait traité.</div>
</div>
<div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-space-md">
<div class="flex items-center gap-2"><span class="material-symbols-outlined text-primary text-[22px]">shield</span><h4 class="font-headline-sm text-headline-sm text-on-surface font-bold">Sécurité des comptes agents</h4></div>
<div class="p-3 rounded-lg bg-surface space-y-1">
<div class="font-label-sm text-label-sm font-semibold text-on-surface">Blocage / déblocage immédiat</div>
<div class="font-body-sm text-body-sm text-secondary">Un agent bloqué ne peut plus traiter de retraits côté application mobile, avec effet immédiat.</div>
</div>
<div class="flex items-center gap-2 font-label-sm text-label-sm text-secondary"><span class="material-symbols-outlined text-[16px] text-primary">verified_user</span><span>Identifiants envoyés par email à la création du compte agent</span></div>
</div>
<div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-space-md">
<div class="flex items-center gap-2"><span class="material-symbols-outlined text-primary text-[22px]">info</span><h4 class="font-headline-sm text-headline-sm text-on-surface font-bold">À venir</h4></div>
<p class="font-body-sm text-body-sm text-secondary">Paliers de commission par volume, plafonds de retrait journaliers et suivi de réserve de caisse par agent ne sont pas encore configurables — ils arriveront dans une prochaine itération du module.</p>
</div>
</div>
</div>

<!-- Dialog Créer un agent -->
<div v-if="createDialog" class="fixed inset-0 z-[90] flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm p-4" @click.self="closeCreate">
<div class="w-full max-w-md bg-white rounded-2xl shadow-xl p-space-lg space-y-space-md">
<div class="flex items-center justify-between">
<h3 class="font-headline-md text-headline-md font-bold text-on-surface">Créer un agent BIM</h3>
<button class="w-8 h-8 rounded-lg text-secondary hover:bg-surface-container flex items-center justify-center" type="button" @click="closeCreate"><span class="material-symbols-outlined text-[20px]">close</span></button>
</div>

<div v-if="!createdCreds" class="space-y-space-sm">
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Nom d'utilisateur *</label><input v-model="createForm.username" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" placeholder="Jean Mukeba" type="text"/></div>
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Email *</label><input v-model="createForm.email" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" type="email"/></div>
<div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Téléphone *</label><input v-model="createForm.telephone" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none" placeholder="+243 9XX XXX XXX" type="text"/></div>
<p class="font-label-sm text-label-sm text-secondary">Un mot de passe temporaire sera généré et envoyé à l'adresse email saisie.</p>
<div class="flex justify-end gap-space-sm pt-space-sm">
<button class="h-10 px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm font-medium" type="button" :disabled="creating" @click="closeCreate">Annuler</button>
<button class="h-10 px-space-md rounded-lg bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold disabled:opacity-60" type="button" :disabled="creating" @click="submitCreate">{{ creating ? 'Création…' : "Créer l'agent" }}</button>
</div>
</div>

<div v-else class="space-y-space-sm">
<div class="flex items-center gap-2 text-primary font-semibold"><span class="material-symbols-outlined text-[22px]">check_circle</span><span>Agent créé avec succès !</span></div>
<div class="bg-surface-container-low rounded-xl p-space-md space-y-2 font-body-sm text-body-sm">
<div class="flex justify-between"><span class="text-secondary">Nom</span><span class="font-semibold">{{ createdCreds.username }}</span></div>
<div class="flex justify-between"><span class="text-secondary">Email</span><span class="font-semibold">{{ createdCreds.email }}</span></div>
<div class="flex justify-between"><span class="text-secondary">N° compte</span><span class="font-mono font-semibold text-primary">{{ createdCreds.accountNumber }}</span></div>
<div class="flex justify-between"><span class="text-secondary">Mot de passe</span><span class="font-mono font-semibold text-primary">{{ createdCreds.plainPassword }}</span></div>
</div>
<p class="font-label-sm text-label-sm text-secondary">Ces identifiants ont été envoyés à {{ createdCreds.email }}. Communiquez le numéro de compte à l'agent.</p>
<div class="flex justify-end pt-space-sm">
<button class="h-10 px-space-md rounded-lg bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold" type="button" @click="closeCreate">Fermer</button>
</div>
</div>
</div>
</div>
</div>
</template>
