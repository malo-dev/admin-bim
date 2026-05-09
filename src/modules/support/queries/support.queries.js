import { useQuery } from '@tanstack/vue-query';
import { computed } from 'vue';
import SupportService from '../services/support.service';

export function useSupportQuery(filters) {
    return useQuery({
        queryKey: computed(() => ['support', filters.value]),
        queryFn: () => SupportService.getSupports({ ...filters.value, paginate: 'true' }),
    });
}
