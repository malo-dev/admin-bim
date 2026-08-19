import apiClient from '@/api/axios';

const getAllVersions = () => apiClient.get('/app_version').then((r) => r.data);

const upsertVersion = (payload) => apiClient.post('/app_version/upsert', payload).then((r) => r.data);

const AppVersionService = { getAllVersions, upsertVersion };
export default AppVersionService;
