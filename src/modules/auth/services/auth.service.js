import apiClient from '@/api/axios';

/**
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<import('../types/auth.types').LoginResponse>}
 */
const login = async (credentials) => {
    const { data } = await apiClient.post('/auth/login', credentials);
    return data;
};

/**
 * @param {string} email
 * @returns {Promise<void>}
 */
const logout = async (email) => {
    await apiClient.post('/auth/logout', { email });
};

const AuthService = { login, logout };

export default AuthService;
