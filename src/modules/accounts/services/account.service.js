import apiClient from '@/api/axios';

/**
 * @param {{ username: string, email: string, password: string }} payload
 */
const createBimAdmin = async (payload) => {
    const { data } = await apiClient.post('/auth/create-bim-admin', payload);
    return data;
};

/**
 * @param {{ company: { name: string, email: string, description?: string, location?: string }, admin: { username: string, email: string, password: string } }} payload
 */
const createCompanyAccount = async (payload) => {
    const { data } = await apiClient.post('/auth/create-company-account', payload);
    return data;
};

/**
 * @param {{ username: string, email: string, password: string }} payload
 */
const bootstrap = async (payload) => {
    const { data } = await apiClient.post('/auth/bootstrap', payload);
    return data;
};

/**
 * @param {{ email: string }} payload
 */
const requestBimReset = async (payload) => {
    const { data } = await apiClient.post('/auth/request-bim-reset', payload);
    return data;
};

/**
 * @param {{ email: string, otp: string, newPassword: string }} payload
 */
const resetBimPassword = async (payload) => {
    const { data } = await apiClient.post('/auth/reset-bim-password', payload);
    return data;
};

/**
 * @param {{ search?: string, page?: number, pageSize?: number, paginate?: string }} params
 */
const getAdminAccounts = async (params = {}) => {
    const { data } = await apiClient.get('/auth/admin-accounts', { params });
    return data;
};

const addCompanyAdmin = async (payload) => {
    const { data } = await apiClient.post('/auth/add-company-admin', payload);
    return data;
};

const AccountService = { createBimAdmin, createCompanyAccount, addCompanyAdmin, bootstrap, requestBimReset, resetBimPassword, getAdminAccounts };

export default AccountService;
