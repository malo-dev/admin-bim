import { useQuery } from '@tanstack/vue-query';
import { computed } from 'vue';
import AgentsService from '../services/agents.service';

export function useAgentsQuery(filters) {
    return useQuery({
        queryKey:        computed(() => ['admin-agents', filters.value]),
        queryFn:         () => AgentsService.getAll({ ...filters.value }),
        refetchInterval: 20_000,
        refetchOnWindowFocus: true,
    });
}
