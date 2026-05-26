<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import apiClient from '@/api/axios';
import { io } from 'socket.io-client';

const toast   = useToast();
const alerts  = ref([]);
const loading = ref(false);
const tab     = ref('all'); // 'all' | 'securite' | 'sante'
let socket    = null;

/* ── Labels ── */
const SEC_LABEL  = { suspect: '🟠 Suspect', urgence: '🔴 Urgence', secours: '🆘 Au secours' };
const SUB_LABEL  = { ebola: '🦠 Ebola', cas_suspect: '⚠️ Cas suspect', autre: '🏥 Autre urgence' };
const SEC_SEV    = { suspect: 'warn', urgence: 'danger', secours: 'danger' };

function typeLabel(a) {
    if (a.category === 'sante') return SUB_LABEL[a.subType] ?? '🏥 SOS Santé';
    return SEC_LABEL[a.type] ?? a.type;
}
function typeSeverity(a) {
    if (a.category === 'sante') return 'danger';
    return SEC_SEV[a.type] ?? 'secondary';
}
function formatDate(d) {
    return d ? new Date(d).toLocaleString('fr-FR') : '—';
}

/* ── Filtered list ── */
const filtered = computed(() => {
    if (tab.value === 'all') return alerts.value;
    return alerts.value.filter(a => a.category === tab.value);
});

const activeCount  = computed(() => alerts.value.filter(a => a.status === 'active').length);
const santeCount   = computed(() => alerts.value.filter(a => a.category === 'sante' && a.status === 'active').length);
const securiteCount= computed(() => alerts.value.filter(a => a.category === 'securite' && a.status === 'active').length);

/* ── API ── */
async function loadAlerts() {
    loading.value = true;
    try {
        const res = await apiClient.get('/auth/sos/alerts?status=all');
        alerts.value = res.data?.data ?? [];
    } catch {
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les alertes SOS', life: 3000 });
    } finally {
        loading.value = false;
    }
}

async function resolve(sosId) {
    try {
        await apiClient.put(`/auth/sos/${sosId}/resolve`);
        toast.add({ severity: 'success', summary: 'Résolue', detail: 'Alerte marquée comme résolue', life: 3000 });
        const idx = alerts.value.findIndex(a => a.sosId === sosId);
        if (idx !== -1) {
            alerts.value[idx].status = 'resolved';
            alerts.value[idx].resolvedAt = new Date().toISOString();
        }
    } catch {
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de résoudre l\'alerte', life: 3000 });
    }
}

/* ── Socket.io ── */
onMounted(() => {
    loadAlerts();

    const socketUrl = import.meta.env.VITE_SOCKET_URL
        || import.meta.env.VITE_API_URL?.replace('/api/v1', '')
        || 'http://localhost:8083';

    socket = io(socketUrl, { transports: ['websocket'] });
    socket.emit('join_admin');

    socket.on('livreur:sos', (data) => {
        // reçoit aussi les SOS utilisateurs (emitSOSAlert est commun)
        if (data.source === 'user') {
            alerts.value.unshift({ ...data, status: 'active' });
            const label = data.category === 'sante'
                ? (SUB_LABEL[data.subType] ?? '🏥 SOS Santé')
                : (SEC_LABEL[data.type] ?? data.typeLabel);
            toast.add({
                severity: 'error',
                summary: `${label} — BIM SOS Utilisateur`,
                detail: `${data.userName} · ${data.contactPhone ?? data.telephone ?? '—'}`,
                life: 12000,
            });
        }
    });
});

onUnmounted(() => {
    if (socket) socket.disconnect();
});
</script>

