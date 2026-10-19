<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import apiClient from '@/api/client'
import { authStore } from '@/stores/auth'
import { socketStore } from '@/stores/socket'
import ToastHost from '@/components/ToastHost.vue'

const AVATAR_URL =
  'https://lh3.googleusercontent.com/aida/AEtjO1VzsrPn1s0Hw_3PqJYcZLOnzEz89mV6h7ecEdOwkck2_CBm8i83Tya4hR_OD2qrC4tQ4rh9mLxRTrPCtFjZSM9aN5jcmp2gMVg9iKsvRKiYq9gSaPg2i_yNkBGEKpDbJj2qBK8oodsrAHHhEGDF401644XZ5p5ekpZPge_62d2un1mygugmVznSHFVPhw9q_1fAguv0ZjElHmAsFGEjW8sIIq_38jN6TEZ0WuxkIZBwJHo3suL4bbBKBjytzSppvxckaIfiA8BSsw'

const ROLE_LABELS = {
  BIM: 'Super Admin BIM',
  COMPANY_ADMIN: 'Admin Entreprise',
  CLIENT: 'Client'
}

const adminName = computed(() => authStore.user?.email?.split('@')[0] || 'Administrateur')
const adminEmail = computed(() => authStore.user?.email || '')
const adminRoleLabel = computed(() => ROLE_LABELS[authStore.user?.role] || authStore.user?.role || 'Administrateur')

function logout() {
  socketStore.disconnect()
  authStore.clearAuth()
  router.push('/connexion')
}

const cdfRate = ref(null)
apiClient
  .get('/currency')
  .then(({ data }) => {
    const cdf = data?.data?.find((c) => c.code === 'CDF')
    if (cdf?.rate) cdfRate.value = Math.round(Number(cdf.rate))
  })
  .catch(() => {})

const pendingRecharges = ref(0)
apiClient
  .get('/tsx/admin/recharges', { params: { status: 'pending', pageSize: 1 } })
  .then(({ data }) => {
    pendingRecharges.value = data?.total ?? 0
  })
  .catch(() => {})

// `section` correspond à `meta.section` des routes. Une entrée avec `children` devient un sous-menu dépliable.
// Les entrées sans `to` ni `children` n'ont pas encore d'écran.
const navGroups = reactive([
  {
    title: 'Principal',
    items: [{ label: 'Tableau de bord', icon: 'grid_view', to: '/tableau-de-bord', section: 'tableau-de-bord' }]
  },
  {
    title: 'Gestion',
    items: [
      {
        label: 'Comptes & Utilisateurs',
        icon: 'manage_accounts',
        section: 'comptes',
        children: [
          { label: 'Comptes', to: '/comptes' },
          { label: 'Utilisateurs & Accès', to: '/utilisateurs-acces' },
          { label: "Codes d'accès Staff", to: '/codes-acces-staff' }
        ]
      },
      { label: 'Entreprises & Partenaires', icon: 'apartment', to: '/entreprises', section: 'entreprises' },
      {
        label: 'Catalogue & Services',
        icon: 'layers',
        section: 'catalogue',
        children: [
          { label: 'Catalogue Produits', to: '/catalogue' },
          { label: 'Tutoriels Formation', to: '/formation' }
        ]
      },
      {
        label: 'Commandes & Logistique',
        icon: 'local_shipping',
        section: 'commandes',
        children: [
          { label: 'Commandes & Livraisons', to: '/commandes' },
          { label: 'BIM Transport', to: '/transport' },
          { label: 'Agents BIM', to: '/agents' }
        ]
      }
    ]
  },
  {
    title: 'Finance & Trésorerie',
    items: [
      {
        label: 'Transactions & Recharges',
        icon: 'sync_alt',
        section: 'transactions',
        badge: pendingRecharges,
        children: [
          { label: 'Transactions', to: '/transactions' },
          { label: 'Demandes de recharge', to: '/recharges' },
          { label: 'Rapprochement Mobile Money', to: '/recharges/rapprochement' }
        ]
      },
      { label: 'Portefeuilles', icon: 'account_balance_wallet', to: '/portefeuilles', section: 'portefeuilles' },
      { label: 'Rapports & Statistiques', icon: 'monitoring', to: '/statistiques', section: 'statistiques' }
    ]
  },
  {
    title: 'Système & Support',
    items: [
      { label: 'Tickets Support', icon: 'headset_mic', soon: true },
      { label: "Logs d'activité", icon: 'history_toggle_off', to: '/logs', section: 'logs' },
      { label: 'Paramètres', icon: 'settings', to: '/parametres', section: 'parametres' }
    ]
  }
])

