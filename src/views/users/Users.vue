<script setup>
import { ref, computed, watch } from 'vue';
import { refDebounced } from '@vueuse/core';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import {
    useUsersQuery,
    useCommercesQuery,
    useUsersBalanceStatsQuery,
} from '@/modules/users/queries/users.queries';
import UsersService from '@/modules/users/services/users.service';
import {
    useToggleUserActiveMutation,
    useToggleUserBlockMutation,
    useDeleteUserMutation,
    useUpdateSoldNumberMutation,
    useRechargeUserMutation,
    useResetUserPasswordMutation,
} from '@/modules/users/mutations/users.mutations';

const toast = useToast();
const confirm = useConfirm();

// ── Filtres tableau ────────────────────────────────────────────────────────────
const searchInput = ref('');
const search = refDebounced(searchInput, 400);
const selectedCommerceId = ref(null);
const dateFrom = ref(null);
const dateTo = ref(null);
const currentPage = ref(1);
const pageSize = ref(20);

watch([search, selectedCommerceId, dateFrom, dateTo], () => { currentPage.value = 1; });

const filters = computed(() => ({
    search: search.value || undefined,
    commerceId: selectedCommerceId.value || undefined,
    createdAtFrom: dateFrom.value ? dateFrom.value.toISOString().split('T')[0] : undefined,
    createdAtTo: dateTo.value ? dateTo.value.toISOString().split('T')[0] : undefined,
    page: currentPage.value,
    pageSize: pageSize.value,
}));

// ── Requêtes tableau ───────────────────────────────────────────────────────────
const { data, isLoading, isFetching } = useUsersQuery(filters);
const { data: commercesData } = useCommercesQuery();

const users = computed(() => data.value?.data ?? []);
const totalRecords = computed(() => data.value?.pagination?.total ?? 0);

const commerceOptions = computed(() => {
    const raw = commercesData.value;
    const list = Array.isArray(raw) ? raw : (raw?.data ?? []);
    return list.map((c) => ({ label: c.commerceName, value: c.commerceId }));
});

const hasActiveFilters = computed(() =>
    !!(searchInput.value || selectedCommerceId.value || dateFrom.value || dateTo.value)
);

function onPage(event) {
    currentPage.value = event.page + 1;
    pageSize.value = event.rows;
}

function clearFilters() {
    searchInput.value = '';
    selectedCommerceId.value = null;
    dateFrom.value = null;
    dateTo.value = null;
    currentPage.value = 1;
}

// ── Solde total (cards du haut) ────────────────────────────────────────────────
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

const balancePeriodParam = computed(() =>
    isBalanceCustom.value ? '' : selectedBalancePeriod.value
);

const {
    data: balanceStats,
    isLoading: balanceLoading,
    isError: balanceError,
    refetch: balanceRefetch,
} = useUsersBalanceStatsQuery(balancePeriodParam);

const totalBalance     = computed(() => balanceStats.value?.totalBalance ?? null);
const totalUsers       = computed(() => balanceStats.value?.totalUsers   ?? totalRecords.value);
const activeUsersCount = computed(() => balanceStats.value?.activeUsers  ?? null);
const newUsersCount    = computed(() => balanceStats.value?.newUsers     ?? null);
const avgBalance       = computed(() => {
    if (totalBalance.value != null && totalUsers.value > 0)
        return Math.round(totalBalance.value / totalUsers.value);
    return null;
});

const balancePeriodLabel = computed(() => {
    const found = BALANCE_PERIODS.find((p) => p.value === selectedBalancePeriod.value);
    return found?.label ?? '';
});

// ── Mutations ──────────────────────────────────────────────────────────────────
const { mutate: toggleActive, isPending: activePending } = useToggleUserActiveMutation();
const { mutate: toggleBlock,  isPending: blockPending  } = useToggleUserBlockMutation();
const { mutate: deleteUser,   isPending: deletePending } = useDeleteUserMutation();
const { mutate: updateSold, isPending: soldPending } = useUpdateSoldNumberMutation();
const { mutate: rechargeUser, isPending: rechargePending } = useRechargeUserMutation();
const { mutate: resetPassword, isPending: resetPending } = useResetUserPasswordMutation();

