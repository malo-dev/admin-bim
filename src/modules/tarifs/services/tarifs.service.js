import apiClient from '@/api/axios';

const getAllTiers = () => apiClient.get('/ride-tiers').then((r) => r.data);

// `imageFile` (optionnel) : fichier image de la gamme de véhicule. Si présent,
// on envoie en multipart ; sinon on garde un simple JSON (ex: toggleActive).
function toPayload(payload, imageFile) {
    if (!imageFile) return payload;
    const fd = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) fd.append(key, value);
    });
    fd.append('image', imageFile);
    return fd;
}

const createTier = (payload, imageFile) => apiClient.post('/ride-tiers', toPayload(payload, imageFile), {
    ...(imageFile && { headers: { 'Content-Type': 'multipart/form-data' } }),
}).then((r) => r.data);

const updateTier = (tierKey, payload, imageFile) => apiClient.put(`/ride-tiers/${tierKey}`, toPayload(payload, imageFile), {
    ...(imageFile && { headers: { 'Content-Type': 'multipart/form-data' } }),
}).then((r) => r.data);

const deleteTier = (tierKey) => apiClient.delete(`/ride-tiers/${tierKey}`).then((r) => r.data);

const TarifsService = { getAllTiers, createTier, updateTier, deleteTier };
export default TarifsService;
