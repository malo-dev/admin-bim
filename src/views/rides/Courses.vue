<script setup>
import { ref, computed } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useRidesQuery, useAvailableChauffeursQuery } from '@/modules/rides/queries/rides.queries';
import { useAssignChauffeurMutation } from '@/modules/rides/mutations/rides.mutations';

const toast = useToast();

const STATUS_OPTIONS = [
    { label: 'En recherche', value: 'searching' },
    { label: 'Acceptée', value: 'accepted' },
    { label: "En approche", value: 'arriving' },
    { label: 'En course', value: 'in_progress' },
    { label: 'Terminée', value: 'completed' },
    { label: 'Annulée', value: 'cancelled' },
];
const STATUS_LABEL = Object.fromEntries(STATUS_OPTIONS.map((o) => [o.value, o.label]));
const STATUS_SEVERITY = {
    searching: 'warn', accepted: 'info', arriving: 'info',
    in_progress: 'info', completed: 'success', cancelled: 'danger',
};
const QUICK_PERIODS = [
    { label: "Aujourd'hui", value: 'today' },
    { label: 'Semaine', value: 'week' },
    { label: 'Mois', value: 'month' },
];

const currentPage = ref(1);
const pageSize = ref(20);
const statusFilter = ref(null);
const periodFilter = ref(null);

const filters = computed(() => ({
    page: currentPage.value,
    pageSize: pageSize.value,
    ...(statusFilter.value && { status: statusFilter.value }),
    ...(periodFilter.value && { period: periodFilter.value }),
}));

const { data, isLoading, isFetching } = useRidesQuery(filters);
const rides = computed(() => data.value?.data ?? []);
const totalRecords = computed(() => data.value?.total ?? 0);

const { data: availableData } = useAvailableChauffeursQuery();
const availableChauffeurs = computed(() => availableData.value?.data ?? []);

const { mutate: assignChauffeur, isPending: assigning } = useAssignChauffeurMutation();

const assignDialog = ref(false);
const assignTarget = ref(null);
const selectedChauffeurId = ref(null);

function openAssign(row) {
    assignTarget.value = row;
    selectedChauffeurId.value = null;
    assignDialog.value = true;
}

function confirmAssign() {
    if (!selectedChauffeurId.value || !assignTarget.value) return;
    assignChauffeur({ rideNumber: assignTarget.value.rideNumber, chauffeurId: selectedChauffeurId.value }, {
        onSuccess: () => {
            toast.add({ severity: 'success', summary: 'Assigné', detail: 'Chauffeur assigné à la course — vous pouvez l\'appeler pour confirmer.', life: 4000 });
            assignDialog.value = false;
        },
        onError: (err) => toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
    });
}

function onPage(event) {
    currentPage.value = event.page + 1;
    pageSize.value = event.rows;
}

function fmt(n) {
    return Number(n ?? 0).toFixed(2);
}

function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}
</script>