function doToggleActive(user) {
    toggleActive(user.id, {
        onSuccess: () =>
            toast.add({
                severity: user.isActive ? 'warn' : 'success',
                summary: user.isActive ? 'Désactivé' : 'Activé',
                detail: `Compte de ${user.username} ${user.isActive ? 'désactivé' : 'activé'}`,
                life: 3000,
            }),
        onError: (err) =>
            toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
    });
}

function doToggleBlock(user) {
    toggleBlock(user.id, {
        onSuccess: () =>
            toast.add({
                severity: user.isBlocked ? 'success' : 'warn',
                summary: user.isBlocked ? 'Débloqué' : 'Bloqué',
                detail: `Compte de ${user.username} ${user.isBlocked ? 'débloqué' : 'bloqué'}`,
                life: 3000,
            }),
        onError: (err) =>
            toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
    });
}

function confirmDelete(user) {
    confirm.require({
        message: `Supprimer définitivement le compte de « ${user.username} » ? Cette action est irréversible.`,
        header: 'Confirmation de suppression',
        icon: 'pi pi-exclamation-triangle',
        rejectProps: { label: 'Annuler', severity: 'secondary', outlined: true },
        acceptProps: { label: 'Supprimer', severity: 'danger' },
        accept: () =>
            deleteUser(user.id, {
                onSuccess: () => toast.add({ severity: 'success', summary: 'Supprimé', detail: 'Utilisateur supprimé', life: 3000 }),
                onError: (err) =>
                    toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
            }),
    });
}

// ── Dialog Modifier Solde ──────────────────────────────────────────────────────
const showEditSoldDialog = ref(false);
const editSoldTarget = ref(null);
const editSoldValue = ref(null);

function openEditSoldDialog(user) {
    editSoldTarget.value = user;
    editSoldValue.value = getUserBalance(user) ?? 0;
    showEditSoldDialog.value = true;
}

function submitEditSold() {
    if (editSoldValue.value === null || editSoldValue.value < 0 || editSoldValue.value > 5000) {
        toast.add({ severity: 'warn', summary: 'Valeur invalide', detail: 'Le solde doit être entre 0 et 5000 EC', life: 3000 });
        return;
    }
    updateSold(
        { id: editSoldTarget.value.id, soldNumber: editSoldValue.value },
        {
            onSuccess: () => {
                showEditSoldDialog.value = false;
                toast.add({
                    severity: 'success',
                    summary: 'Solde mis à jour',
                    detail: `Solde de ${editSoldTarget.value.username} → ${editSoldValue.value} EC`,
                    life: 4000,
                });
            },
            onError: (err) =>
                toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
        }
    );
}

// ── Dialog Recharge ────────────────────────────────────────────────────────────
const showRechargeDialog = ref(false);
const rechargeTarget = ref(null);
const rechargeAmount = ref(null);

function openRechargeDialog(user) {
    rechargeTarget.value = user;
    rechargeAmount.value = null;
    showRechargeDialog.value = true;
}

function submitRecharge() {
    if (!rechargeAmount.value || rechargeAmount.value <= 0) {
        toast.add({ severity: 'warn', summary: 'Montant invalide', detail: 'Entrez un montant positif', life: 3000 });
        return;
    }
    rechargeUser(
        { id: rechargeTarget.value.id, amount: rechargeAmount.value },
        {
            onSuccess: () => {
                showRechargeDialog.value = false;
                toast.add({
                    severity: 'success',
                    summary: 'Rechargé',
                    detail: `${rechargeAmount.value} EC ajoutés au compte de ${rechargeTarget.value.username}`,
                    life: 4000,
                });
            },
            onError: (err) =>
                toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
        }
    );
}

// ── Dialog Reset Password ──────────────────────────────────────────────────────
const showResetDialog = ref(false);
const resetTarget = ref(null);
const generatedPassword = ref('');

function openResetDialog(user) {
    resetTarget.value = user;
    generatedPassword.value = '';
    showResetDialog.value = true;
}

