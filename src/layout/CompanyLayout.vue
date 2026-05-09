<script setup>
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/modules/auth/store/auth.store';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const navItems = [
    { label: 'Commandes', icon: 'pi pi-shopping-cart', to: '/company/orders' },
    { label: 'Paiements', icon: 'pi pi-credit-card', to: '/company/payments' },
    { label: 'Comptes', icon: 'pi pi-users', to: '/company/accounts' },
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
        <header class="bg-surface-0 dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700 px-4 sm:px-6 py-3 flex items-center justify-between shadow-sm">
            <div class="flex items-center gap-2 sm:gap-3 min-w-0">
                <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <i class="pi pi-building text-primary text-sm" />
                </div>
                <div class="flex items-center gap-1 sm:gap-2 min-w-0">
                    <span class="font-bold text-surface-900 dark:text-surface-0 text-base sm:text-lg whitespace-nowrap">BIM NEXT</span>
                    <span class="text-muted-color text-xs sm:text-sm hidden sm:block whitespace-nowrap">— Portail entreprise</span>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-xs text-muted-color hidden lg:block truncate max-w-40">{{ authStore.user?.email }}</span>
                <!-- Mobile: icône seule -->
                <Button icon="pi pi-sign-out" severity="secondary" outlined size="small"
                    class="sm:hidden" @click="logout" />
                <!-- Desktop: icône + label -->
                <Button icon="pi pi-sign-out" label="Déconnexion" severity="secondary" outlined size="small"
                    class="hidden sm:flex" @click="logout" />
            </div>
        </header>

        <!-- Nav — scroll horizontal sur mobile -->
        <nav class="bg-surface-0 dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700">
            <div class="flex overflow-x-auto scrollbar-none px-2 sm:px-6">
                <router-link
                    v-for="item in navItems"
                    :key="item.to"
                    :to="item.to"
                    class="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0"
                    :class="isActive(item.to)
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-color hover:text-surface-900 dark:hover:text-surface-0'"
                >
                    <i :class="item.icon" class="text-base" />
                    <span>{{ item.label }}</span>
                </router-link>
            </div>
        </nav>

        <!-- Content -->
        <main class="flex-1 p-3 sm:p-6">
            <router-view />
        </main>

        <footer class="text-center py-3 text-xs text-muted-color border-t border-surface-200 dark:border-surface-700">
            BIM NEXT — Portail entreprise
        </footer>
    </div>
    <Toast position="bottom-center" />
</template>
