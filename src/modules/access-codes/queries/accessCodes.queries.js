import { useQuery } from '@tanstack/vue-query';
import AccessCodesService from '../services/accessCodes.service';

export function useAccessCodesQuery() {
    return useQuery({
        queryKey: ['access-codes'],
        queryFn: () => AccessCodesService.getAllCodes(),
    });
}
