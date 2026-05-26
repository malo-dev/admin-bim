<script setup>
import { ref, computed } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useLivreurCandidatesQuery } from '@/modules/company-portal/queries/company-portal.queries';
import { useUpdateLivreurStatusMutation } from '@/modules/company-portal/mutations/company-portal.mutations';

const STATUS_LABEL = {
    pending:  'En attente',
    accepted: 'Acceptée',
    rejected: 'Refusée',
    active:   'Engagé',
};
const STATUS_SEVERITY = {
    pending:  'warn',
    accepted: 'info',
    rejected: 'danger',
    active:   'success',
};

const NEXT_ACTIONS = {
    pending:  [
        { status: 'accepted', label: 'Accepter', icon: 'pi pi-check', severity: 'success' },
        { status: 'rejected', label: 'Refuser',  icon: 'pi pi-times', severity: 'danger' },
    ],
    accepted: [
        { status: 'active',   label: 'Engager',  icon: 'pi pi-send',  severity: 'info' },
        { status: 'rejected', label: 'Refuser',  icon: 'pi pi-times', severity: 'danger' },
    ],
};

const STATUS_OPTIONS = [
    { label: 'Tous', value: null },
    { label: 'En attente', value: 'pending' },
    { label: 'Acceptées', value: 'accepted' },
    { label: 'Refusées', value: 'rejected' },
    { label: 'Engagés', value: 'active' },
];

// Classification automatique selon la note moyenne
function getClassification(rating, ratingCount) {
    const r = parseFloat(rating || 0);
    if (ratingCount === 0) return { label: 'Non évalué', color: '#6B7280', bg: '#F3F4F6', severity: 'secondary' };
    if (r >= 4.5) return { label: 'Excellent',    color: '#16A34A', bg: '#F0FDF4', severity: 'success' };
    if (r >= 3.5) return { label: 'Bien',          color: '#22C55E', bg: '#F0FDF4', severity: 'success' };
    if (r >= 2.5) return { label: 'Correct',       color: '#F97316', bg: '#FFF7ED', severity: 'warn' };
    if (r >= 1.5) return { label: 'À améliorer',   color: '#EF4444', bg: '#FEF2F2', severity: 'danger' };
    return           { label: 'Insuffisant',    color: '#7F1D1D', bg: '#FEF2F2', severity: 'danger' };
}

const selectedStatus = ref(null);
const toast = useToast();

const { data, isLoading, isFetching } = useLivreurCandidatesQuery(selectedStatus);
const { mutate: updateStatus, isPending: updating } = useUpdateLivreurStatusMutation();

const livreurs = computed(() => data.value?.data ?? []);
const total    = computed(() => data.value?.total ?? 0);

// Stats globales des évaluations
const avgRating = computed(() => {
    const active = livreurs.value.filter(l => l.ratingCount > 0);
    if (!active.length) return null;
    return (active.reduce((s, l) => s + parseFloat(l.rating || 0), 0) / active.length).toFixed(2);
});

function handleAction(row, newStatus) {
    updateStatus({ id: row.livreurId, status: newStatus }, {
        onSuccess: () => {
            const msgs = {
                accepted: 'Candidature acceptée',
                rejected: 'Candidature refusée',
                active:   'Livreur engagé — mot de passe envoyé par email',
            };
            toast.add({ severity: newStatus === 'rejected' ? 'warn' : 'success', summary: msgs[newStatus] || 'Mis à jour', life: 3000 });
        },
        onError: () => toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de mettre à jour le statut', life: 3000 }),
    });
}

function renderStars(rating) {
    const r = Math.round(parseFloat(rating || 0));
    return '★'.repeat(r) + '☆'.repeat(5 - r);
}

function formatDate(d) {
    return d ? new Date(d).toLocaleDateString('fr-FR') : '—';
}
</script>

