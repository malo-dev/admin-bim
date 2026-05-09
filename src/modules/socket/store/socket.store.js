import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { io } from 'socket.io-client';
import { useLocalStorage } from '@vueuse/core';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const useSocketStore = defineStore('socket', () => {
    /** @type {import('vue').Ref<import('socket.io-client').Socket|null>} */
    const socket = ref(null);
    const isConnected = ref(false);

    // Liste des utilisateurs actuellement connectés sur BIM
    /** @type {import('vue').Ref<Array<{userId: string, connectedAt: string}>>} */
    const onlineUsers = ref([]);

    // Historique des connexions/déconnexions (session en cours)
    /** @type {import('vue').Ref<Array<{userId: string, event: 'online'|'offline', time: string}>>} */
    const connectionLog = ref([]);

    const onlineCount = computed(() => onlineUsers.value.length);

    const storedToken = useLocalStorage('bim_admin_token', null);

    function connect() {
        if (socket.value?.connected) return;

        socket.value = io(SOCKET_URL, {
            auth: { token: storedToken.value },
            transports: ['websocket'],
            reconnection: true,
            reconnectionDelay: 2000,
        });

        socket.value.on('connect', () => {
            isConnected.value = true;
            // Rejoindre la room admin pour recevoir les events temps réel
            socket.value.emit('join_admin');
        });

        socket.value.on('disconnect', () => {
            isConnected.value = false;
        });

        // Snapshot complet de tous les users en ligne
        socket.value.on('online_users', (users) => {
            onlineUsers.value = users;
        });

        // Un user vient de se connecter
        socket.value.on('user:online', ({ userId, connectedAt }) => {
            connectionLog.value.unshift({ userId, event: 'online', time: connectedAt });
            if (connectionLog.value.length > 200) connectionLog.value.pop();
        });

        // Un user vient de se déconnecter
        socket.value.on('user:offline', ({ userId }) => {
            connectionLog.value.unshift({ userId, event: 'offline', time: new Date().toISOString() });
            if (connectionLog.value.length > 200) connectionLog.value.pop();
        });
    }

    function disconnect() {
        socket.value?.disconnect();
        socket.value = null;
        isConnected.value = false;
        onlineUsers.value = [];
    }

    return {
        socket,
        isConnected,
        onlineUsers,
        connectionLog,
        onlineCount,
        connect,
        disconnect,
    };
});
