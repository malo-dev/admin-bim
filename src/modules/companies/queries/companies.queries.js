import { useQuery } from '@tanstack/vue-query';
import { computed } from 'vue';
import CompaniesService from '../services/companies.service';
import SectorsService from '@/modules/sectors/services/sectors.service';

export function useCompaniesQuery(filters) {
    return useQuery({
        queryKey: computed(() => ['companies', filters.value]),
        queryFn: () => CompaniesService.getAllCompanies({ ...filters.value, paginate: 'true' }),
    });
}

export function useAllSectorsQuery() {
    return useQuery({
        queryKey: ['sectors-all'],
        queryFn: () => SectorsService.getAllSectors({ paginate: 'false' }),
        staleTime: 1000 * 60 * 10,
    });
}
