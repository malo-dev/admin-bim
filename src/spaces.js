// Espaces de gestion d'admin-bim : la page d'accueil (EspacesView) en affiche
// la liste ; une fois dans un espace, le menu latéral (AdminLayout) ne montre
// QUE les pages de cet espace.
export const SPACES = [
  {
    key: 'utilisateurs',
    label: 'Utilisateurs',
    icon: 'group',
    text: 'Clients, comptes administrateurs et codes d’accès du staff.',
    pages: [
      { to: '/utilisateurs-acces', label: 'Utilisateurs & accès', icon: 'group' },
      { to: '/comptes', label: 'Comptes administrateurs', icon: 'manage_accounts' },
      { to: '/codes-acces-staff', label: "Codes d'accès staff", icon: 'key' }
    ]
  },
  {
    key: 'catalogue',
    label: 'Catalogue produits',
    icon: 'inventory_2',
    text: 'Eau, gaz, carburant et autres produits : prix, images, disponibilité.',
    pages: [
      { to: '/catalogue', label: 'Catalogue produits', icon: 'inventory_2' },
      { to: '/formation', label: 'Tutoriels formation', icon: 'school' }
    ]
  },
  {
    key: 'entreprises',
    label: 'Entreprises & partenaires',
    icon: 'apartment',
    text: 'Entreprises partenaires, secteurs et commissions.',
    pages: [{ to: '/entreprises', label: 'Entreprises & partenaires', icon: 'apartment' }]
  },
  {
    key: 'commandes',
    label: 'Commandes & livraisons',
    icon: 'local_shipping',
    text: 'Commandes, statuts, livreurs et agents.',
    pages: [
      { to: '/commandes', label: 'Commandes & livraisons', icon: 'local_shipping' },
      { to: '/agents', label: 'Agents BIM', icon: 'storefront' }
    ]
  },
  {
    key: 'transport',
    label: 'BIM Transport',
    icon: 'local_taxi',
    text: 'Courses taxi, chauffeurs, gammes et tarifs.',
    pages: [{ to: '/transport', label: 'BIM Transport', icon: 'local_taxi' }]
  },
  {
    key: 'finance',
    label: 'Finance & recharges',
    icon: 'account_balance_wallet',
    text: 'Demandes de recharge, rapprochement, transactions et soldes.',
    badgeKey: 'recharges',
    pages: [
      { to: '/recharges', label: 'Demandes de recharge', icon: 'add_card', badgeKey: 'recharges' },
      { to: '/recharges/rapprochement', label: 'Rapprochement Mobile Money', icon: 'fact_check' },
      { to: '/transactions', label: 'Transactions', icon: 'sync_alt' },
      { to: '/portefeuilles', label: 'Portefeuilles', icon: 'account_balance_wallet' }
    ]
  },
  {
    key: 'pilotage',
    label: 'Pilotage',
    icon: 'monitoring',
    text: "Tableau de bord, statistiques, logs d'activité et paramètres.",
    pages: [
      { to: '/tableau-de-bord', label: 'Tableau de bord', icon: 'grid_view' },
      { to: '/statistiques', label: 'Statistiques', icon: 'monitoring' },
      { to: '/logs', label: "Logs d'activité", icon: 'history_toggle_off' },
      { to: '/parametres', label: 'Paramètres', icon: 'settings' }
    ]
  }
]

/** Espace auquel appartient une page (chemin exact), ou null. */
export function spaceOf(path) {
  return SPACES.find((s) => s.pages.some((p) => p.to === path)) ?? null
}
