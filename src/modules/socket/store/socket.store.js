import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { io } from 'socket.io-client';
import { useLocalStorage } from '@vueuse/core';

// Le socket se connecte à la racine du serveur, pas au préfixe /api/v1
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const SOCKET_URL = API_URL.replace(/\/api\/v\d+\/?$/, '');

export const useSocketStore = defineStore('socket', () => {
    /** @type {import('vue').Ref<import('socket.io-client').Socket|null>} */
    const socket = ref(null);
    const isConnected = ref(false);

    /** @type {import('vue').Ref<Array<{userId: string, username: string|null, connectedAt: string}>>} */
    const onlineUsers = ref([]);

    /** @type {import('vue').Ref<Array<{userId: string, username: string|null, event: 'online'|'offline', time: string}>>} */
    const connectionLog = ref([]);

    const onlineCount = computed(() => onlineUsers.value.length);

    const storedToken = useLocalStorage('bim_admin_token', null);
    const storedUser = useLocalStorage('bim_admin_user', null, {
        serializer: {
            read: (v) => (v ? JSON.parse(v) : null),
            write: (v) => JSON.stringify(v),
        },
    });

    function connect() {
        if (socket.value?.connected) return;

        socket.value = io(SOCKET_URL, {
            auth: { token: storedToken.value },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 2000,
        });

        socket.value.on('connect', () => {
            isConnected.value = true;

            // Rejoindre la room admin pour recevoir les events temps réel
            socket.value.emit('join_admin');

            // S'enregistrer aussi comme utilisateur en ligne avec son propre userId
            const adminId = storedUser.value?.userId;
            if (adminId) {
                socket.value.emit('join', String(adminId));
            }
        });

        socket.value.on('connect_error', (err) => {
            console.error('[Socket] Erreur de connexion :', err.message);
            isConnected.value = false;
        });

        socket.value.on('disconnect', () => {
            isConnected.value = false;
        });

        // Snapshot complet des users en ligne
        socket.value.on('online_users', (users) => {
            onlineUsers.value = users;
        });

        // Un user vient de se connecter
        socket.value.on('user:online', ({ userId, username, connectedAt }) => {
            connectionLog.value.unshift({ userId, username, event: 'online', time: connectedAt });
            if (connectionLog.value.length > 200) connectionLog.value.pop();
        });

        // Un user vient de se déconnecter
        socket.value.on('user:offline', ({ userId, username }) => {
            connectionLog.value.unshift({ userId, username, event: 'offline', time: new Date().toISOString() });
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
