import apiClient from '@/api/axios';

const getTransactions = (params = {}) =>
    apiClient.get('/tsx', { params }).then((r) => r.data);

const getRecharges = (params = {}) =>
    apiClient.get('/tsx/admin/recharges', { params }).then((r) => r.data);

const getRetraits = (params = {}) =>
    apiClient.get('/tsx/admin/retraits', { params }).then((r) => r.data);

const getPaiements = (params = {}) =>
    apiClient.get('/tsx/admin/paiements', { params }).then((r) => r.data);

const getAllCompanies = () =>
    apiClient.get('/company', { params: { paginate: 'false' } }).then((r) => r.data);

const approveRecharge = (id) =>
    apiClient.patch(`/tsx/admin/recharges/${id}/approve`).then((r) => r.data);

const rejectRecharge = (id, reason) =>
    apiClient.patch(`/tsx/admin/recharges/${id}/reject`, { reason }).then((r) => r.data);

const reverseRecharge = (id) =>
    apiClient.patch(`/tsx/admin/recharges/${id}/reverse`).then((r) => r.data);

const TransactionsService = { getTransactions, getRecharges, getRetraits, getPaiements, getAllCompanies, approveRecharge, rejectRecharge, reverseRecharge };
export default TransactionsService;
