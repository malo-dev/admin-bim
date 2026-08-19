import { useMutation, useQueryClient } from '@tanstack/vue-query';
import BannersService from '../services/banners.service';

export function useCreateBannerMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload) => BannersService.createBanner(payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['banners'] }),
    });
}

export function useUpdateBannerMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }) => BannersService.updateBanner(id, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['banners'] }),
    });
}

export function useDeleteBannerMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id) => BannersService.deleteBanner(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['banners'] }),
    });
}
