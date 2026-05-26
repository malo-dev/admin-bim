import { useQuery } from '@tanstack/vue-query';
import { computed } from 'vue';
import CompanyPortalService from '../services/company-portal.service';

export function useMyOrdersQuery(filters) {
    return useQuery({
        queryKey: computed(() => ['my-orders', filters.value]),
        queryFn: () => CompanyPortalService.getMyOrders({ ...filters.value }),
    });
}

export function useMyCompanyAdminsQuery() {
    return useQuery({
        queryKey: ['my-company-admins'],
        queryFn: () => CompanyPortalService.getMyCompanyAdmins(),
        select: (r) => r.data ?? [],
    });
}

export function useMyPaymentsQuery(filters) {
    return useQuery({
        queryKey: computed(() => ['my-payments', filters.value]),
        queryFn: () => CompanyPortalService.getMyPayments({ ...filters.value }),
    });
}

export function useMyStatsQuery(period) {
    return useQuery({
        queryKey: computed(() => ['my-stats', period.value]),
        queryFn: () => CompanyPortalService.getMyStats(period.value ? { period: period.value } : {}),
    });
}

export function useLivreurCandidatesQuery(status) {
    return useQuery({
        queryKey: computed(() => ['livreur-candidates', status?.value]),
        queryFn: () => CompanyPortalService.getLivreurCandidates(status?.value ? { status: status.value } : {}),
    });
}
