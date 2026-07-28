<script setup>
import { ref, computed, watch } from 'vue';
import { refDebounced } from '@vueuse/core';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { useCompaniesQuery, useAllSectorsQuery } from '@/modules/companies/queries/companies.queries';
import {
    useCreateCompanyMutation,
    useUpdateCompanyMutation,
    useDeleteCompanyMutation,
} from '@/modules/companies/mutations/companies.mutations';
import { useAddCompanyAdminMutation } from '@/modules/accounts/mutations/account.mutations';

const toast = useToast();
const confirm = useConfirm();

// ── Filters ────────────────────────────────────────────────────────────────────
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

const { data, isLoading, isFetching } = useCompaniesQuery(filters);
const { data: sectorsData } = useAllSectorsQuery();

const companies = computed(() => data.value?.data ?? []);
const totalRecords = computed(() => data.value?.total ?? 0);

const sectorOptions = computed(() => {
    const raw = sectorsData.value;
    const list = Array.isArray(raw) ? raw : (raw?.data ?? []);
    return list.map((s) => ({ label: s.name, value: s.businessId }));
});

function onPage(event) {
    currentPage.value = event.page + 1;
    pageSize.value = event.rows;
}

// ── Mutations ──────────────────────────────────────────────────────────────────
const { mutate: createCompany, isPending: createPending } = useCreateCompanyMutation();
const { mutate: updateCompany, isPending: updatePending } = useUpdateCompanyMutation();
const { mutate: deleteCompany, isPending: deletePending } = useDeleteCompanyMutation();
const { mutate: addAdmin, isPending: addAdminPending } = useAddCompanyAdminMutation();

// ── Add admin dialog ───────────────────────────────────────────────────────────
const addAdminDialog = ref(false);
const addAdminForm = ref({ companyId: null, companyName: '', username: '', email: '', password: '' });
const showAdminPassword = ref(false);

function openAddAdmin(row) {
    addAdminForm.value = { companyId: row.companyId, companyName: row.name, username: '', email: '', password: '' };
    showAdminPassword.value = false;
    addAdminDialog.value = true;
}

function submitAddAdmin() {
    addAdmin(
        { companyId: addAdminForm.value.companyId, username: addAdminForm.value.username, email: addAdminForm.value.email, password: addAdminForm.value.password },
        {
            onSuccess: (res) => {
                toast.add({ severity: 'success', summary: 'Admin créé', detail: `${res.admin?.username} ajouté comme admin de ${res.company?.name}`, life: 4000 });
                addAdminDialog.value = false;
            },
            onError: (err) =>
                toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
        }
    );
}

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

// ── Create dialog ──────────────────────────────────────────────────────────────
const createDialog = ref(false);
const createForm = ref({ name: '', email: '', description: '', location: '', businessId: null });
const createLogoFile = ref(null);
const createLogoPreview = ref(null);
const createLogoInput = ref(null);

function openCreate() {
    createForm.value = { name: '', email: '', description: '', location: '', businessId: null };
    createLogoFile.value = null;
    createLogoPreview.value = null;
    createDialog.value = true;
}

async function onCreateLogoChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    const compressed = await compressImage(file);
    createLogoFile.value = compressed;
    createLogoPreview.value = URL.createObjectURL(compressed);
}

function submitCreate() {
    const f = createForm.value;
    const payload = {
        name: f.name,
        email: f.email,
        ...(f.description && { description: f.description }),
        ...(f.location && { location: f.location }),
        ...(f.businessId && { businessId: f.businessId }),
    };

    createCompany([payload], {
        onSuccess: (res) => {
            const newId = res.data?.[0]?.companyId;
            if (createLogoFile.value && newId) {
                const fd = new FormData();
                fd.append('logo', createLogoFile.value);
                updateCompany({ id: newId, payload: fd }, {
                    onSuccess: () => toast.add({ severity: 'success', summary: 'Créée', detail: 'Entreprise créée avec logo', life: 3000 }),
                    onError: () => toast.add({ severity: 'warn', summary: 'Créée sans logo', detail: 'L\'entreprise a été créée mais le logo n\'a pas pu être envoyé', life: 4000 }),
                });
            } else {
                toast.add({ severity: 'success', summary: 'Créée', detail: `${res.count ?? 1} entreprise(s) créée(s)`, life: 3000 });
            }
            createDialog.value = false;
        },
        onError: (err) =>
            toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
    });
}

const canCreate = computed(() => !!createForm.value.name && !!createForm.value.email);

