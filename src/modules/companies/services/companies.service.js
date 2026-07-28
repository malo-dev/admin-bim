import apiClient from '@/api/axios';

const getAllCompanies = async (params = {}) => {
    const { data } = await apiClient.get('/company', { params });
    return data;
};

/** @param {object[]} companies - tableau d'entreprises */
const createCompany = async (companies) => {
    const { data } = await apiClient.post('/company/create', companies);
    return data;
};

const updateCompany = async (id, payload) => {
    const isForm = payload instanceof FormData;
    const { data } = await apiClient.put(`/company/update/${id}`, payload, isForm ? { headers: { 'Content-Type': 'multipart/form-data' } } : {});
    return data;
};

const deleteCompany = async (id) => {
    const { data } = await apiClient.delete(`/company/delete/${id}`);
    return data;
};

const CompaniesService = { getAllCompanies, createCompany, updateCompany, deleteCompany };
export default CompaniesService;
