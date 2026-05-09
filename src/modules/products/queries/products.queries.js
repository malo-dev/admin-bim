import { useQuery } from '@tanstack/vue-query';
import { computed } from 'vue';
import ProductsService from '../services/products.service';

export function useProductsQuery(filters) {
    return useQuery({
        queryKey: computed(() => ['products', filters.value]),
        queryFn: () => ProductsService.getAllProducts({ ...filters.value, paginate: 'true' }),
    });
}

export function useAllCompaniesForProductQuery() {
    return useQuery({
        queryKey: ['companies-all'],
        queryFn: () => ProductsService.getAllCompanies(),
        staleTime: 1000 * 60 * 5,
        select: (raw) => {
            const list = Array.isArray(raw) ? raw : (raw?.data ?? []);
            return list.map((c) => ({ label: c.name, value: c.companyId }));
        },
    });
}

export function useAllCurrenciesQuery() {
    return useQuery({
        queryKey: ['currencies-all'],
        queryFn: () => ProductsService.getAllCurrencies(),
        staleTime: 1000 * 60 * 15,
        select: (raw) => {
            const list = Array.isArray(raw) ? raw : (raw?.data ?? []);
            return list.map((c) => ({ label: `${c.code} — ${c.name}`, value: c.currencyId, symbol: c.symbol }));
        },
    });
}
