<script setup>
import { ref, computed, watch } from 'vue';
import { refDebounced } from '@vueuse/core';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { useProductsQuery, useAllCurrenciesQuery } from '@/modules/products/queries/products.queries';
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
    return path.startsWith('http') ? path : SERVER_ROOT + path;
}

// ── Filtres : uniquement les produits sans entreprise (standalone) ─────────────
const searchInput = ref('');
const search = refDebounced(searchInput, 400);
const currentPage = ref(1);
const pageSize = ref(20);

watch(search, () => { currentPage.value = 1; });

const filters = computed(() => ({
    search: search.value || undefined,
    standalone: 'true',
    page: currentPage.value,
    pageSize: pageSize.value,
}));

const { data, isLoading, isFetching } = useProductsQuery(filters);
const { data: currencyOptions } = useAllCurrenciesQuery();

const products = computed(() => data.value?.data ?? []);
const totalRecords = computed(() => data.value?.total ?? 0);

function onPage(event) {
    currentPage.value = event.page + 1;
    pageSize.value = event.rows;
}

function currencySymbol(currencyId) {
    return (currencyOptions.value ?? []).find((c) => c.value === currencyId)?.symbol ?? '';
}
function getInitials(name) {
    return name ? name[0].toUpperCase() : '?';
}

// ── Image compression (identique au module Produits) ────────────────────────────
async function compressImage(file, maxBytes = 300 * 1024) {
    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            const canvas = document.createElement('canvas');
            let { width, height } = img;
            const MAX_DIM = 1200;
            if (width > MAX_DIM || height > MAX_DIM) {
                const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }
            canvas.width = width;
            canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            let quality = 0.85;
            const tryCompress = () => {
                canvas.toBlob((blob) => {
                    if (blob.size <= maxBytes || quality <= 0.15) {
                        resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
                    } else {
                        quality -= 0.1;
                        tryCompress();
                    }
                }, 'image/jpeg', quality);
            };
            tryCompress();
        };
        img.src = url;
    });
}

// ── Mutations ────────────────────────────────────────────────────────────────
const { mutate: createProducts, isPending: createPending } = useCreateProductsMutation();
const { mutate: updateProduct, isPending: updatePending } = useUpdateProductMutation();
const { mutate: deleteProduct, isPending: deletePending } = useDeleteProductMutation();

function emptyForm() {
    return { name: '', price: null, description: '', currencyId: null, unityMesure: '' };
}

// ── Create dialog ────────────────────────────────────────────────────────────
const createDialog = ref(false);
const createForm = ref(emptyForm());
const createImageFile = ref(null);
const createImagePreview = ref(null);
const createFileInputRef = ref(null);

function openCreate() {
    createForm.value = emptyForm();
    createImageFile.value = null;
    createImagePreview.value = null;
    createDialog.value = true;
}

async function onCreateFileChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    createImageFile.value = await compressImage(file);
    createImagePreview.value = URL.createObjectURL(createImageFile.value);
}

const canCreate = computed(() =>
    !!createForm.value.name &&
    createForm.value.price !== null && createForm.value.price !== '' &&
    !!createForm.value.description
);

function submitCreate() {
    const f = createForm.value;
    // Pas de companyId : ce produit apparaît dans « Produits du moment » sur l'accueil de l'app,
    // indépendamment de toute entreprise.
    const payload = {
        name: f.name,
        price: f.price,
        description: f.description,
        ...(f.currencyId && { currencyId: f.currencyId }),
        ...(f.unityMesure && { unityMesure: f.unityMesure }),
    };
    createProducts([payload], {
        onSuccess: (res) => {
            const newId = res.data?.[0]?.productId;
            if (createImageFile.value && newId) {
                const fd = new FormData();
                fd.append('image', createImageFile.value);
                updateProduct({ id: newId, payload: fd }, {
                    onSuccess: () => toast.add({ severity: 'success', summary: 'Créé', detail: 'Produit ajouté avec image', life: 3000 }),
                });
            } else {
                toast.add({ severity: 'success', summary: 'Créé', detail: 'Produit ajouté', life: 3000 });
            }
            createDialog.value = false;
        },
        onError: (err) =>
            toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
    });
}