function submitReset() {
    resetPassword(resetTarget.value.id, {
        onSuccess: (res) => {
            generatedPassword.value = res?.newPassword ?? res?.password ?? '(voir email)';
            toast.add({
                severity: 'success',
                summary: 'Mot de passe réinitialisé',
                detail: `Nouveau mot de passe généré pour ${resetTarget.value.username}`,
                life: 4000,
            });
        },
        onError: (err) =>
            toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
    });
}

function copyPassword() {
    navigator.clipboard.writeText(generatedPassword.value);
    toast.add({ severity: 'info', summary: 'Copié', detail: 'Mot de passe copié', life: 2000 });
}

// ── Dialog Mot de passe de transaction ────────────────────────────────────────
const showPinDialog = ref(false);
const pinTarget = ref(null);
const pinValue = ref('');
const pinVisible = ref(false);
const pinLoading = ref(false);
const pinError = ref('');

async function openPinDialog(user) {
    pinTarget.value = user;
    pinValue.value = '';
    pinVisible.value = false;
    pinError.value = '';
    showPinDialog.value = true;
    pinLoading.value = true;
    try {
        const res = await UsersService.getTransactionPassword(user.id);
        // Le champ s'appelle "randomly" dans le modèle User
        pinValue.value = res?.randomly ?? res?.transactionPassword ?? res?.pin ?? res?.password ?? '';
        if (!pinValue.value) pinError.value = 'Aucun mot de passe de transaction défini pour cet utilisateur.';
    } catch (err) {
        pinError.value = err?.response?.data?.message ?? 'Impossible de récupérer le mot de passe de transaction.';
    } finally {
        pinLoading.value = false;
    }
}

function copyPin() {
    navigator.clipboard.writeText(pinValue.value);
    toast.add({ severity: 'info', summary: 'Copié', detail: 'Mot de passe de transaction copié', life: 2000 });
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatDate(d) {
    return d ? new Date(d).toLocaleDateString('fr-FR') : '—';
}

function getInitials(name) {
    return name ? name[0].toUpperCase() : '?';
}

function getCommerceName(user) {
    if (!user.commerce) return null;
    if (Array.isArray(user.commerce)) return user.commerce[0]?.commerceName ?? null;
    return user.commerce.commerceName ?? null;
}

function getUserBalance(row) {
    // soldNumber est le champ balance du modèle User
    return row.soldNumber
        ?? row.balance
        ?? row.wallet?.balance
        ?? null;
}

function fmtEC(val) {
    if (val === undefined || val === null) return null;
    return Number(val).toLocaleString('fr-FR') + ' EC';
}

function fmtBig(val) {
    if (val === undefined || val === null) return '—';
    return Number(val).toLocaleString('fr-FR');
}

// ── ⚠️ Zone dangereuse : réinitialisation de tous les soldes ──────────────────
const resetDone       = ref(false);   // désactive le bouton après usage
const resetConfDialog = ref(false);
const resetTyped      = ref('');
const resetLoading    = ref(false);
const RESET_KEYWORD   = 'CONFIRMER';

function openResetConfirm() {
    resetTyped.value = '';
    resetConfDialog.value = true;
}

async function executeResetAll() {
    if (resetTyped.value !== RESET_KEYWORD) {
        toast.add({ severity: 'warn', summary: 'Mot de confirmation incorrect', detail: `Tapez exactement : ${RESET_KEYWORD}`, life: 3000 });
        return;
    }
    resetLoading.value = true;
    try {
        const { data } = await UsersService.resetAllBalances();
        toast.add({
            severity: 'success',
            summary: '✅ Réinitialisation effectuée',
            detail: data?.message ?? `${data?.affectedRows ?? '?'} solde(s) remis à 0`,
            life: 6000,
        });
        resetDone.value       = true;   // désactive définitivement pour cette session
        resetConfDialog.value = false;
    } catch (err) {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: err?.response?.data?.message ?? 'Erreur serveur',
            life: 5000,
        });
    } finally {
        resetLoading.value = false;
    }
}
</script>

