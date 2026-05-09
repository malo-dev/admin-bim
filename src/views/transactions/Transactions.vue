<script setup>
import { ref, computed, watch } from 'vue';
import { refDebounced } from '@vueuse/core';
import {
    useTransactionsQuery,
    useRechargesQuery,
    useRetraitsQuery,
    usePaiementsQuery,
    useAllCompaniesForTsxQuery,
} from '@/modules/transactions/queries/transactions.queries';

const activeTab = ref(0);

const PERIOD_OPTIONS = [
    { label: "Aujourd'hui", value: 'daily' },
    { label: 'Cette semaine', value: 'weekly' },
    { label: 'Ce mois', value: 'monthly' },
    { label: 'Ce trimestre', value: 'quarterly' },
    { label: 'Ce semestre', value: 'semiannual' },
    { label: 'Cette année', value: 'annual' },
];

const TRX_TYPE_OPTIONS = [
    { label: 'Retrait', value: 'retrait' },
    { label: 'Recharge', value: 'recharge' },
    { label: 'Transfert', value: 'transfert' },
    { label: 'Paiement', value: 'paiement' },
];

const TRX_STATUS_OPTIONS = [
    { label: 'Réussi', value: 'réussi' },
    { label: 'Échoué', value: 'échoué' },
    { label: 'En attente', value: 'en attente' },
    { label: 'Annulé', value: 'annuler' },
];

const RECHARGE_STATUS_OPTIONS = [
    { label: 'Succès', value: 'success' },
    { label: 'Échoué', value: 'failed' },
    { label: 'En attente', value: 'pending' },
];

const TRX_SEVERITY    = { 'réussi': 'success', 'échoué': 'danger', 'en attente': 'warn', 'annuler': 'secondary' };
const TRX_TYPE_SEV    = { retrait: 'warn', recharge: 'info', transfert: 'secondary', paiement: 'success' };
const RECH_SEVERITY   = { success: 'success', failed: 'danger', pending: 'warn' };
const RECH_LABEL      = { success: 'Succès', failed: 'Échoué', pending: 'En attente' };

const { data: companyOptions } = useAllCompaniesForTsxQuery();

function formatDate(d) {
    return d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
}
function fmt(amount) {
    return amount != null ? Number(amount).toLocaleString('fr-FR') : '—';
}

// ── Tab 1 : Transactions générales ────────────────────────────────────────────
const trxSearchInput = ref('');
const trxSearch      = refDebounced(trxSearchInput, 400);
const trxType        = ref(null);
const trxStatus      = ref(null);
const trxPeriod      = ref(null);
const trxPage        = ref(1);
const trxPageSize    = ref(20);

watch([trxSearch, trxType, trxStatus, trxPeriod], () => { trxPage.value = 1; });

const trxFilters = computed(() => ({
    search: trxSearch.value || undefined,
    transactionType: trxType.value || undefined,
    status: trxStatus.value || undefined,
    period: trxPeriod.value || undefined,
    page: trxPage.value,
    pageSize: trxPageSize.value,
}));

const { data: trxData, isLoading: trxLoading, isFetching: trxFetching } = useTransactionsQuery(trxFilters);
const transactions = computed(() => trxData.value?.data ?? []);
const trxTotal     = computed(() => trxData.value?.total ?? 0);
function onTrxPage(e) { trxPage.value = e.page + 1; trxPageSize.value = e.rows; }

// ── Tab 2 : Recharges ─────────────────────────────────────────────────────────
const rechSearchInput = ref('');
const rechSearch      = refDebounced(rechSearchInput, 400);
const rechStatus      = ref(null);
const rechPeriod      = ref(null);
const rechPage        = ref(1);
const rechPageSize    = ref(20);

watch([rechSearch, rechStatus, rechPeriod], () => { rechPage.value = 1; });