<template>
    <div class="card">
        <div class="flex items-center gap-3 mb-5">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <i class="pi pi-car text-primary text-lg" />
            </div>
            <div>
                <h1 class="text-xl font-bold text-surface-900 dark:text-surface-0">Courses BIM Transport</h1>
                <p class="text-sm text-muted-color">Suivi des réservations et assignation manuelle d'un chauffeur</p>
            </div>
        </div>

        <div class="flex flex-wrap items-center gap-3 mb-4">
            <Select v-model="statusFilter" :options="STATUS_OPTIONS" optionLabel="label" optionValue="value"
                placeholder="Tous les statuts" showClear class="min-w-48" />
            <div class="flex items-center gap-2">
                <Button
                    v-for="opt in QUICK_PERIODS"
                    :key="opt.value"
                    :label="opt.label"
                    size="small"
                    :severity="periodFilter === opt.value ? 'primary' : 'secondary'"
                    :outlined="periodFilter !== opt.value"
                    @click="periodFilter = periodFilter === opt.value ? null : opt.value"
                />
            </div>
            <span class="text-sm text-muted-color whitespace-nowrap ml-auto">
                <i v-if="isFetching && !isLoading" class="pi pi-spin pi-spinner text-xs mr-1" />
                {{ totalRecords }} course(s)
            </span>
        </div>

        <!-- Chargement -->
        <div v-if="isLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton v-for="n in 6" :key="n" height="12rem" borderRadius="1rem" />
        </div>

        <!-- Vide -->
        <div v-else-if="rides.length === 0" class="text-center py-12 text-muted-color">
            <i class="pi pi-car text-4xl mb-3 block opacity-30" />
            <p class="font-medium">Aucune course trouvée</p>
        </div>

        <!-- Cards -->
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div v-for="row in rides" :key="row.rideId" class="card mb-0! p-4! flex flex-col gap-3">
                <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                        <div class="font-semibold text-sm truncate">{{ row.passenger?.username ?? '—' }}</div>
                        <div class="text-xs text-muted-color truncate">{{ row.passenger?.telephone ?? row.passenger?.email ?? '—' }}</div>
                    </div>
                    <Tag :value="STATUS_LABEL[row.status] ?? row.status" :severity="STATUS_SEVERITY[row.status] ?? 'secondary'" />
                </div>

                <div class="flex flex-col gap-1 text-xs">
                    <div class="flex items-center gap-2">
                        <i class="pi pi-circle-fill text-primary" style="font-size:8px" />
                        <span class="truncate">{{ row.pickupAddress }}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <i class="pi pi-map-marker text-muted-color" style="font-size:9px" />
                        <span class="truncate">{{ row.destinationAddress }}</span>
                    </div>
                </div>

                <div class="flex items-center justify-between gap-2">
                    <span class="text-xs text-muted-color">{{ row.vehicleTier }} · {{ fmt(row.distanceKm) }} km</span>
                    <span class="font-semibold text-sm">{{ fmt(row.finalFare ?? row.estimatedFare) }} EC</span>
                </div>

                <!-- Chauffeur assigné -->
                <div v-if="row.chauffeur" class="flex items-center justify-between gap-2 rounded-lg bg-surface-50 dark:bg-surface-800 px-2 py-1.5">
                    <div class="min-w-0">
                        <div class="text-xs font-medium truncate">{{ row.chauffeur.user?.username ?? 'Chauffeur' }}</div>
                        <div class="text-xs text-muted-color">{{ row.chauffeur.user?.telephone ?? row.chauffeur.telephone ?? '—' }}</div>
                    </div>
                    <a v-if="row.chauffeur.user?.telephone ?? row.chauffeur.telephone" :href="`tel:${row.chauffeur.user?.telephone ?? row.chauffeur.telephone}`">
                        <Button icon="pi pi-phone" size="small" rounded severity="success" outlined />
                    </a>
                </div>

                <!-- Assigner un chauffeur (course en recherche) -->
                <Button
                    v-else-if="row.status === 'searching'"
                    label="Assigner un chauffeur"
                    icon="pi pi-user-plus"
                    size="small"
                    outlined
                    @click="openAssign(row)"
                />

                <div class="text-xs text-muted-color pt-2 border-t border-surface-100 dark:border-surface-800">
                    {{ formatDate(row.createdAt) }}
                </div>
            </div>
        </div>

        <Paginator
            v-if="totalRecords > 0"
            class="mt-4"
            :rows="pageSize"
            :totalRecords="totalRecords"
            :rowsPerPageOptions="[10, 20, 50]"
            template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
            currentPageReportTemplate="{first} à {last} sur {totalRecords}"
            @page="onPage"
        />

        <Dialog v-model:visible="assignDialog" header="Assigner un chauffeur" modal style="width:26rem" :draggable="false">
            <p class="text-sm text-muted-color mb-4">
                Choisissez un chauffeur en ligne et disponible — vous devrez ensuite l'appeler vous-même pour lui
                dire d'aller récupérer le client à l'adresse indiquée.
            </p>
            <div v-if="availableChauffeurs.length === 0" class="text-center py-6 text-muted-color text-sm">
                Aucun chauffeur en ligne et disponible pour le moment.
            </div>
            <div v-else class="flex flex-col gap-2">
                <div
                    v-for="c in availableChauffeurs"
                    :key="c.chauffeurId"
                    class="flex items-center justify-between gap-2 rounded-lg border p-2 cursor-pointer"
                    :class="selectedChauffeurId === c.chauffeurId ? 'border-primary bg-primary/5' : 'border-surface-200 dark:border-surface-700'"
                    @click="selectedChauffeurId = c.chauffeurId"
                >
                    <div class="min-w-0">
                        <div class="text-sm font-medium truncate">{{ c.user?.username ?? 'Chauffeur' }}</div>
                        <div class="text-xs text-muted-color">{{ c.user?.telephone ?? c.telephone ?? '—' }} · {{ c.vehicleTier }} · ⭐ {{ Number(c.rating ?? 5).toFixed(1) }}</div>
                    </div>
                    <RadioButton :value="c.chauffeurId" v-model="selectedChauffeurId" />
                </div>
            </div>
            <template #footer>
                <Button label="Annuler" severity="secondary" outlined @click="assignDialog = false" />
                <Button label="Assigner" icon="pi pi-check" :loading="assigning" :disabled="!selectedChauffeurId" @click="confirmAssign" />
            </template>
        </Dialog>
    </div>
</template>
