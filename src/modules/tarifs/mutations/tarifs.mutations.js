import { useMutation, useQueryClient } from '@tanstack/vue-query';
import TarifsService from '../services/tarifs.service';

export function useCreateTierMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload) => TarifsService.createTier(payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ride-tiers'] }),
    });
}

export function useUpdateTierMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ tierKey, payload }) => TarifsService.updateTier(tierKey, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ride-tiers'] }),
    });
}

export function useDeleteTierMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (tierKey) => TarifsService.deleteTier(tierKey),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ride-tiers'] }),
    });
}
