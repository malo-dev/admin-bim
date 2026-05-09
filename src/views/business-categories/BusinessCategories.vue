<script setup>
import { ref, computed, watch } from 'vue';
import { refDebounced } from '@vueuse/core';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { useSectorsQuery } from '@/modules/sectors/queries/sectors.queries';
import {
    useCreateSectorMutation,
    useUpdateSectorMutation,
    useDeleteSectorMutation,
} from '@/modules/sectors/mutations/sectors.mutations';

const toast = useToast();
const confirm = useConfirm();

// ── Filters ────────────────────────────────────────────────────────────────────
const searchInput = ref('');
const search = refDebounced(searchInput, 400);
const currentPage = ref(1);
const pageSize = ref(10);

watch(search, () => { currentPage.value = 1; });

const filters = computed(() => ({
    search: search.value || undefined,
    page: currentPage.value,
    pageSize: pageSize.value,
}));

const { data, isLoading, isFetching } = useSectorsQuery(filters);

const sectors = computed(() => data.value?.data ?? []);
const totalRecords = computed(() => data.value?.total ?? 0);

function onPage(event) {
    currentPage.value = event.page + 1;
    pageSize.value = event.rows;
}

// ── Mutations ──────────────────────────────────────────────────────────────────
const { mutate: createSector, isPending: createPending } = useCreateSectorMutation();
const { mutate: updateSector, isPending: updatePending } = useUpdateSectorMutation();
const { mutate: deleteSector, isPending: deletePending } = useDeleteSectorMutation();

// ── Create dialog ──────────────────────────────────────────────────────────────
const createDialog = ref(false);
const createForm = ref({ name: '', description: '', logo: '' });

function openCreate() {
    createForm.value = { name: '', description: '', logo: '' };
    createDialog.value = true;
}

function submitCreate() {
    createSector(
        { name: createForm.value.name, description: createForm.value.description || undefined, logo: createForm.value.logo || undefined },
        {
            onSuccess: () => {
                toast.add({ severity: 'success', summary: 'Créé', detail: 'Secteur ajouté avec succès', life: 3000 });
                createDialog.value = false;
            },
            onError: (err) =>
                toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
        }
    );
}

// ── Edit dialog ────────────────────────────────────────────────────────────────
const editDialog = ref(false);
const editForm = ref({ id: null, name: '', description: '', logo: '' });

function openEdit(row) {
    editForm.value = { id: row.businessId, name: row.name ?? '', description: row.description ?? '', logo: row.logo ?? '' };
    editDialog.value = true;
}

function submitEdit() {
    updateSector(
        { id: editForm.value.id, payload: { name: editForm.value.name, description: editForm.value.description, logo: editForm.value.logo } },
        {
            onSuccess: () => {
                toast.add({ severity: 'success', summary: 'Mis à jour', detail: 'Secteur modifié avec succès', life: 3000 });
                editDialog.value = false;
            },
            onError: (err) =>
                toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
        }
    );
}

