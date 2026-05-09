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

const TransactionsService = { getTransactions, getRecharges, getRetraits, getPaiements, getAllCompanies };
export default TransactionsService;
