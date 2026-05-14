import { useQuery } from '@tanstack/vue-query';
import { computed } from 'vue';
import UsersService from '../services/users.service';

export function useUsersQuery(filters) {
    return useQuery({
        queryKey: computed(() => ['users', filters.value]),
        queryFn: () => UsersService.getUsers({ ...filters.value, paginate: 'true' }),
    });
}

export function useCommercesQuery() {
    return useQuery({
        queryKey: ['commerces-all'],
        queryFn: () => UsersService.getCommerces(),
        staleTime: 1000 * 60 * 10,
    });
}

export function useOtpsQuery(filters) {
    return useQuery({
        queryKey: computed(() => ['otps', filters.value]),
        queryFn: () => UsersService.getOtps({ ...filters.value }),
        retry: false,
    });
}

export function useUsersBalanceStatsQuery(period) {
    return useQuery({
        queryKey: computed(() => ['users-balance-stats', period.value]),
        queryFn: () => UsersService.getUsersBalanceStats(period.value ? { period: period.value } : {}),
        retry: false,
        staleTime: 1000 * 30,
    });
}
