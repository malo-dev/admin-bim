import { useMutation, useQueryClient } from '@tanstack/vue-query';
import AccountService from '../services/account.service';

export function useCreateBimAdminMutation() {
    return useMutation({
        mutationFn: (payload) => AccountService.createBimAdmin(payload),
    });
}

export function useCreateCompanyAccountMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload) => AccountService.createCompanyAccount(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminAccounts'] });
            queryClient.invalidateQueries({ queryKey: ['companies'] });
        },
    });
}

export function useBootstrapMutation() {
    return useMutation({
        mutationFn: (payload) => AccountService.bootstrap(payload),
    });
}

export function useRequestBimResetMutation() {
    return useMutation({
        mutationFn: (payload) => AccountService.requestBimReset(payload),
    });
}

export function useResetBimPasswordMutation() {
    return useMutation({
        mutationFn: (payload) => AccountService.resetBimPassword(payload),
    });
}

export function useAddCompanyAdminMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload) => AccountService.addCompanyAdmin(payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminAccounts'] }),
    });
}
