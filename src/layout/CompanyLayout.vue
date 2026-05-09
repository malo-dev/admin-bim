<script setup>
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/modules/auth/store/auth.store';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const navItems = [
    { label: 'Commandes', icon: 'pi pi-shopping-cart', to: '/company/orders' },
    { label: 'Paiements reçus', icon: 'pi pi-credit-card', to: '/company/payments' },
    { label: 'Comptes admins', icon: 'pi pi-users', to: '/company/accounts' },
];

function isActive(to) {
    return route.path === to;
}

function logout() {
    authStore.clearAuth();
    router.push('/company/login');
}
</script>

<template>
    <div class="min-h-screen bg-surface-50 dark:bg-surface-950 flex flex-col">
        <!-- Topbar -->
        <header class="bg-surface-0 dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700 px-6 py-3 flex items-center justify-between shadow-sm">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <i class="pi pi-building text-primary text-sm" />
                </div>
                <span class="font-bold text-surface-900 dark:text-surface-0 text-lg">BIM NEXT</span>
                <span class="text-muted-color text-sm hidden sm:block">— Portail entreprise</span>
            </div>
            <div class="flex items-center gap-3">
                <span class="text-sm text-muted-color hidden md:block">{{ authStore.user?.email }}</span>
                <Button icon="pi pi-sign-out" label="Déconnexion" severity="secondary" outlined size="small"
                    @click="logout" />
            </div>
        </header>

        <!-- Nav -->
        <nav class="bg-surface-0 dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700 px-6">
            <div class="flex gap-1">
                <router-link
                    v-for="item in navItems"
                    :key="item.to"
                    :to="item.to"
                    class="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors"
                    :class="isActive(item.to)
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-color hover:text-surface-900 dark:hover:text-surface-0 hover:border-surface-300'"
                >
                    <i :class="item.icon" />
                    <span>{{ item.label }}</span>
                </router-link>
            </div>
        </nav>

        <!-- Content -->
        <main class="flex-1 p-6">
            <router-view />
        </main>

        <footer class="text-center py-3 text-xs text-muted-color border-t border-surface-200 dark:border-surface-700">
            BIM NEXT — Portail entreprise
        </footer>
    </div>
    <Toast />
</template>
