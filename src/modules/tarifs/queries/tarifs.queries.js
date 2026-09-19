import { useQuery } from '@tanstack/vue-query';
import TarifsService from '../services/tarifs.service';

export function useTarifsQuery() {
    return useQuery({
        queryKey: ['ride-tiers'],
        queryFn: () => TarifsService.getAllTiers(),
    });
}
