import apiClient from '@/api/axios';

const getAllProducts = (params = {}) =>
    apiClient.get('/product', { params }).then((r) => r.data);

const createProducts = (productsArray) =>
    apiClient.post('/product/create', productsArray).then((r) => r.data);

const updateProduct = (id, payload) => {
    // payload may include a File under key "image"
    if (payload.image instanceof File) {
        const form = new FormData();
        Object.entries(payload).forEach(([k, v]) => {
            if (v !== null && v !== undefined && v !== '') form.append(k, v);
        });
        return apiClient.put(`/product/update/${id}`, form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }).then((r) => r.data);
    }
    return apiClient.put(`/product/update/${id}`, payload).then((r) => r.data);
};

const deleteProduct = (id) =>
    apiClient.delete(`/product/delete/${id}`).then((r) => r.data);

const getAllCompanies = () =>
    apiClient.get('/company', { params: { paginate: 'false' } }).then((r) => r.data);

const getAllCurrencies = () =>
    apiClient.get('/currency', { params: { paginate: 'false' } }).then((r) => r.data);

const ProductsService = { getAllProducts, createProducts, updateProduct, deleteProduct, getAllCompanies, getAllCurrencies };
export default ProductsService;
