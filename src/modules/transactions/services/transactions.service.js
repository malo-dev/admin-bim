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

// FlexPay confirme le paiement via un webhook — s'il n'arrive jamais, la
// recharge reste "en attente" même si FlexPay a bien confirmé le paiement
// de son côté. On interroge FlexPay directement pour trancher avant de
// créditer, au lieu d'approuver à l'aveugle.
const verifyPayment = (reference) =>
    apiClient.post('/tsx/recharge/verify', { reference }).then((r) => r.data);

// Taux de change (ex: EC/USD → CDF) utilisé pour les recharges/retraits en francs.
const getCurrencies = () =>
    apiClient.get('/currency').then((r) => r.data);

const updateCurrency = (id, data) =>
    apiClient.put(`/currency/update/${id}`, data).then((r) => r.data);

const TransactionsService = { getTransactions, getRecharges, getRetraits, getPaiements, getAllCompanies, approveRecharge, rejectRecharge, reverseRecharge, verifyPayment, getCurrencies, updateCurrency };
export default TransactionsService;
