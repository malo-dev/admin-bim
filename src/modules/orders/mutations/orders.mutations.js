import { useMutation, useQueryClient } from '@tanstack/vue-query';
import OrdersService from '../services/orders.service';

export function useUpdateOrderMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }) => OrdersService.updateOrder(id, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
    });
}

export function useDeleteOrderMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id) => OrdersService.deleteOrder(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
    });
}
