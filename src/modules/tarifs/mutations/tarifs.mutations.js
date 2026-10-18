import { useMutation, useQueryClient } from '@tanstack/vue-query';
import TarifsService from '../services/tarifs.service';

export function useCreateTierMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ payload, imageFile }) => TarifsService.createTier(payload, imageFile),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ride-tiers'] }),
    });
}

export function useUpdateTierMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ tierKey, payload, imageFile }) => TarifsService.updateTier(tierKey, payload, imageFile),
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
