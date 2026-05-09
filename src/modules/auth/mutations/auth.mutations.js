import { useMutation } from '@tanstack/vue-query';
import { useRouter } from 'vue-router';
import AuthService from '../services/auth.service';
import { useAuthStore } from '../store/auth.store';

export function useLoginMutation() {
    const authStore = useAuthStore();
    const router = useRouter();

    return useMutation({
        mutationFn: (credentials) => AuthService.login(credentials),
        onSuccess: (data, variables) => {
            authStore.setAuth({ ...data, email: variables.email });
            router.push('/');
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
