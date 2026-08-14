import apiClient from '@/api/axios';

const getAdminList  = ()         => apiClient.get('/tutorial/admin/list').then(r => r.data);
const getPublicList = ()         => apiClient.get('/tutorial/list').then(r => r.data);
const create        = (payload)  => apiClient.post('/tutorial/admin/create', payload).then(r => r.data);
const update        = (id, payload) => apiClient.put(`/tutorial/admin/${id}`, payload).then(r => r.data);
const remove        = (id)       => apiClient.delete(`/tutorial/admin/${id}`).then(r => r.data);

const TutorialsService = { getAdminList, getPublicList, create, update, remove };
export default TutorialsService;