<template>
    <div class="flex flex-col gap-5">
        <ConfirmDialog />

        <!-- Header -->
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <i class="pi pi-users text-primary text-lg" />
            </div>
            <div>
                <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Utilisateurs</h1>
                <p class="text-sm text-muted-color">Tous les utilisateurs de la plateforme BIM</p>
            </div>
        </div>

        <!-- ── Cards Solde Total ──────────────────────────────────────────────── -->
        <div class="card p-4">
            <!-- Sélecteur de période -->
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
                    <Button
                        icon="pi pi-refresh"
                        size="small"
                        severity="secondary"
                        text
                        rounded
                        :loading="balanceLoading"
                        @click="balanceRefetch"
                    />
                </div>
            </div>

            <!-- Custom date range -->
            <div v-if="isBalanceCustom" class="flex flex-wrap items-center gap-3 mb-4 pb-4 border-b border-surface-200 dark:border-surface-700">
                <DatePicker v-model="balanceCustomFrom" placeholder="Depuis" dateFormat="dd/mm/yy" showButtonBar style="min-width:9rem" />
                <span class="text-muted-color">→</span>
                <DatePicker v-model="balanceCustomTo" placeholder="Jusqu'au" dateFormat="dd/mm/yy" showButtonBar style="min-width:9rem" />
                <Button label="Appliquer" icon="pi pi-search" size="small" @click="balanceRefetch" />
            </div>

            <!-- Message endpoint non disponible -->
            <div v-if="balanceError" class="flex items-center gap-3 p-4 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 mb-2">
                <i class="pi pi-exclamation-triangle text-orange-500 text-xl" />
                <div>
                    <p class="text-sm font-semibold text-orange-700 dark:text-orange-300">Endpoint non disponible</p>
                    <p class="text-xs text-orange-600 dark:text-orange-400">
                        L'API <code class="bg-orange-100 dark:bg-orange-900 px-1 rounded">/auth/users/balance-stats</code> doit être créée côté backend pour afficher ces statistiques.
                    </p>
                </div>
            </div>

            <!-- 3 Cards -->
            <div v-else class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <!-- Solde total (toujours la somme de tous les utilisateurs) -->
                <div class="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                    <div class="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                        <i class="pi pi-wallet text-blue-600 dark:text-blue-400" />
                    </div>
                    <div class="min-w-0">
                        <p class="text-xs text-muted-color">Solde total — tous utilisateurs</p>
                        <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            <span v-if="balanceLoading" class="text-surface-300 text-base">Chargement…</span>
                            <span v-else-if="totalBalance != null">{{ fmtBig(totalBalance) }} EC</span>
                            <span v-else class="text-surface-400 text-base">— EC</span>
                        </p>
                        <p class="text-xs text-muted-color mt-0.5">{{ totalUsers }} comptes · solde cumulé</p>
                    </div>
                </div>

                <!-- Utilisateurs actifs -->
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

                <!-- Nouveaux inscrits sur la période -->
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

        <!-- ── Tableau ────────────────────────────────────────────────────────── -->
        <div class="card">
            <!-- Filters toolbar -->
            <div class="flex flex-wrap items-center gap-3 mb-5">
                <IconField class="flex-1 min-w-52">
                    <InputIcon class="pi pi-search" />
                    <InputText v-model="searchInput" placeholder="Nom, email, prénom…" class="w-full" />
                </IconField>

                <Select
                    v-model="selectedCommerceId"
                    :options="commerceOptions"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Commerce"
                    showClear
                    style="min-width:13rem"
                />

                <DatePicker
                    v-model="dateFrom"
                    placeholder="Créé depuis"
                    dateFormat="dd/mm/yy"
                    showButtonBar
                    style="min-width:9rem"
                />
                <DatePicker
                    v-model="dateTo"
                    placeholder="Jusqu'au"
                    dateFormat="dd/mm/yy"
                    showButtonBar
                    style="min-width:9rem"
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
                    {{ totalRecords }} utilisateur(s)
                </span>
            </div>

            <DataTable
                :value="users"
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
                        <i class="pi pi-users text-4xl mb-3 block opacity-30" />
                        <p class="font-medium">Aucun utilisateur trouvé</p>
                        <p v-if="hasActiveFilters" class="text-sm mt-1">Essayez de modifier les filtres</p>
                    </div>
                </template>

                <!-- Utilisateur -->
                <Column header="Utilisateur" style="min-width:16rem">
                    <template #body="{ data: row }">
                        <div class="flex items-center gap-3">
                            <Avatar
                                v-if="row.imageUrl"
                                :image="row.imageUrl"
                                shape="circle"
                            />
                            <Avatar
                                v-else
                                :label="getInitials(row.username)"
                                shape="circle"
                                :style="{ backgroundColor: 'var(--p-surface-200)', color: 'var(--p-text-color)', fontWeight: '600' }"
                            />
                            <div>
                                <div class="font-semibold text-surface-900 dark:text-surface-0">
                                    {{ row.fullname || row.username }}
                                </div>
                                <div class="text-xs text-muted-color">{{ row.email }}</div>
                            </div>
                        </div>
                    </template>
                </Column>

                <!-- N° Compte -->
                <Column header="N° Compte" style="min-width:10rem">
                    <template #body="{ data: row }">
                        <code
                            class="text-xs px-2 py-1 rounded"
                            style="background: var(--p-surface-100); color: var(--p-text-muted-color)"
                        >
                            {{ row.accountNumber || '—' }}
                        </code>
                    </template>
                </Column>

                <!-- Solde -->
                <Column header="Solde" style="min-width:9rem">
                    <template #body="{ data: row }">
                        <span
                            v-if="getUserBalance(row) != null"
                            class="font-semibold text-sm"
                            :class="getUserBalance(row) > 0 ? 'text-green-600 dark:text-green-400' : 'text-muted-color'"
                        >
                            {{ fmtEC(getUserBalance(row)) }}
                        </span>
                        <span
                            v-else
                            class="text-xs text-muted-color italic"
                            v-tooltip.top="'Le solde n\'est pas retourné par cette API'"
                        >
                            N/D
                        </span>
                    </template>
                </Column>

                <!-- Statut -->
                <Column header="Statut" style="min-width:8rem">
                    <template #body="{ data: row }">
                        <Tag
                            :value="row.isActive ? 'Actif' : 'Inactif'"
                            :severity="row.isActive ? 'success' : 'secondary'"
                        />
                    </template>
                </Column>

                <!-- Accès -->
                <Column header="Accès" style="min-width:8rem">
                    <template #body="{ data: row }">
                        <Tag v-if="row.isBlocked" value="Bloqué" severity="danger" />
                        <Tag v-else value="Normal" severity="secondary" />
                    </template>
                </Column>

                <!-- Date -->
                <Column header="Créé le" style="min-width:9rem">
                    <template #body="{ data: row }">{{ formatDate(row.createdAt) }}</template>
                </Column>

                <!-- Actions -->
                <Column header="Actions" style="min-width:14rem" alignHeader="right">
                    <template #body="{ data: row }">
                        <div class="flex gap-1 justify-end flex-wrap">
                            <Button
                                v-tooltip.top="'Mot de passe de transaction'"
                                icon="pi pi-lock"
                                severity="contrast"
                                outlined
                                rounded
                                size="small"
                                @click="openPinDialog(row)"
                            />
                            <Button
                                v-tooltip.top="'Modifier le solde'"
                                icon="pi pi-pencil"
                                severity="success"
                                outlined
                                rounded
                                size="small"
                                :loading="soldPending"
                                @click="openEditSoldDialog(row)"
                            />
                            <Button
                                v-tooltip.top="'Recharger le compte'"
                                icon="pi pi-wallet"
                                severity="info"
                                outlined
                                rounded
                                size="small"
                                @click="openRechargeDialog(row)"
                            />
                            <Button
                                v-tooltip.top="'Réinitialiser mot de passe'"
                                icon="pi pi-key"
                                severity="secondary"
                                outlined
                                rounded
                                size="small"
                                :loading="resetPending"
                                @click="openResetDialog(row)"
                            />
                            <Button
                                v-tooltip.top="row.isActive ? 'Désactiver' : 'Activer'"
                                :icon="row.isActive ? 'pi pi-power-off' : 'pi pi-check-circle'"
                                :severity="row.isActive ? 'warning' : 'success'"
                                outlined
                                rounded
                                size="small"
                                :loading="activePending"
                                @click="doToggleActive(row)"
                            />
                            <Button
                                v-tooltip.top="row.isBlocked ? 'Débloquer' : 'Bloquer'"
                                :icon="row.isBlocked ? 'pi pi-lock-open' : 'pi pi-ban'"
                                :severity="row.isBlocked ? 'success' : 'danger'"
                                outlined
                                rounded
                                size="small"
                                :loading="blockPending"
                                @click="doToggleBlock(row)"
                            />
                            <Button
                                v-tooltip.top="'Supprimer'"
                                icon="pi pi-trash"
                                severity="danger"
                                outlined
                                rounded
                                size="small"
                                :loading="deletePending"
                                @click="confirmDelete(row)"
                            />
                        </div>
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- ── Dialog Modifier Solde ───────────────────────────────────────── -->
        <Dialog
            v-model:visible="showEditSoldDialog"
            :header="`Modifier le solde de ${editSoldTarget?.username ?? ''}`"
            :style="{ width: '24rem' }"
            modal
            :draggable="false"
        >
            <div class="flex flex-col gap-4 pt-2">
                <div class="flex items-center gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800">
                    <Avatar
                        :label="getInitials(editSoldTarget?.username)"
                        shape="circle"
                        :style="{ backgroundColor: 'var(--p-surface-200)', color: 'var(--p-text-color)', fontWeight: '600' }"
                    />
                    <div>
                        <div class="font-semibold">{{ editSoldTarget?.fullname || editSoldTarget?.username }}</div>
                        <div class="text-xs text-muted-color">
                            Solde actuel : <strong>{{ fmtEC(getUserBalance(editSoldTarget ?? {})) ?? 'N/D' }}</strong>
                        </div>
                    </div>
                </div>

                <div class="flex flex-col gap-1">
                    <label class="text-sm font-medium">Nouveau solde (EC) <span class="text-muted-color font-normal">· max 5 000</span></label>
                    <InputNumber
                        v-model="editSoldValue"
                        :min="0"
                        :max="5000"
                        :step="1"
                        showButtons
                        buttonLayout="horizontal"
                        decrementButtonIcon="pi pi-minus"
                        incrementButtonIcon="pi pi-plus"
                        class="w-full"
                        fluid
                    />
                </div>

                <Message severity="info" :closable="false" class="text-xs">
                    Cette action <strong>remplace</strong> le solde actuel. Pour ajouter des fonds, utilisez plutôt « Recharger ».
                </Message>
            </div>

            <template #footer>
                <Button label="Annuler" severity="secondary" outlined @click="showEditSoldDialog = false" />
                <Button
                    label="Enregistrer"
                    icon="pi pi-check"
                    severity="success"
                    :loading="soldPending"
                    :disabled="editSoldValue === null || editSoldValue < 0 || editSoldValue > 5000"
                    @click="submitEditSold"
                />
            </template>
        </Dialog>

        <!-- ── Dialog Recharge ──────────────────────────────────────────────── -->
        <Dialog
            v-model:visible="showRechargeDialog"
            :header="`Recharger le compte de ${rechargeTarget?.username ?? ''}`"
            :style="{ width: '26rem' }"
            modal
            :draggable="false"
        >
            <div class="flex flex-col gap-4 pt-2">
                <div class="flex items-center gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800">
                    <Avatar
                        :label="getInitials(rechargeTarget?.username)"
                        shape="circle"
                        :style="{ backgroundColor: 'var(--p-surface-200)', color: 'var(--p-text-color)', fontWeight: '600' }"
                    />
                    <div>
                        <div class="font-semibold">{{ rechargeTarget?.fullname || rechargeTarget?.username }}</div>
                        <div class="text-xs text-muted-color">
                            Solde actuel :
                            <strong>{{ fmtEC(getUserBalance(rechargeTarget ?? {})) ?? 'N/D' }}</strong>
                        </div>
                    </div>
                </div>

                <div class="flex flex-col gap-1">
                    <label class="text-sm font-medium">Montant à ajouter (EC)</label>
                    <InputNumber
                        v-model="rechargeAmount"
                        :min="1"
                        :step="1"
                        showButtons
                        buttonLayout="horizontal"
                        decrementButtonIcon="pi pi-minus"
                        incrementButtonIcon="pi pi-plus"
                        class="w-full"
                        placeholder="Ex : 50"
                        fluid
                    />
                </div>
            </div>

            <template #footer>
                <Button label="Annuler" severity="secondary" outlined @click="showRechargeDialog = false" />
                <Button
                    label="Recharger"
                    icon="pi pi-wallet"
                    severity="info"
                    :loading="rechargePending"
                    :disabled="!rechargeAmount || rechargeAmount <= 0"
                    @click="submitRecharge"
                />
            </template>
        </Dialog>

        <!-- ── Dialog Mot de passe de transaction ──────────────────────────── -->
        <Dialog
            v-model:visible="showPinDialog"
            :header="`Mot de passe de transaction — ${pinTarget?.username ?? ''}`"
            :style="{ width: '26rem' }"
            modal
            :draggable="false"
            @hide="pinVisible = false"
        >
            <div class="flex flex-col gap-4 pt-2">
                <div class="flex items-center gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800">
                    <Avatar
                        :label="getInitials(pinTarget?.username)"
                        shape="circle"
                        :style="{ backgroundColor: 'var(--p-surface-200)', color: 'var(--p-text-color)', fontWeight: '600' }"
                    />
                    <div>
                        <div class="font-semibold">{{ pinTarget?.fullname || pinTarget?.username }}</div>
                        <div class="text-xs text-muted-color">{{ pinTarget?.email }}</div>
                    </div>
                </div>

                <!-- Chargement -->
                <div v-if="pinLoading" class="flex items-center justify-center py-4 gap-2 text-muted-color">
                    <i class="pi pi-spin pi-spinner" />
                    <span class="text-sm">Récupération en cours…</span>
                </div>

                <!-- Erreur -->
                <Message v-else-if="pinError" severity="error" :closable="false" class="text-sm">
                    {{ pinError }}
                </Message>

                <!-- Mot de passe -->
                <div v-else class="flex flex-col gap-2">
                    <label class="text-sm font-medium">Mot de passe de transaction</label>
                    <div class="flex items-center gap-2">
                        <InputText
                            :value="pinVisible ? pinValue : pinValue.replace(/./g, '●')"
                            readonly
                            class="flex-1 font-mono text-lg tracking-widest"
                        />
                        <Button
                            :icon="pinVisible ? 'pi pi-eye-slash' : 'pi pi-eye'"
                            severity="secondary"
                            outlined
                            @click="pinVisible = !pinVisible"
                            v-tooltip="pinVisible ? 'Masquer' : 'Afficher'"
                        />
                        <Button
                            icon="pi pi-copy"
                            severity="secondary"
                            outlined
                            @click="copyPin"
                            v-tooltip="'Copier'"
                        />
                    </div>
                    <p class="text-xs text-orange-500 dark:text-orange-400">
                        <i class="pi pi-exclamation-triangle mr-1" />
                        Information confidentielle — ne pas divulguer à des tiers.
                    </p>
                </div>
            </div>

            <template #footer>
                <Button label="Fermer" severity="secondary" outlined @click="showPinDialog = false" />
            </template>
        </Dialog>

        <!-- ── Dialog Reset Password ────────────────────────────────────────── -->
        <Dialog
            v-model:visible="showResetDialog"
            :header="`Réinitialiser le mot de passe de ${resetTarget?.username ?? ''}`"
            :style="{ width: '28rem' }"
            modal
            :draggable="false"
        >
            <div class="flex flex-col gap-4 pt-2">
                <div class="flex items-center gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800">
                    <Avatar
                        :label="getInitials(resetTarget?.username)"
                        shape="circle"
                        :style="{ backgroundColor: 'var(--p-surface-200)', color: 'var(--p-text-color)', fontWeight: '600' }"
                    />
                    <div>
                        <div class="font-semibold">{{ resetTarget?.fullname || resetTarget?.username }}</div>
                        <div class="text-xs text-muted-color">{{ resetTarget?.email }}</div>
                    </div>
                </div>

                <Message severity="warn" :closable="false" class="text-sm">
                    Un nouveau mot de passe sera généré automatiquement et envoyé à l'utilisateur.
                </Message>

                <div v-if="generatedPassword" class="flex flex-col gap-1">
                    <label class="text-sm font-medium">Nouveau mot de passe généré</label>
                    <div class="flex items-center gap-2">
                        <InputText :value="generatedPassword" readonly class="flex-1 font-mono" />
                        <Button icon="pi pi-copy" severity="secondary" outlined @click="copyPassword" v-tooltip="'Copier'" />
                    </div>
                    <p class="text-xs text-muted-color">Transmettez ce mot de passe à l'utilisateur de manière sécurisée.</p>
                </div>
            </div>

            <template #footer>
                <Button label="Fermer" severity="secondary" outlined @click="showResetDialog = false" />
                <Button
                    v-if="!generatedPassword"
                    label="Générer un nouveau mot de passe"
                    icon="pi pi-key"
                    severity="warning"
                    :loading="resetPending"
                    @click="submitReset"
                />
            </template>
        </Dialog>

        <!-- ── ⚠️ Zone dangereuse ───────────────────────────────────────────── -->
        <div class="card border border-red-200 dark:border-red-900/40 bg-red-50/40 dark:bg-red-900/10">
            <div class="flex items-start gap-3 mb-4">
                <div class="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
                    <i class="pi pi-exclamation-triangle text-red-500" />
                </div>
                <div>
                    <h3 class="font-bold text-red-600 dark:text-red-400">Zone dangereuse</h3>
                    <p class="text-sm text-muted-color mt-0.5">Ces actions sont irréversibles. Utilisez-les avec précaution.</p>
                </div>
            </div>

            <div class="flex items-center justify-between flex-wrap gap-4 rounded-xl border border-red-200 dark:border-red-800/40 bg-white dark:bg-surface-900 p-4">
                <div>
                    <div class="font-semibold text-surface-900 dark:text-surface-0 text-sm">
                        Réinitialiser tous les soldes à 0 EC
                    </div>
                    <div class="text-xs text-muted-color mt-1">
                        Remet le solde de <strong>tous</strong> les utilisateurs BIM NEXT à 0. À utiliser uniquement lors d'un nouveau départ.
                    </div>
                    <div v-if="resetDone" class="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">
                        <i class="pi pi-check mr-1" />Réinitialisation effectuée pour cette session.
                    </div>
                </div>
                <Button
                    label="Réinitialiser tous les soldes"
                    icon="pi pi-refresh"
                    severity="danger"
                    :disabled="resetDone"
                    @click="openResetConfirm"
                />
            </div>
        </div>

        <!-- ── Dialog confirmation reset ────────────────────────────────────── -->
        <Dialog
            v-model:visible="resetConfDialog"
            header="⚠️ Confirmation requise"
            modal
            style="width:30rem"
            :draggable="false"
        >
            <div class="flex flex-col gap-4">
                <div class="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-300">
                    <strong>Attention :</strong> Cette action va remettre le solde de <strong>tous</strong> les utilisateurs BIM NEXT à <strong>0 EC</strong>. Cette opération est <strong>irréversible</strong>.
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">
                        Tapez <code class="bg-surface-100 dark:bg-surface-800 px-1.5 py-0.5 rounded text-red-600 dark:text-red-400 font-mono text-xs">{{ RESET_KEYWORD }}</code> pour confirmer
                    </label>
                    <InputText
                        v-model="resetTyped"
                        :placeholder="RESET_KEYWORD"
                        class="w-full font-mono"
                        autofocus
                        @keyup.enter="executeResetAll"
                    />
                </div>
            </div>
            <template #footer>
                <Button label="Annuler" severity="secondary" outlined @click="resetConfDialog = false" :disabled="resetLoading" />
                <Button
                    label="Réinitialiser tous les soldes"
                    icon="pi pi-exclamation-triangle"
                    severity="danger"
                    :loading="resetLoading"
                    :disabled="resetTyped !== RESET_KEYWORD"
                    @click="executeResetAll"
                />
            </template>
        </Dialog>
    </div>
</template>
