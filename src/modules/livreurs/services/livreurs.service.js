import apiClient from '@/api/axios';

const getAll = (params = {}) =>
    apiClient.get('/livreur/admin/all', { params }).then((r) => r.data);

const updateStatus = (id, status) =>
    apiClient.put(`/livreur/admin/${id}/status`, { status }).then((r) => r.data);

const create = (payload) =>
    apiClient.post('/livreur/admin/create', payload).then((r) => r.data);

const LivreursService = { getAll, updateStatus, create };
export default LivreursService;
