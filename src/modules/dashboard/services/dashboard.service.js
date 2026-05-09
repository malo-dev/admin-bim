import apiClient from '@/api/axios';

/**
 * @param {'daily'|'weekly'|'monthly'|'quarterly'|'semiannual'|'annual'|''} period
 */
const getStats = async (period = '') => {
    const params = period ? { period } : {};
    const { data } = await apiClient.get('/auth/dashboard-stats', { params });
    return data;
};

const DashboardService = { getStats };

export default DashboardService;
