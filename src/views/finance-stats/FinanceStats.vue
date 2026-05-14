<script setup>
import { ref, computed, watch } from 'vue';
import {
    useRechargesQuery,
    useRetraitsQuery,
    usePaiementsQuery,
} from '@/modules/transactions/queries/transactions.queries';

// ── Période ────────────────────────────────────────────────────────────────────
const PERIOD_OPTIONS = [
    { label: "Aujourd'hui",   value: 'daily' },
    { label: 'Cette semaine', value: 'weekly' },
    { label: 'Ce mois',       value: 'monthly' },
    { label: 'Ce trimestre',  value: 'quarterly' },
    { label: 'Ce semestre',   value: 'semiannual' },
    { label: '6 mois',        value: 'semiannual' },
    { label: 'Cette année',   value: 'annual' },
    { label: 'Personnalisé',  value: 'custom' },
];

// Déduplication (semestre = 6 mois → on n'affiche qu'une seule entrée dans l'UI)
const PERIOD_BUTTONS = [
    { label: "Aujourd'hui",   value: 'daily' },
    { label: 'Cette semaine', value: 'weekly' },
    { label: 'Ce mois',       value: 'monthly' },
    { label: 'Trimestre',     value: 'quarterly' },
    { label: 'Semestre',      value: 'semiannual' },
    { label: 'Cette année',   value: 'annual' },
    { label: 'Personnalisé',  value: 'custom' },
];

const selectedPeriod = ref('monthly');
const customFrom = ref(null);
const customTo = ref(null);

const isCustom = computed(() => selectedPeriod.value === 'custom');

// Params communs envoyés aux APIs
const apiParams = computed(() => {
    if (isCustom.value) {
        return {
            createdAtFrom: customFrom.value ? customFrom.value.toISOString().split('T')[0] : undefined,
            createdAtTo:   customTo.value   ? customTo.value.toISOString().split('T')[0]   : undefined,
        };
    }
    return { period: selectedPeriod.value };
});

// On réinitialise pagination à 1 pour les résumés (on veut tous les enregistrements pour le total)
const summaryParams = computed(() => ({ ...apiParams.value, paginate: 'false' }));

// ── Requêtes avec pageSize maximal pour calculer les totaux ───────────────────
const rechFilters = computed(() => ({ ...summaryParams.value }));
const retFilters  = computed(() => ({ ...summaryParams.value }));
const paiFilters  = computed(() => ({ ...summaryParams.value }));

const { data: rechData, isLoading: rechLoading, refetch: rechRefetch }  = useRechargesQuery(rechFilters);
const { data: retData,  isLoading: retLoading,  refetch: retRefetch  }  = useRetraitsQuery(retFilters);
const { data: paiData,  isLoading: paiLoading,  refetch: paiRefetch  }  = usePaiementsQuery(paiFilters);

const isLoading = computed(() => rechLoading.value || retLoading.value || paiLoading.value);

function refetchAll() {
    rechRefetch();
    retRefetch();
    paiRefetch();
}

// ── Calcul des montants totaux ────────────────────────────────────────────────
function sumAmount(items) {
    if (!Array.isArray(items)) return 0;
    return items.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
}

const rechItems  = computed(() => {
    const d = rechData.value;
    return Array.isArray(d) ? d : (d?.data ?? []);
});
const retItems   = computed(() => {
    const d = retData.value;
    return Array.isArray(d) ? d : (d?.data ?? []);
});
const paiItems   = computed(() => {
    const d = paiData.value;
    return Array.isArray(d) ? d : (d?.data ?? []);
});

// Totaux depuis le meta serveur (si dispo) ou calculés localement
const totalRecharges = computed(() => rechData.value?.totalAmount ?? sumAmount(rechItems.value));
const totalRetraits  = computed(() => retData.value?.totalAmount  ?? sumAmount(retItems.value));
const totalPaiements = computed(() => paiData.value?.totalAmount  ?? sumAmount(paiItems.value));

