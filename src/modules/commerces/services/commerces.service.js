import apiClient from '@/api/axios';

const getAllCommerces = async (params = {}) => {
    const { data } = await apiClient.get('/commerce_track', { params });
    return data;
};

/**
 * Crée un commerce + optionnellement son gestionnaire (utilisateur)
 * @param {{ commerceName: string, commerceEmail: string, username?: string, email?: string, password?: string }} payload
 */
const createCommerceAccount = async (payload) => {
    const { data } = await apiClient.post('/auth/create-commerce-account', payload);
    return data;
};

const updateCommerce = async (id, payload) => {
    const { data } = await apiClient.put(`/commerce_track/update/${id}`, payload);
    return data;
};

const deleteCommerce = async (id) => {
    const { data } = await apiClient.delete(`/commerce_track/delete/${id}`);
    return data;
};

const CommercesService = { getAllCommerces, createCommerceAccount, updateCommerce, deleteCommerce };
export default CommercesService;
