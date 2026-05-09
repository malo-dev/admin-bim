<script setup>
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { refDebounced } from '@vueuse/core';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { useAdminAccountsQuery } from '@/modules/accounts/queries/account.queries';
import {
    useToggleUserActiveMutation,
    useToggleUserBlockMutation,
    useDeleteUserMutation,
    useUpdateUserProfileMutation,
} from '@/modules/users/mutations/users.mutations';

const router = useRouter();
const toast = useToast();
const confirm = useConfirm();

const searchInput = ref('');
const search = refDebounced(searchInput, 400);
const currentPage = ref(1);
const pageSize = ref(20);

watch(search, () => { currentPage.value = 1; });

const filters = computed(() => ({
    search: search.value || undefined,
    page: currentPage.value,
    pageSize: pageSize.value,
}));

const { data, isLoading, isFetching } = useAdminAccountsQuery(filters);

const accounts = computed(() => data.value?.data ?? []);
const totalRecords = computed(() => data.value?.pagination?.total ?? 0);

function onPage(event) {
    currentPage.value = event.page + 1;
    pageSize.value = event.rows;
}

// Mutations
const { mutate: toggleActive, isPending: activePending } = useToggleUserActiveMutation();
const { mutate: toggleBlock, isPending: blockPending } = useToggleUserBlockMutation();
const { mutate: deleteUser, isPending: deletePending } = useDeleteUserMutation();
const { mutate: updateProfile, isPending: updatePending } = useUpdateUserProfileMutation();

function doToggleActive(user) {
    toggleActive(user.id, {
        onSuccess: () =>
            toast.add({
                severity: user.isActive ? 'warn' : 'success',
                summary: user.isActive ? 'Désactivé' : 'Activé',
                detail: `Compte ${user.isActive ? 'désactivé' : 'activé'} avec succès`,
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
                detail: `Compte ${user.isBlocked ? 'débloqué' : 'bloqué'} avec succès`,
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
                onSuccess: () => toast.add({ severity: 'success', summary: 'Supprimé', detail: 'Compte supprimé', life: 3000 }),
                onError: (err) =>
                    toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
            }),
    });
}

// Edit dialog
const editDialog = ref(false);
const editForm = ref({ id: null, username: '', email: '', fullname: '', telephone: '' });

function openEdit(user) {
    editForm.value = {
        id: user.id,
        username: user.username ?? '',
        email: user.email ?? '',
        fullname: user.fullname ?? '',
        telephone: user.telephone ?? '',
    };
    editDialog.value = true;
}

function saveEdit() {
    const { id, ...payload } = editForm.value;
    updateProfile(
        { id, payload },
        {
            onSuccess: () => {
                toast.add({ severity: 'success', summary: 'Mis à jour', detail: 'Compte modifié avec succès', life: 3000 });
                editDialog.value = false;
            },
            onError: (err) =>
                toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
        }
    );
}

function roleSeverity(name) {
    return name === 'BIM' ? 'danger' : 'info';
}
function roleLabel(name) {
    return name === 'BIM' ? 'BIM Admin' : 'Admin Entreprise';
}
function formatDate(d) {
    return d ? new Date(d).toLocaleDateString('fr-FR') : '—';
}
function getInitials(name) {
    return name ? name[0].toUpperCase() : '?';
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <ConfirmDialog />

        <!-- Header -->
        <div class="flex items-center justify-between flex-wrap gap-3">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <i class="pi pi-id-card text-primary text-lg" />
                </div>
                <div>
                    <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Liste des comptes</h1>
                    <p class="text-sm text-muted-color">Administrateurs BIM et Entreprise</p>
                </div>
            </div>
            <Button label="Créer un compte" icon="pi pi-plus" @click="router.push('/accounts/create')" />
        </div>

        <div class="card">
            <!-- Toolbar -->
            <div class="flex items-center gap-3 mb-5 flex-wrap">
                <IconField class="flex-1 min-w-56">
                    <InputIcon class="pi pi-search" />
                    <InputText v-model="searchInput" placeholder="Rechercher par nom, email…" class="w-full" />
                </IconField>
                <span class="text-sm text-muted-color ml-auto">
                    <span v-if="isFetching && !isLoading" class="mr-2"><i class="pi pi-spin pi-spinner text-xs" /></span>
                    {{ totalRecords }} compte(s)
                </span>
            </div>

            <!-- DataTable -->
            <DataTable
                :value="accounts"
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
                        <p class="font-medium">Aucun compte trouvé</p>
                    </div>
                </template>

                <!-- Compte -->
                <Column header="Compte" style="min-width:16rem">
                    <template #body="{ data: row }">
                        <div class="flex items-center gap-3">
                            <Avatar
                                :label="getInitials(row.username)"
                                shape="circle"
                                :style="{ backgroundColor: 'var(--p-primary-100)', color: 'var(--p-primary-700)', fontWeight: '700' }"
                            />
                            <div>
                                <div class="font-semibold text-surface-900 dark:text-surface-0">{{ row.username }}</div>
                                <div class="text-sm text-muted-color">{{ row.email }}</div>
                            </div>
                        </div>
                    </template>
                </Column>

                <!-- Rôle -->
                <Column header="Rôle" style="min-width:12rem">
                    <template #body="{ data: row }">
                        <div class="flex flex-wrap gap-1">
                            <Tag
                                v-for="r in row.role"
                                :key="r.id"
                                :value="roleLabel(r.name)"
                                :severity="roleSeverity(r.name)"
                            />
                        </div>
                    </template>
                </Column>

                <!-- Statut -->
                <Column header="Statut" style="min-width:8rem">
                    <template #body="{ data: row }">
                        <Tag :value="row.isActive ? 'Actif' : 'Inactif'" :severity="row.isActive ? 'success' : 'secondary'" />
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
                <Column header="Actions" style="min-width:11rem" alignHeader="right">
                    <template #body="{ data: row }">
                        <div class="flex gap-1 justify-end">
                            <Button
                                v-tooltip.top="'Modifier'"
                                icon="pi pi-pencil"
                                severity="secondary"
                                outlined
                                rounded
                                size="small"
                                @click="openEdit(row)"
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

        <!-- Edit Dialog -->
        <Dialog
            v-model:visible="editDialog"
            header="Modifier le compte"
            modal
            style="width: 34rem"
            :draggable="false"
        >
            <div class="flex flex-col gap-4 pt-1">
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm text-surface-900 dark:text-surface-0">Nom d'utilisateur</label>
                    <InputText v-model="editForm.username" placeholder="username" />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm text-surface-900 dark:text-surface-0">Email</label>
                    <InputText v-model="editForm.email" type="email" placeholder="email@example.com" />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm text-surface-900 dark:text-surface-0">Nom complet</label>
                    <InputText v-model="editForm.fullname" placeholder="Prénom Nom" />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm text-surface-900 dark:text-surface-0">Téléphone</label>
                    <InputText v-model="editForm.telephone" placeholder="+XXX XXXXXXXXX" />
                </div>
            </div>
            <template #footer>
                <Button label="Annuler" severity="secondary" outlined @click="editDialog = false" :disabled="updatePending" />
                <Button label="Enregistrer" icon="pi pi-check" @click="saveEdit" :loading="updatePending" />
            </template>
        </Dialog>
    </div>
</template>
