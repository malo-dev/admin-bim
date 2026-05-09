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
