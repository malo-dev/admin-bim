<script setup>
import { ref, computed, watch } from 'vue';
import { refDebounced } from '@vueuse/core';
import { useOtpsQuery } from '@/modules/users/queries/users.queries';

const searchInput = ref('');
const search = refDebounced(searchInput, 400);
const selectedStatus = ref(null);
const selectedPeriod = ref(null);
const currentPage = ref(1);
const pageSize = ref(20);

watch([search, selectedStatus, selectedPeriod], () => { currentPage.value = 1; });

const STATUS_OPTIONS = [
    { label: 'Actif', value: 'active' },
    { label: 'Utilisé', value: 'used' },
    { label: 'Expiré', value: 'expired' },
];

const PERIOD_OPTIONS = [
    { label: "Aujourd'hui", value: 'daily' },
    { label: 'Cette semaine', value: 'weekly' },
    { label: 'Ce mois', value: 'monthly' },
];

const STATUS_SEVERITY = { active: 'success', used: 'secondary', expired: 'danger' };
const STATUS_LABEL    = { active: 'Actif', used: 'Utilisé', expired: 'Expiré' };

const filters = computed(() => ({
    search: search.value || undefined,
    status: selectedStatus.value || undefined,
    period: selectedPeriod.value || undefined,
    page: currentPage.value,
    pageSize: pageSize.value,
}));

const { data, isLoading, isFetching } = useOtpsQuery(filters);

const otps = computed(() => {
    const raw = data.value;
    if (!raw) return [];
    return Array.isArray(raw) ? raw : (raw?.data ?? []);
});

const totalRecords = computed(() => {
    const raw = data.value;
    if (!raw) return 0;
    return raw?.pagination?.total ?? raw?.total ?? otps.value.length;
});

const hasActiveFilters = computed(() => !!(searchInput.value || selectedStatus.value || selectedPeriod.value));

function clearFilters() {
    searchInput.value = '';
    selectedStatus.value = null;
    selectedPeriod.value = null;
    currentPage.value = 1;
}

function onPage(event) {
    currentPage.value = event.page + 1;
    pageSize.value = event.rows;
}

function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

function isExpired(otp) {
    if (otp.status === 'expired') return true;
    if (otp.expiresAt) return new Date(otp.expiresAt) < new Date();
    return false;
}

function getOtpStatus(otp) {
    if (otp.status) return otp.status;
    if (otp.isUsed) return 'used';
    if (isExpired(otp)) return 'expired';
    return 'active';
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <!-- Header -->
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <i class="pi pi-shield text-primary text-lg" />
            </div>
            <div>
                <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">OTP envoyés</h1>
                <p class="text-sm text-muted-color">Historique des codes OTP générés sur la plateforme</p>
            </div>
        </div>

        <div class="card">
            <!-- Filters -->
            <div class="flex flex-wrap items-center gap-3 mb-5">
                <IconField class="flex-1 min-w-52">
                    <InputIcon class="pi pi-search" />
                    <InputText v-model="searchInput" placeholder="Email, téléphone, utilisateur…" class="w-full" />
                </IconField>

                <Select
                    v-model="selectedStatus"
                    :options="STATUS_OPTIONS"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Tous les statuts"
                    showClear
                    style="min-width:11rem"
                />

                <Select
                    v-model="selectedPeriod"
                    :options="PERIOD_OPTIONS"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Toute période"
                    showClear
                    style="min-width:11rem"
                />

                <Button
                    v-if="hasActiveFilters"
                    icon="pi pi-filter-slash"
                    severity="secondary"
                    outlined
                    label="Effacer"
                    @click="clearFilters"
                />

                <span class="text-sm text-muted-color ml-auto whitespace-nowrap">
                    <i v-if="isFetching && !isLoading" class="pi pi-spin pi-spinner text-xs mr-1" />
                    {{ totalRecords }} OTP(s)
                </span>
            </div>

            <DataTable
                :value="otps"
                :loading="isLoading"
                lazy
                paginator
                :rows="pageSize"
                :totalRecords="totalRecords"
                @page="onPage"
                :rowsPerPageOptions="[10, 20, 50]"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="{first} à {last} sur {totalRecords}"
                stripedRows
                scrollable
            >
                <template #empty>
                    <div class="text-center py-12 text-muted-color">
                        <i class="pi pi-shield text-4xl mb-3 block opacity-30" />
                        <p class="font-medium">Aucun OTP trouvé</p>
                        <p v-if="hasActiveFilters" class="text-sm mt-1">Essayez de modifier les filtres</p>
                    </div>
                </template>

                <!-- Utilisateur -->
                <Column header="Utilisateur" style="min-width:14rem">
                    <template #body="{ data: row }">
                        <div v-if="row.user">
                            <div class="font-semibold text-sm">{{ row.user.username ?? row.user.email }}</div>
                            <div class="text-xs text-muted-color">{{ row.user.email }}</div>
                        </div>
                        <div v-else-if="row.email">
                            <div class="text-sm">{{ row.email }}</div>
                        </div>
                        <span v-else class="text-muted-color text-sm">—</span>
                    </template>
                </Column>

                <!-- Code OTP -->
                <Column header="Code OTP" style="min-width:9rem">
                    <template #body="{ data: row }">
                        <code
                            class="text-base font-mono font-bold px-2 py-1 rounded tracking-widest"
                            style="background: var(--p-surface-100); color: var(--p-primary-color)"
                        >
                            {{ row.otp ?? row.code ?? '••••••' }}
                        </code>
                    </template>
                </Column>

                <!-- Statut -->
                <Column header="Statut" style="min-width:8rem">
                    <template #body="{ data: row }">
                        <Tag
                            :value="STATUS_LABEL[getOtpStatus(row)] ?? getOtpStatus(row)"
                            :severity="STATUS_SEVERITY[getOtpStatus(row)] ?? 'secondary'"
                        />
                    </template>
                </Column>

                <!-- Type -->
                <Column header="Type" style="min-width:9rem">
                    <template #body="{ data: row }">
                        <span class="text-sm text-muted-color capitalize">{{ row.type ?? row.purpose ?? '—' }}</span>
                    </template>
                </Column>

                <!-- Créé le -->
                <Column header="Créé le" style="min-width:10rem">
                    <template #body="{ data: row }">{{ formatDate(row.createdAt) }}</template>
                </Column>

                <!-- Expire le -->
                <Column header="Expire le" style="min-width:10rem">
                    <template #body="{ data: row }">
                        <span :class="isExpired(row) ? 'text-red-500 text-sm' : 'text-sm'">
                            {{ formatDate(row.expiresAt) }}
                        </span>
                    </template>
                </Column>

                <!-- Utilisé le -->
                <Column header="Utilisé le" style="min-width:10rem">
                    <template #body="{ data: row }">{{ formatDate(row.usedAt) }}</template>
                </Column>
            </DataTable>
        </div>
    </div>
</template>
