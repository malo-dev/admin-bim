<script setup>
import { ref, computed, watch } from 'vue';
import { refDebounced } from '@vueuse/core';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import {
    useProductsQuery,
    useAllCompaniesForProductQuery,
    useAllCurrenciesQuery,
} from '@/modules/products/queries/products.queries';
import {
    useCreateProductsMutation,
    useUpdateProductMutation,
    useDeleteProductMutation,
} from '@/modules/products/mutations/products.mutations';

const toast = useToast();
const confirm = useConfirm();

const SERVER_ROOT = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace('/api/v1', '');

function imageUrl(path) {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return SERVER_ROOT + path;
}

// ── Filters ────────────────────────────────────────────────────────────────────
const searchInput = ref('');
const search = refDebounced(searchInput, 400);
const selectedCompanyId = ref(null);
const currentPage = ref(1);
const pageSize = ref(20);

watch([search, selectedCompanyId], () => { currentPage.value = 1; });

const filters = computed(() => ({
    search: search.value || undefined,
    companyId: selectedCompanyId.value || undefined,
    page: currentPage.value,
    pageSize: pageSize.value,
}));

const { data, isLoading, isFetching } = useProductsQuery(filters);
const { data: companyOptions } = useAllCompaniesForProductQuery();
const { data: currencyOptions } = useAllCurrenciesQuery();

const products = computed(() => data.value?.data ?? []);
const totalRecords = computed(() => data.value?.total ?? 0);

function onPage(event) {
    currentPage.value = event.page + 1;
    pageSize.value = event.rows;
}

// ── Mutations ──────────────────────────────────────────────────────────────────
const { mutate: createProducts, isPending: createPending } = useCreateProductsMutation();
const { mutate: updateProduct, isPending: updatePending } = useUpdateProductMutation();
const { mutate: deleteProduct, isPending: deletePending } = useDeleteProductMutation();

// ── Helpers ───────────────────────────────────────────────────────────────────
function emptyForm() {
    return {
        name: '',
        price: null,
        description: '',
        qty: null,
        currencyId: null,
        companyId: null,
        unityMesure: '',
        expiredAt: null,
        warning: '',
        TVA: null,
        threshold: null,
        reduction: null,
    };
}

function formatDate(d) {
    return d ? new Date(d).toLocaleDateString('fr-FR') : '—';
}
function getInitials(name) {
    return name ? name[0].toUpperCase() : '?';
}
function currencySymbol(currencyId) {
    const c = (currencyOptions.value ?? []).find((c) => c.value === currencyId);
    return c?.symbol ?? '';
}

// ── Create dialog ──────────────────────────────────────────────────────────────
const createDialog = ref(false);
const createForm = ref(emptyForm());

function openCreate() {
    createForm.value = emptyForm();
    createDialog.value = true;
}

const canCreate = computed(() =>
    !!createForm.value.name &&
    createForm.value.price !== null && createForm.value.price !== '' &&
    !!createForm.value.description &&
    createForm.value.qty !== null && createForm.value.qty !== '' &&
    !!createForm.value.currencyId &&
    !!createForm.value.companyId
);

function submitCreate() {
    const f = createForm.value;
    const payload = {
        name: f.name,
        price: f.price,
        description: f.description,
        qty: f.qty,
        currencyId: f.currencyId,
        companyId: f.companyId,
        ...(f.unityMesure && { unityMesure: f.unityMesure }),
        ...(f.expiredAt && { expiredAt: f.expiredAt }),
        ...(f.warning && { warning: f.warning }),
        ...(f.TVA !== null && f.TVA !== '' && { TVA: f.TVA }),
        ...(f.threshold !== null && f.threshold !== '' && { threshold: f.threshold }),
        ...(f.reduction !== null && f.reduction !== '' && { reduction: f.reduction }),
    };
    createProducts([payload], {
        onSuccess: (res) => {
            toast.add({ severity: 'success', summary: 'Créé', detail: `${res.count ?? 1} produit(s) créé(s)`, life: 3000 });
            createDialog.value = false;
        },
        onError: (err) =>
            toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
    });
}

// ── Edit dialog ────────────────────────────────────────────────────────────────
const editDialog = ref(false);
const editForm = ref({ id: null, ...emptyForm(), image: null });
const imagePreview = ref(null);
const fileInputRef = ref(null);

