import { useQuery } from '@tanstack/vue-query';
import ProductCategoriesService from '../services/product-categories.service';

export function useProductCategoriesQuery() {
    return useQuery({
        queryKey: ['product-categories'],
        queryFn: () => ProductCategoriesService.getAll({ paginate: 'false' }),
        staleTime: 1000 * 60 * 5,
        select: (raw) => Array.isArray(raw) ? raw : (raw?.data ?? []),
    });
}
