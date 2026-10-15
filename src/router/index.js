import AppLayout from '@/layout/AppLayout.vue';
import CompanyLayout from '@/layout/CompanyLayout.vue';
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            component: AppLayout,
            meta: { requiresAuth: true },
            children: [
                { path: '/', name: 'dashboard', component: () => import('@/views/Dashboard.vue') },

                // ── 3 pages hub ──────────────────────────────────────────────────
                { path: '/gestion', name: 'gestion', component: () => import('@/views/gestion/Gestion.vue') },
                { path: '/finance-support', name: 'financeSupport', component: () => import('@/views/finance-support/FinanceSupport.vue') },

                // Détail de commande — reste une route à part (drill-down depuis l'onglet Commandes)
                { path: '/orders/:id', name: 'orderDetail', component: () => import('@/views/orders/OrderDetail.vue') },

                // ── Anciennes URLs → redirection vers le bon onglet du bon hub ──
                { path: '/online-users', redirect: '/' },

                { path: '/accounts/create', redirect: '/gestion?tab=0' },
                { path: '/accounts/list', redirect: '/gestion?tab=0' },
                { path: '/accounts/create-company', redirect: '/gestion?tab=0' },

                { path: '/users', redirect: '/gestion?tab=1' },
                { path: '/roles', redirect: '/gestion?tab=1' },
                { path: '/user-roles', redirect: '/gestion?tab=1' },

                { path: '/companies', redirect: '/gestion?tab=2' },
                { path: '/commerces', redirect: '/gestion?tab=2' },
                { path: '/branches', redirect: '/gestion?tab=2' },
                { path: '/business-categories', redirect: '/gestion?tab=2' },

                { path: '/products', redirect: '/gestion?tab=3' },
                { path: '/products-random', redirect: '/gestion?tab=3' },
                { path: '/product-categories', redirect: '/gestion?tab=3' },
                { path: '/products-sold', redirect: '/gestion?tab=3' },

                { path: '/banners', redirect: '/gestion?tab=4' },
                { path: '/app-version', redirect: '/gestion?tab=4' },

                { path: '/chauffeurs', redirect: '/gestion?tab=5' },
                { path: '/tarifs-transport', redirect: '/gestion?tab=5' },

                { path: '/orders', redirect: '/gestion?tab=6' },
                { path: '/consumption', redirect: '/gestion?tab=6' },
                { path: '/livreurs', redirect: '/gestion?tab=6' },
                { path: '/bonus', redirect: '/gestion?tab=6' },

                { path: '/agents', redirect: '/gestion?tab=7' },
                { path: '/tutorials', redirect: '/gestion?tab=8' },

                { path: '/transactions', redirect: '/finance-support?tab=0' },
                { path: '/recharges', redirect: '/finance-support?tab=1' },
                { path: '/finance-stats', redirect: '/finance-support?tab=3' },
                { path: '/history', redirect: '/finance-support?tab=4' },
                { path: '/support', redirect: '/finance-support?tab=5' },
                { path: '/notifications', redirect: '/finance-support?tab=6' },
                { path: '/notes', redirect: '/finance-support?tab=7' },
                { path: '/bim-sos', redirect: '/finance-support?tab=8' },
                { path: '/feedbacks', redirect: '/finance-support?tab=9' },
                { path: '/otps', redirect: '/finance-support?tab=10' },
                { path: '/currencies', redirect: '/finance-support?tab=11' },
                { path: '/categories', redirect: '/finance-support?tab=11' },
                { path: '/api-docs', redirect: '/finance-support?tab=11' },
                { path: '/portals', redirect: '/finance-support?tab=11' },
            ],
        },
        {
            path: '/landing',
            name: 'landing',
            component: () => import('@/views/pages/Landing.vue'),
        },
        // ── Portail entreprise ──────────────────────────────────────────────────
        {
            path: '/company',
            component: CompanyLayout,
            meta: { requiresCompanyAuth: true },
            children: [
                { path: 'orders', name: 'companyOrders', component: () => import('@/views/company/CompanyOrders.vue') },
                { path: 'payments', name: 'companyPayments', component: () => import('@/views/company/CompanyPayments.vue') },
                { path: 'accounts', name: 'companyAccounts', component: () => import('@/views/company/CompanyAccounts.vue') },
                { path: 'livreurs', name: 'companyLivreurs', component: () => import('@/views/company/CompanyLivreurs.vue') },
                { path: 'settings', name: 'companySettings', component: () => import('@/views/company/CompanySettings.vue') },
                { path: 'sos',      name: 'companySOSAlerts', component: () => import('@/views/company/CompanySOSAlerts.vue') },
            ],
        },
        {
            path: '/company/login',
            name: 'companyLogin',
            meta: { companyGuestOnly: true },
            component: () => import('@/views/company/CompanyLogin.vue'),
        },
        // ── Auth admin ──────────────────────────────────────────────────────────
        {
            path: '/auth/login',
            name: 'login',
            meta: { guestOnly: true },
            component: () => import('@/views/pages/auth/Login.vue'),
        },
        {
            path: '/auth/bootstrap',
            name: 'bootstrap',
            meta: { guestOnly: true },
            component: () => import('@/views/pages/auth/Bootstrap.vue'),
        },
        {
            path: '/auth/reset',
            name: 'resetAdminPassword',
            meta: { guestOnly: true },
            component: () => import('@/views/pages/auth/ResetAdminPassword.vue'),
        },
        {
            path: '/auth/access',
            name: 'accessDenied',
            component: () => import('@/views/pages/auth/Access.vue'),
        },
        {
            path: '/auth/error',
            name: 'error',
            component: () => import('@/views/pages/auth/Error.vue'),
        },
        {
            path: '/:pathMatch(.*)*',
            name: 'notfound',
            component: () => import('@/views/pages/NotFound.vue'),
        },
    ],
});

router.beforeEach((to) => {
    const token = localStorage.getItem('bim_admin_token');
    const isAuthenticated = !!token;
    const userStr = localStorage.getItem('bim_admin_user');
    const user = userStr ? JSON.parse(userStr) : null;
    const role = user?.role;
    const isCompanyAdmin = role === 'COMPANY_ADMIN';

    // Espace admin principal — réservé aux BIM
    if (to.meta.requiresAuth && !isAuthenticated) return { name: 'login' };
    if (to.meta.requiresAuth && isAuthenticated && isCompanyAdmin) return { name: 'companyOrders' };

    // Espace portail entreprise — réservé aux COMPANY_ADMIN
    if (to.meta.requiresCompanyAuth && !isAuthenticated) return { name: 'companyLogin' };
    if (to.meta.requiresCompanyAuth && isAuthenticated && !isCompanyAdmin) return { name: 'dashboard' };

    // Pages guest admin (login admin)
    if (to.meta.guestOnly && isAuthenticated) {
        return isCompanyAdmin ? { name: 'companyOrders' } : { name: 'dashboard' };
    }

    // Pages guest portail entreprise (login company)
    if (to.meta.companyGuestOnly && isAuthenticated) {
        return isCompanyAdmin ? { name: 'companyOrders' } : { name: 'dashboard' };
    }
});

export default router;
