import { useQuery } from '@tanstack/vue-query';
import { computed } from 'vue';
import OrdersService from '../services/orders.service';

export function useOrdersQuery(filters) {
    return useQuery({
        queryKey: computed(() => ['orders', filters.value]),
        queryFn: () => OrdersService.getOrders({ ...filters.value, paginate: 'true' }),
        refetchInterval: 15_000,       // rafraîchit toutes les 15 s en arrière-plan
        refetchOnWindowFocus: true,    // aussi quand l'admin revient sur l'onglet
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
