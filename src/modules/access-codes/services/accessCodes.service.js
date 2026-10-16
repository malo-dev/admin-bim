import apiClient from '@/api/axios';

const getAllCodes = () => apiClient.get('/access-code').then((r) => r.data);

const updateCode = (role, code) => apiClient.put(`/access-code/${role}`, { code }).then((r) => r.data);

const AccessCodesService = { getAllCodes, updateCode };
export default AccessCodesService;
