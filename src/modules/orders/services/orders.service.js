import apiClient from '@/api/axios';

const getOrders = (params = {}) =>
    apiClient.get('/order', { params }).then((r) => r.data);

const getOrderById = (id) =>
    apiClient.get(`/order/${id}`).then((r) => r.data);

const updateOrder = (id, payload) =>
    apiClient.put(`/order/${id}`, payload).then((r) => r.data);

const deleteOrder = (id) =>
    apiClient.delete(`/order/${id}`).then((r) => r.data);

const getAllCompanies = () =>
    apiClient.get('/company', { params: { paginate: 'false' } }).then((r) => r.data);

const OrdersService = { getOrders, getOrderById, updateOrder, deleteOrder, getAllCompanies };
export default OrdersService;
