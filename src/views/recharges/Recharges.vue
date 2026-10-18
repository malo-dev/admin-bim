<script setup>
import { ref, computed, watch } from 'vue';
import { refDebounced } from '@vueuse/core';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { useRechargesQuery } from '@/modules/transactions/queries/transactions.queries';
import TransactionsService from '@/modules/transactions/services/transactions.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    useApproveRechargeMutation,
    useRejectRechargeMutation,
    useReverseRechargeMutation,
    useVerifyPaymentMutation,
} from '@/modules/transactions/mutations/transactions.mutations';

const toast   = useToast();
const confirm = useConfirm();

/* ── Filters ── */
const searchInput  = ref('');
const search       = refDebounced(searchInput, 400);
const statusFilter = ref('pending');
const currentPage  = ref(1);
const pageSize     = ref(20);

// ── Filtres rapides par période ──────────────────────────────────────────────
const QUICK_PERIODS = [
    { label: "Aujourd'hui", value: 'today' },
    { label: 'Hier',        value: 'yesterday' },
    { label: 'Semaine',     value: 'week' },
    { label: 'Mois',        value: 'month' },
];
const quickPeriod = ref(null);
const dateFrom     = ref(null);
const dateTo       = ref(null);

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

function applyQuickPeriod(period) {
    quickPeriod.value = period;
    const today = new Date();
    if (period === 'today') {
        dateFrom.value = today;
        dateTo.value = today;
    } else if (period === 'yesterday') {
        const y = new Date(today);
        y.setDate(y.getDate() - 1);
        dateFrom.value = y;
        dateTo.value = y;
    } else if (period === 'week') {
        const start = new Date(today);
        const dow = (start.getDay() + 6) % 7; // lundi = 0
        start.setDate(start.getDate() - dow);
        dateFrom.value = start;
        dateTo.value = today;
    } else if (period === 'month') {
        dateFrom.value = new Date(today.getFullYear(), today.getMonth(), 1);
        dateTo.value = today;
    }
}

watch([search, statusFilter, dateFrom, dateTo], () => { currentPage.value = 1; });

const filters = computed(() => ({
    search:    search.value || undefined,
    status:    statusFilter.value || undefined,
    startDate: toLocalDateStr(dateFrom.value),
    endDate:   toLocalDateStr(dateTo.value),
    page:      currentPage.value,
    pageSize:  pageSize.value,
}));

const { data, isLoading, isFetching, refetch } = useRechargesQuery(filters);

const recharges    = computed(() => data.value?.data ?? (Array.isArray(data.value) ? data.value : []));
const totalRecords = computed(() => data.value?.total ?? recharges.value.length);
const totalAmount  = computed(() => data.value?.totalAmount ?? null);
const pendingCount = computed(() => recharges.value.filter(r => r.status === 'pending').length);

/* ── Export PDF (liste complète filtrée, pas seulement la page affichée) ── */
const exporting = ref(false);
const STATUS_FILTER_LABELS = { pending: 'En attente', success: 'Approuvées', failed: 'Rejetées', '': 'Toutes' };

function fmtEC(val) {
    if (val === undefined || val === null) return '—';
    return Number(val).toLocaleString('fr-FR') + ' EC';
}

