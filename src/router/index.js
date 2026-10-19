import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '@/views/LoginView.vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { authStore } from '@/stores/auth'

const TITLE_SUFFIX = 'BIM NEXT Enterprise Platform'

// `section` indique l'entrée du menu latéral à mettre en surbrillance.
const adminPages = [
  { path: 'tableau-de-bord', name: 'tableau-de-bord', title: 'Tableau de bord', section: 'tableau-de-bord', component: () => import('@/views/TableauDeBordView.vue') },
  { path: 'comptes', name: 'comptes', title: 'Gestion des comptes', section: 'comptes', component: () => import('@/views/GestionComptesView.vue') },
  { path: 'utilisateurs-acces', name: 'utilisateurs-acces', title: 'Utilisateurs & Accès', section: 'comptes', component: () => import('@/views/UtilisateursAccesView.vue') },
  { path: 'codes-acces-staff', name: 'codes-acces-staff', title: "Codes d'accès Staff", section: 'comptes', component: () => import('@/views/CodesAccesStaffView.vue') },
  { path: 'entreprises', name: 'entreprises', title: 'Entreprises & Partenaires', section: 'entreprises', component: () => import('@/views/EntreprisesPartenairesView.vue') },
  { path: 'catalogue', name: 'catalogue', title: 'Catalogue Produits & Services', section: 'catalogue', component: () => import('@/views/CatalogueProduitsView.vue') },
  { path: 'transport', name: 'transport', title: 'BIM Transport', section: 'commandes', component: () => import('@/views/TransportChauffeursView.vue') },
  { path: 'commandes', name: 'commandes', title: 'Commandes & Livraisons', section: 'commandes', component: () => import('@/views/CommandesLivraisonsView.vue') },
  { path: 'agents', name: 'agents', title: 'Agents BIM', section: 'commandes', component: () => import('@/views/AgentsCashOutView.vue') },
  { path: 'formation', name: 'formation', title: 'Tutoriels Formation', section: 'catalogue', component: () => import('@/views/TutorielsFormationView.vue') },
  { path: 'transactions', name: 'transactions', title: 'Finance & Transactions', section: 'transactions', component: () => import('@/views/FinanceTransactionsView.vue') },
  { path: 'recharges', name: 'recharges', title: 'Demandes de recharge', section: 'transactions', component: () => import('@/views/RechargesTresorerieView.vue') },
  { path: 'recharges/rapprochement', name: 'recharges-rapprochement', title: 'Rapprochement Mobile Money', section: 'transactions', component: () => import('@/views/RechargesRapprochementView.vue') },
  { path: 'portefeuilles', name: 'portefeuilles', title: 'Portefeuilles utilisateurs', section: 'portefeuilles', component: () => import('@/views/PortefeuillesView.vue') },
  { path: 'statistiques', name: 'statistiques', title: 'Statistiques financières', section: 'statistiques', component: () => import('@/views/StatistiquesFinancieresView.vue') },
  { path: 'logs', name: 'logs', title: "Logs d'activité", section: 'logs', component: () => import('@/views/LogsActiviteView.vue') },
  { path: 'parametres', name: 'parametres', title: 'Paramètres', section: 'parametres', component: () => import('@/views/ParametresView.vue') }
]

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/connexion' },
    {
      path: '/connexion',
      name: 'connexion',
      component: LoginView,
      meta: { title: 'Connexion Administrateur' }
    },
    {
      path: '/',
      component: AdminLayout,
      children: adminPages.map(({ title, section, ...route }) => ({ ...route, meta: { title, section } }))
    },
    { path: '/:pathMatch(.*)*', redirect: '/tableau-de-bord' }
  ],
  scrollBehavior: () => ({ top: 0 })
})

router.beforeEach((to) => {
  if (to.name !== 'connexion' && !authStore.isAuthenticated) {
    return { name: 'connexion' }
  }
  if (to.name === 'connexion' && authStore.isAuthenticated) {
    return { path: '/tableau-de-bord' }
  }
  return true
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} - ${TITLE_SUFFIX}` : TITLE_SUFFIX
})

export default router