// Fil d'activité temps réel (recharges, retraits, transferts, paiements, commandes) — alimenté
// par l'événement socket `admin:activity` émis par le serveur à chaque opération.
const notifications = computed(() =>
  socketStore.activityFeed.map((item) => ({ ...item, time: relativeTime(item.time) }))
)
const notifPermission = ref(socketStore.notificationPermission())
async function enableBrowserNotifications() {
  notifPermission.value = await socketStore.requestNotificationPermission()
}
function relativeTime(iso) {
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (diffSec < 60) return "à l'instant"
  if (diffSec < 3600) return `il y a ${Math.floor(diffSec / 60)} min`
  if (diffSec < 86400) return `il y a ${Math.floor(diffSec / 3600)} h`
  return `il y a ${Math.floor(diffSec / 86400)} j`
}

const route = useRoute()
const router = useRouter()
const activeSection = computed(() => route.meta.section)

// Fil d'Ariane : groupe du menu > entrée > page.
const breadcrumb = computed(() => {
  for (const group of navGroups) {
    const item = group.items.find((entry) => entry.section && entry.section === activeSection.value)
    if (item) {
      const crumbs = [group.title, item.label]
      if (item.children) crumbs.push(route.meta.title)
      return crumbs
    }
  }
  return [route.meta.title]
})

// Sous-menus ouverts : celui de la page courante s'ouvre automatiquement.
const openMenus = reactive({})
watch(activeSection, (section) => section && (openMenus[section] = true), { immediate: true })

// Menu replié (icônes seules) sur grand écran, mémorisé localement.
function readCollapsed() {
  try {
    return localStorage.getItem('bim-sidebar-collapsed') === '1'
  } catch {
    return false
  }
}
const collapsed = ref(readCollapsed())
watch(collapsed, (value) => {
  try {
    localStorage.setItem('bim-sidebar-collapsed', value ? '1' : '0')
  } catch {
    /* stockage indisponible : préférence non mémorisée */
  }
})

// Menu en tiroir sur mobile.
const mobileOpen = ref(false)
watch(() => route.fullPath, () => {
  mobileOpen.value = false
  openPanel.value = null
})

function onParentClick(item) {
  if (collapsed.value) {
    router.push(item.children[0].to)
  } else {
    openMenus[item.section] = !openMenus[item.section]
  }
}

// Menus déroulants de l'en-tête (notifications, profil) : un seul ouvert à la fois.
const openPanel = ref(null)
function togglePanel(name) {
  openPanel.value = openPanel.value === name ? null : name
  if (openPanel.value === 'notifications') socketStore.markActivityRead()
}

const searchInput = ref(null)
function onKeydown(event) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    searchInput.value?.focus()
  }
  if (event.key === 'Escape') {
    openPanel.value = null
    mobileOpen.value = false
  }
}
function onDocumentClick(event) {
  if (!event.target.closest('[data-panel]')) openPanel.value = null
}
onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  document.addEventListener('click', onDocumentClick)
  socketStore.connect()
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.removeEventListener('click', onDocumentClick)
})

const itemBase = 'group relative flex items-center gap-3 rounded-xl transition-all duration-200'
const itemIdle = 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
const itemActive = 'bg-gradient-to-r from-primary-container to-primary text-white shadow-md shadow-primary/20'
const itemParentActive = 'bg-surface-container-low text-primary'
</script>

