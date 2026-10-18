<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { refDebounced } from '@vueuse/core';
import { useToast } from 'primevue/usetoast';
import {
    useTransactionsQuery,
    useRechargesQuery,
    useRetraitsQuery,
    usePaiementsQuery,
    useAllCompaniesForTsxQuery,
} from '@/modules/transactions/queries/transactions.queries';
import TransactionsService from '@/modules/transactions/services/transactions.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const toast = useToast();
const activeTab = ref(0);

// ── Taux de change CDF (recharges/retraits en francs) ───────────────────────
const cdfCurrencyId = ref(null);
const cdfRate        = ref(null);
const showRateDialog = ref(false);
const rateInput      = ref(null);
const savingRate      = ref(false);

async function loadCdfRate() {
    try {
        const res = await TransactionsService.getCurrencies();
        const cdf = (res?.data ?? []).find((c) => c.code === 'CDF');
        if (cdf) { cdfCurrencyId.value = cdf.currencyId; cdfRate.value = cdf.rate; }
    } catch { /* non bloquant */ }
}

function openRateDialog() {
    rateInput.value = cdfRate.value;
    showRateDialog.value = true;
}

async function saveCdfRate() {
    if (!cdfCurrencyId.value || !rateInput.value || rateInput.value <= 0) return;
    savingRate.value = true;
    try {
        await TransactionsService.updateCurrency(cdfCurrencyId.value, { rate: rateInput.value });
        cdfRate.value = rateInput.value;
        showRateDialog.value = false;
        toast.add({ severity: 'success', summary: 'Taux mis à jour', detail: `1 EC = ${rateInput.value} FC`, life: 3000 });
    } catch (e) {
        toast.add({ severity: 'error', summary: 'Erreur', detail: e?.response?.data?.message || 'Impossible de mettre à jour le taux.', life: 4000 });
    } finally {
        savingRate.value = false;
    }
}

onMounted(loadCdfRate);

// ── Filtres rapides par période (communs aux 4 onglets) ─────────────────────
const QUICK_PERIODS = [
    { label: "Aujourd'hui", value: 'today' },
    { label: 'Hier',        value: 'yesterday' },
    { label: 'Semaine',     value: 'week' },
    { label: 'Mois',        value: 'month' },
];

// `.toISOString()` convertit en UTC avant de découper la date — avec un
// fuseau local en avance sur UTC, minuit local devenait la veille en UTC et
// décalait tous les filtres "un jour" d'une journée. On formate donc la date
// telle qu'affichée localement, sans passer par l'UTC.
function toLocalDateStr(d) {
    if (!d) return undefined;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function quickPeriodRange(period) {
    const today = new Date();
    if (period === 'today') {
        return { from: today, to: today };
    } else if (period === 'yesterday') {
        const y = new Date(today);
        y.setDate(y.getDate() - 1);
        return { from: y, to: y };
    } else if (period === 'week') {
        const start = new Date(today);
        const dow = (start.getDay() + 6) % 7; // lundi = 0
        start.setDate(start.getDate() - dow);
        return { from: start, to: today };
    } else if (period === 'month') {
        return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: today };
    }
    return { from: null, to: null };
}

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
const trxSearchInput   = ref('');
const trxSearch        = refDebounced(trxSearchInput, 400);
const trxType          = ref(null);
const trxStatus        = ref(null);
const trxQuickPeriod   = ref(null);
const trxDateFrom      = ref(null);
const trxDateTo        = ref(null);
const trxPage          = ref(1);
const trxPageSize      = ref(20);
const trxExporting     = ref(false);

function applyTrxQuickPeriod(period) {
    trxQuickPeriod.value = period;
    const { from, to } = quickPeriodRange(period);
    trxDateFrom.value = from;
    trxDateTo.value = to;
}

watch([trxSearch, trxType, trxStatus, trxDateFrom, trxDateTo], () => { trxPage.value = 1; });

const trxFilters = computed(() => ({
    search: trxSearch.value || undefined,
    transactionType: trxType.value || undefined,
    status: trxStatus.value || undefined,
    createdAtFrom: toLocalDateStr(trxDateFrom.value),
    createdAtTo: toLocalDateStr(trxDateTo.value),
    page: trxPage.value,
    pageSize: trxPageSize.value,
}));