<template>
    <div class="flex flex-col gap-3 sm:gap-4">

        <!-- Header -->
        <div class="flex flex-wrap items-center gap-3">
            <div class="flex items-center gap-3 flex-1 min-w-0">
                <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center shrink-0">
                    <i class="pi pi-truck text-green-600 dark:text-green-400 text-base sm:text-lg" />
                </div>
                <div class="min-w-0">
                    <h1 class="text-xl sm:text-2xl font-bold text-surface-900 dark:text-surface-0 leading-tight">Livreurs</h1>
                    <p class="text-xs sm:text-sm text-muted-color hidden sm:block">Candidatures, évaluations et performance</p>
                </div>
            </div>
            <Select v-model="selectedStatus" :options="STATUS_OPTIONS" optionLabel="label" optionValue="value"
                placeholder="Tous les statuts" showClear class="w-full sm:w-auto sm:min-w-44" />
        </div>

        <!-- Stat évaluation globale -->
        <div v-if="avgRating" class="grid grid-cols-3 gap-3">
            <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3 text-center">
                <p class="text-yellow-600 text-xs font-semibold mb-1">Note moyenne</p>
                <p class="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{{ avgRating }} ★</p>
            </div>
            <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 text-center">
                <p class="text-green-600 text-xs font-semibold mb-1">Excellent / Bien</p>
                <p class="text-2xl font-bold text-green-700 dark:text-green-300">
                    {{ livreurs.filter(l => parseFloat(l.rating || 0) >= 3.5).length }}
                </p>
            </div>
            <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-center">
                <p class="text-red-600 text-xs font-semibold mb-1">À améliorer</p>
                <p class="text-2xl font-bold text-red-700 dark:text-red-300">
                    {{ livreurs.filter(l => l.ratingCount > 0 && parseFloat(l.rating || 0) < 2.5).length }}
                </p>
            </div>
        </div>

        <!-- Tableau -->
        <div class="card px-3! sm:px-6!">
            <div class="flex items-center justify-between mb-4">
                <span class="text-sm font-semibold text-surface-900 dark:text-surface-0">
                    {{ total }} candidature(s)
                    <i v-if="isFetching && !isLoading" class="pi pi-spin pi-spinner text-xs ml-1 text-muted-color" />
                </span>
            </div>

            <DataTable :value="livreurs" :loading="isLoading" stripedRows size="small"
                :paginator="livreurs.length > 10" :rows="10">
                <template #empty>
                    <div class="text-center py-10 text-muted-color">
                        <i class="pi pi-truck text-4xl mb-3 block opacity-30" />
                        <p class="font-medium text-sm">Aucune candidature</p>
                    </div>
                </template>

                <Column header="Date" style="min-width:8rem">
                    <template #body="{ data: row }">
                        <span class="text-xs whitespace-nowrap">{{ formatDate(row.createdAt) }}</span>
                    </template>
                </Column>

                <Column header="Livreur" style="min-width:12rem">
                    <template #body="{ data: row }">
                        <div v-if="row.user">
                            <div class="font-semibold text-sm">{{ row.user.username }}</div>
                            <div class="text-xs text-muted-color">{{ row.user.email }}</div>
                            <a v-if="row.telephone" :href="`tel:${row.telephone}`"
                                class="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 mt-0.5 hover:underline">
                                <i class="pi pi-phone text-xs" /> {{ row.telephone }}
                            </a>
                        </div>
                        <span v-else class="text-muted-color text-xs">—</span>
                    </template>
                </Column>

                <Column header="Motivation" style="min-width:14rem">
                    <template #body="{ data: row }">
                        <span class="text-xs text-muted-color line-clamp-2">{{ row.motivation || '—' }}</span>
                    </template>
                </Column>

                <Column header="Pièce d'identité" style="min-width:10rem">
                    <template #body="{ data: row }">
                        <div class="flex gap-2">
                            <a v-if="row.idCardRecto" :href="`https://serverbimnext.masmara-dimajelo.org${row.idCardRecto}`"
                                target="_blank" class="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                                <i class="pi pi-image text-xs" /> Recto
                            </a>
                            <a v-if="row.idCardVerso" :href="`https://serverbimnext.masmara-dimajelo.org${row.idCardVerso}`"
                                target="_blank" class="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                                <i class="pi pi-image text-xs" /> Verso
                            </a>
                            <span v-if="!row.idCardRecto && !row.idCardVerso" class="text-xs text-muted-color">—</span>
                        </div>
                    </template>
                </Column>

                <Column header="Évaluation" style="min-width:11rem">
                    <template #body="{ data: row }">
                        <div class="flex flex-col gap-1">
                            <!-- Étoiles + score -->
                            <div class="flex items-center gap-1.5">
                                <span class="text-yellow-500 text-sm tracking-tight">{{ renderStars(row.rating) }}</span>
                                <span class="text-xs font-bold text-surface-800 dark:text-surface-100">
                                    {{ Number(row.rating || 0).toFixed(1) }}
                                </span>
                                <span class="text-xs text-muted-color">({{ row.ratingCount || 0 }} avis)</span>
                            </div>
                            <!-- Badge classification -->
                            <span
                                :style="{
                                    backgroundColor: getClassification(row.rating, row.ratingCount).bg,
                                    color: getClassification(row.rating, row.ratingCount).color,
                                    border: `1px solid ${getClassification(row.rating, row.ratingCount).color}`,
                                    borderRadius: '20px',
                                    padding: '2px 8px',
                                    fontSize: '10px',
                                    fontWeight: '700',
                                    display: 'inline-block',
                                }"
                            >
                                {{ getClassification(row.rating, row.ratingCount).label }}
                            </span>
                        </div>
                    </template>
                </Column>

                <Column header="Statut" style="min-width:8rem">
                    <template #body="{ data: row }">
                        <Tag :value="STATUS_LABEL[row.status] ?? row.status"
                            :severity="STATUS_SEVERITY[row.status] ?? 'secondary'"
                            class="text-xs!" />
                    </template>
                </Column>

                <Column header="Actions" style="min-width:14rem">
                    <template #body="{ data: row }">
                        <div class="flex gap-1 flex-wrap">
                            <Button
                                v-for="action in (NEXT_ACTIONS[row.status] ?? [])"
                                :key="action.status"
                                :label="action.label"
                                :icon="action.icon"
                                :severity="action.severity"
                                size="small"
                                outlined
                                :loading="updating"
                                @click="handleAction(row, action.status)"
                            />
                            <span v-if="row.status === 'active'" class="text-xs text-green-600 dark:text-green-400 font-semibold flex items-center gap-1">
                                <i class="pi pi-check-circle" /> Actif
                            </span>
                            <span v-if="row.status === 'rejected'" class="text-xs text-muted-color italic">Refusée</span>
                        </div>
                    </template>
                </Column>
            </DataTable>
        </div>
    </div>
</template>
