import { useMutation, useQueryClient } from '@tanstack/vue-query';
import ChauffeursService from '../services/chauffeurs.service';

export function useCreateChauffeurMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload) => ChauffeursService.createChauffeur(payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chauffeurs'] }),
    });
}

export function useUpdateChauffeurMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }) => ChauffeursService.updateChauffeur(id, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chauffeurs'] }),
    });
}

export function useDeleteChauffeurMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id) => ChauffeursService.deleteChauffeur(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chauffeurs'] }),
    });
}
