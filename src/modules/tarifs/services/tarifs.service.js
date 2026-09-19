import apiClient from '@/api/axios';

const getAllTiers = () => apiClient.get('/ride-tiers').then((r) => r.data);

const createTier = (payload) => apiClient.post('/ride-tiers', payload).then((r) => r.data);

const updateTier = (tierKey, payload) => apiClient.put(`/ride-tiers/${tierKey}`, payload).then((r) => r.data);

const deleteTier = (tierKey) => apiClient.delete(`/ride-tiers/${tierKey}`).then((r) => r.data);

const TarifsService = { getAllTiers, createTier, updateTier, deleteTier };
export default TarifsService;
