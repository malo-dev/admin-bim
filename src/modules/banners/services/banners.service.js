import apiClient from '@/api/axios';

const getAllBanners = (params = {}) =>
    apiClient.get('/banner', { params }).then((r) => r.data);

const createBanner = (payload) => {
    const form = new FormData();
    Object.entries(payload).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== '') form.append(k, v);
    });
    return apiClient.post('/banner/create', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
};

const updateBanner = (id, payload) => {
    const form = new FormData();
    Object.entries(payload).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== '') form.append(k, v);
    });
    return apiClient.put(`/banner/update/${id}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
};

const deleteBanner = (id) =>
    apiClient.delete(`/banner/delete/${id}`).then((r) => r.data);

const BannersService = { getAllBanners, createBanner, updateBanner, deleteBanner };
export default BannersService;
