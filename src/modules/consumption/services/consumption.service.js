import apiClient from '@/api/axios';

const getAllConsumptions = (params = {}) =>
    apiClient.get('/consumption', { params }).then((r) => r.data);

const ConsumptionService = { getAllConsumptions };
export default ConsumptionService;