<template>
  <div class="relative isolate bg-white font-body-md text-body-md text-on-surface antialiased min-h-full">
    <!-- Fond : halos de couleur flous derrière le verre -->
    <div class="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div class="absolute -top-48 -left-40 w-[46rem] h-[46rem] rounded-full bg-blue-300/30 blur-[130px]"></div>
      <div class="absolute top-[20%] -right-48 w-[40rem] h-[40rem] rounded-full bg-indigo-300/25 blur-[130px]"></div>
      <div class="absolute -bottom-56 left-[30%] w-[42rem] h-[42rem] rounded-full bg-sky-200/45 blur-[130px]"></div>
      <div class="absolute top-[55%] left-[8%] w-80 h-80 rounded-full bg-emerald-200/25 blur-[110px]"></div>
      <div class="absolute inset-0 bg-[radial-gradient(rgb(30_58_138/0.05)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]"></div>
    </div>

    <!-- Voile mobile -->
    <Transition enter-from-class="opacity-0" leave-to-class="opacity-0" enter-active-class="transition-opacity duration-200" leave-active-class="transition-opacity duration-200">
      <div v-if="mobileOpen" class="fixed inset-0 z-40 bg-inverse-surface/40 backdrop-blur-sm lg:hidden" @click="mobileOpen = false"></div>
    </Transition>

    <!-- Menu latéral -->
    <aside
      class="fixed left-0 top-0 h-full z-50 flex flex-col bg-white/70 backdrop-blur-2xl backdrop-saturate-150 border-r border-white/70 shadow-[1px_0_0_rgb(30_58_138/0.05),8px_0_32px_-12px_rgb(30_64_175/0.12)] transition-all duration-300 ease-out"
      :class="[collapsed ? 'lg:w-20' : 'lg:w-64', mobileOpen ? 'w-72 translate-x-0 shadow-2xl' : 'w-72 -translate-x-full lg:translate-x-0']"
    >
      <!-- Marque -->
      <div class="h-16 shrink-0 flex items-center gap-3 px-4" :class="{ 'lg:justify-center lg:px-0': collapsed }">
        <div class="relative w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-primary-container via-primary to-[#001a66] flex items-center justify-center text-white font-headline-md font-extrabold shadow-lg shadow-primary/30">
          B
          <span class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-surface-container-lowest"></span>
        </div>
        <div class="flex flex-col min-w-0" :class="{ 'lg:hidden': collapsed }">
          <div class="flex items-baseline gap-1 leading-none">
            <span class="font-headline-md text-[19px] text-primary tracking-tight font-extrabold">BIM</span>
            <span class="font-headline-md text-[19px] text-on-surface font-semibold tracking-tight">NEXT</span>
          </div>
          <span class="mt-1 font-label-sm text-[10px] text-secondary uppercase tracking-[0.18em]">Enterprise Platform</span>
        </div>
        <button class="ml-auto lg:hidden w-9 h-9 rounded-lg text-secondary hover:bg-surface-container flex items-center justify-center" type="button" @click="mobileOpen = false">
          <span class="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      <!-- Navigation -->
      <div class="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 space-y-5">
        <div v-for="group in navGroups" :key="group.title">
          <div v-if="!collapsed" class="px-3 pb-1.5 font-label-sm text-[10.5px] uppercase tracking-[0.14em] text-outline font-semibold">{{ group.title }}</div>
          <div v-else class="hidden lg:block mx-auto mb-2 w-6 h-px bg-surface-container-highest"></div>
          <div v-if="collapsed" class="lg:hidden px-3 pb-1.5 font-label-sm text-[10.5px] uppercase tracking-[0.14em] text-outline font-semibold">{{ group.title }}</div>

          <nav class="space-y-1">
            <template v-for="item in group.items" :key="item.label">
              <!-- Entrée avec sous-menu -->
              <div v-if="item.children">
                <button
                  type="button"
                  class="w-full text-left px-3 py-2.5"
                  :class="[itemBase, activeSection === item.section ? (collapsed ? itemActive : itemParentActive) : itemIdle, { 'lg:justify-center lg:px-0': collapsed }]"
                  :aria-expanded="!!openMenus[item.section]"
                  :title="collapsed ? item.label : undefined"
                  @click="onParentClick(item)"
                >
                  <span class="material-symbols-outlined text-[21px] shrink-0">{{ item.icon }}</span>
                  <span class="font-body-sm text-body-sm font-medium flex-1 truncate" :class="{ 'lg:hidden': collapsed }">{{ item.label }}</span>
                  <span
                    v-if="item.badge"
                    class="min-w-[20px] h-5 px-1.5 rounded-full bg-tertiary-container text-white text-[10px] font-bold flex items-center justify-center"
                    :class="{ 'lg:absolute lg:top-1 lg:right-2 lg:min-w-[16px] lg:h-4 lg:px-1 lg:text-[9px]': collapsed }"
                  >{{ item.badge }}</span>
                  <span
                    class="material-symbols-outlined text-[18px] text-outline transition-transform duration-200"
                    :class="{ 'rotate-180': openMenus[item.section], 'lg:hidden': collapsed }"
                  >expand_more</span>
                </button>
                <div class="grid transition-all duration-300 ease-out" :class="[openMenus[item.section] ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0', { 'lg:hidden': collapsed }]">
                  <div class="overflow-hidden">
                    <div class="mt-1 ml-[1.4rem] pl-3 border-l border-surface-container-highest space-y-0.5">
                      <RouterLink
                        v-for="child in item.children"
                        :key="child.to"
                        :to="child.to"
                        class="relative flex items-center px-3 py-2 rounded-lg font-body-sm text-body-sm transition-all duration-200"
                        :class="route.path === child.to ? 'text-primary font-semibold bg-primary-fixed/50' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'"
                        :aria-current="route.path === child.to ? 'page' : undefined"
                      >
                        <span v-if="route.path === child.to" class="absolute -left-[13px] top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-primary"></span>
                        {{ child.label }}
                      </RouterLink>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Entrée simple -->
              <RouterLink
                v-else-if="item.to"
                :to="item.to"
                class="px-3 py-2.5"
                :class="[itemBase, activeSection === item.section ? itemActive : itemIdle, { 'lg:justify-center lg:px-0': collapsed }]"
                :aria-current="activeSection === item.section ? 'page' : undefined"
                :title="collapsed ? item.label : undefined"
              >
                <span class="material-symbols-outlined text-[21px] shrink-0">{{ item.icon }}</span>
                <span class="font-body-sm text-body-sm font-medium truncate" :class="{ 'lg:hidden': collapsed }">{{ item.label }}</span>
              </RouterLink>

              <!-- Entrée sans écran -->
              <div
                v-else
                class="px-3 py-2.5 cursor-not-allowed text-outline"
                :class="[itemBase, { 'lg:justify-center lg:px-0': collapsed }]"
                :title="collapsed ? `${item.label} (bientôt)` : undefined"
              >
                <span class="material-symbols-outlined text-[21px] shrink-0">{{ item.icon }}</span>
                <span class="font-body-sm text-body-sm font-medium truncate flex-1" :class="{ 'lg:hidden': collapsed }">{{ item.label }}</span>
                <span v-if="item.soon" class="px-1.5 py-0.5 rounded-md bg-surface-container text-[9.5px] font-semibold uppercase tracking-wide" :class="{ 'lg:hidden': collapsed }">Bientôt</span>
              </div>
            </template>
          </nav>
        </div>
      </div>

      <!-- Profil -->
      <div class="shrink-0 p-3 border-t border-surface-container">
        <div class="flex items-center gap-3 p-2 rounded-xl bg-white/70 shadow-sm" :class="{ 'lg:justify-center lg:p-1.5': collapsed }">
          <div class="relative shrink-0">
            <img alt="Profil" class="w-9 h-9 rounded-full object-cover ring-2 ring-white" :src="AVATAR_URL" />
            <span class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-surface-container-low"></span>
          </div>
          <div class="min-w-0 flex-1" :class="{ 'lg:hidden': collapsed }">
            <div class="font-body-sm text-body-sm font-semibold text-on-surface truncate">{{ adminName }}</div>
            <div class="font-label-sm text-label-sm text-primary truncate">{{ adminRoleLabel }}</div>
          </div>
          <button
            type="button"
            class="w-8 h-8 shrink-0 rounded-lg text-secondary hover:text-error hover:bg-error-container/60 flex items-center justify-center transition-colors"
            :class="{ 'lg:hidden': collapsed }"
            title="Se déconnecter"
            @click="logout"
          >
            <span class="material-symbols-outlined text-[19px]">logout</span>
          </button>
        </div>
      </div>
    </aside>

    <!-- Zone principale -->
    <div class="flex flex-col min-h-screen transition-[padding] duration-300 ease-out" :class="collapsed ? 'lg:pl-20' : 'lg:pl-64'">
      <header
        class="fixed top-0 right-0 left-0 h-16 z-30 flex items-center gap-3 px-4 sm:px-6 bg-white/55 backdrop-blur-2xl backdrop-saturate-150 border-b border-white/70 shadow-[0_1px_0_rgb(30_58_138/0.05)] transition-[left] duration-300 ease-out"
        :class="collapsed ? 'lg:left-20' : 'lg:left-64'"
      >
        <!-- Ouvrir (mobile) / replier (bureau) le menu -->
        <button class="lg:hidden w-9 h-9 rounded-lg text-secondary hover:bg-surface-container flex items-center justify-center" type="button" title="Menu" @click="mobileOpen = true">
          <span class="material-symbols-outlined text-[22px]">menu</span>
        </button>
        <button
          class="hidden lg:flex w-9 h-9 rounded-lg text-secondary hover:bg-surface-container hover:text-on-surface items-center justify-center transition-colors"
          type="button"
          :title="collapsed ? 'Déplier le menu' : 'Replier le menu'"
          @click="collapsed = !collapsed"
        >
          <span class="material-symbols-outlined text-[22px]">{{ collapsed ? 'left_panel_open' : 'left_panel_close' }}</span>
        </button>

        <!-- Fil d'Ariane -->
        <nav class="hidden sm:flex items-center gap-1.5 min-w-0 font-body-sm text-body-sm" aria-label="Fil d'Ariane">
          <template v-for="(crumb, index) in breadcrumb" :key="index">
            <span v-if="index" class="material-symbols-outlined text-[16px] text-outline-variant">chevron_right</span>
            <span class="truncate" :class="index === breadcrumb.length - 1 ? 'text-on-surface font-semibold' : 'text-secondary'">{{ crumb }}</span>
          </template>
        </nav>

        <div class="ml-auto flex items-center gap-2 sm:gap-3">
          <div class="hidden xl:flex items-center gap-2 h-9 px-3 rounded-lg bg-white/70 border border-white/80 shadow-sm font-label-md text-label-md text-secondary">
            <span class="relative flex w-2 h-2">
              <span class="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75 animate-ping"></span>
              <span class="relative inline-flex w-2 h-2 rounded-full bg-emerald-500"></span>
            </span>
            <span>1 EC = <strong class="text-on-surface tabular-nums">{{ cdfRate ? cdfRate.toLocaleString('fr-FR') : '—' }} FC</strong></span>
          </div>

          <!-- Recherche (Ctrl K) -->
          <div class="relative hidden md:flex items-center">
            <span class="material-symbols-outlined absolute left-3 text-outline text-[18px] pointer-events-none">search</span>
            <input
              ref="searchInput"
              class="h-9 pl-9 pr-14 w-56 lg:w-72 rounded-lg bg-white/70 border border-white/80 shadow-sm font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/10 transition-all"
              placeholder="Rechercher..."
              type="search"
            />
            <kbd class="absolute right-2 px-1.5 py-0.5 rounded-md bg-surface-container text-[10px] font-semibold text-secondary border border-surface-container-highest pointer-events-none">Ctrl K</kbd>
          </div>

          <!-- Notifications -->
          <div class="relative" data-panel>
            <button
              class="relative w-9 h-9 flex items-center justify-center rounded-lg text-secondary hover:bg-surface-container hover:text-on-surface transition-colors"
              :class="{ 'bg-surface-container text-on-surface': openPanel === 'notifications' }"
              type="button"
              title="Notifications"
              @click="togglePanel('notifications')"
            >
              <span class="material-symbols-outlined text-[21px]">notifications</span>
              <span v-if="socketStore.unreadActivity" class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-tertiary-container ring-2 ring-surface"></span>
            </button>
            <Transition enter-from-class="opacity-0 -translate-y-1 scale-95" leave-to-class="opacity-0 -translate-y-1 scale-95" enter-active-class="transition duration-150 ease-out" leave-active-class="transition duration-100 ease-in">
              <div v-if="openPanel === 'notifications'" class="absolute right-0 mt-2 w-80 origin-top-right rounded-2xl bg-white/85 backdrop-blur-2xl shadow-xl border border-white/80 overflow-hidden">
                <div class="px-4 py-3 flex items-center justify-between border-b border-surface-container">
                  <span class="font-body-sm text-body-sm font-semibold text-on-surface">Activité en direct</span>
                  <span class="px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant text-[10px] font-bold">{{ notifications.length }}</span>
                </div>
                <button
                  v-if="notifPermission === 'default'"
                  type="button"
                  class="w-full flex items-center gap-2.5 px-4 py-2.5 border-b border-surface-container bg-primary-fixed/20 hover:bg-primary-fixed/30 transition-colors text-left"
                  @click="enableBrowserNotifications"
                >
                  <span class="material-symbols-outlined text-[18px] text-primary">notifications_active</span>
                  <span class="font-label-md text-label-md text-on-surface font-medium">Activer les notifications du navigateur</span>
                </button>
                <div v-if="!notifications.length" class="px-4 py-8 text-center font-body-sm text-body-sm text-secondary">
                  Aucune activité pour l'instant. Les recharges, retraits, transferts, paiements et commandes apparaîtront ici en direct.
                </div>
                <RouterLink
                  v-for="notif in notifications.slice(0, 8)"
                  :key="notif.id"
                  :to="notif.to"
                  class="flex items-start gap-3 px-4 py-3 hover:bg-surface-container-low transition-colors"
                >
                  <div class="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center" :class="notif.unread ? 'bg-primary-fixed text-primary' : 'bg-surface-container text-secondary'">
                    <span class="material-symbols-outlined text-[19px]">{{ notif.icon }}</span>
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                      <span class="font-body-sm text-body-sm font-semibold text-on-surface truncate">{{ notif.title }}</span>
                      <span v-if="notif.unread" class="w-1.5 h-1.5 shrink-0 rounded-full bg-primary"></span>
                    </div>
                    <p class="font-label-sm text-label-sm text-secondary truncate">{{ notif.text }}</p>
                    <p class="mt-0.5 font-label-sm text-[10.5px] text-outline">{{ notif.time }}</p>
                  </div>
                </RouterLink>
                <RouterLink to="/logs" class="block px-4 py-2.5 text-center font-label-md text-label-md text-primary bg-surface-container-low hover:bg-surface-container transition-colors">
                  Voir toute l'activité
                </RouterLink>
              </div>
            </Transition>
          </div>

          <div class="hidden sm:block h-8 w-px bg-surface-container-highest"></div>

          <!-- Profil -->
          <div class="relative" data-panel>
            <button
              class="flex items-center gap-2.5 h-10 pl-1 pr-2 rounded-xl hover:bg-surface-container transition-colors"
              :class="{ 'bg-surface-container': openPanel === 'profile' }"
              type="button"
              @click="togglePanel('profile')"
            >
              <img alt="Profil" class="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow-sm" :src="AVATAR_URL" />
              <div class="hidden sm:block text-left leading-tight">
                <div class="font-body-sm text-body-sm font-semibold text-on-surface">{{ adminName }}</div>
                <div class="font-label-sm text-[10.5px] text-primary font-medium">{{ adminRoleLabel }}</div>
              </div>
              <span class="hidden sm:block material-symbols-outlined text-[18px] text-outline">expand_more</span>
            </button>
            <Transition enter-from-class="opacity-0 -translate-y-1 scale-95" leave-to-class="opacity-0 -translate-y-1 scale-95" enter-active-class="transition duration-150 ease-out" leave-active-class="transition duration-100 ease-in">
              <div v-if="openPanel === 'profile'" class="absolute right-0 mt-2 w-60 origin-top-right rounded-2xl bg-white/85 backdrop-blur-2xl shadow-xl border border-white/80 p-1.5">
                <div class="px-3 py-2.5 mb-1 border-b border-surface-container">
                  <div class="font-body-sm text-body-sm font-semibold text-on-surface">{{ adminName }}</div>
                  <div class="font-label-sm text-label-sm text-secondary">{{ adminEmail }}</div>
                </div>
                <RouterLink to="/parametres" class="flex items-center gap-2.5 px-3 py-2 rounded-lg font-body-sm text-body-sm text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors">
                  <span class="material-symbols-outlined text-[19px]">settings</span>Paramètres
                </RouterLink>
                <RouterLink to="/logs" class="flex items-center gap-2.5 px-3 py-2 rounded-lg font-body-sm text-body-sm text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors">
                  <span class="material-symbols-outlined text-[19px]">history</span>Mon activité
                </RouterLink>
                <div class="my-1 h-px bg-surface-container"></div>
                <button type="button" class="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-body-sm text-body-sm text-error hover:bg-error-container/60 transition-colors" @click="logout">
                  <span class="material-symbols-outlined text-[19px]">logout</span>Se déconnecter
                </button>
              </div>
            </Transition>
          </div>
        </div>
      </header>

      <main class="w-full pt-16 flex-1">
        <RouterView v-slot="{ Component }">
          <Transition name="page" mode="out-in">
            <div :key="route.path">
              <component :is="Component" />
            </div>
          </Transition>
        </RouterView>
      </main>
    </div>

    <ToastHost />
  </div>
</template>
