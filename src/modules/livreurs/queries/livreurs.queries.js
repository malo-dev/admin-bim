import { useQuery } from '@tanstack/vue-query';
import { computed } from 'vue';
import LivreursService from '../services/livreurs.service';

export function useLivreursQuery(filters) {
    return useQuery({
        queryKey: computed(() => ['admin-livreurs', filters.value]),
        queryFn: () => LivreursService.getAll({ ...filters.value }),
        refetchInterval: 15_000,
        refetchOnWindowFocus: true,
    });
}