// ── Edit dialog ────────────────────────────────────────────────────────────────
const editDialog = ref(false);
const editForm = ref({ id: null, name: '', email: '', description: '', location: '', businessId: null });
const editLogoFile = ref(null);
const editLogoPreview = ref(null);
const editLogoInput = ref(null);

function openEdit(row) {
    editForm.value = {
        id: row.companyId,
        name: row.name ?? '',
        email: row.email ?? '',
        description: row.description ?? '',
        location: row.location ?? '',
        businessId: row.businessId ?? null,
    };
    editLogoFile.value = null;
    editLogoPreview.value = row.logo ?? null;
    editDialog.value = true;
}

async function onEditLogoChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    const compressed = await compressImage(file);
    editLogoFile.value = compressed;
    editLogoPreview.value = URL.createObjectURL(compressed);
}

function submitEdit() {
    const f = editForm.value;
    let payload;
    if (editLogoFile.value) {
        payload = new FormData();
        payload.append('name', f.name);
        payload.append('email', f.email);
        if (f.description) payload.append('description', f.description);
        if (f.location) payload.append('location', f.location);
        if (f.businessId) payload.append('businessId', String(f.businessId));
        payload.append('logo', editLogoFile.value);
    } else {
        payload = { name: f.name, email: f.email, description: f.description, location: f.location, businessId: f.businessId };
    }
    updateCompany(
        { id: f.id, payload },
        {
            onSuccess: () => {
                toast.add({ severity: 'success', summary: 'Mis à jour', detail: 'Entreprise modifiée', life: 3000 });
                editDialog.value = false;
            },
            onError: (err) =>
                toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
        }
    );
}

const canEdit = computed(() => !!editForm.value.name && !!editForm.value.email);