const { data: trxData, isLoading: trxLoading, isFetching: trxFetching } = useTransactionsQuery(trxFilters);
const transactions   = computed(() => trxData.value?.data ?? []);
const trxTotal       = computed(() => trxData.value?.total ?? 0);
const trxTotalAmount = computed(() => trxData.value?.totalAmount ?? null);
function onTrxPage(e) { trxPage.value = e.page + 1; trxPageSize.value = e.rows; }

function periodLabelFor(quickPeriod, dateFrom, dateTo) {
    const found = QUICK_PERIODS.find((p) => p.value === quickPeriod)?.label;
    if (found) return found;
    const from = toLocalDateStr(dateFrom);
    const to = toLocalDateStr(dateTo);
    if (from || to) return `${from ?? ''} → ${to ?? ''}`;
    return 'Toutes dates';
}

async function exportTrxPdf() {
    trxExporting.value = true;
    try {
        const periodLabel = periodLabelFor(trxQuickPeriod.value, trxDateFrom.value, trxDateTo.value);
        const res = await TransactionsService.getTransactions({
            search: trxSearch.value || undefined,
            transactionType: trxType.value || undefined,
            status: trxStatus.value || undefined,
            createdAtFrom: toLocalDateStr(trxDateFrom.value),
            createdAtTo: toLocalDateStr(trxDateTo.value),
            paginate: 'true',
            page: 1,
            pageSize: 1000,
        });
        const rows = res?.data ?? [];

        const doc = new jsPDF();
        doc.setFontSize(15);
        doc.text('BIM NEXT — Transactions', 14, 16);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Période : ${periodLabel}`, 14, 23);
        doc.text(`${rows.length} transaction(s) · Montant total : ${fmt(res?.totalAmount)} EC`, 14, 29);

        autoTable(doc, {
            startY: 35,
            head: [['Utilisateur', 'Email', 'Type', 'Statut', 'Montant', 'Description', 'Date']],
            body: rows.map((r) => [
                r.user?.username || '—',
                r.user?.email || '—',
                r.transactionType || '—',
                r.status || '—',
                fmt(r.amount) + ' EC',
                r.description || '—',
                formatDate(r.createdAt),
            ]),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [0, 53, 197] },
        });

        doc.save(`transactions_${toLocalDateStr(new Date())}.pdf`);
    } catch (err) {
        toast.add({ severity: 'error', summary: 'Erreur', detail: "Impossible d'exporter le PDF", life: 4000 });
        console.error(err);
    } finally {
        trxExporting.value = false;
    }
}

// ── Tab 2 : Recharges ─────────────────────────────────────────────────────────
const rechSearchInput  = ref('');
const rechSearch       = refDebounced(rechSearchInput, 400);
const rechStatus       = ref(null);
const rechQuickPeriod  = ref(null);
const rechDateFrom     = ref(null);
const rechDateTo       = ref(null);
const rechPage         = ref(1);
const rechPageSize     = ref(20);
const rechExporting    = ref(false);

function applyRechQuickPeriod(period) {
    rechQuickPeriod.value = period;
    const { from, to } = quickPeriodRange(period);
    rechDateFrom.value = from;
    rechDateTo.value = to;
}

watch([rechSearch, rechStatus, rechDateFrom, rechDateTo], () => { rechPage.value = 1; });

const rechFilters = computed(() => ({
    search: rechSearch.value || undefined,
    status: rechStatus.value || undefined,
    startDate: toLocalDateStr(rechDateFrom.value),
    endDate: toLocalDateStr(rechDateTo.value),
    page: rechPage.value,
    pageSize: rechPageSize.value,
}));

const { data: rechData, isLoading: rechLoading, isFetching: rechFetching } = useRechargesQuery(rechFilters);
const recharges       = computed(() => rechData.value?.data ?? []);
const rechTotal       = computed(() => rechData.value?.total ?? 0);
const rechTotalAmount = computed(() => rechData.value?.totalAmount ?? null);
function onRechPage(e) { rechPage.value = e.page + 1; rechPageSize.value = e.rows; }

async function exportRechPdf() {
    rechExporting.value = true;
    try {
        const periodLabel = periodLabelFor(rechQuickPeriod.value, rechDateFrom.value, rechDateTo.value);
        const res = await TransactionsService.getRecharges({
            search: rechSearch.value || undefined,
            status: rechStatus.value || undefined,
            startDate: toLocalDateStr(rechDateFrom.value),
            endDate: toLocalDateStr(rechDateTo.value),
            page: 1,
            pageSize: 1000,
        });
        const rows = res?.data ?? (Array.isArray(res) ? res : []);

        const doc = new jsPDF();
        doc.setFontSize(15);
        doc.text('BIM NEXT — Recharges', 14, 16);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Période : ${periodLabel}`, 14, 23);
        doc.text(`${rows.length} recharge(s) · Montant total : ${fmt(res?.totalAmount)} EC`, 14, 29);

        autoTable(doc, {
            startY: 35,
            head: [['Utilisateur', 'Email', 'Téléphone', 'Montant', 'Référence', 'Statut', 'Date']],
            body: rows.map((r) => [
                r.user?.username || '—',
                r.user?.email || '—',
                r.telephone || '—',
                fmt(r.amount) + ' EC',
                r.reference || '—',
                RECH_LABEL[r.status] ?? r.status ?? '—',
                formatDate(r.createdAt),
            ]),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [0, 53, 197] },
        });

        doc.save(`recharges_${toLocalDateStr(new Date())}.pdf`);
    } catch (err) {
        toast.add({ severity: 'error', summary: 'Erreur', detail: "Impossible d'exporter le PDF", life: 4000 });
        console.error(err);
    } finally {
        rechExporting.value = false;
    }
}

