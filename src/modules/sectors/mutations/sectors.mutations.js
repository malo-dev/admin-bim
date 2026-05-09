import { useMutation, useQueryClient } from '@tanstack/vue-query';
import SectorsService from '../services/sectors.service';

export function useCreateSectorMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload) => SectorsService.createSector(payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sectors'] }),
    });
}

export function useUpdateSectorMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }) => SectorsService.updateSector(id, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sectors'] }),
    });
}

export function useDeleteSectorMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id) => SectorsService.deleteSector(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sectors'] }),
    });
}
