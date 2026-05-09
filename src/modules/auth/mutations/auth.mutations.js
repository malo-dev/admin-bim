import { useMutation } from '@tanstack/vue-query';
import { useRouter } from 'vue-router';
import AuthService from '../services/auth.service';
import { useAuthStore } from '../store/auth.store';

export function useLoginMutation() {
    const authStore = useAuthStore();
    const router = useRouter();

    return useMutation({
        mutationFn: async (credentials) => {
            const data = await AuthService.login(credentials);
            if (data.role === 'COMPANY_ADMIN') {
                throw new Error('Accès refusé. Utilisez le portail entreprise.');
            }
            return data;
        },
        onSuccess: (data, variables) => {
            authStore.setAuth({ ...data, email: variables.email });
            router.push('/');
        },
    });
}

export function useCompanyLoginMutation() {
    const authStore = useAuthStore();
    const router = useRouter();

    return useMutation({
        mutationFn: async (credentials) => {
            const data = await AuthService.login(credentials);
            if (data.role !== 'COMPANY_ADMIN') {
                throw new Error('Ces identifiants ne correspondent pas à un compte entreprise.');
            }
            return data;
        },
        onSuccess: (data, variables) => {
            authStore.setAuth({ ...data, email: variables.email });
            router.push('/company/orders');
        },
    });
}

export function useLogoutMutation() {
    const authStore = useAuthStore();
    const router = useRouter();

    return useMutation({
        mutationFn: () => AuthService.logout(authStore.user?.email),
        onSettled: () => {
            authStore.clearAuth();
            router.push('/auth/login');
        },
    });
}
