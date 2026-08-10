import apiClient from '@/api/axios';

const getUsers = async (params = {}) => {
    const { data } = await apiClient.get('/auth/users', { params });
    return data;
};

const getCommerces = async () => {
    const { data } = await apiClient.get('/commerce_track');
    return data;
};

const toggleUserActive = async (id) => {
    const { data } = await apiClient.put(`/auth/users/${id}/activate`);
    return data;
};

const toggleUserBlock = async (id) => {
    const { data } = await apiClient.put(`/auth/users/${id}/block-user`);
    return data;
};

const deleteUser = async (id) => {
    const { data } = await apiClient.delete(`/auth/users/${id}`);
    return data;
};

const updateUserProfile = async (id, payload) => {
    const { data } = await apiClient.put(`/auth/users/${id}/profile`, payload);
    return data;
};

const updateSoldNumber = async (id, soldNumber) => {
    const { data } = await apiClient.put(`/auth/users/${id}/sold`, { soldNumber });
    return data;
};

const rechargeUser = async (id, amount) => {
    const { data } = await apiClient.post(`/auth/users/${id}/admin-recharge`, { amount });
    return data;
};

const resetUserPassword = async (id) => {
    const { data } = await apiClient.post(`/auth/users/${id}/admin-reset-password`);
    return data;
};

const getOtps = async (params = {}) => {
    const { data } = await apiClient.get('/auth/otps', { params });
    return data;
};

const getUsersBalanceStats = async (params = {}) => {
    const { data } = await apiClient.get('/auth/users/balance-stats', { params });
    return data;
};

const getTransactionPassword = async (id) => {
    const { data } = await apiClient.get(`/auth/users/${id}/transaction-password`);
    return data;
};

const resetAllBalances = async () => {
    const { data } = await apiClient.post('/auth/admin/reset-all-balances', {
        confirmation: 'RESET_ALL_BALANCES',
    });
    return { data };
};

const UsersService = {
    getUsers,
    getCommerces,
    toggleUserActive,
    toggleUserBlock,
    deleteUser,
    updateUserProfile,
    updateSoldNumber,
    rechargeUser,
    resetUserPassword,
    getOtps,
    getUsersBalanceStats,
    getTransactionPassword,
    resetAllBalances,
};
export default UsersService;
