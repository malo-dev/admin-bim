<script setup>
import { ref, computed, watch } from 'vue';
import { refDebounced } from '@vueuse/core';
import { useAuthStore } from '@/modules/auth/store/auth.store';
import { useMyPaymentsQuery, useMyStatsQuery } from '@/modules/company-portal/queries/company-portal.queries';

const authStore = useAuthStore();

const PERIOD_OPTIONS = [
    { label: "Aujourd'hui", value: 'daily' },
    { label: 'Cette semaine', value: 'weekly' },
    { label: 'Ce mois', value: 'monthly' },
    { label: 'Ce trimestre', value: 'quarterly' },
    { label: 'Cette année', value: 'annual' },
];

const searchInput = ref('');
const search = refDebounced(searchInput, 400);
const period = ref('daily');
const currentPage = ref(1);
const pageSize = ref(20);

watch([search, period], () => { currentPage.value = 1; });

const filters = computed(() => ({
    search: search.value || undefined,
    period: period.value || undefined,
    companyId: authStore.companyId || undefined,
    page: currentPage.value,
    pageSize: pageSize.value,
    paginate: 'true',
}));

const { data, isLoading, isFetching } = useMyPaymentsQuery(filters);
const { data: stats, isLoading: statsLoading } = useMyStatsQuery(period);

const payments = computed(() => data.value?.data ?? []);
const totalRecords = computed(() => data.value?.total ?? 0);
const paymentStats = computed(() => stats.value?.payments ?? { count: 0, totalAmount: 0 });

function onPage(e) { currentPage.value = e.page + 1; pageSize.value = e.rows; }

function formatDate(d) {
    return d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
}

function formatAmount(amount) {
    if (!amount && amount !== 0) return '—';
    return Number(amount).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
</script>

<template>
    <div class="flex flex-col gap-3 sm:gap-4">

        <!-- Header + période -->
        <div class="flex flex-wrap items-start sm:items-center gap-3">
            <div class="flex items-center gap-3 flex-1 min-w-0">
                <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <i class="pi pi-credit-card text-primary text-base sm:text-lg" />
                </div>
                <div class="min-w-0">
                    <h1 class="text-xl sm:text-2xl font-bold text-surface-900 dark:text-surface-0 leading-tight">Paiements reçus</h1>
                    <p class="text-xs sm:text-sm text-muted-color hidden sm:block">Transactions de paiement effectuées auprès de votre entreprise</p>
                </div>
            </div>
            <Select v-model="period" :options="PERIOD_OPTIONS" optionLabel="label" optionValue="value"
                placeholder="Période" showClear class="w-full sm:w-auto sm:min-w-44" />
        </div>

        <!-- Cartes stats -->
        <div class="grid grid-cols-2 gap-3">
            <div class="card py-4! px-4!">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                        <i class="pi pi-wallet text-green-600 dark:text-green-400 text-lg" />
                    </div>
                    <div class="min-w-0">
                        <p class="text-xs text-muted-color mb-0.5 truncate">Montant total</p>
                        <div v-if="statsLoading" class="h-6 w-20 bg-surface-200 dark:bg-surface-700 rounded animate-pulse" />
                        <p v-else class="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400 leading-none">
                            {{ formatAmount(paymentStats.totalAmount) }}
                            <span class="text-xs font-normal text-muted-color">EC</span>
                        </p>
                    </div>
                </div>
            </div>
            <div class="card py-4! px-4!">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <i class="pi pi-arrows-h text-primary text-lg" />
                    </div>
                    <div class="min-w-0">
                        <p class="text-xs text-muted-color mb-0.5">Paiements</p>
                        <div v-if="statsLoading" class="h-6 w-12 bg-surface-200 dark:bg-surface-700 rounded animate-pulse" />
                        <p v-else class="text-lg sm:text-xl font-bold text-surface-900 dark:text-surface-0 leading-none">
                            {{ paymentStats.count.toLocaleString('fr-FR') }}
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Tableau -->
        <div class="card px-3! sm:px-6!">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center mb-4">
                <IconField class="w-full sm:flex-1 sm:min-w-52">
                    <InputIcon class="pi pi-search" />
                    <InputText v-model="searchInput" placeholder="Référence, client…" class="w-full" />
                </IconField>
                <span class="text-xs sm:text-sm text-muted-color sm:ml-auto">
                    <i v-if="isFetching && !isLoading" class="pi pi-spin pi-spinner text-xs mr-1" />
                    {{ totalRecords }} paiement(s)
                </span>
            </div>

            <DataTable :value="payments" :loading="isLoading" lazy paginator :rows="pageSize"
                :totalRecords="totalRecords" @page="onPage" :rowsPerPageOptions="[10, 20, 50]"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
                stripedRows scrollable size="small">
                <template #empty>
                    <div class="text-center py-10 text-muted-color">
                        <i class="pi pi-credit-card text-4xl mb-3 block opacity-30" />
                        <p class="font-medium text-sm">Aucun paiement trouvé</p>
                    </div>
                </template>

                <Column header="Date" style="min-width:9rem">
                    <template #body="{ data: row }">
                        <span class="text-xs whitespace-nowrap">{{ formatDate(row.createdAt) }}</span>
                    </template>
                </Column>

                <Column header="Client" style="min-width:10rem">
                    <template #body="{ data: row }">
                        <div v-if="row.payer">
                            <div class="font-semibold text-xs sm:text-sm">{{ row.payer.username }}</div>
                            <div class="text-xs text-muted-color hidden sm:block">{{ row.payer.email }}</div>
                        </div>
                        <span v-else class="text-muted-color text-xs">—</span>
                    </template>
                </Column>

                <Column header="Produit" style="min-width:9rem">
                    <template #body="{ data: row }">
                        <span class="text-xs sm:text-sm">{{ row.product?.name || '—' }}</span>
                    </template>
                </Column>

                <Column header="Montant" style="min-width:8rem">
                    <template #body="{ data: row }">
                        <span class="font-bold text-xs sm:text-sm text-green-600 dark:text-green-400 whitespace-nowrap">
                            {{ formatAmount(row.amount) }} EC
                        </span>
                    </template>
                </Column>

                <Column header="Réf." style="min-width:9rem">
                    <template #body="{ data: row }">
                        <span class="font-mono text-xs text-muted-color">{{ row.reference ?? '—' }}</span>
                    </template>
                </Column>
            </DataTable>
        </div>
    </div>
</template>
