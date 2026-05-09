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
    return d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
}

function formatAmount(amount) {
    if (!amount && amount !== 0) return '—';
    return Number(amount).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <!-- Header -->
        <div class="flex flex-wrap items-center gap-3">
            <div class="flex items-center gap-3 flex-1">
                <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <i class="pi pi-credit-card text-primary text-lg" />
                </div>
                <div>
                    <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Paiements reçus</h1>
                    <p class="text-sm text-muted-color">Transactions de paiement effectuées auprès de votre entreprise</p>
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
                    <div class="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <i class="pi pi-wallet text-green-600 dark:text-green-400 text-xl" />
                    </div>
                    <div class="flex-1">
                        <p class="text-sm text-muted-color mb-1">Montant total reçu</p>
                        <div v-if="statsLoading" class="h-7 w-32 bg-surface-200 dark:bg-surface-700 rounded animate-pulse" />
                        <p v-else class="text-2xl font-bold text-green-600 dark:text-green-400">
                            {{ formatAmount(paymentStats.totalAmount) }}
                            <span class="text-sm font-normal text-muted-color ml-1">FCFA</span>
                        </p>
                    </div>
                </div>
            </div>

            <div class="card py-5!">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <i class="pi pi-arrows-h text-primary text-xl" />
                    </div>
                    <div class="flex-1">
                        <p class="text-sm text-muted-color mb-1">Nombre de paiements</p>
                        <div v-if="statsLoading" class="h-7 w-20 bg-surface-200 dark:bg-surface-700 rounded animate-pulse" />
                        <p v-else class="text-2xl font-bold text-surface-900 dark:text-surface-0">
                            {{ paymentStats.count.toLocaleString('fr-FR') }}
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
                    <InputText v-model="searchInput" placeholder="Référence, client…" class="w-full" />
                </IconField>
                <span class="text-sm text-muted-color whitespace-nowrap ml-auto">
                    <i v-if="isFetching && !isLoading" class="pi pi-spin pi-spinner text-xs mr-1" />
                    {{ totalRecords }} paiement(s)
                </span>
            </div>

            <DataTable :value="payments" :loading="isLoading" lazy paginator :rows="pageSize"
                :totalRecords="totalRecords" @page="onPage" :rowsPerPageOptions="[10, 20, 50]"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="{first} à {last} sur {totalRecords}" stripedRows scrollable>
                <template #empty>
                    <div class="text-center py-12 text-muted-color">
                        <i class="pi pi-credit-card text-4xl mb-3 block opacity-30" />
                        <p class="font-medium">Aucun paiement trouvé</p>
                    </div>
                </template>

                <Column header="Date" style="min-width:12rem">
                    <template #body="{ data: row }">
                        <span class="text-sm">{{ formatDate(row.createdAt) }}</span>
                    </template>
                </Column>

                <Column header="Client" style="min-width:13rem">
                    <template #body="{ data: row }">
                        <div v-if="row.payer">
                            <div class="font-semibold text-sm">{{ row.payer.username }}</div>
                            <div class="text-xs text-muted-color">{{ row.payer.email }}</div>
                        </div>
                        <span v-else class="text-muted-color text-sm">—</span>
                    </template>
                </Column>

                <Column header="Produit" style="min-width:12rem">
                    <template #body="{ data: row }">
                        <span v-if="row.product?.name" class="text-sm">{{ row.product.name }}</span>
                        <span v-else class="text-muted-color text-sm">—</span>
                    </template>
                </Column>

                <Column header="Montant" style="min-width:10rem">
                    <template #body="{ data: row }">
                        <span class="font-bold text-sm text-green-600 dark:text-green-400">
                            {{ formatAmount(row.amount) }} FCFA
                        </span>
                    </template>
                </Column>

                <Column header="Référence" style="min-width:12rem">
                    <template #body="{ data: row }">
                        <span class="font-mono text-xs text-muted-color">{{ row.reference ?? '—' }}</span>
                    </template>
                </Column>
            </DataTable>
        </div>
    </div>
</template>
