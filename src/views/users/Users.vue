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

// Reset page on filter change
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
                <!-- Search -->
                <IconField class="flex-1 min-w-52">
                    <InputIcon class="pi pi-search" />
                    <InputText v-model="searchInput" placeholder="Nom, email, prénom…" class="w-full" />
                </IconField>

                <!-- Commerce filter -->
                <Select
                    v-model="selectedCommerceId"
                    :options="commerceOptions"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Commerce"
                    showClear
                    style="min-width:13rem"
                />

                <!-- Date range -->
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

                <!-- Clear filters -->
                <Button
                    v-if="hasActiveFilters"
                    icon="pi pi-filter-slash"
                    severity="secondary"
                    outlined
                    label="Effacer"
                    @click="clearFilters"
                />

                <!-- Count -->
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
                <Column header="Actions" style="min-width:10rem" alignHeader="right">
                    <template #body="{ data: row }">
                        <div class="flex gap-1 justify-end">
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
    </div>
</template>
