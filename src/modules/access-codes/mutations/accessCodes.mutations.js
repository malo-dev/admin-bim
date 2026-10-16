import { useMutation, useQueryClient } from '@tanstack/vue-query';
import AccessCodesService from '../services/accessCodes.service';

export function useUpdateAccessCodeMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ role, code }) => AccessCodesService.updateCode(role, code),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['access-codes'] }),
    });
}
