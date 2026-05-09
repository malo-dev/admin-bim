import { useMutation, useQueryClient } from '@tanstack/vue-query';
import CommercesService from '../services/commerces.service';

export function useCreateCommerceAccountMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload) => CommercesService.createCommerceAccount(payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['commerces'] }),
    });
}

export function useUpdateCommerceMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }) => CommercesService.updateCommerce(id, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['commerces'] }),
    });
}

export function useDeleteCommerceMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id) => CommercesService.deleteCommerce(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['commerces'] }),
    });
}
