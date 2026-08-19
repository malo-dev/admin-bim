import { useQuery } from '@tanstack/vue-query';
import BannersService from '../services/banners.service';

export function useBannersQuery() {
    return useQuery({
        queryKey: ['banners'],
        queryFn: () => BannersService.getAllBanners(),
    });
}