// ── Delete ────────────────────────────────────────────────────────────────────
function confirmDelete(row) {
    confirm.require({
        message: `Supprimer le secteur « ${row.name} » ? Les entreprises liées perdront ce secteur.`,
        header: 'Confirmation',
        icon: 'pi pi-exclamation-triangle',
        rejectProps: { label: 'Annuler', severity: 'secondary', outlined: true },
        acceptProps: { label: 'Supprimer', severity: 'danger' },
        accept: () =>
            deleteSector(row.businessId, {
                onSuccess: () => toast.add({ severity: 'success', summary: 'Supprimé', detail: 'Secteur supprimé', life: 3000 }),
                onError: (err) =>
                    toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
            }),
    });
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
                    <i class="pi pi-tag text-primary text-lg" />
                </div>
                <div>
                    <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Secteurs d'activité</h1>
                    <p class="text-sm text-muted-color">Catégories business de la plateforme</p>
                </div>
            </div>
            <Button label="Ajouter un secteur" icon="pi pi-plus" @click="openCreate" />
        </div>

        <div class="card">
            <!-- Toolbar -->
            <div class="flex items-center gap-3 mb-5 flex-wrap">
                <IconField class="flex-1 min-w-56">
                    <InputIcon class="pi pi-search" />
                    <InputText v-model="searchInput" placeholder="Rechercher un secteur…" class="w-full" />
                </IconField>
                <span class="text-sm text-muted-color ml-auto whitespace-nowrap">
                    <i v-if="isFetching && !isLoading" class="pi pi-spin pi-spinner text-xs mr-1" />
                    {{ totalRecords }} secteur(s)
                </span>
            </div>

            <!-- DataTable -->
            <DataTable
                :value="sectors"
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
            >
                <template #empty>
                    <div class="text-center py-12 text-muted-color">
                        <i class="pi pi-tag text-4xl mb-3 block opacity-30" />
                        <p class="font-medium">Aucun secteur trouvé</p>
                    </div>
                </template>

                <!-- Secteur -->
                <Column header="Secteur" style="min-width:16rem">
                    <template #body="{ data: row }">
                        <div class="flex items-center gap-3">
                            <Avatar
                                v-if="row.logo"
                                :image="row.logo"
                                shape="circle"
                            />
                            <Avatar
                                v-else
                                :label="getInitials(row.name)"
                                shape="circle"
                                :style="{ backgroundColor: 'var(--p-primary-100)', color: 'var(--p-primary-700)', fontWeight: '700' }"
                            />
                            <div>
                                <div class="font-semibold text-surface-900 dark:text-surface-0">{{ row.name }}</div>
                                <div v-if="row.description" class="text-xs text-muted-color line-clamp-1 max-w-xs">
                                    {{ row.description }}
                                </div>
                            </div>
                        </div>
                    </template>
                </Column>

                <!-- Entreprises liées -->
                <Column header="Entreprises" style="min-width:9rem">
                    <template #body="{ data: row }">
                        <Tag
                            v-if="row.companies?.length"
                            :value="`${row.companies.length} entreprise(s)`"
                            severity="info"
                        />
                        <span v-else class="text-muted-color text-sm">—</span>
                    </template>
                </Column>

                <!-- Date -->
                <Column header="Créé le" style="min-width:9rem">
                    <template #body="{ data: row }">{{ formatDate(row.createdAt) }}</template>
                </Column>

                <!-- Actions -->
                <Column header="Actions" style="min-width:8rem" alignHeader="right">
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

        <!-- Create Dialog -->
        <Dialog v-model:visible="createDialog" header="Nouveau secteur d'activité" modal style="width:34rem" :draggable="false">
            <div class="flex flex-col gap-4 pt-1">
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Nom du secteur <span class="text-red-400">*</span></label>
                    <InputText v-model="createForm.name" placeholder="Ex: Restauration, Technologie…" />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Logo (URL)</label>
                    <InputText v-model="createForm.logo" placeholder="https://cdn-icons-png.flaticon.com/512/…" />
                    <div v-if="createForm.logo" class="flex items-center gap-2 mt-1">
                        <img :src="createForm.logo" alt="aperçu" class="w-8 h-8 rounded object-contain" @error="createForm.logo = ''" />
                        <span class="text-xs text-muted-color">Aperçu</span>
                    </div>
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Description</label>
                    <Textarea v-model="createForm.description" placeholder="Description du secteur…" rows="3" autoResize />
                </div>
            </div>
            <template #footer>
                <Button label="Annuler" severity="secondary" outlined @click="createDialog = false" :disabled="createPending" />
                <Button label="Créer" icon="pi pi-check" :loading="createPending" :disabled="!createForm.name" @click="submitCreate" />
            </template>
        </Dialog>

        <!-- Edit Dialog -->
        <Dialog v-model:visible="editDialog" header="Modifier le secteur" modal style="width:34rem" :draggable="false">
            <div class="flex flex-col gap-4 pt-1">
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Nom du secteur</label>
                    <InputText v-model="editForm.name" />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Logo (URL)</label>
                    <InputText v-model="editForm.logo" placeholder="https://cdn-icons-png.flaticon.com/512/…" />
                    <div v-if="editForm.logo" class="flex items-center gap-2 mt-1">
                        <img :src="editForm.logo" alt="aperçu" class="w-8 h-8 rounded object-contain" @error="editForm.logo = ''" />
                        <span class="text-xs text-muted-color">Aperçu</span>
                    </div>
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Description</label>
                    <Textarea v-model="editForm.description" rows="3" autoResize />
                </div>
            </div>
            <template #footer>
                <Button label="Annuler" severity="secondary" outlined @click="editDialog = false" :disabled="updatePending" />
                <Button label="Enregistrer" icon="pi pi-check" :loading="updatePending" :disabled="!editForm.name" @click="submitEdit" />
            </template>
        </Dialog>
    </div>
</template>
