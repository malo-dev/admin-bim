import { useMutation, useQueryClient } from '@tanstack/vue-query';
import LivreursService from '../services/livreurs.service';

export function useUpdateLivreurStatusMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status }) => LivreursService.updateStatus(id, status),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-livreurs'] }),
    });
}

export function useCreateLivreurMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload) => LivreursService.create(payload),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-livreurs'] }),
    });
}