const rechFilters = computed(() => ({
    search: rechSearch.value || undefined,
    status: rechStatus.value || undefined,
    period: rechPeriod.value || undefined,
    page: rechPage.value,
    pageSize: rechPageSize.value,
}));

const { data: rechData, isLoading: rechLoading, isFetching: rechFetching } = useRechargesQuery(rechFilters);
const recharges = computed(() => rechData.value?.data ?? []);
const rechTotal = computed(() => rechData.value?.total ?? 0);
function onRechPage(e) { rechPage.value = e.page + 1; rechPageSize.value = e.rows; }

// ── Tab 3 : Retraits ──────────────────────────────────────────────────────────
const retPeriod   = ref(null);
const retPage     = ref(1);
const retPageSize = ref(20);

watch([retPeriod], () => { retPage.value = 1; });

const retFilters = computed(() => ({
    period: retPeriod.value || undefined,
    page: retPage.value,
    pageSize: retPageSize.value,
}));

const { data: retData, isLoading: retLoading, isFetching: retFetching } = useRetraitsQuery(retFilters);
const retraits = computed(() => retData.value?.data ?? []);
const retTotal = computed(() => retData.value?.total ?? 0);
function onRetPage(e) { retPage.value = e.page + 1; retPageSize.value = e.rows; }

// ── Tab 4 : Paiements ─────────────────────────────────────────────────────────
const paiSearchInput = ref('');
const paiSearch      = refDebounced(paiSearchInput, 400);
const paiCompany     = ref(null);
const paiPeriod      = ref(null);
const paiPage        = ref(1);
const paiPageSize    = ref(20);

watch([paiSearch, paiCompany, paiPeriod], () => { paiPage.value = 1; });

const paiFilters = computed(() => ({
    search: paiSearch.value || undefined,
    companyId: paiCompany.value || undefined,
    period: paiPeriod.value || undefined,
    page: paiPage.value,
    pageSize: paiPageSize.value,
}));

const { data: paiData, isLoading: paiLoading, isFetching: paiFetching } = usePaiementsQuery(paiFilters);
const paiements = computed(() => paiData.value?.data ?? []);
const paiTotal  = computed(() => paiData.value?.total ?? 0);
function onPaiPage(e) { paiPage.value = e.page + 1; paiPageSize.value = e.rows; }
</script>

