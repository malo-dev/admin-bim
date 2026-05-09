import { useQuery } from '@tanstack/vue-query';
import { computed } from 'vue';
import SectorsService from '../services/sectors.service';

export function useSectorsQuery(filters) {
    return useQuery({
        queryKey: computed(() => ['sectors', filters.value]),
        queryFn: () => SectorsService.getAllSectors({ ...filters.value, paginate: 'true' }),
    });
}
