import apiClient from '@/api/axios';

const getAllSectors = async (params = {}) => {
    const { data } = await apiClient.get('/sector', { params });
    return data;
};

const createSector = async (payload) => {
    // L'API attend un tableau
    const { data } = await apiClient.post('/sector/create', [payload]);
    return data;
};

const updateSector = async (id, payload) => {
    const { data } = await apiClient.put(`/sector/update/${id}`, payload);
    return data;
};

const deleteSector = async (id) => {
    const { data } = await apiClient.delete(`/sector/delete/${id}`);
    return data;
};

const SectorsService = { getAllSectors, createSector, updateSector, deleteSector };
export default SectorsService;
