import AppLayout from '@/layout/AppLayout.vue';
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

                // Temps réel
                { path: '/online-users', name: 'onlineUsers', component: () => import('@/views/online-users/OnlineUsers.vue') },

                // Comptes
                { path: '/accounts/create', name: 'createAccount', component: () => import('@/views/accounts/CreateAccount.vue') },

                // Utilisateurs & Accès
                { path: '/users', name: 'users', component: () => import('@/views/users/Users.vue') },
                { path: '/roles', name: 'roles', component: () => import('@/views/roles/Roles.vue') },
                { path: '/user-roles', name: 'userRoles', component: () => import('@/views/user-roles/UserRoles.vue') },

                // Entreprises & Commerce
                { path: '/companies', name: 'companies', component: () => import('@/views/companies/Companies.vue') },
                { path: '/commerces', name: 'commerces', component: () => import('@/views/commerces/Commerces.vue') },
                { path: '/branches', name: 'branches', component: () => import('@/views/branches/Branches.vue') },
                { path: '/business-categories', name: 'businessCategories', component: () => import('@/views/business-categories/BusinessCategories.vue') },

                // Catalogue Produits
                { path: '/products', name: 'products', component: () => import('@/views/products/Products.vue') },
                { path: '/product-categories', name: 'productCategories', component: () => import('@/views/product-categories/ProductCategories.vue') },
                { path: '/products-sold', name: 'productsSold', component: () => import('@/views/products-sold/ProductsSold.vue') },

                // Commandes
                { path: '/orders', name: 'orders', component: () => import('@/views/orders/Orders.vue') },

                // Transactions & Finance
                { path: '/transactions', name: 'transactions', component: () => import('@/views/transactions/Transactions.vue') },
                { path: '/recharges', name: 'recharges', component: () => import('@/views/recharges/Recharges.vue') },
                { path: '/history', name: 'history', component: () => import('@/views/history/History.vue') },
                { path: '/bonus', name: 'bonus', component: () => import('@/views/bonus/Bonus.vue') },

                // Support & Suivi
                { path: '/support', name: 'support', component: () => import('@/views/support/Support.vue') },
                { path: '/feedbacks', name: 'feedbacks', component: () => import('@/views/feedbacks/Feedbacks.vue') },
                { path: '/notifications', name: 'notifications', component: () => import('@/views/notifications/Notifications.vue') },
                { path: '/notes', name: 'notes', component: () => import('@/views/notes/Notes.vue') },

                // Paramètres
                { path: '/currencies', name: 'currencies', component: () => import('@/views/currencies/Currencies.vue') },
                { path: '/categories', name: 'categories', component: () => import('@/views/categories/Categories.vue') },
            ],
        },
        {
            path: '/landing',
            name: 'landing',
            component: () => import('@/views/pages/Landing.vue'),
        },
        {
            path: '/pages/notfound',
            name: 'notfound',
            component: () => import('@/views/pages/NotFound.vue'),
        },
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
    ],
});

router.beforeEach((to) => {
    const token = localStorage.getItem('bim_admin_token');
    const isAuthenticated = !!token;

    if (to.meta.requiresAuth && !isAuthenticated) return { name: 'login' };
    if (to.meta.guestOnly && isAuthenticated) return { name: 'dashboard' };
});

export default router;
