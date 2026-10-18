import { useQuery } from '@tanstack/vue-query';
import { computed } from 'vue';
import RidesService from '../services/rides.service';

export function useRidesQuery(filters) {
    return useQuery({
        queryKey: computed(() => ['rides', filters.value]),
        queryFn: () => RidesService.getAllRides(filters.value),
    });
}

export function useAvailableChauffeursQuery() {
    return useQuery({
        queryKey: ['rides-available-chauffeurs'],
        queryFn: () => RidesService.getAvailableChauffeurs(),
    });
}
