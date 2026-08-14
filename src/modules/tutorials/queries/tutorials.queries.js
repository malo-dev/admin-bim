import { useQuery } from '@tanstack/vue-query';
import TutorialsService from '../services/tutorials.service';

export function useTutorialsQuery() {
    return useQuery({
        queryKey:             ['admin-tutorials'],
        queryFn:              () => TutorialsService.getAdminList(),
        refetchOnWindowFocus: true,
    });
}
