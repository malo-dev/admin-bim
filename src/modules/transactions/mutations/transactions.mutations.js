import { useMutation, useQueryClient } from '@tanstack/vue-query';
import TransactionsService from '../services/transactions.service';

export function useApproveRechargeMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id) => TransactionsService.approveRecharge(id),
        onSuccess: () => qc.refetchQueries({ queryKey: ['recharges'] }),
    });
}

export function useRejectRechargeMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, reason }) => TransactionsService.rejectRecharge(id, reason),
        onSuccess: () => qc.refetchQueries({ queryKey: ['recharges'] }),
    });
}

export function useReverseRechargeMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id) => TransactionsService.reverseRecharge(id),
        onSuccess: () => qc.refetchQueries({ queryKey: ['recharges'] }),
    });
}
