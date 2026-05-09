<script setup>
import { ref, computed, watch } from 'vue';
import { refDebounced } from '@vueuse/core';
import { useMyOrdersQuery, useMyStatsQuery } from '@/modules/company-portal/queries/company-portal.queries';

const STATUS_LABEL = {
    pending: 'En attente',
    confirmed: 'Confirmée',
    processing: 'En cours',
    shipped: 'Expédiée',
    delivered: 'Livrée',
    cancelled: 'Annulée',
};
const STATUS_SEVERITY = {
    pending: 'warn',
    confirmed: 'info',
    processing: 'info',
    shipped: 'secondary',
    delivered: 'success',
    cancelled: 'danger',
};
const STATUS_OPTIONS = Object.entries(STATUS_LABEL).map(([value, label]) => ({ label, value }));

const PERIOD_OPTIONS = [
    { label: "Aujourd'hui", value: 'daily' },
    { label: 'Cette semaine', value: 'weekly' },
    { label: 'Ce mois', value: 'monthly' },
    { label: 'Ce trimestre', value: 'quarterly' },
    { label: 'Cette année', value: 'annual' },
];

const searchInput = ref('');
const search = refDebounced(searchInput, 400);
const selectedStatus = ref(null);
const period = ref('daily');
const dateFrom = ref(null);
const dateTo = ref(null);
const currentPage = ref(1);
const pageSize = ref(20);

watch([search, selectedStatus, period, dateFrom, dateTo], () => { currentPage.value = 1; });

const filters = computed(() => ({
    search: search.value || undefined,
    status: selectedStatus.value || undefined,
    period: period.value || undefined,
    startDate: dateFrom.value ? new Date(dateFrom.value).toISOString() : undefined,
    endDate: dateTo.value ? new Date(dateTo.value).toISOString() : undefined,
    page: currentPage.value,
    pageSize: pageSize.value,
}));

const { data, isLoading, isFetching } = useMyOrdersQuery(filters);
const { data: stats, isLoading: statsLoading } = useMyStatsQuery(period);

const orders = computed(() => data.value?.data ?? []);
const totalRecords = computed(() => data.value?.total ?? 0);
const orderStats = computed(() => stats.value?.orders ?? { count: 0, totalAmount: 0 });

function onPage(e) { currentPage.value = e.page + 1; pageSize.value = e.rows; }

function formatDate(d) {
    return d ? new Date(d).toLocaleDateString('fr-FR') : '—';
}

