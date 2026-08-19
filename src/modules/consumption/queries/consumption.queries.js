import { useQuery } from '@tanstack/vue-query';
import { computed } from 'vue';
import ConsumptionService from '../services/consumption.service';

export function useConsumptionsQuery(filters) {
    return useQuery({
        queryKey: computed(() => ['consumptions', filters.value]),
        queryFn: () => ConsumptionService.getAllConsumptions({ ...filters.value, paginate: 'true' }),
    });
}
