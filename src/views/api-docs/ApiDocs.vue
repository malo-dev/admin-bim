<script setup>
import { ref, computed } from 'vue';

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1');

const searchInput = ref('');
const activeTag   = ref('Tous');

const ENDPOINTS = [
    /* ── Auth ── */
    { method: 'POST',   path: '/auth/login',                    tag: 'Auth', desc: 'Connexion utilisateur (email + mot de passe)', auth: false },
    { method: 'POST',   path: '/auth/register',                 tag: 'Auth', desc: 'Inscription utilisateur', auth: false },
    { method: 'POST',   path: '/auth/logOut',                   tag: 'Auth', desc: 'Déconnexion', auth: true },
    { method: 'POST',   path: '/auth/verifyPwd',                tag: 'Auth', desc: 'Vérification mot de passe / PIN', auth: true },
    { method: 'POST',   path: '/auth/bootstrap',                tag: 'Auth', desc: 'Créer le premier admin BIM (bloqué si un admin existe déjà)', auth: false },
    { method: 'POST',   path: '/auth/request-bim-reset',        tag: 'Auth', desc: 'Envoyer OTP reset mot de passe admin', auth: false },
    { method: 'POST',   path: '/auth/reset-bim-password',       tag: 'Auth', desc: 'Vérifier OTP + nouveau mot de passe admin', auth: false },
    /* ── Users ── */
    { method: 'GET',    path: '/auth/users',                    tag: 'Utilisateurs', desc: 'Liste paginée des utilisateurs', auth: true },
    { method: 'GET',    path: '/auth/users/:id',                tag: 'Utilisateurs', desc: 'Profil d\'un utilisateur par ID', auth: true },
    { method: 'PUT',    path: '/auth/users/:id/profile',        tag: 'Utilisateurs', desc: 'Mettre à jour le profil (supporte multipart pour image)', auth: true },
    { method: 'PUT',    path: '/auth/users/:id/activate',       tag: 'Utilisateurs', desc: 'Activer / désactiver un compte', auth: true },
    { method: 'PUT',    path: '/auth/users/:id/block-user',     tag: 'Utilisateurs', desc: 'Bloquer / débloquer un compte', auth: true },
    { method: 'DELETE', path: '/auth/users/:id',                tag: 'Utilisateurs', desc: 'Supprimer un compte', auth: true },
    { method: 'GET',    path: '/auth/users/balance-stats',      tag: 'Utilisateurs', desc: 'Statistiques de solde des utilisateurs', auth: true },
    { method: 'POST',   path: '/auth/users/:id/admin-recharge', tag: 'Utilisateurs', desc: 'Recharger manuellement un compte', auth: true },
    { method: 'POST',   path: '/auth/users/:id/admin-reset-password', tag: 'Utilisateurs', desc: 'Réinitialiser le mot de passe d\'un utilisateur', auth: true },
    /* ── Comptes admin ── */
    { method: 'GET',    path: '/auth/admin-accounts',           tag: 'Comptes Admin', desc: 'Liste des comptes BIM + COMPANY_ADMIN', auth: true },
    { method: 'POST',   path: '/auth/create-bim-admin',         tag: 'Comptes Admin', desc: 'Créer un admin BIM', auth: true },
    { method: 'POST',   path: '/auth/create-company-account',   tag: 'Comptes Admin', desc: 'Créer un compte entreprise + admin', auth: true },
    { method: 'POST',   path: '/auth/add-company-admin',        tag: 'Comptes Admin', desc: 'Ajouter un admin à une entreprise existante', auth: true },
    /* ── OTP ── */
    { method: 'GET',    path: '/auth/otps',                     tag: 'OTP', desc: 'Liste des OTP envoyés', auth: true },
    { method: 'POST',   path: '/auth/verify-otp',               tag: 'OTP', desc: 'Vérifier un code OTP', auth: false },
    /* ── Dashboard ── */
    { method: 'GET',    path: '/auth/dashboard-stats',          tag: 'Dashboard', desc: 'Statistiques globales (period: daily|weekly|monthly|annual)', auth: true },
    /* ── Secteurs ── */
    { method: 'GET',    path: '/sector',                        tag: 'Secteurs', desc: 'Liste des secteurs d\'activité', auth: true },
    { method: 'GET',    path: '/sector/:id',                    tag: 'Secteurs', desc: 'Détail d\'un secteur', auth: true },
    { method: 'POST',   path: '/sector/create',                 tag: 'Secteurs', desc: 'Créer un secteur (corps = tableau)', auth: true },
    { method: 'PUT',    path: '/sector/update/:id',             tag: 'Secteurs', desc: 'Mettre à jour un secteur', auth: true },
    { method: 'DELETE', path: '/sector/delete/:id',             tag: 'Secteurs', desc: 'Supprimer un secteur', auth: true },
    /* ── Entreprises ── */
    { method: 'GET',    path: '/company',                       tag: 'Entreprises', desc: 'Liste des entreprises (paginate, search)', auth: true },
    { method: 'GET',    path: '/company/:id',                   tag: 'Entreprises', desc: 'Détail d\'une entreprise', auth: true },
    { method: 'POST',   path: '/company/create',                tag: 'Entreprises', desc: 'Créer une entreprise', auth: true },
    { method: 'PUT',    path: '/company/update/:id',            tag: 'Entreprises', desc: 'Mettre à jour une entreprise (multipart pour logo)', auth: true },
    { method: 'DELETE', path: '/company/delete/:id',            tag: 'Entreprises', desc: 'Supprimer une entreprise', auth: true },
    /* ── Produits ── */
    { method: 'GET',    path: '/product',                       tag: 'Produits', desc: 'Liste des produits (companyId, search, paginate)', auth: true },
    { method: 'GET',    path: '/product/:id',                   tag: 'Produits', desc: 'Détail d\'un produit', auth: true },
    { method: 'POST',   path: '/product/create',                tag: 'Produits', desc: 'Créer un produit (multipart pour image)', auth: true },
    { method: 'PUT',    path: '/product/update/:id',            tag: 'Produits', desc: 'Mettre à jour un produit (multipart pour image)', auth: true },
    { method: 'DELETE', path: '/product/delete/:id',            tag: 'Produits', desc: 'Supprimer un produit', auth: true },
    /* ── Catégories Produits ── */
    { method: 'GET',    path: '/category',                      tag: 'Catégories', desc: 'Liste des catégories de produits', auth: true },
    { method: 'GET',    path: '/category/:id',                  tag: 'Catégories', desc: 'Détail d\'une catégorie', auth: true },
    { method: 'POST',   path: '/category/create',               tag: 'Catégories', desc: 'Créer une catégorie (name requis, commerceId optionnel)', auth: true },
    { method: 'PUT',    path: '/category/update/:id',           tag: 'Catégories', desc: 'Mettre à jour une catégorie', auth: true },
    { method: 'DELETE', path: '/category/delete/:id',           tag: 'Catégories', desc: 'Supprimer une catégorie', auth: true },
    /* ── Table de jonction Produit↔Catégorie ── */
    { method: 'GET',    path: '/product_category',              tag: 'Catégories', desc: 'Liens produit ↔ catégorie (table de jonction)', auth: true },
    { method: 'POST',   path: '/product_category/create',       tag: 'Catégories', desc: 'Associer un produit à une catégorie (productId + categoryId)', auth: true },
    { method: 'DELETE', path: '/product_category/delete/:id',   tag: 'Catégories', desc: 'Dissocier un produit d\'une catégorie', auth: true },
    /* ── Transactions ── */
    { method: 'GET',    path: '/tsx',                                    tag: 'Transactions', desc: 'Liste globale des transactions (admin)', auth: true },
    { method: 'GET',    path: '/tsx/:id',                                tag: 'Transactions', desc: 'Détail d\'une transaction', auth: true },
    { method: 'POST',   path: '/tsx/paiement',                           tag: 'Transactions', desc: 'Créer un paiement marchand', auth: true },
    { method: 'POST',   path: '/tsx/transfert',                          tag: 'Transactions', desc: 'Créer un transfert entre comptes', auth: true },
    { method: 'POST',   path: '/tsx/createrecharge',                     tag: 'Transactions', desc: 'Créer une demande de recharge manuelle', auth: true },
    { method: 'POST',   path: '/tsx/retrait',                            tag: 'Transactions', desc: 'Créer une demande de retrait', auth: true },
    { method: 'GET',    path: '/tsx/admin/recharges',                    tag: 'Transactions', desc: 'Liste des recharges (status=pending|success|failed)', auth: true },
    { method: 'GET',    path: '/tsx/admin/retraits',                     tag: 'Transactions', desc: 'Liste des retraits', auth: true },
    { method: 'GET',    path: '/tsx/admin/paiements',                    tag: 'Transactions', desc: 'Liste des paiements marchands', auth: true },
    { method: 'PATCH',  path: '/tsx/admin/recharges/:id/approve',        tag: 'Transactions', desc: 'Approuver une recharge → status success + crédit compte', auth: true },
    { method: 'PATCH',  path: '/tsx/admin/recharges/:id/reject',         tag: 'Transactions', desc: 'Rejeter une recharge → status failed + notification + email', auth: true },
    /* ── Commandes ── */
    { method: 'GET',    path: '/order',                         tag: 'Commandes', desc: 'Liste des commandes (status, companyId)', auth: true },
    { method: 'GET',    path: '/order/:id',                     tag: 'Commandes', desc: 'Détail d\'une commande', auth: true },
    { method: 'POST',   path: '/order/create',                  tag: 'Commandes', desc: 'Passer une commande', auth: true },
    { method: 'PUT',    path: '/order/:id',                     tag: 'Commandes', desc: 'Mettre à jour le statut d\'une commande', auth: true },
    { method: 'GET',    path: '/order/my-orders',               tag: 'Commandes', desc: 'Commandes de l\'entreprise connectée', auth: true },
    { method: 'GET',    path: '/order/mine',                    tag: 'Commandes', desc: 'Commandes de l\'utilisateur connecté', auth: true },
    /* ── Devises ── */
    { method: 'GET',    path: '/currency',                      tag: 'Devises', desc: 'Liste des devises', auth: true },
    { method: 'POST',   path: '/currency/create',               tag: 'Devises', desc: 'Créer une devise', auth: true },
    { method: 'PUT',    path: '/currency/update/:id',           tag: 'Devises', desc: 'Mettre à jour une devise', auth: true },
    { method: 'DELETE', path: '/currency/delete/:id',           tag: 'Devises', desc: 'Supprimer une devise', auth: true },
    /* ── Notifications ── */
    { method: 'GET',    path: '/notification_track',            tag: 'Notifications', desc: 'Liste des notifications', auth: true },
    { method: 'POST',   path: '/notification_track/create',     tag: 'Notifications', desc: 'Envoyer une notification', auth: true },
    { method: 'PUT',    path: '/notification_track/mark_read/:id', tag: 'Notifications', desc: 'Marquer une notification comme lue', auth: true },
    /* ── Support ── */
    { method: 'GET',    path: '/support_track',                 tag: 'Support', desc: 'Liste des tickets support', auth: true },
    { method: 'POST',   path: '/support_track/create',          tag: 'Support', desc: 'Créer un ticket support', auth: true },
    { method: 'PUT',    path: '/support_track/update/:id',      tag: 'Support', desc: 'Mettre à jour un ticket', auth: true },
    { method: 'DELETE', path: '/support_track/delete/:id',      tag: 'Support', desc: 'Supprimer un ticket', auth: true },
    /* ── Notes ── */
    { method: 'GET',    path: '/notes',                         tag: 'Notes', desc: 'Liste de toutes les notes/avis', auth: true },
    { method: 'GET',    path: '/notes/company/:id',             tag: 'Notes', desc: 'Notes d\'une entreprise', auth: true },
    { method: 'POST',   path: '/notes/create',                  tag: 'Notes', desc: 'Créer une note / avis', auth: true },
    { method: 'PUT',    path: '/notes/update/:id',              tag: 'Notes', desc: 'Mettre à jour une note', auth: true },
    { method: 'DELETE', path: '/notes/delete/:id',              tag: 'Notes', desc: 'Supprimer une note', auth: true },
    /* ── Bonus ── */
    { method: 'GET',    path: '/bonus',                         tag: 'Bonus', desc: 'Liste des bonus', auth: true },
    { method: 'POST',   path: '/bonus/create',                  tag: 'Bonus', desc: 'Créer un bonus', auth: true },
    { method: 'PUT',    path: '/bonus/update/:id',              tag: 'Bonus', desc: 'Mettre à jour un bonus', auth: true },
    { method: 'DELETE', path: '/bonus/delete/:id',              tag: 'Bonus', desc: 'Supprimer un bonus', auth: true },
    /* ── Livreurs ── */
    { method: 'POST',   path: '/livreur/apply',                 tag: 'Livreurs', desc: 'Candidature livreur (avec pièces d\'identité)', auth: true },
    { method: 'GET',    path: '/livreur/company/candidates',    tag: 'Livreurs', desc: 'Candidats livreurs de l\'entreprise', auth: true },
    { method: 'PUT',    path: '/livreur/:id/status',            tag: 'Livreurs', desc: 'Approuver / rejeter un livreur', auth: true },
    { method: 'GET',    path: '/livreur/orders/available',      tag: 'Livreurs', desc: 'Commandes disponibles à livrer', auth: true },
    { method: 'PUT',    path: '/livreur/orders/accept/:orderNumber', tag: 'Livreurs', desc: 'Accepter une livraison', auth: true },
];

