import { useQuery } from '@tanstack/vue-query';
import { toValue } from 'vue';
import DashboardService from '../services/dashboard.service';

/**
 * @param {import('vue').Ref<string>} period
 */
export function useDashboardStatsQuery(period) {
    return useQuery({
        queryKey: ['dashboard-stats', period],
        queryFn: () => DashboardService.getStats(toValue(period)),
        staleTime: 1000 * 30,
        refetchInterval: 1000 * 60,
    });
}
