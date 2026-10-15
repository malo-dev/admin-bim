<script setup>
import { ref, computed } from 'vue';
import { refDebounced } from '@vueuse/core';
import { useUsersQuery, useUsersBalanceStatsQuery } from '@/modules/users/queries/users.queries';

// ── Liste des utilisateurs, triée par solde ─────────────────────────────────
const searchInput = ref('');
const search = refDebounced(searchInput, 400);

const filters = computed(() => ({
    search: search.value || undefined,
    page: 1,
    pageSize: 1000,
}));

const { data, isLoading } = useUsersQuery(filters);

const users = computed(() => {
    const rows = data.value?.data ?? [];
    return [...rows].sort((a, b) => Number(b.soldNumber ?? 0) - Number(a.soldNumber ?? 0));
});

function fmtBig(val) {
    if (val === undefined || val === null) return '—';
    return Number(val).toLocaleString('fr-FR');
}
function fmtEC(val) {
    if (val === undefined || val === null) return '—';
    return Number(val).toLocaleString('fr-FR') + ' EC';
}

// ── Solde total (cards du haut) — déplacé depuis Users.vue ──────────────────
const BALANCE_PERIODS = [
    { label: "Aujourd'hui", value: 'daily' },
    { label: 'Semaine',     value: 'weekly' },
    { label: 'Ce mois',     value: 'monthly' },
    { label: 'Cette année', value: 'annual' },
    { label: 'Personnalisé', value: 'custom' },
];

const selectedBalancePeriod = ref('daily');
const balanceCustomFrom = ref(null);
const balanceCustomTo = ref(null);

const isBalanceCustom = computed(() => selectedBalancePeriod.value === 'custom');
const balancePeriodParam = computed(() => (isBalanceCustom.value ? '' : selectedBalancePeriod.value));

const {
    data: balanceStats,
    isLoading: balanceLoading,
    isError: balanceError,
    refetch: balanceRefetch,
} = useUsersBalanceStatsQuery(balancePeriodParam);

const totalBalance     = computed(() => balanceStats.value?.totalBalance ?? null);
const totalUsers       = computed(() => balanceStats.value?.totalUsers   ?? users.value.length);
const activeUsersCount = computed(() => balanceStats.value?.activeUsers  ?? null);
const newUsersCount    = computed(() => balanceStats.value?.newUsers     ?? null);

const balancePeriodLabel = computed(() => {
    const found = BALANCE_PERIODS.find((p) => p.value === selectedBalancePeriod.value);
    return found?.label ?? '';
});
</script>

