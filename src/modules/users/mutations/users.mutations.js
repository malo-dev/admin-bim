import { useMutation, useQueryClient } from '@tanstack/vue-query';
import UsersService from '../services/users.service';

function invalidateAll(queryClient) {
    queryClient.invalidateQueries({ queryKey: ['users'] });
    queryClient.invalidateQueries({ queryKey: ['adminAccounts'] });
}

export function useToggleUserActiveMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id) => UsersService.toggleUserActive(id),
        onSuccess: () => invalidateAll(queryClient),
    });
}

export function useToggleUserBlockMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id) => UsersService.toggleUserBlock(id),
        onSuccess: () => invalidateAll(queryClient),
    });
}

export function useDeleteUserMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id) => UsersService.deleteUser(id),
        onSuccess: () => invalidateAll(queryClient),
    });
}

export function useUpdateUserProfileMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }) => UsersService.updateUserProfile(id, payload),
        onSuccess: () => invalidateAll(queryClient),
    });
}

export function useRechargeUserMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, amount }) => UsersService.rechargeUser(id, amount),
        onSuccess: () => invalidateAll(queryClient),
    });
}

export function useResetUserPasswordMutation() {
    return useMutation({
        mutationFn: (id) => UsersService.resetUserPassword(id),
    });
}
