import { useQuery } from '@tanstack/vue-query';
import { computed } from 'vue';
import ChauffeursService from '../services/chauffeurs.service';

export function useChauffeursQuery(filters) {
    return useQuery({
        queryKey: computed(() => ['chauffeurs', filters.value]),
        queryFn: () => ChauffeursService.getAllChauffeurs({ ...filters.value, paginate: 'true' }),
    });
}