<template>
    <div class="flex flex-col gap-4">
        <!-- Header -->
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <i class="pi pi-arrows-h text-primary text-lg" />
            </div>
            <div>
                <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Transactions</h1>
                <p class="text-sm text-muted-color">Transactions, recharges, retraits et paiements</p>
            </div>
        </div>

        <Tabs v-model:value="activeTab">
            <TabList>
                <Tab :value="0">
                    <i class="pi pi-arrows-h mr-2" />Transactions
                    <Badge v-if="trxTotal" :value="trxTotal" class="ml-2" severity="secondary" />
                </Tab>
                <Tab :value="1">
                    <i class="pi pi-plus-circle mr-2" />Recharges
                    <Badge v-if="rechTotal" :value="rechTotal" class="ml-2" severity="info" />
                </Tab>
                <Tab :value="2">
                    <i class="pi pi-minus-circle mr-2" />Retraits
                    <Badge v-if="retTotal" :value="retTotal" class="ml-2" severity="warn" />
                </Tab>
                <Tab :value="3">
                    <i class="pi pi-shopping-cart mr-2" />Paiements
                    <Badge v-if="paiTotal" :value="paiTotal" class="ml-2" severity="success" />
                </Tab>
            </TabList>

            <!-- ══ TAB 1 : TRANSACTIONS ══════════════════════════════════════ -->
            <TabPanel :value="0">
                <div class="card mt-4">
                    <div class="flex flex-wrap items-center gap-3 mb-5">
                        <IconField class="flex-1 min-w-48">
                            <InputIcon class="pi pi-search" />
                            <InputText v-model="trxSearchInput" placeholder="Rechercher…" class="w-full" />
                        </IconField>
                        <Select v-model="trxType" :options="TRX_TYPE_OPTIONS" optionLabel="label" optionValue="value"
                            placeholder="Tous les types" showClear class="min-w-40" />
                        <Select v-model="trxStatus" :options="TRX_STATUS_OPTIONS" optionLabel="label" optionValue="value"
                            placeholder="Tous les statuts" showClear class="min-w-40" />
                        <Select v-model="trxPeriod" :options="PERIOD_OPTIONS" optionLabel="label" optionValue="value"
                            placeholder="Toute période" showClear class="min-w-40" />
                        <span class="text-sm text-muted-color whitespace-nowrap ml-auto">
                            <i v-if="trxFetching && !trxLoading" class="pi pi-spin pi-spinner text-xs mr-1" />
                            {{ trxTotal }} résultat(s)
                        </span>
                    </div>

                    <DataTable :value="transactions" :loading="trxLoading" lazy paginator :rows="trxPageSize"
                        :totalRecords="trxTotal" @page="onTrxPage" :rowsPerPageOptions="[10, 20, 50]"
                        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                        currentPageReportTemplate="{first} à {last} sur {totalRecords}" stripedRows scrollable>
                        <template #empty>
                            <div class="text-center py-10 text-muted-color">
                                <i class="pi pi-arrows-h text-4xl mb-3 block opacity-30" />
                                <p>Aucune transaction trouvée</p>
                            </div>
                        </template>
                        <Column header="Date" style="min-width:10rem">
                            <template #body="{ data: row }">{{ formatDate(row.createdAt) }}</template>
                        </Column>
                        <Column header="Utilisateur" style="min-width:12rem">
                            <template #body="{ data: row }">
                                <div v-if="row.user">
                                    <div class="font-semibold text-sm">{{ row.user.username }}</div>
                                    <div class="text-xs text-muted-color">{{ row.user.email }}</div>
                                </div>
                                <span v-else class="text-muted-color text-sm">—</span>
                            </template>
                        </Column>
                        <Column header="Type" style="min-width:9rem">
                            <template #body="{ data: row }">
                                <Tag :value="row.transactionType" :severity="TRX_TYPE_SEV[row.transactionType] ?? 'secondary'" />
                            </template>
                        </Column>
                        <Column header="Montant" style="min-width:9rem">
                            <template #body="{ data: row }">
                                <span class="font-semibold">{{ fmt(row.amount) }} EC</span>
                            </template>
                        </Column>
                        <Column header="Statut" style="min-width:9rem">
                            <template #body="{ data: row }">
                                <Tag :value="row.status" :severity="TRX_SEVERITY[row.status] ?? 'secondary'" />
                            </template>
                        </Column>
                        <Column header="Description" style="min-width:14rem">
                            <template #body="{ data: row }">
                                <span class="text-sm text-muted-color line-clamp-1">{{ row.description || '—' }}</span>
                            </template>
                        </Column>
                    </DataTable>
                </div>
            </TabPanel>

            <!-- ══ TAB 2 : RECHARGES ═════════════════════════════════════════ -->
            <TabPanel :value="1">
                <div class="card mt-4">
                    <div class="flex flex-wrap items-center gap-3 mb-5">
                        <IconField class="flex-1 min-w-48">
                            <InputIcon class="pi pi-search" />
                            <InputText v-model="rechSearchInput" placeholder="Téléphone, référence…" class="w-full" />
                        </IconField>
                        <Select v-model="rechStatus" :options="RECHARGE_STATUS_OPTIONS" optionLabel="label" optionValue="value"
                            placeholder="Tous les statuts" showClear class="min-w-40" />
                        <Select v-model="rechPeriod" :options="PERIOD_OPTIONS" optionLabel="label" optionValue="value"
                            placeholder="Toute période" showClear class="min-w-40" />
                        <span class="text-sm text-muted-color whitespace-nowrap ml-auto">
                            <i v-if="rechFetching && !rechLoading" class="pi pi-spin pi-spinner text-xs mr-1" />
                            {{ rechTotal }} recharge(s)
                        </span>
                    </div>

                    <DataTable :value="recharges" :loading="rechLoading" lazy paginator :rows="rechPageSize"
                        :totalRecords="rechTotal" @page="onRechPage" :rowsPerPageOptions="[10, 20, 50]"
                        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                        currentPageReportTemplate="{first} à {last} sur {totalRecords}" stripedRows scrollable>
                        <template #empty>
                            <div class="text-center py-10 text-muted-color">
                                <i class="pi pi-plus-circle text-4xl mb-3 block opacity-30" />
                                <p>Aucune recharge trouvée</p>
                            </div>
                        </template>
                        <Column header="Date" style="min-width:10rem">
                            <template #body="{ data: row }">{{ formatDate(row.createdAt) }}</template>
                        </Column>
                        <Column header="Utilisateur" style="min-width:12rem">
                            <template #body="{ data: row }">
                                <div v-if="row.user">
                                    <div class="font-semibold text-sm">{{ row.user.username }}</div>
                                    <div class="text-xs text-muted-color">{{ row.user.email }}</div>
                                </div>
                                <span v-else class="text-muted-color text-sm">—</span>
                            </template>
                        </Column>
                        <Column header="Montant" style="min-width:9rem">
                            <template #body="{ data: row }">
                                <span class="font-semibold">{{ fmt(row.amount) }} EC</span>
                            </template>
                        </Column>
                        <Column header="Téléphone" style="min-width:10rem">
                            <template #body="{ data: row }">{{ row.telephone || '—' }}</template>
                        </Column>
                        <Column header="Référence" style="min-width:13rem">
                            <template #body="{ data: row }">
                                <span class="font-mono text-xs">{{ row.reference }}</span>
                            </template>
                        </Column>
                        <Column header="Statut" style="min-width:9rem">
                            <template #body="{ data: row }">
                                <Tag :value="RECH_LABEL[row.status] ?? row.status"
                                    :severity="RECH_SEVERITY[row.status] ?? 'secondary'" />
                            </template>
                        </Column>
                    </DataTable>
                </div>
            </TabPanel>

            <!-- ══ TAB 3 : RETRAITS ══════════════════════════════════════════ -->
            <TabPanel :value="2">
                <div class="card mt-4">
                    <div class="flex flex-wrap items-center gap-3 mb-5">
                        <Select v-model="retPeriod" :options="PERIOD_OPTIONS" optionLabel="label" optionValue="value"
                            placeholder="Toute période" showClear class="min-w-44" />
                        <span class="text-sm text-muted-color whitespace-nowrap ml-auto">
                            <i v-if="retFetching && !retLoading" class="pi pi-spin pi-spinner text-xs mr-1" />
                            {{ retTotal }} retrait(s)
                        </span>
                    </div>

                    <DataTable :value="retraits" :loading="retLoading" lazy paginator :rows="retPageSize"
                        :totalRecords="retTotal" @page="onRetPage" :rowsPerPageOptions="[10, 20, 50]"
                        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                        currentPageReportTemplate="{first} à {last} sur {totalRecords}" stripedRows scrollable>
                        <template #empty>
                            <div class="text-center py-10 text-muted-color">
                                <i class="pi pi-minus-circle text-4xl mb-3 block opacity-30" />
                                <p>Aucun retrait trouvé</p>
                            </div>
                        </template>
                        <Column header="Date" style="min-width:10rem">
                            <template #body="{ data: row }">{{ formatDate(row.createdAt) }}</template>
                        </Column>
                        <Column header="Utilisateur" style="min-width:12rem">
                            <template #body="{ data: row }">
                                <div v-if="row.sender">
                                    <div class="font-semibold text-sm">{{ row.sender.username }}</div>
                                    <div class="text-xs text-muted-color">{{ row.sender.email }}</div>
                                </div>
                                <span v-else class="text-muted-color text-sm">ID: {{ row.id }}</span>
                            </template>
                        </Column>
                        <Column header="Montant" style="min-width:9rem">
                            <template #body="{ data: row }">
                                <span class="font-semibold">{{ fmt(row.amount) }} EC</span>
                            </template>
                        </Column>
                        <Column header="Frais total" style="min-width:8rem">
                            <template #body="{ data: row }">
                                <span class="text-sm text-muted-color">{{ fmt(row.fraisTransaction) }} EC</span>
                            </template>
                        </Column>
                        <Column header="Frais agent" style="min-width:8rem">
                            <template #body="{ data: row }">
                                <span class="text-sm text-muted-color">{{ fmt(row.fraisAgent) }} EC</span>
                            </template>
                        </Column>
                        <Column header="Agent (ID)" style="min-width:8rem">
                            <template #body="{ data: row }">
                                <span class="text-sm font-mono">{{ row.targetId }}</span>
                            </template>
                        </Column>
                    </DataTable>
                </div>
            </TabPanel>

            <!-- ══ TAB 4 : PAIEMENTS ═════════════════════════════════════════ -->
            <TabPanel :value="3">
                <div class="card mt-4">
                    <div class="flex flex-wrap items-center gap-3 mb-5">
                        <IconField class="flex-1 min-w-48">
                            <InputIcon class="pi pi-search" />
                            <InputText v-model="paiSearchInput" placeholder="Description…" class="w-full" />
                        </IconField>
                        <Select v-model="paiCompany" :options="companyOptions ?? []" optionLabel="label" optionValue="value"
                            placeholder="Toutes les entreprises" showClear class="min-w-48" filter />
                        <Select v-model="paiPeriod" :options="PERIOD_OPTIONS" optionLabel="label" optionValue="value"
                            placeholder="Toute période" showClear class="min-w-40" />
                        <span class="text-sm text-muted-color whitespace-nowrap ml-auto">
                            <i v-if="paiFetching && !paiLoading" class="pi pi-spin pi-spinner text-xs mr-1" />
                            {{ paiTotal }} paiement(s)
                        </span>
                    </div>

                    <DataTable :value="paiements" :loading="paiLoading" lazy paginator :rows="paiPageSize"
                        :totalRecords="paiTotal" @page="onPaiPage" :rowsPerPageOptions="[10, 20, 50]"
                        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                        currentPageReportTemplate="{first} à {last} sur {totalRecords}" stripedRows scrollable>
                        <template #empty>
                            <div class="text-center py-10 text-muted-color">
                                <i class="pi pi-shopping-cart text-4xl mb-3 block opacity-30" />
                                <p>Aucun paiement trouvé</p>
                            </div>
                        </template>
                        <Column header="Date" style="min-width:10rem">
                            <template #body="{ data: row }">{{ formatDate(row.createdAt) }}</template>
                        </Column>
                        <Column header="Payeur" style="min-width:12rem">
                            <template #body="{ data: row }">
                                <div v-if="row.payer">
                                    <div class="font-semibold text-sm">{{ row.payer.username }}</div>
                                    <div class="text-xs text-muted-color">{{ row.payer.email }}</div>
                                </div>
                                <span v-else class="text-muted-color text-sm">—</span>
                            </template>
                        </Column>
                        <Column header="Entreprise" style="min-width:11rem">
                            <template #body="{ data: row }">
                                <Tag v-if="row.company?.name" :value="row.company.name" severity="secondary" />
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
                                <span class="font-semibold">{{ fmt(row.amount) }} EC</span>
                            </template>
                        </Column>
                        <Column header="Description" style="min-width:14rem">
                            <template #body="{ data: row }">
                                <span class="text-sm text-muted-color line-clamp-1">{{ row.description || '—' }}</span>
                            </template>
                        </Column>
                    </DataTable>
                </div>
            </TabPanel>
        </Tabs>
    </div>
</template>