// ── Edit dialog ──────────────────────────────────────────────────────────────
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
        currencyId: row.currencyId ?? null,
        unityMesure: row.unityMesure ?? '',
        image: null,
    };
    imagePreview.value = imageUrl(row.imageUrl);
    editDialog.value = true;
}

async function onFileChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    editForm.value.image = await compressImage(file);
    imagePreview.value = URL.createObjectURL(editForm.value.image);
}

const canEdit = computed(() =>
    !!editForm.value.name &&
    editForm.value.price !== null && editForm.value.price !== '' &&
    !!editForm.value.description
);

function submitEdit() {
    const f = editForm.value;
    const payload = {
        name: f.name,
        price: f.price,
        description: f.description,
        currencyId: f.currencyId,
        unityMesure: f.unityMesure || '',
        ...(f.image && { image: f.image }),
    };
    updateProduct({ id: f.id, payload }, {
        onSuccess: () => {
            toast.add({ severity: 'success', summary: 'Mis à jour', detail: 'Produit modifié', life: 3000 });
            editDialog.value = false;
        },
        onError: (err) =>
            toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
    });
}

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
            }),
    });
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <ConfirmDialog />

        <div class="flex items-center justify-between flex-wrap gap-3">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <i class="pi pi-sparkles text-primary text-lg" />
                </div>
                <div>
                    <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Produits aléatoires</h1>
                    <p class="text-sm text-muted-color">
                        Produits non rattachés à une entreprise, affichés dans « Produits du moment » sur l'accueil de l'app BIM
                    </p>
                </div>
            </div>
            <Button label="Ajouter un produit" icon="pi pi-plus" @click="openCreate" />
        </div>

        <div class="card">
            <div class="flex items-center gap-3 mb-5 flex-wrap">
                <IconField class="flex-1 min-w-56">
                    <InputIcon class="pi pi-search" />
                    <InputText v-model="searchInput" placeholder="Rechercher un produit…" class="w-full" />
                </IconField>
                <span class="text-sm text-muted-color ml-auto whitespace-nowrap">
                    <i v-if="isFetching && !isLoading" class="pi pi-spin pi-spinner text-xs mr-1" />
                    {{ totalRecords }} produit(s)
                </span>
            </div>

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
                        <i class="pi pi-sparkles text-4xl mb-3 block opacity-30" />
                        <p class="font-medium">Aucun produit aléatoire pour le moment</p>
                    </div>
                </template>

                <Column header="Produit" style="min-width:18rem">
                    <template #body="{ data: row }">
                        <div class="flex items-center gap-3">
                            <img v-if="imageUrl(row.imageUrl)" :src="imageUrl(row.imageUrl)" class="w-9 h-9 rounded-lg object-contain bg-surface-100 dark:bg-surface-800" />
                            <Avatar v-else :label="getInitials(row.name)" shape="square" :style="{ backgroundColor: 'var(--p-primary-100)', color: 'var(--p-primary-700)', fontWeight: '700' }" />
                            <div>
                                <div class="font-semibold text-surface-900 dark:text-surface-0">{{ row.name }}</div>
                                <div v-if="row.description" class="text-xs text-muted-color line-clamp-1 max-w-xs">{{ row.description }}</div>
                            </div>
                        </div>
                    </template>
                </Column>

                <Column header="Prix" style="min-width:8rem">
                    <template #body="{ data: row }">
                        <span class="font-semibold">{{ row.price }}</span>
                        <span class="text-xs text-muted-color ml-1">{{ row.currency?.code ?? currencySymbol(row.currencyId) }}</span>
                    </template>
                </Column>

                <Column header="Unité" style="min-width:7rem">
                    <template #body="{ data: row }">{{ row.unityMesure || '—' }}</template>
                </Column>

                <Column header="Actions" style="min-width:8rem" alignHeader="right">
                    <template #body="{ data: row }">
                        <div class="flex gap-1 justify-end">
                            <Button v-tooltip.top="'Modifier'" icon="pi pi-pencil" severity="secondary" outlined rounded size="small" @click="openEdit(row)" />
                            <Button v-tooltip.top="'Supprimer'" icon="pi pi-trash" severity="danger" outlined rounded size="small" :loading="deletePending" @click="confirmDelete(row)" />
                        </div>
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- Create -->
        <Dialog v-model:visible="createDialog" header="Nouveau produit aléatoire" modal style="width:36rem" :draggable="false">
            <div class="flex flex-col gap-4 pt-1">
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Image du produit</label>
                    <div class="flex items-center gap-4">
                        <img v-if="createImagePreview" :src="createImagePreview" class="w-20 h-20 rounded-lg object-cover border border-surface-200 dark:border-surface-700" />
                        <div v-else class="w-20 h-20 rounded-lg bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-muted-color">
                            <i class="pi pi-image text-2xl opacity-40" />
                        </div>
                        <div class="flex flex-col gap-1">
                            <input ref="createFileInputRef" type="file" accept="image/*" class="hidden" @change="onCreateFileChange" />
                            <Button label="Choisir une image" icon="pi pi-upload" severity="secondary" outlined size="small" @click="createFileInputRef.click()" />
                        </div>
                    </div>
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Nom du produit <span class="text-red-400">*</span></label>
                    <InputText v-model="createForm.name" placeholder="Ex: Forfait Starlink 50 Go" />
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="flex flex-col gap-2">
                        <label class="font-medium text-sm">Prix <span class="text-red-400">*</span></label>
                        <InputText v-model.number="createForm.price" type="number" placeholder="0" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium text-sm">Devise</label>
                        <Select v-model="createForm.currencyId" :options="currencyOptions ?? []" optionLabel="label" optionValue="value" placeholder="EC par défaut" class="w-full" showClear />
                    </div>
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Description <span class="text-red-400">*</span></label>
                    <Textarea v-model="createForm.description" rows="3" autoResize placeholder="Description du produit…" />
                </div>
            </div>
            <template #footer>
                <Button label="Annuler" severity="secondary" outlined @click="createDialog = false" :disabled="createPending" />
                <Button label="Créer" icon="pi pi-check" :loading="createPending" :disabled="!canCreate" @click="submitCreate" />
            </template>
        </Dialog>

        <!-- Edit -->
        <Dialog v-model:visible="editDialog" header="Modifier le produit" modal style="width:36rem" :draggable="false">
            <div class="flex flex-col gap-4 pt-1">
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Image du produit</label>
                    <div class="flex items-center gap-4">
                        <img v-if="imagePreview" :src="imagePreview" class="w-20 h-20 rounded-lg object-cover border border-surface-200 dark:border-surface-700" />
                        <div v-else class="w-20 h-20 rounded-lg bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-muted-color">
                            <i class="pi pi-image text-2xl opacity-40" />
                        </div>
                        <div class="flex flex-col gap-1">
                            <input ref="fileInputRef" type="file" accept="image/*" class="hidden" @change="onFileChange" />
                            <Button label="Choisir une image" icon="pi pi-upload" severity="secondary" outlined size="small" @click="fileInputRef.click()" />
                        </div>
                    </div>
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Nom du produit <span class="text-red-400">*</span></label>
                    <InputText v-model="editForm.name" />
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="flex flex-col gap-2">
                        <label class="font-medium text-sm">Prix <span class="text-red-400">*</span></label>
                        <InputText v-model.number="editForm.price" type="number" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium text-sm">Devise</label>
                        <Select v-model="editForm.currencyId" :options="currencyOptions ?? []" optionLabel="label" optionValue="value" class="w-full" showClear />
                    </div>
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Description <span class="text-red-400">*</span></label>
                    <Textarea v-model="editForm.description" rows="3" autoResize />
                </div>
            </div>
            <template #footer>
                <Button label="Annuler" severity="secondary" outlined @click="editDialog = false" :disabled="updatePending" />
                <Button label="Enregistrer" icon="pi pi-check" :loading="updatePending" :disabled="!canEdit" @click="submitEdit" />
            </template>
        </Dialog>
    </div>
</template>