function formatAmount(amount) {
    if (!amount && amount !== 0) return '—';
    return Number(amount).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function clearFilters() {
    searchInput.value = '';
    selectedStatus.value = null;
    dateFrom.value = null;
    dateTo.value = null;
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <!-- Header -->
        <div class="flex flex-wrap items-center gap-3">
            <div class="flex items-center gap-3 flex-1">
                <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <i class="pi pi-shopping-cart text-primary text-lg" />
                </div>
                <div>
                    <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Mes commandes</h1>
                    <p class="text-sm text-muted-color">Commandes passées auprès de votre entreprise</p>
                </div>
            </div>
            <!-- Sélecteur de période global -->
            <Select v-model="period" :options="PERIOD_OPTIONS" optionLabel="label" optionValue="value"
                placeholder="Toute période" showClear class="min-w-44" />
        </div>

        <!-- Cartes de statistiques -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="card py-5!">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <i class="pi pi-shopping-cart text-blue-600 dark:text-blue-400 text-xl" />
                    </div>
                    <div class="flex-1">
                        <p class="text-sm text-muted-color mb-1">Montant total commandes</p>
                        <div v-if="statsLoading" class="h-7 w-32 bg-surface-200 dark:bg-surface-700 rounded animate-pulse" />
                        <p v-else class="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {{ formatAmount(orderStats.totalAmount) }}
                            <span class="text-sm font-normal text-muted-color ml-1">FCFA</span>
                        </p>
                    </div>
                </div>
            </div>

            <div class="card py-5!">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <i class="pi pi-list text-primary text-xl" />
                    </div>
                    <div class="flex-1">
                        <p class="text-sm text-muted-color mb-1">Nombre de commandes</p>
                        <div v-if="statsLoading" class="h-7 w-20 bg-surface-200 dark:bg-surface-700 rounded animate-pulse" />
                        <p v-else class="text-2xl font-bold text-surface-900 dark:text-surface-0">
                            {{ orderStats.count.toLocaleString('fr-FR') }}
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Tableau -->
        <div class="card">
            <div class="flex flex-wrap items-center gap-3 mb-5">
                <IconField class="flex-1 min-w-52">
                    <InputIcon class="pi pi-search" />
                    <InputText v-model="searchInput" placeholder="N° commande, adresse…" class="w-full" />
                </IconField>
                <Select v-model="selectedStatus" :options="STATUS_OPTIONS" optionLabel="label" optionValue="value"
                    placeholder="Tous les statuts" showClear class="min-w-44" />
                <DatePicker v-model="dateFrom" placeholder="Du" showButtonBar dateFormat="dd/mm/yy" class="min-w-36" />
                <DatePicker v-model="dateTo" placeholder="Au" showButtonBar dateFormat="dd/mm/yy" class="min-w-36" />
                <Button icon="pi pi-times" severity="secondary" outlined rounded size="small"
                    v-tooltip.top="'Réinitialiser'" @click="clearFilters" />
                <span class="text-sm text-muted-color whitespace-nowrap ml-auto">
                    <i v-if="isFetching && !isLoading" class="pi pi-spin pi-spinner text-xs mr-1" />
                    {{ totalRecords }} commande(s)
                </span>
            </div>

            <DataTable :value="orders" :loading="isLoading" lazy paginator :rows="pageSize"
                :totalRecords="totalRecords" @page="onPage" :rowsPerPageOptions="[10, 20, 50]"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="{first} à {last} sur {totalRecords}" stripedRows scrollable>
                <template #empty>
                    <div class="text-center py-12 text-muted-color">
                        <i class="pi pi-shopping-cart text-4xl mb-3 block opacity-30" />
                        <p class="font-medium">Aucune commande trouvée</p>
                    </div>
                </template>

                <Column header="Date" style="min-width:9rem">
                    <template #body="{ data: row }">
                        <span class="text-sm">{{ formatDate(row.createdAt) }}</span>
                    </template>
                </Column>

                <Column header="N° Commande" style="min-width:10rem">
                    <template #body="{ data: row }">
                        <span class="font-mono text-sm font-semibold">{{ row.orderNumber || '—' }}</span>
                    </template>
                </Column>

                <Column header="Client" style="min-width:12rem">
                    <template #body="{ data: row }">
                        <div v-if="row.user">
                            <div class="font-semibold text-sm">{{ row.user.username }}</div>
                            <div class="text-xs text-muted-color">{{ row.user.email }}</div>
                        </div>
                        <span v-else class="text-muted-color text-sm">—</span>
                    </template>
                </Column>

                <Column header="Produit" style="min-width:11rem">
                    <template #body="{ data: row }">
                        <span v-if="row.product?.name" class="text-sm">{{ row.product.name }}</span>
                        <span v-else class="text-muted-color text-sm">—</span>
                    </template>
                </Column>

                <Column header="Montant" style="min-width:9rem">
                    <template #body="{ data: row }">
                        <span class="text-sm font-semibold">
                            {{ formatAmount(row.totalAmount) }}
                            <span class="text-xs text-muted-color font-normal ml-1">FCFA</span>
                        </span>
                    </template>
                </Column>

                <Column header="Statut" style="min-width:10rem">
                    <template #body="{ data: row }">
                        <Tag :value="STATUS_LABEL[row.status] ?? row.status"
                            :severity="STATUS_SEVERITY[row.status] ?? 'secondary'" />
                    </template>
                </Column>

                <Column header="Adresse" style="min-width:14rem">
                    <template #body="{ data: row }">
                        <span class="text-sm text-muted-color line-clamp-2">{{ row.shippingAddress || '—' }}</span>
                    </template>
                </Column>
            </DataTable>
        </div>
    </div>
</template>
