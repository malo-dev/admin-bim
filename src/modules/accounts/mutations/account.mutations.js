import { useMutation } from '@tanstack/vue-query';
import AccountService from '../services/account.service';

export function useCreateBimAdminMutation() {
    return useMutation({
        mutationFn: (payload) => AccountService.createBimAdmin(payload),
    });
}

export function useCreateCompanyAccountMutation() {
    return useMutation({
        mutationFn: (payload) => AccountService.createCompanyAccount(payload),
    });
}

export function useBootstrapMutation() {
    return useMutation({
        mutationFn: (payload) => AccountService.bootstrap(payload),
    });
}

export function useResetBimPasswordMutation() {
    return useMutation({
        mutationFn: (payload) => AccountService.resetBimPassword(payload),
    });
}
