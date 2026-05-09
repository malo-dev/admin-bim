import { useMutation, useQueryClient } from '@tanstack/vue-query';
import CompaniesService from '../services/companies.service';

export function useCreateCompanyMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (companies) => CompaniesService.createCompany(companies),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['companies'] }),
    });
}

export function useUpdateCompanyMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }) => CompaniesService.updateCompany(id, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['companies'] }),
    });
}

export function useDeleteCompanyMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id) => CompaniesService.deleteCompany(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['companies'] }),
    });
}
