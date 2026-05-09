import { useQuery } from '@tanstack/vue-query';
import { computed } from 'vue';
import AccountService from '../services/account.service';

export function useAdminAccountsQuery(filters) {
    return useQuery({
        queryKey: computed(() => ['adminAccounts', filters.value]),
        queryFn: () => AccountService.getAdminAccounts({ ...filters.value, paginate: 'true' }),
    });
}