const countRecharges = computed(() => rechData.value?.total ?? rechData.value?.pagination?.total ?? rechItems.value.length);
const countRetraits  = computed(() => retData.value?.total  ?? retData.value?.pagination?.total  ?? retItems.value.length);
const countPaiements = computed(() => paiData.value?.total  ?? paiData.value?.pagination?.total  ?? paiItems.value.length);

// Solde net = recharges - retraits - paiements
const soldeNet = computed(() => totalRecharges.value - totalRetraits.value - totalPaiements.value);

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(val) {
    if (val === undefined || val === null) return '—';
    return Number(val).toLocaleString('fr-FR');
}

const periodLabel = computed(() => {
    const found = PERIOD_BUTTONS.find((p) => p.value === selectedPeriod.value);
    return found?.label ?? selectedPeriod.value;
});
</script>

<template>
    <div class="flex flex-col gap-6">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <i class="pi pi-chart-bar text-primary text-lg" />
                </div>
                <div>
                    <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Statistiques financières</h1>
                    <p class="text-sm text-muted-color">Solde global et montants filtrés par période</p>
                </div>
            </div>

            <Button
                icon="pi pi-refresh"
                severity="secondary"
                text
                rounded
                :loading="isLoading"
                @click="refetchAll"
                v-tooltip="'Actualiser'"
            />
        </div>

        <!-- Filtres période -->
        <div class="card p-4">
            <div class="flex flex-wrap items-center gap-2">
                <Button
                    v-for="opt in PERIOD_BUTTONS"
                    :key="opt.value + opt.label"
                    :label="opt.label"
                    :severity="selectedPeriod === opt.value && !(isCustom && opt.value !== 'custom') ? 'primary' : 'secondary'"
                    :outlined="!(selectedPeriod === opt.value)"
                    size="small"
                    @click="selectedPeriod = opt.value"
                />
            </div>

            <!-- Custom date range -->
            <div v-if="isCustom" class="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-surface-200 dark:border-surface-700">
                <DatePicker
                    v-model="customFrom"
                    placeholder="Date de début"
                    dateFormat="dd/mm/yy"
                    showButtonBar
                    style="min-width:10rem"
                />
                <span class="text-muted-color text-sm">→</span>
                <DatePicker
                    v-model="customTo"
                    placeholder="Date de fin"
                    dateFormat="dd/mm/yy"
                    showButtonBar
                    style="min-width:10rem"
                />
                <Button
                    label="Appliquer"
                    icon="pi pi-search"
                    size="small"
                    severity="primary"
                    @click="refetchAll"
                />
            </div>
        </div>

        <!-- KPI Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

            <!-- Solde Net -->
            <div class="card p-5 col-span-1 sm:col-span-2 xl:col-span-1 flex items-start gap-4 border-2"
                :class="soldeNet >= 0 ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'">
                <div class="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                    :class="soldeNet >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'">
                    <i class="pi pi-wallet text-xl"
                        :class="soldeNet >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'" />
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm text-muted-color">Solde net</p>
                    <p class="text-3xl font-bold leading-tight"
                        :class="soldeNet >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                        <span v-if="isLoading" class="text-surface-300">…</span>
                        <span v-else>{{ fmt(soldeNet) }} EC</span>
                    </p>
                    <p class="text-xs text-muted-color mt-1">{{ periodLabel }}</p>
                </div>
            </div>

            <!-- Total Recharges -->
            <div class="card p-5 flex items-start gap-4">
                <div class="shrink-0 w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <i class="pi pi-plus-circle text-blue-600 dark:text-blue-400 text-xl" />
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm text-muted-color">Total recharges</p>
                    <p class="text-3xl font-bold text-surface-900 dark:text-surface-0 leading-tight">
                        <span v-if="rechLoading" class="text-surface-300">…</span>
                        <span v-else>{{ fmt(totalRecharges) }} EC</span>
                    </p>
                    <p class="text-xs text-muted-color mt-1">
                        {{ countRecharges }} opération(s) · {{ periodLabel }}
                    </p>
                </div>
            </div>

            <!-- Total Retraits -->
            <div class="card p-5 flex items-start gap-4">
                <div class="shrink-0 w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <i class="pi pi-minus-circle text-orange-600 dark:text-orange-400 text-xl" />
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm text-muted-color">Total retraits</p>
                    <p class="text-3xl font-bold text-surface-900 dark:text-surface-0 leading-tight">
                        <span v-if="retLoading" class="text-surface-300">…</span>
                        <span v-else>{{ fmt(totalRetraits) }} EC</span>
                    </p>
                    <p class="text-xs text-muted-color mt-1">
                        {{ countRetraits }} opération(s) · {{ periodLabel }}
                    </p>
                </div>
            </div>

            <!-- Total Paiements -->
            <div class="card p-5 flex items-start gap-4">
                <div class="shrink-0 w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                    <i class="pi pi-shopping-cart text-violet-600 dark:text-violet-400 text-xl" />
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm text-muted-color">Total paiements</p>
                    <p class="text-3xl font-bold text-surface-900 dark:text-surface-0 leading-tight">
                        <span v-if="paiLoading" class="text-surface-300">…</span>
                        <span v-else>{{ fmt(totalPaiements) }} EC</span>
                    </p>
                    <p class="text-xs text-muted-color mt-1">
                        {{ countPaiements }} opération(s) · {{ periodLabel }}
                    </p>
                </div>
            </div>
        </div>

        <!-- Tableau récapitulatif -->
        <div class="card">
            <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-0 mb-4">
                Récapitulatif — {{ periodLabel }}
            </h2>

            <DataTable
                :value="[
                    { type: 'Recharges',  icon: 'pi pi-plus-circle',   color: 'text-blue-600',   amount: totalRecharges,  count: countRecharges,  severity: 'info' },
                    { type: 'Retraits',   icon: 'pi pi-minus-circle',  color: 'text-orange-600', amount: totalRetraits,   count: countRetraits,   severity: 'warn' },
                    { type: 'Paiements',  icon: 'pi pi-shopping-cart', color: 'text-violet-600', amount: totalPaiements,  count: countPaiements,  severity: 'secondary' },
                ]"
                :loading="isLoading"
                stripedRows
            >
                <Column header="Type">
                    <template #body="{ data: row }">
                        <div class="flex items-center gap-2">
                            <i :class="[row.icon, row.color, 'text-lg']" />
                            <span class="font-semibold">{{ row.type }}</span>
                        </div>
                    </template>
                </Column>
                <Column header="Nombre d'opérations">
                    <template #body="{ data: row }">
                        <Badge :value="row.count" :severity="row.severity" />
                    </template>
                </Column>
                <Column header="Montant total">
                    <template #body="{ data: row }">
                        <span class="font-bold text-lg">{{ fmt(row.amount) }} EC</span>
                    </template>
                </Column>
                <Column header="% du flux">
                    <template #body="{ data: row }">
                        <div class="flex items-center gap-2">
                            <ProgressBar
                                :value="totalRecharges + totalRetraits + totalPaiements > 0
                                    ? Math.round((row.amount / (totalRecharges + totalRetraits + totalPaiements)) * 100)
                                    : 0"
                                style="height: 6px; min-width: 80px"
                                :showValue="false"
                            />
                            <span class="text-sm text-muted-color">
                                {{
                                    totalRecharges + totalRetraits + totalPaiements > 0
                                        ? Math.round((row.amount / (totalRecharges + totalRetraits + totalPaiements)) * 100)
                                        : 0
                                }}%
                            </span>
                        </div>
                    </template>
                </Column>
            </DataTable>

            <!-- Ligne total net -->
            <div class="flex items-center justify-between px-4 py-3 mt-3 rounded-xl"
                :class="soldeNet >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'">
                <span class="font-semibold text-surface-900 dark:text-surface-0">Solde net (recharges − retraits − paiements)</span>
                <span class="text-2xl font-bold"
                    :class="soldeNet >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                    {{ soldeNet >= 0 ? '+' : '' }}{{ fmt(soldeNet) }} EC
                </span>
            </div>
        </div>
    </div>
</template>
