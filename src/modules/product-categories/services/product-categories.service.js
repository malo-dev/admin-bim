import apiClient from '@/api/axios';

/* ── Catégories CRUD ── */
const getAll = (params = {}) =>
    apiClient.get('/category', { params }).then((r) => r.data);

const create = (payload) =>
    apiClient.post('/category/create', payload).then((r) => r.data);

const update = (id, payload) =>
    apiClient.put(`/category/update/${id}`, payload).then((r) => r.data);

const remove = (id) =>
    apiClient.delete(`/category/delete/${id}`).then((r) => r.data);

/* ── Associations produit ↔ catégorie ── */
const getProductsByCategoryId = (categoryId) =>
    apiClient.get(`/product_category/by-category/${categoryId}`).then((r) => r.data);

const linkProduct = (productId, categoryId) =>
    apiClient.post('/product_category/create', { productId, categoryId }).then((r) => r.data);

const unlinkProduct = (productId, categoryId) =>
    apiClient.post('/product_category/unlink', { productId, categoryId }).then((r) => r.data);

/* ── All products (for picker) ── */
const getAllProducts = (params = {}) =>
    apiClient.get('/product', { params }).then((r) => r.data);

const ProductCategoriesService = { getAll, create, update, remove, getProductsByCategoryId, linkProduct, unlinkProduct, getAllProducts };
export default ProductCategoriesService;
