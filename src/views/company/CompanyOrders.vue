<script setup>
import { ref, computed, watch } from 'vue';
import { refDebounced } from '@vueuse/core';
import { useToast } from 'primevue/usetoast';
import { useMyOrdersQuery, useMyStatsQuery } from '@/modules/company-portal/queries/company-portal.queries';
import { useUpdateOrderStatusMutation } from '@/modules/company-portal/mutations/company-portal.mutations';

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
const PAY_LABEL = {
    pending: 'En attente',
    paid: 'Payé',
    refunded: 'Remboursé',
};
const PAY_SEVERITY = {
    pending: 'warn',
    paid: 'success',
    refunded: 'info',
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

const toast = useToast();
const { data, isLoading, isFetching } = useMyOrdersQuery(filters);
const { data: stats, isLoading: statsLoading } = useMyStatsQuery(period);
const { mutate: updateStatus, isPending: updatingStatus } = useUpdateOrderStatusMutation();

const orders = computed(() => data.value?.data ?? []);
const totalRecords = computed(() => data.value?.total ?? 0);
const orderStats = computed(() => stats.value?.orders ?? { count: 0, totalAmount: 0 });

const NEXT_ACTIONS = {
    pending:    [
        { status: 'confirmed', label: 'Accepter',       severity: 'success', icon: 'pi pi-check' },
        { status: 'cancelled', label: 'Refuser',         severity: 'danger',  icon: 'pi pi-times' },
    ],
    confirmed:  [{ status: 'processing', label: 'En préparation', severity: 'info',    icon: 'pi pi-cog' }],
    processing: [{ status: 'shipped',    label: 'Expédier',       severity: 'info',    icon: 'pi pi-send' }],
    shipped:    [{ status: 'delivered',  label: 'Livré',          severity: 'success', icon: 'pi pi-box' }],
};

function handleStatusChange(row, newStatus) {
    updateStatus({ id: row.orderId, status: newStatus }, {
        onSuccess: () => toast.add({ severity: 'success', summary: 'Statut mis à jour', life: 2500 }),
        onError: () => toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de mettre à jour le statut', life: 3000 }),
    });
}

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
    <div class="flex flex-col gap-3 sm:gap-4">

        <!-- Header + période -->
        <div class="flex flex-wrap items-start sm:items-center gap-3">
            <div class="flex items-center gap-3 flex-1 min-w-0">
                <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <i class="pi pi-shopping-cart text-primary text-base sm:text-lg" />
                </div>
                <div class="min-w-0">
                    <h1 class="text-xl sm:text-2xl font-bold text-surface-900 dark:text-surface-0 leading-tight">Mes commandes</h1>
                    <p class="text-xs sm:text-sm text-muted-color hidden sm:block">Commandes passées auprès de votre entreprise</p>
                </div>
            </div>
            <Select v-model="period" :options="PERIOD_OPTIONS" optionLabel="label" optionValue="value"
                placeholder="Période" showClear class="w-full sm:w-auto sm:min-w-44" />
        </div>

        <!-- Cartes stats -->
        <div class="grid grid-cols-2 gap-3">
            <div class="card py-4! px-4!">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                        <i class="pi pi-shopping-cart text-blue-600 dark:text-blue-400 text-lg" />
                    </div>
                    <div class="min-w-0">
                        <p class="text-xs text-muted-color mb-0.5 truncate">Montant total</p>
                        <div v-if="statsLoading" class="h-6 w-20 bg-surface-200 dark:bg-surface-700 rounded animate-pulse" />
                        <p v-else class="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400 leading-none">
                            {{ formatAmount(orderStats.totalAmount) }}
                            <span class="text-xs font-normal text-muted-color">EC</span>
                        </p>
                    </div>
                </div>
            </div>
            <div class="card py-4! px-4!">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <i class="pi pi-list text-primary text-lg" />
                    </div>
                    <div class="min-w-0">
                        <p class="text-xs text-muted-color mb-0.5">Commandes</p>
                        <div v-if="statsLoading" class="h-6 w-12 bg-surface-200 dark:bg-surface-700 rounded animate-pulse" />
                        <p v-else class="text-lg sm:text-xl font-bold text-surface-900 dark:text-surface-0 leading-none">
                            {{ orderStats.count.toLocaleString('fr-FR') }}
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Tableau -->
        <div class="card px-3! sm:px-6!">
            <!-- Filtres empilés sur mobile -->
            <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center mb-4">
                <IconField class="w-full sm:flex-1 sm:min-w-52">
                    <InputIcon class="pi pi-search" />
                    <InputText v-model="searchInput" placeholder="N° commande, adresse…" class="w-full" />
                </IconField>
                <div class="flex gap-2 flex-wrap">
                    <Select v-model="selectedStatus" :options="STATUS_OPTIONS" optionLabel="label" optionValue="value"
                        placeholder="Statut" showClear class="flex-1 min-w-36 sm:min-w-40" />
                    <DatePicker v-model="dateFrom" placeholder="Du" showButtonBar dateFormat="dd/mm/yy" class="flex-1 min-w-28" />
                    <DatePicker v-model="dateTo" placeholder="Au" showButtonBar dateFormat="dd/mm/yy" class="flex-1 min-w-28" />
                    <Button icon="pi pi-times" severity="secondary" outlined rounded size="small"
                        v-tooltip.top="'Réinitialiser'" @click="clearFilters" />
                </div>
                <span class="text-xs sm:text-sm text-muted-color sm:ml-auto">
                    <i v-if="isFetching && !isLoading" class="pi pi-spin pi-spinner text-xs mr-1" />
                    {{ totalRecords }} commande(s)
                </span>
            </div>

            <DataTable :value="orders" :loading="isLoading" lazy paginator :rows="pageSize"
                :totalRecords="totalRecords" @page="onPage" :rowsPerPageOptions="[10, 20, 50]"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
                currentPageReportTemplate="{first}-{last}/{totalRecords}" stripedRows scrollable
                size="small">
                <template #empty>
                    <div class="text-center py-10 text-muted-color">
                        <i class="pi pi-shopping-cart text-4xl mb-3 block opacity-30" />
                        <p class="font-medium text-sm">Aucune commande trouvée</p>
                    </div>
                </template>

                <Column header="Date" style="min-width:8rem">
                    <template #body="{ data: row }">
                        <span class="text-xs sm:text-sm whitespace-nowrap">{{ formatDate(row.createdAt) }}</span>
                    </template>
                </Column>

                <Column header="N°" style="min-width:8rem">
                    <template #body="{ data: row }">
                        <span class="font-mono text-xs font-semibold">{{ row.orderNumber || '—' }}</span>
                    </template>
                </Column>

                <Column header="Client" style="min-width:12rem">
                    <template #body="{ data: row }">
                        <div v-if="row.user">
                            <div class="font-semibold text-xs sm:text-sm">{{ row.user.username }}</div>
                            <div class="text-xs text-muted-color hidden sm:block">{{ row.user.email }}</div>
                            <a v-if="row.clientPhone"
                               :href="`tel:${row.clientPhone}`"
                               class="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 mt-0.5 hover:underline">
                                <i class="pi pi-phone text-xs" />
                                {{ row.clientPhone }}
                            </a>
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
                        <span class="text-xs sm:text-sm font-semibold whitespace-nowrap">
                            {{ formatAmount(row.totalAmount) }} EC
                        </span>
                    </template>
                </Column>

                <Column header="Statut" style="min-width:8rem">
                    <template #body="{ data: row }">
                        <Tag :value="STATUS_LABEL[row.status] ?? row.status"
                            :severity="STATUS_SEVERITY[row.status] ?? 'secondary'"
                            class="text-xs!" />
                    </template>
                </Column>

                <Column header="Paiement" style="min-width:8rem">
                    <template #body="{ data: row }">
                        <Tag :value="PAY_LABEL[row.paymentStatus] ?? row.paymentStatus ?? 'En attente'"
                            :severity="PAY_SEVERITY[row.paymentStatus] ?? 'warn'"
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
                                :loading="updatingStatus"
                                @click="handleStatusChange(row, action.status)"
                            />
                            <span v-if="!NEXT_ACTIONS[row.status]" class="text-xs text-muted-color italic">—</span>
                        </div>
                    </template>
                </Column>
            </DataTable>
        </div>
    </div>
</template>
