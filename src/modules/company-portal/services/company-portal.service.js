import apiClient from '@/api/axios';

const getMyOrders = (params = {}) =>
    apiClient.get('/order/my-orders', { params }).then((r) => r.data);

const getMyCompanyAdmins = () =>
    apiClient.get('/auth/my-company-admins').then((r) => r.data);

const updateCompanyAdmin = (id, payload) =>
    apiClient.put(`/auth/my-company-admins/${id}`, payload).then((r) => r.data);

const deleteCompanyAdmin = (id) =>
    apiClient.delete(`/auth/my-company-admins/${id}`).then((r) => r.data);

const getMyPayments = (params = {}) =>
    apiClient.get('/tsx/admin/paiements', { params }).then((r) => r.data);

const getMyStats = (params = {}) =>
    apiClient.get('/order/my-stats', { params }).then((r) => r.data);

const CompanyPortalService = { getMyOrders, getMyCompanyAdmins, updateCompanyAdmin, deleteCompanyAdmin, getMyPayments, getMyStats };
export default CompanyPortalService;