function openEdit(row) {
    editForm.value = {
        id: row.productId,
        name: row.name ?? '',
        price: row.price ?? null,
        description: row.description ?? '',
        qty: row.qty ?? null,
        currencyId: row.currencyId ?? null,
        companyId: row.companyId ?? null,
        unityMesure: row.unityMesure ?? '',
        expiredAt: row.expiredAt ? new Date(row.expiredAt) : null,
        warning: row.Warning ?? row.warning ?? '',
        TVA: row.TVA ?? null,
        threshold: row.threshold ?? null,
        reduction: row.reduction ?? null,
        image: null,
    };
    imagePreview.value = imageUrl(row.imageUrl);
    editDialog.value = true;
}

function onFileChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    editForm.value.image = file;
    imagePreview.value = URL.createObjectURL(file);
}

function clearImage() {
    editForm.value.image = null;
    imagePreview.value = null;
    if (fileInputRef.value) fileInputRef.value.value = '';
}

const canEdit = computed(() =>
    !!editForm.value.name &&
    editForm.value.price !== null && editForm.value.price !== '' &&
    !!editForm.value.description &&
    editForm.value.qty !== null && editForm.value.qty !== '' &&
    !!editForm.value.currencyId &&
    !!editForm.value.companyId
);

function submitEdit() {
    const f = editForm.value;
    const payload = {
        name: f.name,
        price: f.price,
        description: f.description,
        qty: f.qty,
        currencyId: f.currencyId,
        companyId: f.companyId,
        unityMesure: f.unityMesure || '',
        expiredAt: f.expiredAt || null,
        warning: f.warning || '',
        TVA: f.TVA ?? '',
        threshold: f.threshold ?? '',
        reduction: f.reduction ?? '',
        ...(f.image && { image: f.image }),
    };
    updateProduct({ id: f.id, payload }, {
        onSuccess: () => {
            toast.add({ severity: 'success', summary: 'Mis à jour', detail: 'Produit modifié avec succès', life: 3000 });
            editDialog.value = false;
        },
        onError: (err) =>
            toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
    });
}

