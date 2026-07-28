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

/* ── active tab ── */
const activeTab = ref(0);

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

/* ── Mise en avant: all products (paginate false) ── */
const upsellFilters = computed(() => ({ paginate: 'false', pageSize: 500 }));
const { data: upsellData } = useProductsQuery(upsellFilters);
const allUpsellProducts = computed(() => upsellData.value?.data ?? []);

/* sub-section 1: Articles Recommandés (home) — all products */
const recSearch = ref('');
const filteredRec = computed(() => {
    const q = recSearch.value.toLowerCase();
    return q
        ? allUpsellProducts.value.filter((p) => (p.name ?? '').toLowerCase().includes(q) || (p.company?.name ?? '').toLowerCase().includes(q))
        : allUpsellProducts.value;
});

/* sub-section 2: Upselling Panier (cart) — supermarché sector only */
function isSupermarche(p) {
    const sector = (p.company?.category?.name ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const co     = (p.company?.name ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return sector.includes('supermarche') || sector.includes('supermarket') || sector.includes('epicerie')
        || co.includes('supermarche') || co.includes('supermarket') || co.includes('epicerie');
}
const supermarcheProducts = computed(() => allUpsellProducts.value.filter(isSupermarche));
const upsellSearch = ref('');
const filteredUpsell = computed(() => {
    const q = upsellSearch.value.toLowerCase();
    return q
        ? supermarcheProducts.value.filter((p) => (p.name ?? '').toLowerCase().includes(q) || (p.company?.name ?? '').toLowerCase().includes(q))
        : supermarcheProducts.value;
});

const togglingId    = ref(null);
const togglingUpsId = ref(null);

/* ── Image compression (target < 300 KB) ── */
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
    const compressed = await compressImage(file);
    createImageFile.value = compressed;
    createImagePreview.value = URL.createObjectURL(compressed);
}

function clearCreateImage() {
    createImageFile.value = null;
    createImagePreview.value = null;
    if (createFileInputRef.value) createFileInputRef.value.value = '';
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
            const newId = res.data?.[0]?.productId;
            if (createImageFile.value && newId) {
                const fd = new FormData();
                fd.append('image', createImageFile.value);
                updateProduct({ id: newId, payload: fd }, {
                    onSuccess: () => toast.add({ severity: 'success', summary: 'Créé', detail: 'Produit créé avec image', life: 3000 }),
                    onError: () => toast.add({ severity: 'warn', summary: 'Créé sans image', detail: 'Le produit a été créé mais l\'image n\'a pas pu être envoyée', life: 4000 }),
                });
            } else {
                toast.add({ severity: 'success', summary: 'Créé', detail: `${res.count ?? 1} produit(s) créé(s)`, life: 3000 });
            }
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

async function onFileChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    const compressed = await compressImage(file);
    editForm.value.image = compressed;
    imagePreview.value = URL.createObjectURL(compressed);
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

// ── Toggle recommended (home page) ────────────────────────────────────────────
function toggleRecommended(row) {
    togglingId.value = row.productId;
    updateProduct(
        { id: row.productId, payload: { isRecommended: !row.isRecommended } },
        {
            onSuccess: () => {
                const label = !row.isRecommended ? 'Affiché dans « Articles Recommandés »' : 'Retiré des recommandations';
                toast.add({ severity: 'success', summary: 'Mis à jour', detail: label, life: 2500 });
            },
            onError: (err) =>
                toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
            onSettled: () => { togglingId.value = null; },
        }
    );
}

// ── Toggle upselling (cart — supermarché only) ─────────────────────────────────
function toggleUpselling(row) {
    togglingUpsId.value = row.productId;
    updateProduct(
        { id: row.productId, payload: { isUpselling: !row.isUpselling } },
        {
            onSuccess: () => {
                const label = !row.isUpselling ? 'Ajouté au panier upselling' : 'Retiré du panier upselling';
                toast.add({ severity: 'success', summary: 'Mis à jour', detail: label, life: 2500 });
            },
            onError: (err) =>
                toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
            onSettled: () => { togglingUpsId.value = null; },
        }
    );
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
            <div class="flex gap-2">
                <Button v-if="activeTab === 0" label="Ajouter un produit" icon="pi pi-plus" @click="openCreate" />
            </div>
        </div>

        <!-- Tabs -->
        <Tabs :value="activeTab" @update:value="activeTab = $event">
            <TabList>
                <Tab :value="0"><i class="pi pi-box mr-2" />Tous les produits</Tab>
                <Tab :value="1">
                    <i class="pi pi-star mr-2" />Mise en avant
                    <Badge
                        v-if="allUpsellProducts.filter(p => p.isRecommended || p.isUpselling).length"
                        :value="allUpsellProducts.filter(p => p.isRecommended || p.isUpselling).length"
                        severity="warn"
                        class="ml-2"
                    />
                </Tab>
            </TabList>
        </Tabs>

        <!-- ──────────────────────────────────────────────────────────── -->
        <!-- TAB 0 : All products                                         -->
        <!-- ──────────────────────────────────────────────────────────── -->
        <div v-show="activeTab === 0" class="card">
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
        </div><!-- end tab-0 card -->

        <!-- ──────────────────────────────────────────────────────────── -->
        <!-- TAB 1 : Mise en avant (deux sous-sections)                   -->
        <!-- ──────────────────────────────────────────────────────────── -->
        <div v-show="activeTab === 1" class="flex flex-col gap-6">

            <!-- ── SUB 1 : Articles Recommandés (page d'accueil BIM) ────── -->
            <div class="flex flex-col gap-3">
                <div class="flex items-center gap-3 flex-wrap">
                    <div class="flex items-center gap-2">
                        <i class="pi pi-star text-amber-500 text-lg" />
                        <h2 class="text-base font-bold text-surface-900 dark:text-surface-0">Articles Recommandés</h2>
                        <Tag :value="`${allUpsellProducts.filter(p => p.isRecommended).length} actif(s)`" severity="warn" />
                    </div>
                    <p class="text-xs text-muted-color ml-auto">Ces produits apparaissent dans « Articles Recommandés » sur l'accueil de l'app BIM</p>
                </div>

                <div class="card">
                    <div class="flex items-center gap-3 mb-5 flex-wrap">
                        <IconField class="flex-1 min-w-56">
                            <InputIcon class="pi pi-search" />
                            <InputText v-model="recSearch" placeholder="Rechercher un produit, une entreprise…" class="w-full" />
                        </IconField>
                        <span class="text-sm text-muted-color whitespace-nowrap">{{ allUpsellProducts.length }} produit(s)</span>
                    </div>
                    <div v-if="filteredRec.length === 0" class="text-center py-10 text-muted-color">
                        <i class="pi pi-box text-4xl mb-3 block opacity-25" />
                        <p>Aucun produit trouvé</p>
                    </div>
                    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        <div
                            v-for="row in filteredRec"
                            :key="row.productId"
                            class="border rounded-2xl p-4 flex flex-col gap-3 transition-all"
                            :class="row.isRecommended ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10' : 'border-surface-200 dark:border-surface-700'"
                        >
                            <div class="flex items-center gap-3">
                                <Avatar v-if="imageUrl(row.imageUrl)" :image="imageUrl(row.imageUrl)" shape="square" size="large" class="rounded-xl shrink-0" />
                                <Avatar v-else :label="(row.name ?? '?')[0].toUpperCase()" shape="square" size="large" :style="{ backgroundColor: 'var(--p-primary-100)', color: 'var(--p-primary-700)', fontWeight: '700' }" class="shrink-0" />
                                <div class="min-w-0">
                                    <p class="font-bold text-surface-900 dark:text-surface-0 truncate text-sm">{{ row.name }}</p>
                                    <p class="text-xs text-muted-color truncate">{{ row.company?.name ?? '—' }}</p>
                                    <p class="text-xs font-semibold text-primary">{{ Number(row.price ?? 0).toFixed(2) }} EC</p>
                                </div>
                            </div>
                            <div class="flex items-center justify-between mt-auto pt-3 border-t border-surface-100 dark:border-surface-800">
                                <span class="text-xs font-medium" :class="row.isRecommended ? 'text-amber-600 dark:text-amber-400' : 'text-muted-color'">
                                    <i :class="['pi mr-1', row.isRecommended ? 'pi-star-fill text-amber-400' : 'pi-star']" />
                                    {{ row.isRecommended ? 'Recommandé' : 'Non recommandé' }}
                                </span>
                                <ToggleSwitch
                                    :modelValue="!!row.isRecommended"
                                    :disabled="togglingId === row.productId"
                                    @update:modelValue="toggleRecommended(row)"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ── SUB 2 : Ventes croisées Supermarché (panier BIM) ──────── -->
            <div class="flex flex-col gap-3">
                <div class="flex items-center gap-3 flex-wrap">
                    <div class="flex items-center gap-2">
                        <i class="pi pi-shopping-cart text-primary text-lg" />
                        <h2 class="text-base font-bold text-surface-900 dark:text-surface-0">Ventes croisées Supermarché</h2>
                        <Tag :value="`${supermarcheProducts.filter(p => p.isUpselling).length} actif(s)`" severity="primary" />
                    </div>
                    <p class="text-xs text-muted-color ml-auto">Ces produits s'affichent dans « Complétez votre panier » — uniquement secteur Supermarché</p>
                </div>

                <div class="card">
                    <div class="flex items-center gap-3 mb-5 flex-wrap">
                        <IconField class="flex-1 min-w-56">
                            <InputIcon class="pi pi-search" />
                            <InputText v-model="upsellSearch" placeholder="Rechercher un produit supermarché…" class="w-full" />
                        </IconField>
                        <span class="text-sm text-muted-color whitespace-nowrap">{{ supermarcheProducts.length }} produit(s) supermarché</span>
                    </div>

                    <!-- No supermarché products at all -->
                    <div v-if="supermarcheProducts.length === 0" class="text-center py-10 text-muted-color">
                        <i class="pi pi-shopping-bag text-4xl mb-3 block opacity-25" />
                        <p class="font-medium">Aucune entreprise Supermarché trouvée</p>
                        <p class="text-xs mt-1">Les entreprises dont le secteur contient « Supermarché » ou « Épicerie » apparaîtront ici</p>
                    </div>

                    <!-- Filtered results empty -->
                    <div v-else-if="filteredUpsell.length === 0" class="text-center py-10 text-muted-color">
                        <i class="pi pi-search text-4xl mb-3 block opacity-25" />
                        <p>Aucun résultat pour cette recherche</p>
                    </div>

                    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        <div
                            v-for="row in filteredUpsell"
                            :key="row.productId"
                            class="border rounded-2xl p-4 flex flex-col gap-3 transition-all"
                            :class="row.isUpselling ? 'border-primary/50 bg-primary/5 dark:bg-primary/10' : 'border-surface-200 dark:border-surface-700'"
                        >
                            <div class="flex items-center gap-3">
                                <Avatar v-if="imageUrl(row.imageUrl)" :image="imageUrl(row.imageUrl)" shape="square" size="large" class="rounded-xl shrink-0" />
                                <Avatar v-else :label="(row.name ?? '?')[0].toUpperCase()" shape="square" size="large" :style="{ backgroundColor: 'var(--p-primary-100)', color: 'var(--p-primary-700)', fontWeight: '700' }" class="shrink-0" />
                                <div class="min-w-0">
                                    <p class="font-bold text-surface-900 dark:text-surface-0 truncate text-sm">{{ row.name }}</p>
                                    <p class="text-xs text-muted-color truncate">{{ row.company?.name ?? '—' }}</p>
                                    <p class="text-xs font-semibold text-primary">{{ Number(row.price ?? 0).toFixed(2) }} EC</p>
                                </div>
                            </div>
                            <div class="flex items-center justify-between mt-auto pt-3 border-t border-surface-100 dark:border-surface-800">
                                <span class="text-xs font-medium" :class="row.isUpselling ? 'text-primary' : 'text-muted-color'">
                                    <i :class="['pi mr-1', row.isUpselling ? 'pi-cart-plus text-primary' : 'pi-cart-plus']" />
                                    {{ row.isUpselling ? 'Dans le panier' : 'Non affiché' }}
                                </span>
                                <ToggleSwitch
                                    :modelValue="!!row.isUpselling"
                                    :disabled="togglingUpsId === row.productId"
                                    @update:modelValue="toggleUpselling(row)"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ── Create Dialog ──────────────────────────────────────────────── -->
        <Dialog v-model:visible="createDialog" header="Nouveau produit" modal style="width:44rem" :draggable="false">
            <div class="flex flex-col gap-4 pt-1">
                <!-- Image upload -->
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Image du produit</label>
                    <div class="flex items-center gap-4">
                        <div v-if="createImagePreview" class="relative">
                            <img :src="createImagePreview" alt="aperçu" class="w-20 h-20 rounded-lg object-cover border border-surface-200 dark:border-surface-700" />
                            <button class="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs" @click="clearCreateImage">×</button>
                        </div>
                        <div v-else class="w-20 h-20 rounded-lg bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-muted-color">
                            <i class="pi pi-image text-2xl opacity-40" />
                        </div>
                        <div class="flex flex-col gap-1">
                            <input ref="createFileInputRef" type="file" accept="image/*" class="hidden" @change="onCreateFileChange" />
                            <Button label="Choisir une image" icon="pi pi-upload" severity="secondary" outlined size="small" @click="createFileInputRef.click()" />
                            <span class="text-xs text-muted-color">JPG, PNG, WebP — compressée automatiquement ≤ 300 Ko</span>
                        </div>
                    </div>
                </div>

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
                            <span class="text-xs text-muted-color">JPG, PNG, WebP — compressée automatiquement ≤ 300 Ko</span>
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
