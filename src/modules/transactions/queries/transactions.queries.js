import { useQuery } from '@tanstack/vue-query';
import { computed } from 'vue';
import TransactionsService from '../services/transactions.service';

export function useTransactionsQuery(filters) {
    return useQuery({
        queryKey: computed(() => ['transactions', filters.value]),
        queryFn: () => TransactionsService.getTransactions({ ...filters.value, paginate: 'true' }),
    });
}

export function useRechargesQuery(filters) {
    return useQuery({
        queryKey: computed(() => ['recharges', filters.value]),
        queryFn: () => TransactionsService.getRecharges(filters.value),
        refetchInterval: 15_000,      // nouvelle demande visible sans recharger
        refetchOnWindowFocus: true,
    });
}

export function useRetraitsQuery(filters) {
    return useQuery({
        queryKey: computed(() => ['retraits', filters.value]),
        queryFn: () => TransactionsService.getRetraits(filters.value),
        refetchInterval: 15_000,
        refetchOnWindowFocus: true,
    });
}

export function usePaiementsQuery(filters) {
    return useQuery({
        queryKey: computed(() => ['paiements', filters.value]),
        queryFn: () => TransactionsService.getPaiements(filters.value),
    });
}

export function useAllCompaniesForTsxQuery() {
    return useQuery({
        queryKey: ['companies-all'],
        queryFn: () => TransactionsService.getAllCompanies(),
        staleTime: 1000 * 60 * 5,
        select: (raw) => {
            const list = Array.isArray(raw) ? raw : (raw?.data ?? []);
            return list.map((c) => ({ label: c.name, value: c.companyId }));
        },
    });
}