// ── Delete ────────────────────────────────────────────────────────────────────
function confirmDelete(row) {
    confirm.require({
        message: `Supprimer définitivement « ${row.name} » et toutes ses données ?`,
        header: 'Confirmation',
        icon: 'pi pi-exclamation-triangle',
        rejectProps: { label: 'Annuler', severity: 'secondary', outlined: true },
        acceptProps: { label: 'Supprimer', severity: 'danger' },
        accept: () =>
            deleteCompany(row.companyId, {
                onSuccess: () => toast.add({ severity: 'success', summary: 'Supprimée', detail: 'Entreprise supprimée', life: 3000 }),
                onError: (err) =>
                    toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
            }),
    });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(d) {
    return d ? new Date(d).toLocaleDateString('fr-FR') : '—';
}
function getInitials(name) {
    return name ? name[0].toUpperCase() : '?';
}
function companyRating(row) {
    return Number(row.note ?? row.rating ?? row.averageRating ?? 0);
}
function reviewCount(row) {
    return row._count?.reviews ?? row.reviewCount ?? row.avisCount ?? row.reviews?.length ?? 0;
}
function starClass(star, rating) {
    return rating >= star ? 'pi-star-fill text-amber-400' : 'pi-star text-surface-300';
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <ConfirmDialog />

        <!-- Header -->
        <div class="flex items-center justify-between flex-wrap gap-3">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <i class="pi pi-building text-primary text-lg" />
                </div>
                <div>
                    <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Entreprises</h1>
                    <p class="text-sm text-muted-color">Gestion des entreprises partenaires BIM</p>
                </div>
            </div>
            <Button label="Ajouter une entreprise" icon="pi pi-plus" @click="openCreate" />
        </div>

        <div class="card">
            <!-- Toolbar -->
            <div class="flex items-center gap-3 mb-5 flex-wrap">
                <IconField class="flex-1 min-w-56">
                    <InputIcon class="pi pi-search" />
                    <InputText v-model="searchInput" placeholder="Nom, email, ville…" class="w-full" />
                </IconField>
                <span class="text-sm text-muted-color ml-auto whitespace-nowrap">
                    <i v-if="isFetching && !isLoading" class="pi pi-spin pi-spinner text-xs mr-1" />
                    {{ totalRecords }} entreprise(s)
                </span>
            </div>

            <!-- DataTable -->
            <DataTable
                :value="companies"
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
                        <i class="pi pi-building text-4xl mb-3 block opacity-30" />
                        <p class="font-medium">Aucune entreprise trouvée</p>
                    </div>
                </template>

                <!-- Entreprise -->
                <Column header="Entreprise" style="min-width:18rem">
                    <template #body="{ data: row }">
                        <div class="flex items-center gap-3">
                            <Avatar
                                v-if="row.logo"
                                :image="row.logo"
                                shape="circle"
                                size="normal"
                                :imageErrored="() => true"
                            />
                            <Avatar
                                v-else
                                :label="getInitials(row.name)"
                                shape="circle"
                                :style="{ backgroundColor: 'var(--p-primary-100)', color: 'var(--p-primary-700)', fontWeight: '700' }"
                            />
                            <div>
                                <div class="font-semibold text-surface-900 dark:text-surface-0">{{ row.name }}</div>
                                <div class="text-xs text-muted-color">{{ row.email }}</div>
                            </div>
                        </div>
                    </template>
                </Column>

                <!-- Secteur -->
                <Column header="Secteur" style="min-width:12rem">
                    <template #body="{ data: row }">
                        <Tag v-if="row.category" :value="row.category.name" severity="secondary" />
                        <span v-else class="text-muted-color text-sm">—</span>
                    </template>
                </Column>

                <!-- Localisation -->
                <Column header="Ville" style="min-width:9rem">
                    <template #body="{ data: row }">
                        <span v-if="row.location" class="text-sm">
                            <i class="pi pi-map-marker text-muted-color mr-1 text-xs" />{{ row.location }}
                        </span>
                        <span v-else class="text-muted-color text-sm">—</span>
                    </template>
                </Column>

                <!-- Produits -->
                <Column header="Produits" style="min-width:8rem">
                    <template #body="{ data: row }">
                        <Tag
                            v-if="row.products?.length"
                            :value="`${row.products.length}`"
                            severity="info"
                        />
                        <span v-else class="text-muted-color text-sm">0</span>
                    </template>
                </Column>

                <!-- Note & Avis -->
                <Column header="Note / Avis" style="min-width:12rem">
                    <template #body="{ data: row }">
                        <div class="flex flex-col gap-0.5">
                            <div class="flex items-center gap-0.5">
                                <i
                                    v-for="star in 5"
                                    :key="star"
                                    class="pi text-sm"
                                    :class="starClass(star, companyRating(row))"
                                />
                                <span class="ml-1 text-xs font-semibold text-surface-700 dark:text-surface-300">
                                    {{ companyRating(row) > 0 ? companyRating(row).toFixed(1) : '—' }}
                                </span>
                            </div>
                            <span class="text-xs text-muted-color">
                                {{ reviewCount(row) > 0 ? `${reviewCount(row)} avis au total` : 'Aucun avis' }}
                            </span>
                        </div>
                    </template>
                </Column>

                <!-- Date -->
                <Column header="Créée le" style="min-width:9rem">
                    <template #body="{ data: row }">{{ formatDate(row.createdAt) }}</template>
                </Column>

                <!-- Actions -->
                <Column header="Actions" style="min-width:10rem" alignHeader="right">
                    <template #body="{ data: row }">
                        <div class="flex gap-1 justify-end">
                            <Button
                                v-tooltip.top="'Ajouter un admin'"
                                icon="pi pi-user-plus"
                                severity="info"
                                outlined
                                rounded
                                size="small"
                                @click="openAddAdmin(row)"
                            />
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

        <!-- ── Create Dialog ─────────────────────────────────────────────── -->
        <Dialog v-model:visible="createDialog" header="Nouvelle entreprise" modal style="width:40rem" :draggable="false">
            <div class="flex flex-col gap-4 pt-1">
                <div class="grid grid-cols-2 gap-4">
                    <div class="flex flex-col gap-2">
                        <label class="font-medium text-sm">Nom <span class="text-red-400">*</span></label>
                        <InputText v-model="createForm.name" placeholder="Nom de l'entreprise" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium text-sm">Email <span class="text-red-400">*</span></label>
                        <InputText v-model="createForm.email" type="email" placeholder="contact@entreprise.com" />
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div class="flex flex-col gap-2">
                        <label class="font-medium text-sm">Secteur d'activité</label>
                        <Select
                            v-model="createForm.businessId"
                            :options="sectorOptions"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Choisir un secteur"
                            showClear
                            class="w-full"
                        />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium text-sm">Ville / Localisation</label>
                        <InputText v-model="createForm.location" placeholder="Ex: Kinshasa, Bunia…" />
                    </div>
                </div>

                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Logo</label>
                    <div class="flex items-center gap-4">
                        <div v-if="createLogoPreview" class="relative">
                            <img :src="createLogoPreview" alt="logo" class="w-16 h-16 rounded-xl object-cover border border-surface-200 dark:border-surface-700" />
                            <button class="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs" @click="createLogoFile=null;createLogoPreview=null;createLogoInput.value=''">×</button>
                        </div>
                        <div v-else class="w-16 h-16 rounded-xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-muted-color">
                            <i class="pi pi-building text-2xl opacity-40" />
                        </div>
                        <div class="flex flex-col gap-1">
                            <input ref="createLogoInput" type="file" accept="image/*" class="hidden" @change="onCreateLogoChange" />
                            <Button label="Choisir un logo" icon="pi pi-upload" severity="secondary" outlined size="small" @click="createLogoInput.click()" />
                            <span class="text-xs text-muted-color">Compressé automatiquement ≤ 300 Ko</span>
                        </div>
                    </div>
                </div>

                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Description</label>
                    <Textarea v-model="createForm.description" placeholder="Description de l'entreprise…" rows="3" autoResize />
                </div>
            </div>
            <template #footer>
                <Button label="Annuler" severity="secondary" outlined @click="createDialog = false" :disabled="createPending" />
                <Button label="Créer l'entreprise" icon="pi pi-check" :loading="createPending" :disabled="!canCreate" @click="submitCreate" />
            </template>
        </Dialog>

        <!-- ── Add Admin Dialog ─────────────────────────────────────────── -->
        <Dialog v-model:visible="addAdminDialog" :header="`Ajouter un admin — ${addAdminForm.companyName}`" modal style="width:34rem" :draggable="false">
            <div class="flex flex-col gap-4 pt-1">
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Nom d'utilisateur <span class="text-red-400">*</span></label>
                    <InputText v-model="addAdminForm.username" placeholder="Ex: john_doe" />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Email de connexion <span class="text-red-400">*</span></label>
                    <InputText v-model="addAdminForm.email" type="email" placeholder="admin@entreprise.com" />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Mot de passe <span class="text-red-400">*</span></label>
                    <IconField>
                        <InputIcon
                            :class="showAdminPassword ? 'pi pi-eye-slash' : 'pi pi-eye'"
                            class="cursor-pointer"
                            @click="showAdminPassword = !showAdminPassword"
                        />
                        <InputText
                            v-model="addAdminForm.password"
                            :type="showAdminPassword ? 'text' : 'password'"
                            placeholder="Mot de passe sécurisé"
                            class="w-full"
                        />
                    </IconField>
                </div>
            </div>
            <template #footer>
                <Button label="Annuler" severity="secondary" outlined @click="addAdminDialog = false" :disabled="addAdminPending" />
                <Button
                    label="Créer l'admin"
                    icon="pi pi-check"
                    :loading="addAdminPending"
                    :disabled="!addAdminForm.username || !addAdminForm.email || !addAdminForm.password"
                    @click="submitAddAdmin"
                />
            </template>
        </Dialog>

        <!-- ── Edit Dialog ───────────────────────────────────────────────── -->
        <Dialog v-model:visible="editDialog" header="Modifier l'entreprise" modal style="width:40rem" :draggable="false">
            <div class="flex flex-col gap-4 pt-1">
                <div class="grid grid-cols-2 gap-4">
                    <div class="flex flex-col gap-2">
                        <label class="font-medium text-sm">Nom</label>
                        <InputText v-model="editForm.name" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium text-sm">Email</label>
                        <InputText v-model="editForm.email" type="email" />
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div class="flex flex-col gap-2">
                        <label class="font-medium text-sm">Secteur d'activité</label>
                        <Select
                            v-model="editForm.businessId"
                            :options="sectorOptions"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Choisir un secteur"
                            showClear
                            class="w-full"
                        />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium text-sm">Ville / Localisation</label>
                        <InputText v-model="editForm.location" />
                    </div>
                </div>

                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Logo</label>
                    <div class="flex items-center gap-4">
                        <div v-if="editLogoPreview" class="relative">
                            <img :src="editLogoPreview" alt="logo" class="w-16 h-16 rounded-xl object-cover border border-surface-200 dark:border-surface-700" @error="editLogoPreview=null" />
                            <button class="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs" @click="editLogoFile=null;editLogoPreview=null;editLogoInput.value=''">×</button>
                        </div>
                        <div v-else class="w-16 h-16 rounded-xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-muted-color">
                            <i class="pi pi-building text-2xl opacity-40" />
                        </div>
                        <div class="flex flex-col gap-1">
                            <input ref="editLogoInput" type="file" accept="image/*" class="hidden" @change="onEditLogoChange" />
                            <Button label="Changer le logo" icon="pi pi-upload" severity="secondary" outlined size="small" @click="editLogoInput.click()" />
                            <span class="text-xs text-muted-color">Compressé automatiquement ≤ 300 Ko</span>
                        </div>
                    </div>
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
