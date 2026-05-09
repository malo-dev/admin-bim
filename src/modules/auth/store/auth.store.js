import { defineStore } from 'pinia';
import { computed } from 'vue';
import { useLocalStorage } from '@vueuse/core';
import { BIM_ADMIN_ROLE } from '../types/auth.types';

export const useAuthStore = defineStore('auth', () => {
    const token = useLocalStorage('bim_admin_token', null);
    const user = useLocalStorage('bim_admin_user', null, {
        serializer: {
            read: (v) => (v ? JSON.parse(v) : null),
            write: (v) => JSON.stringify(v),
        },
    });

    const isAuthenticated = computed(() => !!token.value);
    const isBimAdmin = computed(() => user.value?.role === BIM_ADMIN_ROLE);
    const companyId = computed(() => user.value?.companyId ?? null);

    /**
     * @param {import('../types/auth.types').LoginResponse & { email: string }} response
     */
    function setAuth(response) {
        token.value = response.token;
        user.value = {
            userId: response.userId,
            email: response.email,
            role: response.role ?? null,
            companyId: response.companyId ?? null,
            isBimAdmin: response.role === BIM_ADMIN_ROLE,
        };
    }

    function clearAuth() {
        token.value = null;
        user.value = null;
    }

    return {
        token,
        user,
        isAuthenticated,
        isBimAdmin,
        companyId,
        setAuth,
        clearAuth,
    };
});
