<script setup>
import { ref, computed, watch } from 'vue';
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import {
    useProductCategoriesQuery,
} from '@/modules/product-categories/queries/product-categories.queries';
import {
    useCreateCategoryMutation,
    useUpdateCategoryMutation,
    useDeleteCategoryMutation,
} from '@/modules/product-categories/mutations/product-categories.mutations';
import ProductCategoriesService from '@/modules/product-categories/services/product-categories.service';

const toast   = useToast();
const confirm = useConfirm();
const qc      = useQueryClient();

const SERVER_ROOT = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace('/api/v1', '');
function imageUrl(p) {
    if (!p) return null;
    return p.startsWith('http') ? p : SERVER_ROOT + p;
}

/* ── Categories ── */
const { data: rawCategories, isLoading } = useProductCategoriesQuery();
const categories = computed(() => rawCategories.value ?? []);

const { mutate: createCat, isPending: createPending } = useCreateCategoryMutation();
const { mutate: updateCat, isPending: updatePending } = useUpdateCategoryMutation();
const { mutate: deleteCat, isPending: deletePending } = useDeleteCategoryMutation();

/* ── All products (for picker) ── */
const { data: allProductsRaw } = useQuery({
    queryKey: ['all-products-picker'],
    queryFn: () => ProductCategoriesService.getAllProducts({ paginate: 'false' }),
    staleTime: 1000 * 60 * 5,
});
const allProducts = computed(() => {
    const raw = allProductsRaw.value;
    return Array.isArray(raw) ? raw : (raw?.data ?? []);
});

/* ── Helpers ── */
function emptyForm() { return { name: '', description: '' }; }
function colorFor(name = '') {
    const colors = ['#0035C5', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4'];
    let h = 0;
    for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
    return colors[h % colors.length];
}
function catId(cat) { return cat.categoryId ?? cat.id ?? cat.productCategoryId; }

/* ── Create ── */
const createDialog = ref(false);
const createForm   = ref(emptyForm());
const canCreate    = computed(() => !!createForm.value.name.trim());

function openCreate() { createForm.value = emptyForm(); createDialog.value = true; }
function submitCreate() {
    createCat({ name: createForm.value.name.trim(), description: createForm.value.description.trim() || '' }, {
        onSuccess: () => { toast.add({ severity: 'success', summary: 'Créée', detail: 'Catégorie créée', life: 3000 }); createDialog.value = false; },
        onError: (err) => toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
    });
}

/* ── Edit ── */
const editDialog = ref(false);
const editForm   = ref({ id: null, ...emptyForm() });
const canEdit    = computed(() => !!editForm.value.name.trim());

function openEdit(cat) {
    editForm.value = { id: catId(cat), name: cat.name ?? '', description: cat.description ?? '' };
    editDialog.value = true;
}
function submitEdit() {
    updateCat({ id: editForm.value.id, payload: { name: editForm.value.name.trim(), description: editForm.value.description.trim() } }, {
        onSuccess: () => { toast.add({ severity: 'success', summary: 'Modifiée', detail: 'Catégorie mise à jour', life: 3000 }); editDialog.value = false; },
        onError: (err) => toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
    });
}

/* ── Delete ── */
function confirmDelete(cat) {
    confirm.require({
        message: `Supprimer « ${cat.name} » et toutes ses associations produits ?`,
        header: 'Confirmation',
        icon: 'pi pi-exclamation-triangle',
        rejectProps: { label: 'Annuler', severity: 'secondary', outlined: true },
        acceptProps: { label: 'Supprimer', severity: 'danger' },
        accept: () => deleteCat(catId(cat), {
            onSuccess: () => toast.add({ severity: 'success', summary: 'Supprimée', life: 3000 }),
            onError: (err) => toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message, life: 4000 }),
        }),
    });
}

/* ── Gérer produits ── */
const manageDialog    = ref(false);
const manageCategory  = ref(null);
const productSearch   = ref('');
const linkedIds       = ref(new Set());
const linkingId       = ref(null);
const loadingLinked   = ref(false);

async function openManage(cat) {
    manageCategory.value = cat;
    productSearch.value  = '';
    linkedIds.value      = new Set();
    loadingLinked.value  = true;
    manageDialog.value   = true;
    try {
        const res = await ProductCategoriesService.getProductsByCategoryId(catId(cat));
        const ids = res?.data ?? res ?? [];
        linkedIds.value = new Set(ids.map(Number));
    } catch { /* ignore */ }
    loadingLinked.value = false;
}

const filteredProducts = computed(() => {
    const q = productSearch.value.toLowerCase();
    return q
        ? allProducts.value.filter(p => (p.name ?? '').toLowerCase().includes(q) || (p.company?.name ?? '').toLowerCase().includes(q))
        : allProducts.value;
});

