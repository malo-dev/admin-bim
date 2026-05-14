<script setup>
import { computed } from 'vue';
import AppMenuItem from './AppMenuItem.vue';
import { useSocketStore } from '@/modules/socket/store/socket.store';
import { useAuthStore } from '@/modules/auth/store/auth.store';

const socketStore = useSocketStore();
const authStore = useAuthStore();

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
            { label: 'Compte entreprise', icon: 'pi pi-fw pi-building', to: '/accounts/create-company' },
            { label: 'Liste des comptes', icon: 'pi pi-fw pi-list', to: '/accounts/list' }
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
            { label: 'Produits', icon: 'pi pi-fw pi-box', to: '/products' }
        ]
    },
    {
        label: 'Commandes',
        items: [
            { label: 'Commandes', icon: 'pi pi-fw pi-shopping-cart', to: '/orders' }
        ]
    },
    {
        label: 'Transactions & Finance',
        items: [
            { label: 'Transactions', icon: 'pi pi-fw pi-arrows-h', to: '/transactions' },
            { label: 'Statistiques financières', icon: 'pi pi-fw pi-chart-bar', to: '/finance-stats' },
        ]
    },
    {
        label: 'Support & Suivi',
        items: [
            { label: 'Support', icon: 'pi pi-fw pi-headphones', to: '/support' },
{ label: 'Notifications', icon: 'pi pi-fw pi-bell', to: '/notifications' },
            { label: 'Notes entreprises', icon: 'pi pi-fw pi-file-edit', to: '/notes' }
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
