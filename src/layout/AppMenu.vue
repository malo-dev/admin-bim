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
        label: 'Tableau de bord',
        items: [
            {
                label: 'Tableau de bord',
                icon: 'pi pi-fw pi-home',
                to: '/',
                badge: socketStore.onlineCount > 0 ? String(socketStore.onlineCount) : null,
                badgeSeverity: 'success',
            },
        ]
    },
    {
        label: 'Gestion',
        items: [
            { label: 'Gestion', icon: 'pi pi-fw pi-cog', to: '/gestion' },
        ]
    },
    {
        label: 'Finance & Support',
        items: [
            {
                label: 'Finance & Support',
                icon: 'pi pi-fw pi-wallet',
                to: '/finance-support',
                badge: pendingCount.value > 0 ? String(pendingCount.value) : null,
                badgeSeverity: 'warn',
            },
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
