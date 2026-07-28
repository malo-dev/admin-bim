<script setup>
import { ref, computed, watch } from 'vue';
import { refDebounced } from '@vueuse/core';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { useRechargesQuery } from '@/modules/transactions/queries/transactions.queries';
import {
    useApproveRechargeMutation,
    useRejectRechargeMutation,
    useReverseRechargeMutation,
} from '@/modules/transactions/mutations/transactions.mutations';

const toast   = useToast();
const confirm = useConfirm();

/* ── Filters ── */
const searchInput  = ref('');
const search       = refDebounced(searchInput, 400);
const statusFilter = ref('pending');
const currentPage  = ref(1);
const pageSize     = ref(20);

watch([search, statusFilter], () => { currentPage.value = 1; });

const filters = computed(() => ({
    search:   search.value || undefined,
    status:   statusFilter.value || undefined,
    page:     currentPage.value,
    pageSize: pageSize.value,
}));

const { data, isLoading, isFetching, refetch } = useRechargesQuery(filters);

const recharges    = computed(() => data.value?.data ?? (Array.isArray(data.value) ? data.value : []));
const totalRecords = computed(() => data.value?.total ?? recharges.value.length);
const pendingCount = computed(() => recharges.value.filter(r => r.status === 'pending').length);

function onPage(event) {
    currentPage.value = event.page + 1;
    pageSize.value = event.rows;
}

/* ── Mutations ── */
const { mutate: doApprove,  isPending: approving  } = useApproveRechargeMutation();
const { mutate: doReject,   isPending: rejecting   } = useRejectRechargeMutation();
const { mutate: doReverse,  isPending: reversing   } = useReverseRechargeMutation();

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
</script>

<template>
    <div class="flex flex-col gap-4">
        <ConfirmDialog />

        <!-- Header -->
        <div class="flex items-center justify-between flex-wrap gap-3">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <i class="pi pi-plus-circle text-amber-600 dark:text-amber-400 text-lg" />
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
                </span>
            </div>

            <!-- DataTable -->
            <DataTable
                :value="recharges"
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
                        <i class="pi pi-inbox text-4xl mb-3 block opacity-25" />
                        <p class="font-medium">Aucune demande trouvée</p>
                    </div>
                </template>

                <!-- Utilisateur -->
                <Column header="Utilisateur" style="min-width:16rem">
                    <template #body="{ data: row }">
                        <div class="flex items-center gap-3">
                            <div class="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 font-bold text-primary text-sm">
                                {{ (row.user?.username ?? '?')[0]?.toUpperCase() }}
                            </div>
                            <div class="min-w-0">
                                <p class="font-semibold text-surface-900 dark:text-surface-0 truncate">{{ row.user?.username ?? '—' }}</p>
                                <p class="text-xs text-muted-color truncate">{{ row.user?.email ?? '—' }}</p>
                            </div>
                        </div>
                    </template>
                </Column>

                <!-- Montant -->
                <Column header="Montant" style="min-width:9rem">
                    <template #body="{ data: row }">
                        <span class="font-bold text-xl text-surface-900 dark:text-surface-0">{{ fmtAmount(row) }}</span>
                    </template>
                </Column>

                <!-- Méthode -->
                <Column header="Méthode" style="min-width:10rem">
                    <template #body="{ data: row }">
                        <Tag :value="row.telephone ?? row.paymentMethod ?? '—'" severity="secondary" />
                    </template>
                </Column>

                <!-- Référence -->
                <Column header="Référence" style="min-width:11rem">
                    <template #body="{ data: row }">
                        <span class="text-xs font-mono text-muted-color">{{ row.reference ?? '—' }}</span>
                    </template>
                </Column>

                <!-- Date -->
                <Column header="Date" style="min-width:11rem">
                    <template #body="{ data: row }">
                        <span class="text-sm text-muted-color">{{ fmtDate(row.createdAt) }}</span>
                    </template>
                </Column>

                <!-- Statut -->
                <Column header="Statut" style="min-width:8rem">
                    <template #body="{ data: row }">
                        <Tag :value="statusLabel(row)" :severity="statusSeverity(row)" />
                    </template>
                </Column>

                <!-- Actions -->
                <Column header="Actions" style="min-width:14rem" alignHeader="right">
                    <template #body="{ data: row }">
                        <!-- En attente → Approuver + Rejeter -->
                        <div v-if="isPending(row)" class="flex gap-2 justify-end">
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
                        </div>

                        <!-- Approuvée → Désapprouver -->
                        <div v-else-if="isApproved(row)" class="flex gap-2 justify-end items-center">
                            <Tag value="Approuvée" severity="success" />
                            <Button
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

                        <!-- Rejetée → statut uniquement -->
                        <div v-else class="flex justify-end">
                            <Tag value="Rejetée" severity="danger" />
                        </div>
                    </template>
                </Column>
            </DataTable>
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