function isLinked(p) { return linkedIds.value.has(Number(p.productId ?? p.id)); }

async function toggleLink(p) {
    if (!manageCategory.value) return;
    const pid = Number(p.productId ?? p.id);
    const cid = catId(manageCategory.value);
    linkingId.value = pid;
    try {
        if (isLinked(p)) {
            await ProductCategoriesService.unlinkProduct(pid, cid);
            linkedIds.value.delete(pid);
            linkedIds.value = new Set(linkedIds.value);
            toast.add({ severity: 'warn', summary: 'Retiré', detail: `${p.name} retiré de la catégorie`, life: 2500 });
        } else {
            await ProductCategoriesService.linkProduct(pid, cid);
            linkedIds.value.add(pid);
            linkedIds.value = new Set(linkedIds.value);
            toast.add({ severity: 'success', summary: 'Ajouté', detail: `${p.name} ajouté à la catégorie`, life: 2500 });
        }
        qc.invalidateQueries({ queryKey: ['product-categories'] });
    } catch (err) {
        toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 });
    }
    linkingId.value = null;
}
</script>

<template>
    <div class="flex flex-col gap-6">
        <ConfirmDialog />

        <!-- Header -->
        <div class="flex items-center justify-between flex-wrap gap-3">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <i class="pi pi-tags text-primary text-lg" />
                </div>
                <div>
                    <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Catégories Produits</h1>
                    <p class="text-sm text-muted-color">Organisez vos produits par catégories — associez plusieurs produits à plusieurs catégories</p>
                </div>
            </div>
            <Button label="Nouvelle catégorie" icon="pi pi-plus" @click="openCreate" />
        </div>

        <!-- Loading -->
        <div v-if="isLoading" class="card flex items-center justify-center py-20">
            <i class="pi pi-spin pi-spinner text-3xl text-primary" />
        </div>

        <!-- Empty -->
        <div v-else-if="categories.length === 0" class="card flex items-center justify-center py-20">
            <div class="text-center text-muted-color">
                <i class="pi pi-tags text-5xl mb-4 block opacity-25" />
                <p class="text-lg font-semibold">Aucune catégorie</p>
                <p class="text-sm mt-1 mb-4">Créez votre première catégorie de produits</p>
                <Button label="Créer une catégorie" icon="pi pi-plus" size="small" @click="openCreate" />
            </div>
        </div>

        <!-- Grid -->
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div
                v-for="cat in categories"
                :key="catId(cat)"
                class="card flex flex-col gap-3 hover:shadow-md transition-shadow"
            >
                <div class="flex items-center gap-3">
                    <div
                        class="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0"
                        :style="{ backgroundColor: colorFor(cat.name) }"
                    >
                        {{ cat.name?.[0]?.toUpperCase() ?? '?' }}
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="font-bold text-surface-900 dark:text-surface-0 truncate">{{ cat.name }}</p>
                        <p class="text-xs text-muted-color">
                            {{ cat.productCount ?? cat._count?.products ?? cat.productsCount ?? 0 }} produit(s) associé(s)
                        </p>
                    </div>
                </div>

                <p v-if="cat.description" class="text-sm text-muted-color line-clamp-2">{{ cat.description }}</p>
                <p v-else class="text-xs text-muted-color italic">Aucune description</p>

                <div class="flex gap-2 mt-auto pt-2 border-t border-surface-100 dark:border-surface-800">
                    <Button
                        icon="pi pi-box"
                        label="Gérer produits"
                        severity="primary"
                        size="small"
                        class="flex-1"
                        @click="openManage(cat)"
                    />
                    <Button icon="pi pi-pencil" severity="secondary" outlined rounded size="small" @click="openEdit(cat)" />
                    <Button icon="pi pi-trash" severity="danger" outlined rounded size="small" :loading="deletePending" @click="confirmDelete(cat)" />
                </div>
            </div>
        </div>

        <!-- ── Gérer produits Dialog ──────────────────────────────────── -->
        <Dialog
            v-model:visible="manageDialog"
            :header="`Produits associés — ${manageCategory?.name ?? ''}`"
            modal
            style="width:54rem;max-height:85vh"
            :draggable="false"
        >
            <div class="flex flex-col gap-4" style="min-height:400px">
                <!-- Info -->
                <div class="flex items-start gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20 text-sm text-surface-700 dark:text-surface-300">
                    <i class="pi pi-info-circle text-primary mt-0.5 shrink-0" />
                    <span>Cliquez sur un produit pour l'associer ou le retirer de cette catégorie. Plusieurs produits peuvent appartenir à la même catégorie et un produit peut appartenir à plusieurs catégories.</span>
                </div>

                <!-- Search -->
                <IconField>
                    <InputIcon class="pi pi-search" />
                    <InputText v-model="productSearch" placeholder="Rechercher par nom, entreprise…" class="w-full" />
                </IconField>

                <!-- Loading linked -->
                <div v-if="loadingLinked" class="flex justify-center py-8">
                    <i class="pi pi-spin pi-spinner text-2xl text-primary" />
                </div>

                <!-- Product grid -->
                <div v-else class="overflow-y-auto" style="max-height:420px">
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pr-1">
                        <div
                            v-for="p in filteredProducts"
                            :key="p.productId ?? p.id"
                            class="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all select-none"
                            :class="isLinked(p)
                                ? 'border-primary bg-primary/5 dark:bg-primary/10'
                                : 'border-surface-200 dark:border-surface-700 hover:border-primary/40'"
                            @click="toggleLink(p)"
                        >
                            <!-- Loading spinner OR checkbox -->
                            <div class="shrink-0 w-5 h-5 flex items-center justify-center">
                                <i v-if="linkingId === Number(p.productId ?? p.id)" class="pi pi-spin pi-spinner text-primary text-sm" />
                                <div v-else-if="isLinked(p)" class="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                    <i class="pi pi-check text-white text-xs" />
                                </div>
                                <div v-else class="w-5 h-5 rounded-full border-2 border-surface-300 dark:border-surface-600" />
                            </div>

                            <!-- Image -->
                            <img
                                v-if="p.image"
                                :src="imageUrl(p.image)"
                                :alt="p.name"
                                class="w-10 h-10 rounded-lg object-cover shrink-0"
                                @error="e => e.target.style.display='none'"
                            />
                            <div v-else class="w-10 h-10 rounded-lg bg-surface-100 dark:bg-surface-800 flex items-center justify-center shrink-0">
                                <i class="pi pi-box text-muted-color text-sm" />
                            </div>

                            <!-- Info -->
                            <div class="flex-1 min-w-0">
                                <p class="font-semibold text-sm text-surface-900 dark:text-surface-0 truncate">{{ p.name }}</p>
                                <p class="text-xs text-muted-color truncate">{{ p.company?.name ?? '—' }}</p>
                                <p class="text-xs font-bold text-primary">{{ Number(p.price ?? p.unitPrice ?? 0).toFixed(2) }} EC</p>
                            </div>
                        </div>

                        <div v-if="filteredProducts.length === 0" class="col-span-3 text-center py-10 text-muted-color">
                            <i class="pi pi-search text-3xl mb-2 block opacity-25" />
                            <p>Aucun produit trouvé</p>
                        </div>
                    </div>
                </div>

                <!-- Summary -->
                <div class="flex items-center justify-between pt-2 border-t border-surface-100 dark:border-surface-800 text-sm text-muted-color">
                    <span>{{ linkedIds.size }} produit(s) associé(s) à cette catégorie</span>
                    <span>{{ allProducts.length }} produit(s) disponibles</span>
                </div>
            </div>
            <template #footer>
                <Button label="Fermer" severity="secondary" @click="manageDialog = false" />
            </template>
        </Dialog>

        <!-- ── Create Dialog ─────────────────────────────────────────── -->
        <Dialog v-model:visible="createDialog" header="Nouvelle catégorie" modal style="width:32rem" :draggable="false">
            <div class="flex flex-col gap-4 pt-1">
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Nom <span class="text-red-400">*</span></label>
                    <InputText v-model="createForm.name" placeholder="Ex: Fruits & Légumes, Boissons…" autofocus @keyup.enter="canCreate && submitCreate()" />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Description</label>
                    <Textarea v-model="createForm.description" placeholder="Description optionnelle…" rows="3" autoResize />
                </div>
                <div v-if="createForm.name" class="flex items-center gap-2">
                    <span class="text-sm text-muted-color">Aperçu :</span>
                    <div class="px-3 py-1 rounded-full text-white text-sm font-medium" :style="{ backgroundColor: colorFor(createForm.name) }">
                        {{ createForm.name }}
                    </div>
                </div>
            </div>
            <template #footer>
                <Button label="Annuler" severity="secondary" outlined @click="createDialog = false" :disabled="createPending" />
                <Button label="Créer" icon="pi pi-check" :loading="createPending" :disabled="!canCreate" @click="submitCreate" />
            </template>
        </Dialog>

        <!-- ── Edit Dialog ───────────────────────────────────────────── -->
        <Dialog v-model:visible="editDialog" header="Modifier la catégorie" modal style="width:32rem" :draggable="false">
            <div class="flex flex-col gap-4 pt-1">
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Nom <span class="text-red-400">*</span></label>
                    <InputText v-model="editForm.name" @keyup.enter="canEdit && submitEdit()" />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Description</label>
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
