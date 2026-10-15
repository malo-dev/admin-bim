<script setup>
import { ref, computed, watch } from 'vue';
import { refDebounced } from '@vueuse/core';
import { useConsumptionsQuery } from '@/modules/consumption/queries/consumption.queries';

const SERVER_ROOT = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace('/api/v1', '');
function imageUrl(path) {
    if (!path) return null;
    return path.startsWith('http') ? path : SERVER_ROOT + path;
}
function formatDate(d) {
    return d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
}

const searchInput = ref('');
const search = refDebounced(searchInput, 400);
const bonusFilter = ref(null); // null = tous, 'true' = bonus uniquement, 'false' = achats payants
const currentPage = ref(1);
const pageSize = ref(20);

watch([search, bonusFilter], () => { currentPage.value = 1; });

const filters = computed(() => ({
    search: search.value || undefined,
    isBonus: bonusFilter.value || undefined,
    page: currentPage.value,
    pageSize: pageSize.value,
}));

const { data, isLoading, isFetching } = useConsumptionsQuery(filters);
const rows = computed(() => data.value?.data ?? []);
const totalRecords = computed(() => data.value?.total ?? 0);

const bonusOptions = [
    { label: 'Tout', value: null },
    { label: 'Achats payants', value: 'false' },
    { label: 'Produits offerts (bonus)', value: 'true' },
];

function onPage(event) {
    currentPage.value = event.page + 1;
    pageSize.value = event.rows;
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <i class="pi pi-verified text-primary text-lg" />
            </div>
            <div>
                <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Fiches de consommation & Fidélité</h1>
                <p class="text-sm text-muted-color">
                    Historique des achats produit par produit — après 10 achats d'un même produit, le 11ème est offert automatiquement
                </p>
            </div>
        </div>

        <div class="card">
            <div class="flex items-center gap-3 mb-5 flex-wrap">
                <IconField class="flex-1 min-w-56">
                    <InputIcon class="pi pi-search" />
                    <InputText v-model="searchInput" placeholder="Rechercher par utilisateur (signature)…" class="w-full" />
                </IconField>
                <Select
                    v-model="bonusFilter"
                    :options="bonusOptions"
                    optionLabel="label"
                    optionValue="value"
                    class="min-w-56"
                />
                <span class="text-sm text-muted-color ml-auto whitespace-nowrap">
                    <i v-if="isFetching && !isLoading" class="pi pi-spin pi-spinner text-xs mr-1" />
                    {{ totalRecords }} fiche(s)
                </span>
            </div>

            <!-- Chargement -->
            <div v-if="isLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Skeleton v-for="n in 6" :key="n" height="11rem" borderRadius="1rem" />
            </div>

            <!-- Vide -->
            <div v-else-if="rows.length === 0" class="text-center py-12 text-muted-color">
                <i class="pi pi-verified text-4xl mb-3 block opacity-30" />
                <p class="font-medium">Aucune fiche de consommation pour le moment</p>
            </div>

            <!-- Cards -->
            <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div
                    v-for="row in rows"
                    :key="row.id"
                    class="card mb-0! p-4! flex flex-col gap-3"
                >
                    <!-- Utilisateur + type -->
                    <div class="flex items-center gap-3">
                        <Avatar :label="(row.signatureName ?? row.user?.username ?? '?')[0]?.toUpperCase()" shape="circle" :style="{ backgroundColor: 'var(--p-primary-100)', color: 'var(--p-primary-700)', fontWeight: '700' }" />
                        <div class="flex-1 min-w-0">
                            <div class="font-semibold text-surface-900 dark:text-surface-0 truncate">{{ row.signatureName ?? row.user?.username ?? '—' }}</div>
                            <div class="text-xs text-muted-color">{{ formatDate(row.consumedAt) }}</div>
                        </div>
                        <Tag v-if="row.isBonus" value="Offert (bonus)" severity="warn" />
                        <Tag v-else value="Achat payant" severity="secondary" />
                    </div>

                    <!-- Produit -->
                    <div class="flex items-center gap-3">
                        <img v-if="imageUrl(row.product?.imageUrl)" :src="imageUrl(row.product?.imageUrl)" class="w-9 h-9 rounded-lg object-contain bg-surface-100 dark:bg-surface-800" />
                        <div class="min-w-0">
                            <div class="font-medium text-sm truncate">{{ row.product?.name ?? '—' }}</div>
                            <div v-if="row.company?.name" class="text-xs text-muted-color truncate">{{ row.company.name }}</div>
                        </div>
                    </div>

                    <!-- Quantité + prix -->
                    <div class="flex items-center justify-between gap-2 pt-2 border-t border-surface-100 dark:border-surface-800">
                        <span class="text-sm text-muted-color">{{ row.quantity }} {{ row.unityMesure || '' }}</span>
                        <span class="font-semibold text-sm">{{ Number(row.totalPaid ?? 0).toFixed(2) }} EC</span>
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
        </div>
    </div>
</template>