// ── Delete ────────────────────────────────────────────────────────────────────
function confirmDelete(row) {
    confirm.require({
        message: `Supprimer le produit « ${row.name} » ?`,
        header: 'Confirmation',
        icon: 'pi pi-exclamation-triangle',
        rejectProps: { label: 'Annuler', severity: 'secondary', outlined: true },
        acceptProps: { label: 'Supprimer', severity: 'danger' },
        accept: () =>
            deleteProduct(row.productId, {
                onSuccess: () => toast.add({ severity: 'success', summary: 'Supprimé', detail: 'Produit supprimé', life: 3000 }),
                onError: (err) =>
                    toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
            }),
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
                    <i class="pi pi-box text-primary text-lg" />
                </div>
                <div>
                    <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Produits</h1>
                    <p class="text-sm text-muted-color">Catalogue produits de la plateforme BIM</p>
                </div>
            </div>
            <Button label="Ajouter un produit" icon="pi pi-plus" @click="openCreate" />
        </div>

        <div class="card">
            <!-- Toolbar -->
            <div class="flex items-center gap-3 mb-5 flex-wrap">
                <IconField class="flex-1 min-w-56">
                    <InputIcon class="pi pi-search" />
                    <InputText v-model="searchInput" placeholder="Rechercher un produit…" class="w-full" />
                </IconField>
                <Select
                    v-model="selectedCompanyId"
                    :options="companyOptions ?? []"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Toutes les entreprises"
                    showClear
                    class="min-w-52"
                />
                <span class="text-sm text-muted-color ml-auto whitespace-nowrap">
                    <i v-if="isFetching && !isLoading" class="pi pi-spin pi-spinner text-xs mr-1" />
                    {{ totalRecords }} produit(s)
                </span>
            </div>

            <!-- DataTable -->
            <DataTable
                :value="products"
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
                        <i class="pi pi-box text-4xl mb-3 block opacity-30" />
                        <p class="font-medium">Aucun produit trouvé</p>
                    </div>
                </template>

                <!-- Image + Nom -->
                <Column header="Produit" style="min-width:18rem">
                    <template #body="{ data: row }">
                        <div class="flex items-center gap-3">
                            <Avatar
                                v-if="imageUrl(row.imageUrl)"
                                :image="imageUrl(row.imageUrl)"
                                shape="square"
                                size="normal"
                            />
                            <Avatar
                                v-else
                                :label="getInitials(row.name)"
                                shape="square"
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

                <!-- Entreprise -->
                <Column header="Entreprise" style="min-width:11rem">
                    <template #body="{ data: row }">
                        <Tag v-if="row.company?.name" :value="row.company.name" severity="secondary" />
                        <span v-else class="text-muted-color text-sm">—</span>
                    </template>
                </Column>

                <!-- Prix -->
                <Column header="Prix" style="min-width:8rem">
                    <template #body="{ data: row }">
                        <span class="font-semibold">{{ row.price }}</span>
                        <span class="text-xs text-muted-color ml-1">{{ row.currency?.code ?? currencySymbol(row.currencyId) }}</span>
                    </template>
                </Column>

                <!-- Stock -->
                <Column header="Stock" style="min-width:7rem">
                    <template #body="{ data: row }">
                        <Tag
                            :value="`${row.qty} ${row.unityMesure || 'u.'}`"
                            :severity="row.qty === 0 ? 'danger' : row.qty <= (row.threshold ?? 5) ? 'warn' : 'success'"
                        />
                    </template>
                </Column>

                <!-- Unité -->
                <Column header="Unité" style="min-width:7rem">
                    <template #body="{ data: row }">
                        <span class="text-sm">{{ row.unityMesure || '—' }}</span>
                    </template>
                </Column>

                <!-- Expiration -->
                <Column header="Expire le" style="min-width:9rem">
                    <template #body="{ data: row }">{{ formatDate(row.expiredAt) }}</template>
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

        <!-- ── Create Dialog ──────────────────────────────────────────────── -->
        <Dialog v-model:visible="createDialog" header="Nouveau produit" modal style="width:44rem" :draggable="false">
            <div class="flex flex-col gap-4 pt-1">
                <!-- Requis -->
                <div class="grid grid-cols-2 gap-4">
                    <div class="flex flex-col gap-2 col-span-2">
                        <label class="font-medium text-sm">Nom du produit <span class="text-red-400">*</span></label>
                        <InputText v-model="createForm.name" placeholder="Ex: Chambre VIP, Pack internet…" />
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div class="flex flex-col gap-2">
                        <label class="font-medium text-sm">Entreprise <span class="text-red-400">*</span></label>
                        <Select
                            v-model="createForm.companyId"
                            :options="companyOptions ?? []"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Choisir une entreprise"
                            class="w-full"
                            filter
                        />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium text-sm">Devise <span class="text-red-400">*</span></label>
                        <Select
                            v-model="createForm.currencyId"
                            :options="currencyOptions ?? []"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Choisir une devise"
                            class="w-full"
                        />
                    </div>
                </div>

                <div class="grid grid-cols-3 gap-4">
                    <div class="flex flex-col gap-2">
                        <label class="font-medium text-sm">Prix <span class="text-red-400">*</span></label>
                        <InputText v-model.number="createForm.price" type="number" placeholder="0" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium text-sm">Quantité <span class="text-red-400">*</span></label>
                        <InputText v-model.number="createForm.qty" type="number" placeholder="0" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium text-sm">Unité de mesure</label>
                        <InputText v-model="createForm.unityMesure" placeholder="Ex: Nuit, Kg, Litre…" />
                    </div>
                </div>

                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Description <span class="text-red-400">*</span></label>
                    <Textarea v-model="createForm.description" placeholder="Description du produit…" rows="3" autoResize />
                </div>

                <!-- Optionnel -->
                <div class="grid grid-cols-3 gap-4">
                    <div class="flex flex-col gap-2">
                        <label class="font-medium text-sm">Date d'expiration</label>
                        <DatePicker v-model="createForm.expiredAt" placeholder="JJ/MM/AAAA" dateFormat="dd/mm/yy" class="w-full" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium text-sm">Seuil d'alerte stock</label>
                        <InputText v-model.number="createForm.threshold" type="number" placeholder="Ex: 5" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium text-sm">Réduction (%)</label>
                        <InputText v-model.number="createForm.reduction" type="number" placeholder="Ex: 10" />
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div class="flex flex-col gap-2">
                        <label class="font-medium text-sm">TVA (%)</label>
                        <InputText v-model.number="createForm.TVA" type="number" placeholder="Ex: 16" />
                    </div>
                </div>

                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Avertissement / Conditions</label>
                    <Textarea v-model="createForm.warning" placeholder="Ex: Check-in à 14h, annulation tardive…" rows="2" autoResize />
                </div>
            </div>
            <template #footer>
                <Button label="Annuler" severity="secondary" outlined @click="createDialog = false" :disabled="createPending" />
                <Button label="Créer" icon="pi pi-check" :loading="createPending" :disabled="!canCreate" @click="submitCreate" />
            </template>
        </Dialog>

        <!-- ── Edit Dialog ─────────────────────────────────────────────────── -->
        <Dialog v-model:visible="editDialog" header="Modifier le produit" modal style="width:44rem" :draggable="false">
            <div class="flex flex-col gap-4 pt-1">
                <!-- Image -->
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Image du produit</label>
                    <div class="flex items-center gap-4">
                        <div v-if="imagePreview" class="relative">
                            <img :src="imagePreview" alt="aperçu" class="w-20 h-20 rounded-lg object-cover border border-surface-200 dark:border-surface-700" />
                            <button
                                class="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs"
                                @click="clearImage"
                            >×</button>
                        </div>
                        <div v-else class="w-20 h-20 rounded-lg bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-muted-color">
                            <i class="pi pi-image text-2xl opacity-40" />
                        </div>
                        <div class="flex flex-col gap-1">
                            <input ref="fileInputRef" type="file" accept="image/*" class="hidden" @change="onFileChange" />
                            <Button
                                label="Choisir une image"
                                icon="pi pi-upload"
                                severity="secondary"
                                outlined
                                size="small"
                                @click="fileInputRef.click()"
                            />
                            <span class="text-xs text-muted-color">JPG, PNG, WebP — max 5 Mo</span>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div class="flex flex-col gap-2 col-span-2">
                        <label class="font-medium text-sm">Nom du produit <span class="text-red-400">*</span></label>
                        <InputText v-model="editForm.name" />
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div class="flex flex-col gap-2">
                        <label class="font-medium text-sm">Entreprise <span class="text-red-400">*</span></label>
                        <Select
                            v-model="editForm.companyId"
                            :options="companyOptions ?? []"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Choisir une entreprise"
                            class="w-full"
                            filter
                        />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium text-sm">Devise <span class="text-red-400">*</span></label>
                        <Select
                            v-model="editForm.currencyId"
                            :options="currencyOptions ?? []"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Choisir une devise"
                            class="w-full"
                        />
                    </div>
                </div>

                <div class="grid grid-cols-3 gap-4">
                    <div class="flex flex-col gap-2">
                        <label class="font-medium text-sm">Prix <span class="text-red-400">*</span></label>
                        <InputText v-model.number="editForm.price" type="number" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium text-sm">Quantité <span class="text-red-400">*</span></label>
                        <InputText v-model.number="editForm.qty" type="number" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium text-sm">Unité de mesure</label>
                        <InputText v-model="editForm.unityMesure" placeholder="Ex: Nuit, Kg…" />
                    </div>
                </div>

                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Description <span class="text-red-400">*</span></label>
                    <Textarea v-model="editForm.description" rows="3" autoResize />
                </div>

                <div class="grid grid-cols-3 gap-4">
                    <div class="flex flex-col gap-2">
                        <label class="font-medium text-sm">Date d'expiration</label>
                        <DatePicker v-model="editForm.expiredAt" placeholder="JJ/MM/AAAA" dateFormat="dd/mm/yy" class="w-full" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium text-sm">Seuil d'alerte stock</label>
                        <InputText v-model.number="editForm.threshold" type="number" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium text-sm">Réduction (%)</label>
                        <InputText v-model.number="editForm.reduction" type="number" />
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div class="flex flex-col gap-2">
                        <label class="font-medium text-sm">TVA (%)</label>
                        <InputText v-model.number="editForm.TVA" type="number" />
                    </div>
                </div>

                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Avertissement / Conditions</label>
                    <Textarea v-model="editForm.warning" rows="2" autoResize />
                </div>
            </div>
            <template #footer>
                <Button label="Annuler" severity="secondary" outlined @click="editDialog = false" :disabled="updatePending" />
                <Button label="Enregistrer" icon="pi pi-check" :loading="updatePending" :disabled="!canEdit" @click="submitEdit" />
            </template>
        </Dialog>
    </div>
</template>
