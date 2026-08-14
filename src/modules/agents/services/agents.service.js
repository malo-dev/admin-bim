import apiClient from '@/api/axios';

const getAll    = (params = {}) =>
    apiClient.get('/agent/admin/list', { params }).then((r) => r.data);

const create    = (payload) =>
    apiClient.post('/agent/admin/create', payload).then((r) => r.data);

const toggle    = (id, action) =>
    apiClient.put(`/agent/admin/${id}/toggle`, { action }).then((r) => r.data);

const AgentsService = { getAll, create, toggle };
export default AgentsService;
