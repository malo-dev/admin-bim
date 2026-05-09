import { useQuery } from '@tanstack/vue-query';
import { computed } from 'vue';
import OrdersService from '../services/orders.service';

export function useOrdersQuery(filters) {
    return useQuery({
        queryKey: computed(() => ['orders', filters.value]),
        queryFn: () => OrdersService.getOrders({ ...filters.value, paginate: 'true' }),
    });
}

export function useAllCompaniesForOrderQuery() {
    return useQuery({
        queryKey: ['companies-all'],
        queryFn: () => OrdersService.getAllCompanies(),
        staleTime: 1000 * 60 * 5,
        select: (raw) => {
            const list = Array.isArray(raw) ? raw : (raw?.data ?? []);
            return list.map((c) => ({ label: c.name, value: c.companyId }));
        },
    });
}
