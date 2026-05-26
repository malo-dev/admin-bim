import { useMutation, useQueryClient } from '@tanstack/vue-query';
import CompanyPortalService from '../services/company-portal.service';

export function useUpdateCompanyAdminMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...payload }) => CompanyPortalService.updateCompanyAdmin(id, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-company-admins'] }),
    });
}

export function useDeleteCompanyAdminMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id) => CompanyPortalService.deleteCompanyAdmin(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-company-admins'] }),
    });
}

export function useUpdateOrderStatusMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status }) => CompanyPortalService.updateOrderStatus(id, status),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-orders'] }),
    });
}

export function useUpdateLivreurStatusMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status }) => CompanyPortalService.updateLivreurStatus(id, status),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['livreur-candidates'] }),
    });
}
