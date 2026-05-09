<script setup>
import { watch } from 'vue';
import { useAuthStore } from '@/modules/auth/store/auth.store';
import { useSocketStore } from '@/modules/socket/store/socket.store';

const authStore = useAuthStore();
const socketStore = useSocketStore();

// Connecter/déconnecter le socket selon l'état d'auth
watch(
    () => authStore.isAuthenticated,
    (authenticated) => {
        if (authenticated) socketStore.connect();
        else socketStore.disconnect();
    },
    { immediate: true }
);
</script>

<template>
    <router-view />
</template>