async function exportPdf() {
    exporting.value = true;
    try {
        const periodLabel = QUICK_PERIODS.find((p) => p.value === quickPeriod.value)?.label
            ?? ((toLocalDateStr(dateFrom.value) || toLocalDateStr(dateTo.value))
                ? `${toLocalDateStr(dateFrom.value) ?? ''} → ${toLocalDateStr(dateTo.value) ?? ''}`
                : 'Toutes dates');

        const res = await TransactionsService.getRecharges({
            search:    search.value || undefined,
            status:    statusFilter.value || undefined,
            startDate: toLocalDateStr(dateFrom.value),
            endDate:   toLocalDateStr(dateTo.value),
            page: 1,
            pageSize: 1000,
        });
        const rows = res?.data ?? (Array.isArray(res) ? res : []);

        const doc = new jsPDF();
        doc.setFontSize(15);
        doc.text('BIM NEXT — Demandes de recharge', 14, 16);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Période : ${periodLabel} · Statut : ${STATUS_FILTER_LABELS[statusFilter.value ?? ''] ?? 'Toutes'}`, 14, 23);
        doc.text(`${rows.length} demande(s) · Montant total : ${fmtEC(res?.totalAmount)}`, 14, 29);

        autoTable(doc, {
            startY: 35,
            head: [['Utilisateur', 'Email', 'Téléphone', 'Montant', 'Référence', 'Statut', 'Date']],
            body: rows.map((r) => [
                r.user?.username ?? '—',
                r.user?.email ?? '—',
                r.telephone ?? r.paymentMethod ?? '—',
                fmtAmount(r),
                r.reference ?? '—',
                statusLabel(r),
                fmtDate(r.createdAt),
            ]),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [0, 53, 197] },
        });

        doc.save(`recharges_${toLocalDateStr(new Date())}.pdf`);
    } catch (err) {
        toast.add({ severity: 'error', summary: 'Erreur', detail: "Impossible d'exporter le PDF", life: 4000 });
        console.error(err);
    } finally {
        exporting.value = false;
    }
}

function onPage(event) {
    currentPage.value = event.page + 1;
    pageSize.value = event.rows;
}

/* ── Mutations ── */
const { mutate: doApprove,  isPending: approving  } = useApproveRechargeMutation();
const { mutate: doReject,   isPending: rejecting   } = useRejectRechargeMutation();
const { mutate: doReverse,  isPending: reversing   } = useReverseRechargeMutation();
const { mutate: doVerify,   isPending: verifying   } = useVerifyPaymentMutation();

const actionId     = ref(null);
const rejectDialog = ref(false);
const rejectReason = ref('');
const rejectTarget = ref(null);

/* ── Helpers ── */
function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtAmount(row) {
    return Number(row.amount ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' EC';
}
function statusSeverity(row) {
    const s = row.status ?? '';
    if (s === 'pending') return 'warn';
    if (s === 'success') return 'success';
    if (s === 'failed')  return 'danger';
    return 'secondary';
}
function statusLabel(row) {
    const s = row.status ?? '';
    if (s === 'pending') return 'En attente';
    if (s === 'success') return 'Approuvée';
    if (s === 'failed')  return 'Rejetée';
    return s || '—';
}
function isPending(row)  { return row.status === 'pending'; }
function isApproved(row) { return row.status === 'success'; }
function rowId(row)      { return row.transactionRechargeId ?? row.id ?? row.tsxId; }

/* ── Approve ── */
function confirmApprove(row) {
    confirm.require({
        message: `Approuver la recharge de ${fmtAmount(row)} pour ${row.user?.username ?? row.user?.email ?? 'cet utilisateur'} ? Cette action créditera immédiatement son compte.`,
        header: 'Confirmer l\'approbation',
        icon: 'pi pi-check-circle',
        rejectProps: { label: 'Annuler', severity: 'secondary', outlined: true },
        acceptProps: { label: 'Approuver', severity: 'success' },
        accept: () => {
            actionId.value = rowId(row);
            doApprove(rowId(row), {
                onSuccess: () => {
                    toast.add({ severity: 'success', summary: 'Recharge approuvée', detail: `${fmtAmount(row)} crédité`, life: 4000 });
                    actionId.value = null;
                    refetch();
                },
                onError: (err) => {
                    toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 5000 });
                    actionId.value = null;
                },
            });
        },
    });
}

/* ── Reject ── */
function openReject(row) {
    rejectTarget.value = row;
    rejectReason.value = '';
    rejectDialog.value = true;
}
function submitReject() {
    const row = rejectTarget.value;
    if (!row) return;
    actionId.value = rowId(row);
    doReject({ id: rowId(row), reason: rejectReason.value.trim() || 'Demande refusée par l\'administrateur' }, {
        onSuccess: () => {
            toast.add({ severity: 'warn', summary: 'Recharge rejetée', detail: `Notification envoyée à ${row.user?.email ?? 'l\'utilisateur'}`, life: 4000 });
            rejectDialog.value = false;
            actionId.value = null;
            refetch();
        },
        onError: (err) => {
            toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 5000 });
            actionId.value = null;
        },
    });
}

/* ── Désapprouver ── */
function confirmReverse(row) {
    confirm.require({
        message: `Annuler l'approbation de ${fmtAmount(row)} pour ${row.user?.username ?? 'cet utilisateur'} ? Ce montant sera retiré de son compte et la demande repassera en attente.`,
        header: 'Désapprouver la recharge',
        icon: 'pi pi-exclamation-triangle',
        rejectProps: { label: 'Annuler', severity: 'secondary', outlined: true },
        acceptProps: { label: 'Désapprouver', severity: 'danger' },
        accept: () => {
            actionId.value = rowId(row);
            doReverse(rowId(row), {
                onSuccess: () => {
                    toast.add({ severity: 'warn', summary: 'Recharge désapprouvée', detail: `${fmtAmount(row)} retiré du compte`, life: 4000 });
                    actionId.value = null;
                    refetch();
                },
                onError: (err) => {
                    toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 5000 });
                    actionId.value = null;
                },
            });
        },
    });
}

