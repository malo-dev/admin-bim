import axios from 'axios';
import { useLocalStorage } from '@vueuse/core';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const storedToken = useLocalStorage('bim_admin_token', null);
const storedUser = useLocalStorage('bim_admin_user', null);

const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000
});

apiClient.interceptors.request.use((config) => {
    if (storedToken.value) config.headers.Authorization = `Bearer ${storedToken.value}`;
    return config;
});

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            storedToken.value = null;
            storedUser.value = null;
            window.location.href = '/auth/login';
        }
        return Promise.reject(error);
    }
);

export default apiClient;
