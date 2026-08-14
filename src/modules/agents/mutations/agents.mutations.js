import { useMutation, useQueryClient } from '@tanstack/vue-query';
import AgentsService from '../services/agents.service';

export function useCreateAgentMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload) => AgentsService.create(payload),
        onSuccess:  () => qc.invalidateQueries({ queryKey: ['admin-agents'] }),
    });
}

export function useToggleAgentMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, action }) => AgentsService.toggle(id, action),
        onSuccess:  () => qc.invalidateQueries({ queryKey: ['admin-agents'] }),
    });
}
