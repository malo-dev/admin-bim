import { useQuery } from '@tanstack/vue-query';
import { computed } from 'vue';
import OrdersService from '../services/orders.service';

export function useOrdersQuery(filters) {
    return useQuery({
        queryKey: computed(() => ['orders', filters.value]),
        queryFn: () => OrdersService.getOrders({ ...filters.value, paginate: 'true' }),
        refetchInterval: 15_000,
        refetchOnWindowFocus: true,
    });
}

export function useOrderByIdQuery(id) {
    return useQuery({
        queryKey: computed(() => ['order', id.value]),
        queryFn: () => OrdersService.getOrderById(id.value),
        enabled: computed(() => !!id.value),
        refetchInterval: 10_000,
        refetchOnWindowFocus: true,
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
