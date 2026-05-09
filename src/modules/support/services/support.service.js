import apiClient from '@/api/axios';

const getSupports = (params = {}) =>
    apiClient.get('/support_track', { params }).then((r) => r.data);

const deleteSupport = (id) =>
    apiClient.delete(`/support_track/delete/${id}`).then((r) => r.data);

const SupportService = { getSupports, deleteSupport };
export default SupportService;