/* ── Vérifier avec FlexPay ──────────────────────────────────────────────────
   FlexPay confirme le paiement via un webhook — s'il n'arrive jamais (réseau,
   callback indisponible au mauvais moment...), la recharge reste "en attente"
   dans notre base MÊME SI FlexPay a bien confirmé le paiement de son côté.
   Approuver à l'aveugle créditerait sans certitude ; cette action interroge
   directement FlexPay avant de créditer (ou de rejeter si FlexPay dit non). */
function handleVerify(row) {
    if (!row.reference) {
        toast.add({ severity: 'warn', summary: 'Impossible', detail: 'Cette demande n\'a pas de référence FlexPay.', life: 4000 });
        return;
    }
    actionId.value = rowId(row);
    doVerify(row.reference, {
        onSuccess: (res) => {
            const soldeTxt = res?.solde != null ? ` — solde actuel : ${Number(res.solde).toLocaleString('fr-FR')} EC` : '';
            const byStatus = {
                already_done: { severity: 'info', summary: 'Déjà crédité', detail: `Ce paiement était déjà crédité.${soldeTxt}` },
                success: { severity: 'success', summary: 'Paiement confirmé', detail: `FlexPay confirme le paiement — compte crédité.${soldeTxt}` },
                cancelled: { severity: 'warn', summary: 'Refusé par FlexPay', detail: 'FlexPay indique que ce paiement a été refusé/annulé.' },
                pending: { severity: 'info', summary: 'Toujours en attente', detail: 'FlexPay n\'a pas encore confirmé ce paiement, réessayez plus tard.' },
            };
            const t = byStatus[res?.status] ?? { severity: 'info', summary: 'Statut inconnu', detail: res?.message ?? '' };
            toast.add({ ...t, life: 5000 });
            actionId.value = null;
            refetch();
        },
        onError: (err) => {
            toast.add({
                severity: 'error', summary: 'Erreur',
                detail: err?.response?.data?.message ?? 'Impossible de vérifier — ce n\'est peut-être pas une recharge FlexPay automatique.',
                life: 5000,
            });
            actionId.value = null;
        },
    });
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <ConfirmDialog />

        <!-- Header -->
        <div class="flex items-center justify-between flex-wrap gap-3">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <i class="pi pi-plus-circle text-primary text-lg" />
                </div>
                <div>
                    <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Demandes de Recharge</h1>
                    <p class="text-sm text-muted-color">Approuvez ou rejetez les demandes de recharge des utilisateurs</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <Badge v-if="statusFilter === 'pending' && pendingCount > 0" :value="`${pendingCount} en attente`" severity="warn" />
                <Button icon="pi pi-refresh" severity="secondary" text rounded :loading="isFetching" @click="refetch" v-tooltip="'Actualiser'" />
            </div>
        </div>

        <!-- Status filter tabs -->
        <div class="flex gap-2 flex-wrap">
            <Button
                v-for="opt in [
                    { label: 'En attente', value: 'pending',  sev: 'warn' },
                    { label: 'Approuvées', value: 'success',  sev: 'success' },
                    { label: 'Rejetées',   value: 'failed',   sev: 'danger' },
                    { label: 'Toutes',     value: '',         sev: 'secondary' },
                ]"
                :key="opt.value"
                :label="opt.label"
                :severity="statusFilter === opt.value ? opt.sev : 'secondary'"
                :outlined="statusFilter !== opt.value"
                size="small"
                @click="statusFilter = opt.value"
            />
        </div>

        <!-- Quick period filters -->
        <div class="flex gap-2 flex-wrap items-center">
            <Button
                v-for="opt in QUICK_PERIODS"
                :key="opt.value"
                :label="opt.label"
                size="small"
                :severity="quickPeriod === opt.value ? 'primary' : 'secondary'"
                :outlined="quickPeriod !== opt.value"
                @click="applyQuickPeriod(opt.value)"
            />
            <DatePicker
                v-model="dateFrom"
                placeholder="Du"
                dateFormat="dd/mm/yy"
                showButtonBar
                style="min-width:8rem"
                @update:modelValue="quickPeriod = null"
            />
            <DatePicker
                v-model="dateTo"
                placeholder="Au"
                dateFormat="dd/mm/yy"
                showButtonBar
                style="min-width:8rem"
                @update:modelValue="quickPeriod = null"
            />
            <Button
                label="Exporter en PDF"
                icon="pi pi-file-pdf"
                severity="secondary"
                outlined
                size="small"
                class="ml-auto"
                :loading="exporting"
                @click="exportPdf"
            />
        </div>

        <div class="card">
            <!-- Toolbar -->
            <div class="flex items-center gap-3 mb-5 flex-wrap">
                <IconField class="flex-1 min-w-52">
                    <InputIcon class="pi pi-search" />
                    <InputText v-model="searchInput" placeholder="Nom, email, référence…" class="w-full" />
                </IconField>
                <span class="text-sm text-muted-color ml-auto whitespace-nowrap">
                    <i v-if="isFetching && !isLoading" class="pi pi-spin pi-spinner text-xs mr-1" />
                    {{ totalRecords }} résultat(s)
                    <template v-if="totalAmount != null"> · {{ fmtEC(totalAmount) }}</template>
                </span>
            </div>

            <!-- Chargement -->
            <div v-if="isLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Skeleton v-for="n in 6" :key="n" height="11rem" borderRadius="1rem" />
            </div>

            <!-- Vide -->
            <div v-else-if="recharges.length === 0" class="text-center py-12 text-muted-color">
                <i class="pi pi-inbox text-4xl mb-3 block opacity-25" />
                <p class="font-medium">Aucune demande trouvée</p>
            </div>

            <!-- Cards -->
            <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div
                    v-for="row in recharges"
                    :key="rowId(row)"
                    class="card mb-0! p-4! flex flex-col gap-3"
                >
                    <!-- En-tête : utilisateur + statut -->
                    <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 font-bold text-primary text-sm">
                            {{ (row.user?.username ?? '?')[0]?.toUpperCase() }}
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="font-semibold text-surface-900 dark:text-surface-0 truncate">{{ row.user?.username ?? '—' }}</p>
                            <p class="text-xs text-muted-color truncate">{{ row.user?.email ?? '—' }}</p>
                        </div>
                        <Tag :value="statusLabel(row)" :severity="statusSeverity(row)" />
                    </div>

                    <!-- Montant — mis en avant -->
                    <div class="flex items-center justify-between gap-2 rounded-xl bg-surface-50 dark:bg-surface-800 px-3 py-2">
                        <span class="text-xs text-muted-color">Montant</span>
                        <span class="font-bold text-xl text-surface-900 dark:text-surface-0">{{ fmtAmount(row) }}</span>
                    </div>

                    <!-- Méthode + référence -->
                    <div class="flex items-center justify-between gap-2">
                        <Tag :value="row.telephone ?? row.paymentMethod ?? '—'" severity="secondary" />
                        <span class="text-xs font-mono text-muted-color truncate">{{ row.reference ?? '—' }}</span>
                    </div>

                    <!-- Date -->
                    <div class="text-xs text-muted-color">{{ fmtDate(row.createdAt) }}</div>

                    <!-- Actions -->
                    <div class="flex gap-1 flex-wrap justify-end pt-2 border-t border-surface-100 dark:border-surface-800">
                        <!-- En attente → Vérifier avec FlexPay + Approuver + Rejeter -->
                        <template v-if="isPending(row)">
                            <Button
                                v-tooltip.top="'Vérifier avec FlexPay avant de décider'"
                                icon="pi pi-sync"
                                label="Vérifier"
                                severity="info"
                                outlined
                                size="small"
                                :loading="actionId === rowId(row) && verifying"
                                @click="handleVerify(row)"
                            />
                            <Button
                                v-tooltip.top="'Approuver'"
                                icon="pi pi-check"
                                label="Approuver"
                                severity="success"
                                size="small"
                                :loading="actionId === rowId(row) && approving"
                                @click="confirmApprove(row)"
                            />
                            <Button
                                v-tooltip.top="'Rejeter'"
                                icon="pi pi-times"
                                severity="danger"
                                outlined
                                rounded
                                size="small"
                                :loading="actionId === rowId(row) && rejecting"
                                @click="openReject(row)"
                            />
                        </template>

                        <!-- Approuvée → Désapprouver -->
                        <Button
                            v-else-if="isApproved(row)"
                            v-tooltip.top="'Désapprouver (retire le montant du compte)'"
                            icon="pi pi-undo"
                            severity="danger"
                            outlined
                            rounded
                            size="small"
                            :loading="actionId === rowId(row) && reversing"
                            @click="confirmReverse(row)"
                        />
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

        <!-- ── Reject Dialog ─────────────────────────────────────────── -->
        <Dialog
            v-model:visible="rejectDialog"
            header="Rejeter la demande de recharge"
            modal
            style="width:36rem"
            :draggable="false"
        >
            <div class="flex flex-col gap-4 pt-1">
                <div v-if="rejectTarget" class="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="font-bold text-surface-900 dark:text-surface-0">{{ rejectTarget.user?.username ?? '—' }}</p>
                            <p class="text-xs text-muted-color">{{ rejectTarget.user?.email }}</p>
                        </div>
                        <p class="font-bold text-red-600 dark:text-red-400 text-2xl">{{ fmtAmount(rejectTarget) }}</p>
                    </div>
                </div>

                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Motif du rejet</label>
                    <Textarea
                        v-model="rejectReason"
                        placeholder="Ex: Justificatif insuffisant, montant non reconnu, limite dépassée…"
                        rows="3"
                        autoResize
                    />
                    <div class="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                        <i class="pi pi-bell mt-0.5 shrink-0" />
                        <span>L'utilisateur recevra une notification push <strong>et un email</strong> avec ce motif.</span>
                    </div>
                </div>
            </div>
            <template #footer>
                <Button label="Annuler" severity="secondary" outlined @click="rejectDialog = false" :disabled="rejecting" />
                <Button label="Rejeter la demande" icon="pi pi-times-circle" severity="danger" :loading="rejecting" @click="submitReject" />
            </template>
        </Dialog>
    </div>
</template>