<template>
    <div class="flex flex-col gap-4">
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <i class="pi pi-wallet text-primary text-lg" />
            </div>
            <div>
                <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Portefeuilles</h1>
                <p class="text-sm text-muted-color">Solde de chaque utilisateur et total cumulé</p>
            </div>
        </div>

        <!-- ── Cards Solde Total ──────────────────────────────────────────────── -->
        <div class="card p-4">
            <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
                <span class="text-sm font-semibold text-surface-700 dark:text-surface-200">
                    <i class="pi pi-wallet mr-2 text-primary" />Solde total des utilisateurs
                </span>
                <div class="flex flex-wrap gap-2 items-center">
                    <Button
                        v-for="opt in BALANCE_PERIODS"
                        :key="opt.value"
                        :label="opt.label"
                        size="small"
                        :severity="selectedBalancePeriod === opt.value ? 'primary' : 'secondary'"
                        :outlined="selectedBalancePeriod !== opt.value"
                        @click="selectedBalancePeriod = opt.value"
                    />
                    <Button icon="pi pi-refresh" size="small" severity="secondary" text rounded :loading="balanceLoading" @click="balanceRefetch" />
                </div>
            </div>

            <div v-if="isBalanceCustom" class="flex flex-wrap items-center gap-3 mb-4 pb-4 border-b border-surface-200 dark:border-surface-700">
                <DatePicker v-model="balanceCustomFrom" placeholder="Depuis" dateFormat="dd/mm/yy" showButtonBar style="min-width:9rem" />
                <span class="text-muted-color">→</span>
                <DatePicker v-model="balanceCustomTo" placeholder="Jusqu'au" dateFormat="dd/mm/yy" showButtonBar style="min-width:9rem" />
                <Button label="Appliquer" icon="pi pi-search" size="small" @click="balanceRefetch" />
            </div>

            <div v-if="balanceError" class="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 mb-2">
                <i class="pi pi-exclamation-triangle text-red-500 text-xl" />
                <p class="text-sm text-red-600 dark:text-red-400">Impossible de charger les statistiques pour le moment.</p>
            </div>

            <div v-else class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="flex items-start gap-3 p-4 rounded-xl bg-primary/5">
                    <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <i class="pi pi-wallet text-primary" />
                    </div>
                    <div class="min-w-0">
                        <p class="text-xs text-muted-color">Solde total — tous utilisateurs</p>
                        <p class="text-2xl font-bold text-primary">
                            <span v-if="balanceLoading" class="text-surface-300 text-base">Chargement…</span>
                            <span v-else-if="totalBalance != null">{{ fmtBig(totalBalance) }} EC</span>
                            <span v-else class="text-surface-400 text-base">— EC</span>
                        </p>
                        <p class="text-xs text-muted-color mt-0.5">{{ totalUsers }} comptes · solde cumulé</p>
                    </div>
                </div>

                <div class="flex items-start gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-900/20">
                    <div class="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0">
                        <i class="pi pi-users text-green-600 dark:text-green-400" />
                    </div>
                    <div class="min-w-0">
                        <p class="text-xs text-muted-color">Utilisateurs actifs</p>
                        <p class="text-2xl font-bold text-green-600 dark:text-green-400">
                            <span v-if="balanceLoading" class="text-surface-300 text-base">Chargement…</span>
                            <span v-else>{{ fmtBig(activeUsersCount) }}</span>
                        </p>
                        <p class="text-xs text-muted-color mt-0.5">Total enregistrés</p>
                    </div>
                </div>

                <div class="flex items-start gap-3 p-4 rounded-xl bg-violet-50 dark:bg-violet-900/20">
                    <div class="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
                        <i class="pi pi-user-plus text-violet-600 dark:text-violet-400" />
                    </div>
                    <div class="min-w-0">
                        <p class="text-xs text-muted-color">Nouveaux inscrits</p>
                        <p class="text-2xl font-bold text-violet-600 dark:text-violet-400">
                            <span v-if="balanceLoading" class="text-surface-300 text-base">Chargement…</span>
                            <span v-else>{{ fmtBig(newUsersCount) }}</span>
                        </p>
                        <p class="text-xs text-muted-color mt-0.5">{{ balancePeriodLabel }}</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- ── Liste triée par solde ──────────────────────────────────────────── -->
        <div class="card">
            <div class="flex items-center justify-between mb-4">
                <IconField class="flex-1 max-w-sm">
                    <InputIcon class="pi pi-search" />
                    <InputText v-model="searchInput" placeholder="Rechercher un utilisateur…" class="w-full" />
                </IconField>
            </div>

            <DataTable :value="users" :loading="isLoading" paginator :rows="20" stripedRows class="text-sm">
                <Column header="Utilisateur" style="min-width:12rem">
                    <template #body="{ data: row }">
                        <div>
                            <div class="font-semibold text-sm">{{ row.username }}</div>
                            <div class="text-xs text-muted-color">{{ row.email }}</div>
                        </div>
                    </template>
                </Column>
                <Column header="Solde" style="min-width:8rem">
                    <template #body="{ data: row }">
                        <span class="font-semibold text-sm" :class="Number(row.soldNumber) > 0 ? 'text-green-600 dark:text-green-400' : 'text-muted-color'">
                            {{ fmtEC(row.soldNumber) }}
                        </span>
                    </template>
                </Column>
                <Column header="Statut" style="min-width:8rem">
                    <template #body="{ data: row }">
                        <Tag :value="row.isActive ? 'Actif' : 'Inactif'" :severity="row.isActive ? 'success' : 'secondary'" />
                    </template>
                </Column>
            </DataTable>
        </div>
    </div>
</template>
