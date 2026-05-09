import { useQuery } from '@tanstack/vue-query';
import { computed } from 'vue';
import CommercesService from '../services/commerces.service';

export function useCommercesQuery(filters) {
    return useQuery({
        queryKey: computed(() => ['commerces', filters.value]),
        queryFn: () => CommercesService.getAllCommerces({ ...filters.value, paginate: 'true' }),
    });
}
