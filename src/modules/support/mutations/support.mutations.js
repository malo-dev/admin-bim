import { useMutation, useQueryClient } from '@tanstack/vue-query';
import SupportService from '../services/support.service';

export function useDeleteSupportMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id) => SupportService.deleteSupport(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['support'] }),
    });
}
