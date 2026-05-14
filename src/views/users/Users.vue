<script setup>
import { ref, computed, watch } from 'vue';
import { refDebounced } from '@vueuse/core';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { useUsersQuery, useCommercesQuery } from '@/modules/users/queries/users.queries';
import {
    useToggleUserActiveMutation,
    useToggleUserBlockMutation,
    useDeleteUserMutation,
    useRechargeUserMutation,
    useResetUserPasswordMutation,
} from '@/modules/users/mutations/users.mutations';

const toast = useToast();
const confirm = useConfirm();

// ── Filters ────────────────────────────────────────────────────────────────────
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

// ── Queries ────────────────────────────────────────────────────────────────────
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

// ── Mutations ──────────────────────────────────────────────────────────────────
const { mutate: toggleActive, isPending: activePending } = useToggleUserActiveMutation();
const { mutate: toggleBlock, isPending: blockPending } = useToggleUserBlockMutation();
const { mutate: deleteUser, isPending: deletePending } = useDeleteUserMutation();
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

// ── Recharge dialog ────────────────────────────────────────────────────────────
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

// ── Reset password dialog ──────────────────────────────────────────────────────
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

function fmtBalance(val) {
    if (val === undefined || val === null) return '—';
    return Number(val).toLocaleString('fr-FR') + ' EC';
}
</script>

<template>
    <div class="flex flex-col gap-4">
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

            <!-- DataTable -->
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
                        <p v-if="hasActiveFilters" class="text-sm mt-1">
                            Essayez de modifier les filtres
                        </p>
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
                            class="font-semibold text-sm"
                            :class="(row.balance ?? row.wallet?.balance ?? 0) > 0 ? 'text-green-600 dark:text-green-400' : 'text-muted-color'"
                        >
                            {{ fmtBalance(row.balance ?? row.wallet?.balance) }}
                        </span>
                    </template>
                </Column>

                <!-- Commerce -->
                <Column header="Commerce" style="min-width:11rem">
                    <template #body="{ data: row }">
                        <span v-if="getCommerceName(row)" class="text-sm">{{ getCommerceName(row) }}</span>
                        <span v-else class="text-muted-color text-sm">—</span>
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
                            <!-- Recharger -->
                            <Button
                                v-tooltip.top="'Recharger le compte'"
                                icon="pi pi-wallet"
                                severity="info"
                                outlined
                                rounded
                                size="small"
                                @click="openRechargeDialog(row)"
                            />
                            <!-- Réinitialiser MDP -->
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
                            <!-- Activer/Désactiver -->
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
                            <!-- Bloquer/Débloquer -->
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
                            <!-- Supprimer -->
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
                            Solde actuel : <strong>{{ fmtBalance(rechargeTarget?.balance ?? rechargeTarget?.wallet?.balance) }}</strong>
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

                <!-- Affiche le nouveau mot de passe après génération -->
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
    </div>
</template>
