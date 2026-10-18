import apiClient from '@/api/axios';

const getAllRides = async (params = {}) => {
    const { data } = await apiClient.get('/ride/admin/all', { params });
    return data;
};

const getAvailableChauffeurs = async () => {
    const { data } = await apiClient.get('/ride/admin/available-chauffeurs');
    return data;
};

const assignChauffeur = async (rideNumber, chauffeurId) => {
    const { data } = await apiClient.post(`/ride/admin/${rideNumber}/assign`, { chauffeurId });
    return data;
};

const RidesService = { getAllRides, getAvailableChauffeurs, assignChauffeur };
export default RidesService;
