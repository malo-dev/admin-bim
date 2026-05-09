import { useMutation, useQueryClient } from '@tanstack/vue-query';
import ProductsService from '../services/products.service';

export function useCreateProductsMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (productsArray) => ProductsService.createProducts(productsArray),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
    });
}

export function useUpdateProductMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }) => ProductsService.updateProduct(id, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
    });
}

export function useDeleteProductMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id) => ProductsService.deleteProduct(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
    });
}