const tags = computed(() => ['Tous', ...new Set(ENDPOINTS.map(e => e.tag))]);

const filtered = computed(() => {
    const q = searchInput.value.toLowerCase();
    return ENDPOINTS.filter(e => {
        const matchTag = activeTag.value === 'Tous' || e.tag === activeTag.value;
        const matchSearch = !q || e.path.toLowerCase().includes(q) || e.desc.toLowerCase().includes(q) || e.method.toLowerCase().includes(q);
        return matchTag && matchSearch;
    });
});

const METHOD_COLORS = {
    GET:    'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    POST:   'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
    PUT:    'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
    PATCH:  'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300',
    DELETE: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
};

function methodColor(m) { return METHOD_COLORS[m] ?? 'bg-surface-100 text-surface-600'; }
function copyUrl(path) {
    navigator.clipboard.writeText(BASE_URL + path);
}
</script>

<template>
    <div class="flex flex-col gap-5">
        <!-- Header -->
        <div class="flex items-center justify-between flex-wrap gap-3">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                    <i class="pi pi-code text-violet-600 dark:text-violet-400 text-lg" />
                </div>
                <div>
                    <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Documentation API</h1>
                    <p class="text-sm text-muted-color font-mono">{{ BASE_URL }}</p>
                </div>
            </div>
            <Tag :value="`${ENDPOINTS.length} endpoints`" severity="secondary" />
        </div>

        <!-- Search + tag filter -->
        <div class="flex flex-col gap-3">
            <IconField>
                <InputIcon class="pi pi-search" />
                <InputText v-model="searchInput" placeholder="Rechercher un endpoint, méthode, description…" class="w-full" />
            </IconField>
            <div class="flex flex-wrap gap-2">
                <Button
                    v-for="tag in tags"
                    :key="tag"
                    :label="tag"
                    size="small"
                    :severity="activeTag === tag ? 'primary' : 'secondary'"
                    :outlined="activeTag !== tag"
                    @click="activeTag = tag"
                />
            </div>
        </div>

        <!-- Results count -->
        <p class="text-sm text-muted-color">{{ filtered.length }} endpoint(s) affiché(s)</p>

        <!-- Endpoint list -->
        <div class="flex flex-col gap-2">
            <div
                v-for="ep in filtered"
                :key="ep.method + ep.path"
                class="card flex items-start gap-4 p-4 hover:shadow-md transition-shadow group"
            >
                <!-- Method badge -->
                <div
                    class="shrink-0 px-2.5 py-1 rounded-lg font-mono font-bold text-xs min-w-13.5 text-center"
                    :class="methodColor(ep.method)"
                >
                    {{ ep.method }}
                </div>

                <!-- Path + desc -->
                <div class="flex-1 min-w-0">
                    <p class="font-mono text-sm font-semibold text-surface-900 dark:text-surface-0 break-all">
                        {{ ep.path }}
                    </p>
                    <p class="text-xs text-muted-color mt-0.5">{{ ep.desc }}</p>
                </div>

                <!-- Tag + auth -->
                <div class="flex flex-col items-end gap-1.5 shrink-0">
                    <Tag :value="ep.tag" severity="secondary" class="text-xs" />
                    <div class="flex items-center gap-1 text-xs" :class="ep.auth ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'">
                        <i :class="ep.auth ? 'pi pi-lock' : 'pi pi-lock-open'" class="text-xs" />
                        <span>{{ ep.auth ? 'Auth requis' : 'Public' }}</span>
                    </div>
                </div>

                <!-- Copy button -->
                <Button
                    icon="pi pi-copy"
                    v-tooltip.top="'Copier l\'URL complète'"
                    severity="secondary"
                    text
                    rounded
                    size="small"
                    class="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    @click="copyUrl(ep.path)"
                />
            </div>
        </div>
    </div>
</template>
