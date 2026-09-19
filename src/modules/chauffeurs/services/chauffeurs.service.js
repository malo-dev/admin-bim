import apiClient from '@/api/axios';

const getAllChauffeurs = (params = {}) =>
    apiClient.get('/chauffeur', { params }).then((r) => r.data);

const createChauffeur = (payload) => {
    const form = new FormData();
    Object.entries(payload).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== '') form.append(k, v);
    });
    return apiClient.post('/chauffeur/admin-create', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
};

const updateChauffeur = (id, payload) =>
    apiClient.put(`/chauffeur/update/${id}`, payload).then((r) => r.data);

const deleteChauffeur = (id) =>
    apiClient.delete(`/chauffeur/delete/${id}`).then((r) => r.data);

const ChauffeursService = { getAllChauffeurs, createChauffeur, updateChauffeur, deleteChauffeur };
export default ChauffeursService;
