import { useQuery } from '@tanstack/vue-query';
import AppVersionService from '../services/appVersion.service';

export function useAppVersionsQuery() {
    return useQuery({
        queryKey: ['app-versions'],
        queryFn: () => AppVersionService.getAllVersions(),
    });
}
