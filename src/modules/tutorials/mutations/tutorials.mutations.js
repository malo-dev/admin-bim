import { useMutation, useQueryClient } from '@tanstack/vue-query';
import TutorialsService from '../services/tutorials.service';

export function useCreateTutorialMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload) => TutorialsService.create(payload),
        onSuccess:  () => qc.invalidateQueries({ queryKey: ['admin-tutorials'] }),
    });
}

export function useUpdateTutorialMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }) => TutorialsService.update(id, payload),
        onSuccess:  () => qc.invalidateQueries({ queryKey: ['admin-tutorials'] }),
    });
}

export function useDeleteTutorialMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id) => TutorialsService.remove(id),
        onSuccess:  () => qc.invalidateQueries({ queryKey: ['admin-tutorials'] }),
    });
}
