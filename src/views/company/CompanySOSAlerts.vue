<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import apiClient from '@/api/axios';
import { useAuthStore } from '@/modules/auth/store/auth.store';
import { io } from 'socket.io-client';

const toast  = useToast();
const auth   = useAuthStore();
const alerts = ref([]);
const loading = ref(false);
let socket = null;

const TYPE_LABEL = { suspect: '🟠 Suspect', urgence: '🔴 Urgence', secours: '🆘 Au secours' };
const TYPE_COLOR = { suspect: 'warn', urgence: 'danger', secours: 'danger' };
const TYPE_BG    = { suspect: '#FFF7ED', urgence: '#FEF2F2', secours: '#FFF0F0' };
const TYPE_BORDER= { suspect: '#F97316', urgence: '#EF4444', secours: '#7C0000' };

async function loadAlerts() {
    loading.value = true;
    try {
        const res = await apiClient.get('/livreur/sos/alerts?status=all');
        alerts.value = res.data?.data ?? [];
    } catch {
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les alertes SOS', life: 3000 });
    } finally {
        loading.value = false;
    }
}

async function resolve(sosId) {
    try {
        await apiClient.put(`/livreur/sos/${sosId}/resolve`);
        toast.add({ severity: 'success', summary: 'Résolue', detail: 'Alerte marquée comme résolue', life: 3000 });
        await loadAlerts();
    } catch {
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de résoudre l\'alerte', life: 3000 });
    }
}

function formatDate(d) {
    return new Date(d).toLocaleString('fr-FR');
}

onMounted(() => {
    loadAlerts();

    // Écouter les alertes SOS en temps réel
    const socketUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:8083';
    socket = io(socketUrl, { transports: ['websocket'] });
    socket.emit('join_admin');
    socket.on('livreur:sos', (data) => {
        alerts.value.unshift({ ...data, status: 'active' });
        toast.add({
            severity: 'error',
            summary: `${data.typeLabel} — Alerte SOS`,
            detail: `${data.livreurName} · ${data.telephone ?? '—'}`,
            life: 10000,
        });
    });
});

onUnmounted(() => {
    if (socket) socket.disconnect();
});
</script>

<template>
    <div class="p-4 md:p-6">
        <div class="flex items-center justify-between mb-6">
            <div>
                <h2 class="text-xl font-bold text-surface-900 dark:text-surface-0">Alertes SOS Livreurs</h2>
                <p class="text-surface-500 text-sm mt-1">Surveillance en temps réel — les alertes apparaissent instantanément</p>
            </div>
            <Button icon="pi pi-refresh" severity="secondary" :loading="loading" @click="loadAlerts" />
        </div>

        <div v-if="loading && !alerts.length" class="flex justify-center py-16">
            <ProgressSpinner style="width:40px;height:40px" />
        </div>

        <div v-else-if="!alerts.length" class="flex flex-col items-center justify-center py-16 gap-3 text-surface-400">
            <i class="pi pi-shield text-4xl"></i>
            <p class="font-semibold">Aucune alerte SOS</p>
            <p class="text-sm">Tout va bien — aucune alerte active</p>
        </div>

        <div v-else class="flex flex-col gap-4">
            <div
                v-for="a in alerts"
                :key="a.sosId"
                class="rounded-2xl border-2 p-4"
                :style="{ backgroundColor: TYPE_BG[a.type], borderColor: TYPE_BORDER[a.type] }"
            >
                <div class="flex items-start justify-between gap-4">
                    <div class="flex items-center gap-3 flex-1">
                        <div class="text-3xl">{{ a.type === 'suspect' ? '🟠' : a.type === 'urgence' ? '🔴' : '🆘' }}</div>
                        <div>
                            <div class="flex items-center gap-2 mb-1">
                                <Tag :value="TYPE_LABEL[a.type]" :severity="TYPE_COLOR[a.type]" />
                                <Tag v-if="a.status === 'resolved'" value="Résolue" severity="success" />
                                <Tag v-else value="ACTIVE" severity="danger" />
                            </div>
                            <p class="font-bold text-surface-900">{{ a.livreurName ?? a.livreur?.user?.username ?? '—' }}</p>
                            <p class="text-sm text-surface-600">
                                {{ a.telephone ?? a.livreur?.telephone ?? '—' }} ·
                                {{ formatDate(a.createdAt) }}
                            </p>
                        </div>
                    </div>
                    <div class="flex flex-col gap-2 items-end shrink-0">
                        <a
                            v-if="a.latitude && a.longitude"
                            :href="`https://maps.google.com/?q=${a.latitude},${a.longitude}`"
                            target="_blank"
                            class="inline-flex items-center gap-1 text-blue-600 font-semibold text-sm hover:underline"
                        >
                            <i class="pi pi-map-marker"></i> Voir position
                        </a>
                        <span v-else class="text-sm text-surface-400">Position inconnue</span>
                        <Button
                            v-if="a.status === 'active'"
                            label="Marquer résolue"
                            icon="pi pi-check"
                            severity="success"
                            size="small"
                            @click="resolve(a.sosId)"
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
