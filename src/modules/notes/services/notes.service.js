import apiClient from '@/api/axios';

const getNotes = (params = {}) =>
    apiClient.get('/notes', { params }).then((r) => r.data);

const deleteNote = (id) =>
    apiClient.delete(`/notes/${id}`).then((r) => r.data);

const getAllCompanies = () =>
    apiClient.get('/company', { params: { paginate: 'false' } }).then((r) => r.data);

const NotesService = { getNotes, deleteNote, getAllCompanies };
export default NotesService;