<template>
    <div class="p-4 md:p-6">

        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
            <div>
                <h2 class="text-xl font-bold text-surface-900 dark:text-surface-0">🚨 BIM SOS — Alertes Utilisateurs</h2>
                <p class="text-surface-500 text-sm mt-1">Alertes de sécurité et sanitaires en temps réel</p>
            </div>
            <Button icon="pi pi-refresh" severity="secondary" :loading="loading" @click="loadAlerts" />
        </div>

        <!-- Stats cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div class="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
                <p class="text-red-600 dark:text-red-400 text-sm font-semibold">Alertes actives</p>
                <p class="text-3xl font-bold text-red-700 dark:text-red-300 mt-1">{{ activeCount }}</p>
            </div>
            <div class="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
                <p class="text-orange-600 dark:text-orange-400 text-sm font-semibold">Sécurité actives</p>
                <p class="text-3xl font-bold text-orange-700 dark:text-orange-300 mt-1">{{ securiteCount }}</p>
            </div>
            <div class="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
                <p class="text-purple-600 dark:text-purple-400 text-sm font-semibold">Santé actives</p>
                <p class="text-3xl font-bold text-purple-700 dark:text-purple-300 mt-1">{{ santeCount }}</p>
            </div>
        </div>

        <!-- Tabs -->
        <div class="flex gap-2 mb-5">
            <button
                v-for="t in [{ key: 'all', label: 'Toutes' }, { key: 'securite', label: '🔒 Sécurité' }, { key: 'sante', label: '🏥 Santé' }]"
                :key="t.key"
                @click="tab = t.key"
                :class="[
                    'px-4 py-2 rounded-lg text-sm font-semibold transition-all',
                    tab === t.key
                        ? 'bg-red-600 text-white shadow'
                        : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700'
                ]"
            >
                {{ t.label }}
            </button>
        </div>

        <!-- Loading -->
        <div v-if="loading && !alerts.length" class="flex justify-center py-16">
            <ProgressSpinner style="width:40px;height:40px" />
        </div>

        <!-- Empty -->
        <div v-else-if="!filtered.length" class="text-center py-16 text-surface-400">
            <i class="pi pi-check-circle text-4xl text-green-400 mb-3 block" />
            <p class="text-lg font-semibold">Aucune alerte{{ tab !== 'all' ? ' dans cette catégorie' : '' }}</p>
            <p class="text-sm mt-1">Toutes les alertes ont été traitées.</p>
        </div>

        <!-- Alert cards -->
        <div v-else class="flex flex-col gap-4">
            <div
                v-for="a in filtered"
                :key="a.sosId"
                :class="[
                    'rounded-2xl border-2 p-5 transition-all',
                    a.status === 'active'
                        ? (a.category === 'sante' ? 'border-purple-400 bg-purple-50 dark:bg-purple-950/20' : 'border-red-400 bg-red-50 dark:bg-red-950/20')
                        : 'border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 opacity-60'
                ]"
            >
                <!-- Row 1: badge + status + time -->
                <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div class="flex items-center gap-2">
                        <Tag
                            :value="typeLabel(a)"
                            :severity="typeSeverity(a)"
                            class="text-sm"
                        />
                        <Tag
                            :value="a.category === 'sante' ? '🏥 Santé' : '🔒 Sécurité'"
                            :severity="a.category === 'sante' ? 'info' : 'warn'"
                            class="text-xs"
                        />
                        <Tag
                            :value="a.status === 'active' ? '🔴 Active' : '✅ Résolue'"
                            :severity="a.status === 'active' ? 'danger' : 'success'"
                            class="text-xs"
                        />
                    </div>
                    <span class="text-surface-400 text-xs">{{ formatDate(a.createdAt) }}</span>
                </div>

                <!-- Row 2: user info -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                    <div class="flex items-center gap-2">
                        <i class="pi pi-user text-surface-500 text-sm" />
                        <div>
                            <p class="font-semibold text-surface-800 dark:text-surface-100 text-sm">{{ a.userName ?? a.user?.username ?? '—' }}</p>
                            <p class="text-surface-500 text-xs">{{ a.user?.email ?? '—' }}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <i class="pi pi-phone text-surface-500 text-sm" />
                        <div>
                            <p class="font-semibold text-surface-800 dark:text-surface-100 text-sm">
                                {{ a.contactPhone ?? a.telephone ?? a.user?.telephone ?? 'Non renseigné' }}
                            </p>
                            <p class="text-surface-500 text-xs">Numéro de contact</p>
                        </div>
                    </div>
                </div>

                <!-- Row 3: santé-specific info -->
                <div v-if="a.category === 'sante'" class="bg-purple-100 dark:bg-purple-900/30 rounded-xl p-3 mb-3">
                    <div v-if="a.caseLocation" class="flex items-start gap-2 mb-1">
                        <i class="pi pi-map-marker text-purple-600 text-sm mt-0.5" />
                        <div>
                            <p class="text-xs font-semibold text-purple-700 dark:text-purple-300">Localisation du cas</p>
                            <p class="text-sm text-surface-700 dark:text-surface-200">{{ a.caseLocation }}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <i class="pi pi-tag text-purple-600 text-sm" />
                        <p class="text-xs text-purple-700 dark:text-purple-300 font-semibold">
                            {{ SUB_LABEL[a.subType] ?? a.subType ?? '—' }}
                        </p>
                    </div>
                </div>

                <!-- Row 4: GPS + actions -->
                <div class="flex flex-wrap items-center justify-between gap-3 mt-2">
                    <div>
                        <a
                            v-if="a.latitude && a.longitude"
                            :href="`https://maps.google.com/?q=${a.latitude},${a.longitude}`"
                            target="_blank"
                            class="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 text-xs font-semibold hover:underline"
                        >
                            <i class="pi pi-map-marker" />
                            Voir sur Google Maps
                        </a>
                        <span v-else class="text-surface-400 text-xs">Position GPS non disponible</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span v-if="a.status === 'resolved'" class="text-green-600 dark:text-green-400 text-xs font-semibold">
                            ✅ Résolue le {{ formatDate(a.resolvedAt) }}
                        </span>
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
