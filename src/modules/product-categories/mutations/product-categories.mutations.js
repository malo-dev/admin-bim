import { useMutation, useQueryClient } from '@tanstack/vue-query';
import ProductCategoriesService from '../services/product-categories.service';

export function useCreateCategoryMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload) => ProductCategoriesService.create(payload),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['product-categories'] }),
    });
}

export function useUpdateCategoryMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }) => ProductCategoriesService.update(id, payload),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['product-categories'] }),
    });
}

export function useDeleteCategoryMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id) => ProductCategoriesService.remove(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['product-categories'] }),
    });
}
