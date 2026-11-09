<script setup>
/**
 * Accueil après connexion : « Que voulez-vous gérer ? ».
 * Une carte par espace de gestion ; un clic ouvre directement l'outil.
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import apiClient from '@/api/client'
import { authStore } from '@/stores/auth'
import { socketStore } from '@/stores/socket'
import ToastHost from '@/components/ToastHost.vue'

const router = useRouter()

function logout() {
  socketStore.disconnect()
  authStore.clearAuth()
  router.push('/connexion')
}

const GROUPS = [
  {
    title: 'Utilisateurs & accès',
    items: [
      { to: '/comptes', icon: 'manage_accounts', label: 'Comptes', text: 'Créer et gérer les comptes administrateurs, entreprises et commerces.' },
      { to: '/utilisateurs-acces', icon: 'group', label: 'Utilisateurs', text: 'Rechercher un client, bloquer, activer, voir son code de transaction.' },
      { to: '/codes-acces-staff', icon: 'key', label: "Codes d'accès staff", text: 'Codes qui ouvrent les espaces livreur, chauffeur et gestion.' }
    ]
  },
  {
    title: 'Catalogue & partenaires',
    items: [
      { to: '/catalogue', icon: 'inventory_2', label: 'Catalogue produits', text: 'Eau, gaz, carburant et autres produits : prix, images, disponibilité.' },
      { to: '/entreprises', icon: 'apartment', label: 'Entreprises & partenaires', text: 'Entreprises partenaires, secteurs et commissions.' },
      { to: '/formation', icon: 'school', label: 'Tutoriels formation', text: "Vidéos et guides affichés dans l'app." }
    ]
  },
  {
    title: 'Commandes & logistique',
    items: [
      { to: '/commandes', icon: 'local_shipping', label: 'Commandes & livraisons', text: 'Suivre les commandes, statuts, livreurs.' },
      { to: '/transport', icon: 'local_taxi', label: 'BIM Transport', text: 'Courses taxi, chauffeurs, gammes et tarifs.' },
      { to: '/agents', icon: 'storefront', label: 'Agents BIM', text: 'Agents de retrait et cash-out.' }
    ]
  },
  {
    title: 'Finance',
    items: [
      { to: '/recharges', icon: 'add_card', label: 'Demandes de recharge', text: 'Approuver ou refuser les recharges (abonnement à la 1ʳᵉ).', badgeKey: 'recharges' },
      { to: '/recharges/rapprochement', icon: 'fact_check', label: 'Rapprochement Mobile Money', text: 'Vérifier les recharges Mobile Money reçues.' },
      { to: '/transactions', icon: 'sync_alt', label: 'Transactions', text: 'Transferts, paiements et retraits.' },
      { to: '/portefeuilles', icon: 'account_balance_wallet', label: 'Portefeuilles', text: 'Soldes des utilisateurs.' },
      { to: '/statistiques', icon: 'monitoring', label: 'Statistiques', text: 'Chiffres et rapports financiers.' }
    ]
  },
  {
    title: 'Pilotage',
    items: [
      { to: '/tableau-de-bord', icon: 'grid_view', label: 'Tableau de bord', text: "Vue d'ensemble de l'activité en temps réel." },
      { to: '/logs', icon: 'history_toggle_off', label: "Logs d'activité", text: 'Qui a fait quoi, et quand.' },
      { to: '/parametres', icon: 'settings', label: 'Paramètres', text: 'Réglages de la plateforme.' }
    ]
  }
]

const search = ref('')
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const groups = computed(() => {
  const q = norm(search.value.trim())
  if (!q) return GROUPS
  return GROUPS
    .map((g) => ({ ...g, items: g.items.filter((i) => norm(`${i.label} ${i.text}`).includes(q)) }))
    .filter((g) => g.items.length)
})

const badges = ref({})
onMounted(async () => {
  try {
    const { data } = await apiClient.get('/tsx/admin/recharges', { params: { status: 'pending', pageSize: 1 } })
    badges.value = { recharges: Number(data?.total ?? 0) }
  } catch {
    /* non bloquant */
  }
})

const hello = computed(() => {
  const h = new Date().getHours()
  return h < 18 ? 'Bonjour' : 'Bonsoir'
})
</script>

<template>
<div class="min-h-full bg-surface">
<!-- En-tête simple : pas de menu latéral sur cette page -->
<header class="h-16 px-space-lg flex items-center justify-between bg-surface-container-lowest shadow-sm">
  <div class="flex items-center gap-space-sm">
    <span class="w-9 h-9 rounded-xl bg-primary text-on-primary font-bold flex items-center justify-center">B.</span>
    <span class="font-headline-sm text-headline-sm font-bold text-on-surface">BIM NEXT <span class="font-normal text-secondary">Admin</span></span>
  </div>
  <button type="button" class="h-10 px-space-sm rounded-lg flex items-center gap-2 text-body-sm font-semibold text-error hover:bg-error-container/60 transition-colors" @click="logout">
    <span class="material-symbols-outlined text-[19px]">logout</span><span class="hidden sm:inline">Se déconnecter</span>
  </button>
</header>

<div class="max-w-6xl mx-auto px-space-lg pt-space-lg pb-space-xl space-y-space-lg">
  <div class="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
    <div>
      <p class="font-body-md text-body-md text-secondary">{{ hello }}{{ authStore.user?.email ? `, ${authStore.user.email}` : '' }}</p>
      <h1 class="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">Que voulez-vous gérer ?</h1>
    </div>
    <div class="relative w-full md:w-80">
      <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
      <input v-model="search" class="w-full h-11 pl-10 pr-4 rounded-xl bg-surface-container-lowest shadow-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Rechercher un espace…" type="text" aria-label="Rechercher un espace"/>
    </div>
  </div>

  <div v-if="groups.length === 0" class="text-center py-12 text-secondary">Aucun espace ne correspond à « {{ search }} ».</div>

  <section v-for="g in groups" :key="g.title" class="space-y-space-sm">
    <h2 class="font-label-md text-label-md text-secondary uppercase font-semibold tracking-wide">{{ g.title }}</h2>
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-space-md">
      <button v-for="i in g.items" :key="i.to" type="button" @click="router.push(i.to)"
        class="group text-left p-space-md rounded-2xl bg-surface-container-lowest shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-start gap-space-sm focus-visible:ring-2 focus-visible:ring-primary/30">
        <span class="w-12 h-12 rounded-xl bg-primary-fixed text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-on-primary transition-colors">
          <span class="material-symbols-outlined text-[24px]">{{ i.icon }}</span>
        </span>
        <span class="flex-1 min-w-0">
          <span class="flex items-center gap-2">
            <span class="font-headline-sm text-headline-sm font-bold text-on-surface">{{ i.label }}</span>
            <span v-if="i.badgeKey && badges[i.badgeKey]" class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-error text-on-error">{{ badges[i.badgeKey] }}</span>
          </span>
          <span class="block mt-1 font-body-sm text-body-sm text-secondary">{{ i.text }}</span>
        </span>
        <span class="material-symbols-outlined text-outline text-[20px] self-center group-hover:text-primary transition-colors">arrow_forward</span>
      </button>
    </div>
  </section>
</div>
<ToastHost />
</div>
</template>
