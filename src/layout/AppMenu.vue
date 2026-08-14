<script setup>
import { computed } from 'vue';
import AppMenuItem from './AppMenuItem.vue';
import { useSocketStore } from '@/modules/socket/store/socket.store';
import { useAuthStore } from '@/modules/auth/store/auth.store';
import { useRechargesQuery } from '@/modules/transactions/queries/transactions.queries';

const socketStore = useSocketStore();
const authStore = useAuthStore();

const { data: pendingData } = useRechargesQuery(computed(() => ({ status: 'pending', pageSize: 1 })));
const pendingCount = computed(() => pendingData.value?.total ?? 0);

const model = computed(() => [
    {
        label: 'Accueil',
        items: [
            { label: 'Dashboard', icon: 'pi pi-fw pi-home', to: '/' }
        ]
    },
    {
        label: 'Temps Réel',
        items: [
            {
                label: 'Utilisateurs connectés',
                icon: 'pi pi-fw pi-wifi',
                to: '/online-users',
                badge: socketStore.onlineCount > 0 ? String(socketStore.onlineCount) : null,
                badgeSeverity: 'success'
            }
        ]
    },
    {
        label: 'Comptes',
        items: [
            { label: 'Créer un compte', icon: 'pi pi-fw pi-user-plus', to: '/accounts/create' },
            { label: 'Liste des comptes', icon: 'pi pi-fw pi-list', to: '/accounts/list' }
        ]
    },
    {
        label: 'Agents BIM',
        items: [
            { label: 'Agents de retrait', icon: 'pi pi-fw pi-id-card', to: '/agents' },
        ]
    },
    {
        label: 'Utilisateurs & Accès',
        items: [
            { label: 'Utilisateurs', icon: 'pi pi-fw pi-users', to: '/users' },
            { label: 'OTP envoyés', icon: 'pi pi-fw pi-shield', to: '/otps' },
        ]
    },
    {
        label: 'Entreprises & Commerce',
        items: [
            { label: "Secteurs d'activité", icon: 'pi pi-fw pi-tag', to: '/business-categories' },
            { label: 'Entreprises', icon: 'pi pi-fw pi-building', to: '/companies' }
        ]
    },
    {
        label: 'Catalogue Produits',
        items: [
            { label: 'Produits', icon: 'pi pi-fw pi-box', to: '/products' },
            { label: 'Catégories Produits', icon: 'pi pi-fw pi-tags', to: '/product-categories' },
        ]
    },
    {
        label: 'Commandes & Livraisons',
        items: [
            { label: 'Commandes',  icon: 'pi pi-fw pi-shopping-cart', to: '/orders' },
            { label: 'Livreurs',   icon: 'pi pi-fw pi-truck',         to: '/livreurs' },
        ]
    },
    {
        label: 'Transactions & Finance',
        items: [
            { label: 'Transactions', icon: 'pi pi-fw pi-arrows-h', to: '/transactions' },
            {
                label: 'Recharges',
                icon: 'pi pi-fw pi-plus-circle',
                to: '/recharges',
                badge: pendingCount.value > 0 ? String(pendingCount.value) : null,
                badgeSeverity: 'warn',
            },
            { label: 'Statistiques financières', icon: 'pi pi-fw pi-chart-bar', to: '/finance-stats' },
        ]
    },
    {
        label: 'Support & Suivi',
        items: [
            { label: 'Support', icon: 'pi pi-fw pi-headphones', to: '/support' },
            { label: 'Notifications', icon: 'pi pi-fw pi-bell', to: '/notifications' },
            { label: 'Notes entreprises', icon: 'pi pi-fw pi-file-edit', to: '/notes' },
            { label: 'BIM SOS', icon: 'pi pi-fw pi-exclamation-triangle', to: '/bim-sos' }
        ]
    },
    {
        label: 'Développeur',
        items: [
            { label: 'Documentation API', icon: 'pi pi-fw pi-code', to: '/api-docs' },
            { label: 'Portails & Liens', icon: 'pi pi-fw pi-link', to: '/portals' },
        ]
    },
]);
</script>

<template>
    <ul class="layout-menu">
        <template v-for="(item, i) in model" :key="i">
            <app-menu-item v-if="!item.separator" :item="item" :index="i" />
            <li v-if="item.separator" class="menu-separator" />
        </template>
    </ul>
</template>

<style lang="scss" scoped></style>
