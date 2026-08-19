import { useMutation, useQueryClient } from '@tanstack/vue-query';
import AppVersionService from '../services/appVersion.service';

export function useUpsertAppVersionMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload) => AppVersionService.upsertVersion(payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['app-versions'] }),
    });
}