// ── Tab 3 : Retraits ──────────────────────────────────────────────────────────
const retQuickPeriod = ref(null);
const retDateFrom    = ref(null);
const retDateTo      = ref(null);
const retPage        = ref(1);
const retPageSize    = ref(20);
const retExporting   = ref(false);

function applyRetQuickPeriod(period) {
    retQuickPeriod.value = period;
    const { from, to } = quickPeriodRange(period);
    retDateFrom.value = from;
    retDateTo.value = to;
}

watch([retDateFrom, retDateTo], () => { retPage.value = 1; });

const retFilters = computed(() => ({
    startDate: toLocalDateStr(retDateFrom.value),
    endDate: toLocalDateStr(retDateTo.value),
    page: retPage.value,
    pageSize: retPageSize.value,
}));

const { data: retData, isLoading: retLoading, isFetching: retFetching } = useRetraitsQuery(retFilters);
const retraits       = computed(() => retData.value?.data ?? []);
const retTotal       = computed(() => retData.value?.total ?? 0);
const retTotalAmount = computed(() => retData.value?.totalAmount ?? null);
function onRetPage(e) { retPage.value = e.page + 1; retPageSize.value = e.rows; }

async function exportRetPdf() {
    retExporting.value = true;
    try {
        const periodLabel = periodLabelFor(retQuickPeriod.value, retDateFrom.value, retDateTo.value);
        const res = await TransactionsService.getRetraits({
            startDate: toLocalDateStr(retDateFrom.value),
            endDate: toLocalDateStr(retDateTo.value),
            page: 1,
            pageSize: 1000,
        });
        const rows = res?.data ?? (Array.isArray(res) ? res : []);

        const doc = new jsPDF();
        doc.setFontSize(15);
        doc.text('BIM NEXT — Retraits', 14, 16);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Période : ${periodLabel}`, 14, 23);
        doc.text(`${rows.length} retrait(s) · Montant total : ${fmt(res?.totalAmount)} EC`, 14, 29);

        autoTable(doc, {
            startY: 35,
            head: [['Utilisateur / ID', 'Montant', 'Frais total', 'Frais agent', 'Agent (ID)', 'Date']],
            body: rows.map((r) => [
                r.sender?.username || `ID: ${r.id}`,
                fmt(r.amount) + ' EC',
                fmt(r.fraisTransaction) + ' EC',
                fmt(r.fraisAgent) + ' EC',
                r.targetId ?? '—',
                formatDate(r.createdAt),
            ]),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [0, 53, 197] },
        });

        doc.save(`retraits_${toLocalDateStr(new Date())}.pdf`);
    } catch (err) {
        toast.add({ severity: 'error', summary: 'Erreur', detail: "Impossible d'exporter le PDF", life: 4000 });
        console.error(err);
    } finally {
        retExporting.value = false;
    }
}

// ── Tab 4 : Paiements ─────────────────────────────────────────────────────────
const paiSearchInput  = ref('');
const paiSearch       = refDebounced(paiSearchInput, 400);
const paiCompany      = ref(null);
const paiQuickPeriod  = ref(null);
const paiDateFrom     = ref(null);
const paiDateTo       = ref(null);
const paiPage         = ref(1);
const paiPageSize     = ref(20);
const paiExporting    = ref(false);

function applyPaiQuickPeriod(period) {
    paiQuickPeriod.value = period;
    const { from, to } = quickPeriodRange(period);
    paiDateFrom.value = from;
    paiDateTo.value = to;
}

watch([paiSearch, paiCompany, paiDateFrom, paiDateTo], () => { paiPage.value = 1; });

const paiFilters = computed(() => ({
    search: paiSearch.value || undefined,
    companyId: paiCompany.value || undefined,
    startDate: toLocalDateStr(paiDateFrom.value),
    endDate: toLocalDateStr(paiDateTo.value),
    page: paiPage.value,
    pageSize: paiPageSize.value,
}));

const { data: paiData, isLoading: paiLoading, isFetching: paiFetching } = usePaiementsQuery(paiFilters);
const paiements       = computed(() => paiData.value?.data ?? []);
const paiTotal        = computed(() => paiData.value?.total ?? 0);
const paiTotalAmount  = computed(() => paiData.value?.totalAmount ?? null);
function onPaiPage(e) { paiPage.value = e.page + 1; paiPageSize.value = e.rows; }

async function exportPaiPdf() {
    paiExporting.value = true;
    try {
        const periodLabel = periodLabelFor(paiQuickPeriod.value, paiDateFrom.value, paiDateTo.value);
        const res = await TransactionsService.getPaiements({
            search: paiSearch.value || undefined,
            companyId: paiCompany.value || undefined,
            startDate: toLocalDateStr(paiDateFrom.value),
            endDate: toLocalDateStr(paiDateTo.value),
            page: 1,
            pageSize: 1000,
        });
        const rows = res?.data ?? (Array.isArray(res) ? res : []);

        const doc = new jsPDF();
        doc.setFontSize(15);
        doc.text('BIM NEXT — Paiements', 14, 16);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Période : ${periodLabel}`, 14, 23);
        doc.text(`${rows.length} paiement(s) · Montant total : ${fmt(res?.totalAmount)} EC`, 14, 29);

        autoTable(doc, {
            startY: 35,
            head: [['Payeur', 'Email', 'Entreprise', 'Produit', 'Montant', 'Description', 'Date']],
            body: rows.map((r) => [
                r.payer?.username || '—',
                r.payer?.email || '—',
                r.company?.name || '—',
                r.product?.name || '—',
                fmt(r.amount) + ' EC',
                r.description || '—',
                formatDate(r.createdAt),
            ]),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [0, 53, 197] },
        });

        doc.save(`paiements_${toLocalDateStr(new Date())}.pdf`);
    } catch (err) {
        toast.add({ severity: 'error', summary: 'Erreur', detail: "Impossible d'exporter le PDF", life: 4000 });
        console.error(err);
    } finally {
        paiExporting.value = false;
    }
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <!-- Header -->
        <div class="flex items-center gap-3 flex-wrap">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <i class="pi pi-arrows-h text-primary text-lg" />
            </div>
            <div class="flex-1 min-w-48">
                <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Transactions</h1>
                <p class="text-sm text-muted-color">Transactions, recharges, retraits et paiements</p>
            </div>

            <!-- Taux de change CDF, utilisé pour les recharges/retraits payés en francs -->
            <button
                type="button"
                class="flex items-center gap-2 rounded-xl border border-surface-200 dark:border-surface-700 px-3 py-2 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                @click="openRateDialog"
            >
                <i class="pi pi-sync text-primary text-sm" />
                <span class="text-sm">
                    <span class="text-muted-color">Taux CDF : </span>
                    <span class="font-semibold">1 EC = {{ cdfRate ?? '…' }} FC</span>
                </span>
                <i class="pi pi-pencil text-xs text-muted-color" />
            </button>
        </div>

        <Dialog v-model:visible="showRateDialog" header="Taux de change CDF" modal style="width: 26rem">
            <p class="text-sm text-muted-color mb-4">
                Nombre de Francs Congolais (FC) équivalents à 1 EC (= 1 USD). Utilisé pour convertir les
                recharges et retraits lorsque l'utilisateur choisit de payer/retirer en francs.
            </p>
            <label class="text-sm font-medium block mb-2">1 EC =</label>
            <div class="flex items-center gap-2">
                <InputNumber v-model="rateInput" class="flex-1" :min="1" :maxFractionDigits="2" />
                <span class="text-muted-color">FC</span>
            </div>
            <template #footer>
                <Button label="Annuler" severity="secondary" text @click="showRateDialog = false" />
                <Button label="Enregistrer" :loading="savingRate" @click="saveCdfRate" />
            </template>
        </Dialog>

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
                        <span class="text-sm text-muted-color whitespace-nowrap ml-auto">
                            <i v-if="trxFetching && !trxLoading" class="pi pi-spin pi-spinner text-xs mr-1" />
                            {{ trxTotal }} résultat(s)
                            <template v-if="trxTotalAmount != null"> · {{ fmt(trxTotalAmount) }} EC</template>
                        </span>
                    </div>

                    <div class="flex flex-wrap items-center gap-2 mb-5">
                        <Button
                            v-for="opt in QUICK_PERIODS"
                            :key="opt.value"
                            :label="opt.label"
                            size="small"
                            :severity="trxQuickPeriod === opt.value ? 'primary' : 'secondary'"
                            :outlined="trxQuickPeriod !== opt.value"
                            @click="applyTrxQuickPeriod(opt.value)"
                        />
                        <DatePicker
                            v-model="trxDateFrom"
                            placeholder="Du"
                            dateFormat="dd/mm/yy"
                            showButtonBar
                            style="min-width:8rem"
                            @update:modelValue="trxQuickPeriod = null"
                        />
                        <DatePicker
                            v-model="trxDateTo"
                            placeholder="Au"
                            dateFormat="dd/mm/yy"
                            showButtonBar
                            style="min-width:8rem"
                            @update:modelValue="trxQuickPeriod = null"
                        />
                        <Button
                            label="Exporter en PDF"
                            icon="pi pi-file-pdf"
                            severity="secondary"
                            outlined
                            size="small"
                            class="ml-auto"
                            :loading="trxExporting"
                            @click="exportTrxPdf"
                        />
                    </div>

                    <!-- Chargement -->
                    <div v-if="trxLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Skeleton v-for="n in 6" :key="n" height="11rem" borderRadius="1rem" />
                    </div>

                    <!-- Vide -->
                    <div v-else-if="transactions.length === 0" class="text-center py-10 text-muted-color">
                        <i class="pi pi-arrows-h text-4xl mb-3 block opacity-30" />
                        <p>Aucune transaction trouvée</p>
                    </div>

                    <!-- Cards -->
                    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div
                            v-for="row in transactions"
                            :key="row.id"
                            class="card mb-0! p-4! flex flex-col gap-3"
                        >
                            <div class="flex items-center gap-3">
                                <div class="flex-1 min-w-0">
                                    <div v-if="row.user" class="min-w-0">
                                        <div class="font-semibold text-sm truncate">{{ row.user.username }}</div>
                                        <div class="text-xs text-muted-color truncate">{{ row.user.email }}</div>
                                    </div>
                                    <span v-else class="text-muted-color text-sm">—</span>
                                </div>
                                <Tag :value="row.status" :severity="TRX_SEVERITY[row.status] ?? 'secondary'" />
                            </div>

                            <div class="flex items-center justify-between gap-2">
                                <Tag :value="row.transactionType" :severity="TRX_TYPE_SEV[row.transactionType] ?? 'secondary'" />
                                <span class="font-semibold">{{ fmt(row.amount) }} EC</span>
                            </div>

                            <p class="text-sm text-muted-color line-clamp-2">{{ row.description || '—' }}</p>

                            <div class="text-xs text-muted-color pt-2 border-t border-surface-100 dark:border-surface-800">
                                {{ formatDate(row.createdAt) }}
                            </div>
                        </div>
                    </div>

                    <Paginator
                        v-if="trxTotal > 0"
                        class="mt-4"
                        :rows="trxPageSize"
                        :totalRecords="trxTotal"
                        :rowsPerPageOptions="[10, 20, 50]"
                        template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                        currentPageReportTemplate="{first} à {last} sur {totalRecords}"
                        @page="onTrxPage"
                    />
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
                        <span class="text-sm text-muted-color whitespace-nowrap ml-auto">
                            <i v-if="rechFetching && !rechLoading" class="pi pi-spin pi-spinner text-xs mr-1" />
                            {{ rechTotal }} recharge(s)
                            <template v-if="rechTotalAmount != null"> · {{ fmt(rechTotalAmount) }} EC</template>
                        </span>
                    </div>

                    <div class="flex flex-wrap items-center gap-2 mb-5">
                        <Button
                            v-for="opt in QUICK_PERIODS"
                            :key="opt.value"
                            :label="opt.label"
                            size="small"
                            :severity="rechQuickPeriod === opt.value ? 'primary' : 'secondary'"
                            :outlined="rechQuickPeriod !== opt.value"
                            @click="applyRechQuickPeriod(opt.value)"
                        />
                        <DatePicker
                            v-model="rechDateFrom"
                            placeholder="Du"
                            dateFormat="dd/mm/yy"
                            showButtonBar
                            style="min-width:8rem"
                            @update:modelValue="rechQuickPeriod = null"
                        />
                        <DatePicker
                            v-model="rechDateTo"
                            placeholder="Au"
                            dateFormat="dd/mm/yy"
                            showButtonBar
                            style="min-width:8rem"
                            @update:modelValue="rechQuickPeriod = null"
                        />
                        <Button
                            label="Exporter en PDF"
                            icon="pi pi-file-pdf"
                            severity="secondary"
                            outlined
                            size="small"
                            class="ml-auto"
                            :loading="rechExporting"
                            @click="exportRechPdf"
                        />
                    </div>

                    <!-- Chargement -->
                    <div v-if="rechLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Skeleton v-for="n in 6" :key="n" height="11rem" borderRadius="1rem" />
                    </div>

                    <!-- Vide -->
                    <div v-else-if="recharges.length === 0" class="text-center py-10 text-muted-color">
                        <i class="pi pi-plus-circle text-4xl mb-3 block opacity-30" />
                        <p>Aucune recharge trouvée</p>
                    </div>

                    <!-- Cards -->
                    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div
                            v-for="row in recharges"
                            :key="row.id"
                            class="card mb-0! p-4! flex flex-col gap-3"
                        >
                            <div class="flex items-center gap-3">
                                <div class="flex-1 min-w-0">
                                    <div v-if="row.user" class="min-w-0">
                                        <div class="font-semibold text-sm truncate">{{ row.user.username }}</div>
                                        <div class="text-xs text-muted-color truncate">{{ row.user.email }}</div>
                                    </div>
                                    <span v-else class="text-muted-color text-sm">—</span>
                                </div>
                                <Tag :value="RECH_LABEL[row.status] ?? row.status"
                                    :severity="RECH_SEVERITY[row.status] ?? 'secondary'" />
                            </div>

                            <div class="flex items-center justify-between gap-2">
                                <span class="text-sm text-muted-color">{{ row.telephone || '—' }}</span>
                                <span class="font-semibold">{{ fmt(row.amount) }} EC</span>
                            </div>

                            <div v-if="row.currency === 'CDF'" class="flex items-center justify-between gap-2">
                                <span class="text-xs text-muted-color">Payé en</span>
                                <span class="text-sm font-semibold text-primary">{{ fmt(row.convertedAmount) }} FC</span>
                            </div>

                            <div class="flex items-center justify-between gap-2">
                                <span class="font-mono text-xs text-muted-color truncate">{{ row.reference }}</span>
                            </div>

                            <div class="text-xs text-muted-color pt-2 border-t border-surface-100 dark:border-surface-800">
                                {{ formatDate(row.createdAt) }}
                            </div>
                        </div>
                    </div>

                    <Paginator
                        v-if="rechTotal > 0"
                        class="mt-4"
                        :rows="rechPageSize"
                        :totalRecords="rechTotal"
                        :rowsPerPageOptions="[10, 20, 50]"
                        template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                        currentPageReportTemplate="{first} à {last} sur {totalRecords}"
                        @page="onRechPage"
                    />
                </div>
            </TabPanel>

            <!-- ══ TAB 3 : RETRAITS ══════════════════════════════════════════ -->
            <TabPanel :value="2">
                <div class="card mt-4">
                    <div class="flex flex-wrap items-center gap-3 mb-5">
                        <span class="text-sm text-muted-color whitespace-nowrap ml-auto">
                            <i v-if="retFetching && !retLoading" class="pi pi-spin pi-spinner text-xs mr-1" />
                            {{ retTotal }} retrait(s)
                            <template v-if="retTotalAmount != null"> · {{ fmt(retTotalAmount) }} EC</template>
                        </span>
                    </div>

                    <div class="flex flex-wrap items-center gap-2 mb-5">
                        <Button
                            v-for="opt in QUICK_PERIODS"
                            :key="opt.value"
                            :label="opt.label"
                            size="small"
                            :severity="retQuickPeriod === opt.value ? 'primary' : 'secondary'"
                            :outlined="retQuickPeriod !== opt.value"
                            @click="applyRetQuickPeriod(opt.value)"
                        />
                        <DatePicker
                            v-model="retDateFrom"
                            placeholder="Du"
                            dateFormat="dd/mm/yy"
                            showButtonBar
                            style="min-width:8rem"
                            @update:modelValue="retQuickPeriod = null"
                        />
                        <DatePicker
                            v-model="retDateTo"
                            placeholder="Au"
                            dateFormat="dd/mm/yy"
                            showButtonBar
                            style="min-width:8rem"
                            @update:modelValue="retQuickPeriod = null"
                        />
                        <Button
                            label="Exporter en PDF"
                            icon="pi pi-file-pdf"
                            severity="secondary"
                            outlined
                            size="small"
                            class="ml-auto"
                            :loading="retExporting"
                            @click="exportRetPdf"
                        />
                    </div>

                    <!-- Chargement -->
                    <div v-if="retLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Skeleton v-for="n in 6" :key="n" height="11rem" borderRadius="1rem" />
                    </div>

                    <!-- Vide -->
                    <div v-else-if="retraits.length === 0" class="text-center py-10 text-muted-color">
                        <i class="pi pi-minus-circle text-4xl mb-3 block opacity-30" />
                        <p>Aucun retrait trouvé</p>
                    </div>

                    <!-- Cards -->
                    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div
                            v-for="row in retraits"
                            :key="row.id"
                            class="card mb-0! p-4! flex flex-col gap-3"
                        >
                            <div class="flex items-center gap-3">
                                <div class="flex-1 min-w-0">
                                    <div v-if="row.sender" class="min-w-0">
                                        <div class="font-semibold text-sm truncate">{{ row.sender.username }}</div>
                                        <div class="text-xs text-muted-color truncate">{{ row.sender.email }}</div>
                                    </div>
                                    <span v-else class="text-muted-color text-sm">ID: {{ row.id }}</span>
                                </div>
                                <span class="font-semibold">{{ fmt(row.amount) }} EC</span>
                            </div>

                            <div v-if="row.currency === 'CDF'" class="flex items-center justify-between gap-2">
                                <span class="text-xs text-muted-color">À remettre en cash</span>
                                <span class="text-sm font-semibold text-primary">{{ fmt(row.convertedAmount) }} FC</span>
                            </div>
                            <div class="flex items-center justify-between gap-2">
                                <span class="text-xs text-muted-color">Frais total</span>
                                <span class="text-sm text-muted-color">{{ fmt(row.fraisTransaction) }} EC</span>
                            </div>
                            <div class="flex items-center justify-between gap-2">
                                <span class="text-xs text-muted-color">Frais agent</span>
                                <span class="text-sm text-muted-color">{{ fmt(row.fraisAgent) }} EC</span>
                            </div>
                            <div class="flex items-center justify-between gap-2">
                                <span class="text-xs text-muted-color">Agent (ID)</span>
                                <span class="text-sm font-mono">{{ row.targetId }}</span>
                            </div>

                            <div class="text-xs text-muted-color pt-2 border-t border-surface-100 dark:border-surface-800">
                                {{ formatDate(row.createdAt) }}
                            </div>
                        </div>
                    </div>

                    <Paginator
                        v-if="retTotal > 0"
                        class="mt-4"
                        :rows="retPageSize"
                        :totalRecords="retTotal"
                        :rowsPerPageOptions="[10, 20, 50]"
                        template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                        currentPageReportTemplate="{first} à {last} sur {totalRecords}"
                        @page="onRetPage"
                    />
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
                        <span class="text-sm text-muted-color whitespace-nowrap ml-auto">
                            <i v-if="paiFetching && !paiLoading" class="pi pi-spin pi-spinner text-xs mr-1" />
                            {{ paiTotal }} paiement(s)
                            <template v-if="paiTotalAmount != null"> · {{ fmt(paiTotalAmount) }} EC</template>
                        </span>
                    </div>

                    <div class="flex flex-wrap items-center gap-2 mb-5">
                        <Button
                            v-for="opt in QUICK_PERIODS"
                            :key="opt.value"
                            :label="opt.label"
                            size="small"
                            :severity="paiQuickPeriod === opt.value ? 'primary' : 'secondary'"
                            :outlined="paiQuickPeriod !== opt.value"
                            @click="applyPaiQuickPeriod(opt.value)"
                        />
                        <DatePicker
                            v-model="paiDateFrom"
                            placeholder="Du"
                            dateFormat="dd/mm/yy"
                            showButtonBar
                            style="min-width:8rem"
                            @update:modelValue="paiQuickPeriod = null"
                        />
                        <DatePicker
                            v-model="paiDateTo"
                            placeholder="Au"
                            dateFormat="dd/mm/yy"
                            showButtonBar
                            style="min-width:8rem"
                            @update:modelValue="paiQuickPeriod = null"
                        />
                        <Button
                            label="Exporter en PDF"
                            icon="pi pi-file-pdf"
                            severity="secondary"
                            outlined
                            size="small"
                            class="ml-auto"
                            :loading="paiExporting"
                            @click="exportPaiPdf"
                        />
                    </div>

                    <!-- Chargement -->
                    <div v-if="paiLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Skeleton v-for="n in 6" :key="n" height="11rem" borderRadius="1rem" />
                    </div>

                    <!-- Vide -->
                    <div v-else-if="paiements.length === 0" class="text-center py-10 text-muted-color">
                        <i class="pi pi-shopping-cart text-4xl mb-3 block opacity-30" />
                        <p>Aucun paiement trouvé</p>
                    </div>

                    <!-- Cards -->
                    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div
                            v-for="row in paiements"
                            :key="row.id"
                            class="card mb-0! p-4! flex flex-col gap-3"
                        >
                            <div class="flex items-center gap-3">
                                <div class="flex-1 min-w-0">
                                    <div v-if="row.payer" class="min-w-0">
                                        <div class="font-semibold text-sm truncate">{{ row.payer.username }}</div>
                                        <div class="text-xs text-muted-color truncate">{{ row.payer.email }}</div>
                                    </div>
                                    <span v-else class="text-muted-color text-sm">—</span>
                                </div>
                                <span class="font-semibold">{{ fmt(row.amount) }} EC</span>
                            </div>

                            <div class="flex items-center justify-between gap-2">
                                <Tag v-if="row.company?.name" :value="row.company.name" severity="secondary" />
                                <span v-else class="text-muted-color text-sm">—</span>
                                <span v-if="row.product?.name" class="text-sm">{{ row.product.name }}</span>
                                <span v-else class="text-muted-color text-sm">—</span>
                            </div>

                            <p class="text-sm text-muted-color line-clamp-2">{{ row.description || '—' }}</p>

                            <div class="text-xs text-muted-color pt-2 border-t border-surface-100 dark:border-surface-800">
                                {{ formatDate(row.createdAt) }}
                            </div>
                        </div>
                    </div>

                    <Paginator
                        v-if="paiTotal > 0"
                        class="mt-4"
                        :rows="paiPageSize"
                        :totalRecords="paiTotal"
                        :rowsPerPageOptions="[10, 20, 50]"
                        template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                        currentPageReportTemplate="{first} à {last} sur {totalRecords}"
                        @page="onPaiPage"
                    />
                </div>
            </TabPanel>
        </Tabs>
    </div>
</template>
