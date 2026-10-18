import { useMutation, useQueryClient } from '@tanstack/vue-query';
import RidesService from '../services/rides.service';

export function useAssignChauffeurMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ rideNumber, chauffeurId }) => RidesService.assignChauffeur(rideNumber, chauffeurId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rides'] });
            queryClient.invalidateQueries({ queryKey: ['rides-available-chauffeurs'] });
        },
    });
}
