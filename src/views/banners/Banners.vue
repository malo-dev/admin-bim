<script setup>
import { ref, computed } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { useBannersQuery } from '@/modules/banners/queries/banners.queries';
import {
    useCreateBannerMutation,
    useUpdateBannerMutation,
    useDeleteBannerMutation,
} from '@/modules/banners/mutations/banners.mutations';

const toast = useToast();
const confirm = useConfirm();

const SERVER_ROOT = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace('/api/v1', '');
function imageUrl(path) {
    if (!path) return null;
    return path.startsWith('http') ? path : SERVER_ROOT + path;
}

const { data, isLoading } = useBannersQuery();
const banners = computed(() => data.value?.data ?? []);

const { mutate: createBanner, isPending: createPending } = useCreateBannerMutation();
const { mutate: updateBanner, isPending: updatePending } = useUpdateBannerMutation();
const { mutate: deleteBanner, isPending: deletePending } = useDeleteBannerMutation();

function emptyForm() {
    return { title: '', tagline: '', linkUrl: '', position: 0, isActive: true };
}

// ── Create ───────────────────────────────────────────────────────────────────
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

function onCreateFileChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    createImageFile.value = file;
    createImagePreview.value = URL.createObjectURL(file);
}

const canCreate = computed(() => !!createForm.value.title);

function submitCreate() {
    const f = createForm.value;
    createBanner(
        { ...f, ...(createImageFile.value && { image: createImageFile.value }) },
        {
            onSuccess: () => {
                toast.add({ severity: 'success', summary: 'Créée', detail: 'Bannière ajoutée', life: 3000 });
                createDialog.value = false;
            },
            onError: (err) =>
                toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
        }
    );
}

// ── Edit ─────────────────────────────────────────────────────────────────────
const editDialog = ref(false);
const editForm = ref({ id: null, ...emptyForm(), image: null });
const imagePreview = ref(null);
const fileInputRef = ref(null);

function openEdit(row) {
    editForm.value = {
        id: row.bannerId,
        title: row.title ?? '',
        tagline: row.tagline ?? '',
        linkUrl: row.linkUrl ?? '',
        position: row.position ?? 0,
        isActive: row.isActive ?? true,
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

const canEdit = computed(() => !!editForm.value.title);

function submitEdit() {
    const f = editForm.value;
    updateBanner(
        { id: f.id, payload: { title: f.title, tagline: f.tagline, linkUrl: f.linkUrl, position: f.position, isActive: f.isActive, ...(f.image && { image: f.image }) } },
        {
            onSuccess: () => {
                toast.add({ severity: 'success', summary: 'Mise à jour', detail: 'Bannière modifiée', life: 3000 });
                editDialog.value = false;
            },
            onError: (err) =>
                toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
        }
    );
}

function toggleActive(row) {
    updateBanner({ id: row.bannerId, payload: { isActive: !row.isActive } });
}

function confirmDelete(row) {
    confirm.require({
        message: `Supprimer la bannière « ${row.title} » ?`,
        header: 'Confirmation',
        icon: 'pi pi-exclamation-triangle',
        rejectProps: { label: 'Annuler', severity: 'secondary', outlined: true },
        acceptProps: { label: 'Supprimer', severity: 'danger' },
        accept: () =>
            deleteBanner(row.bannerId, {
                onSuccess: () => toast.add({ severity: 'success', summary: 'Supprimée', detail: 'Bannière supprimée', life: 3000 }),
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
                    <i class="pi pi-images text-primary text-lg" />
                </div>
                <div>
                    <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Bannières « Nos offres spéciales »</h1>
                    <p class="text-sm text-muted-color">Carrousel promotionnel affiché sur l'accueil de l'app BIM (Starlink, carburant, eau, gaz…)</p>
                </div>
            </div>
            <Button label="Ajouter une bannière" icon="pi pi-plus" @click="openCreate" />
        </div>

        <div v-if="isLoading" class="card flex items-center justify-center py-16 text-muted-color">
            <i class="pi pi-spin pi-spinner text-2xl" />
        </div>

        <div v-else-if="banners.length === 0" class="card text-center py-16 text-muted-color">
            <i class="pi pi-images text-4xl mb-3 block opacity-30" />
            <p class="font-medium">Aucune bannière pour le moment</p>
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
                v-for="row in banners"
                :key="row.bannerId"
                class="card !p-0 overflow-hidden flex flex-col"
                :class="!row.isActive && 'opacity-50'"
            >
                <div class="h-32 bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
                    <img v-if="imageUrl(row.imageUrl)" :src="imageUrl(row.imageUrl)" class="w-full h-full object-cover" />
                    <i v-else class="pi pi-image text-3xl opacity-30" />
                </div>
                <div class="p-4 flex flex-col gap-2 flex-1">
                    <div class="flex items-start justify-between gap-2">
                        <p class="font-bold text-surface-900 dark:text-surface-0">{{ row.title }}</p>
                        <Tag :value="`#${row.position}`" severity="secondary" />
                    </div>
                    <p v-if="row.tagline" class="text-xs text-muted-color line-clamp-2">{{ row.tagline }}</p>
                    <div class="flex items-center justify-between mt-auto pt-3 border-t border-surface-100 dark:border-surface-800">
                        <ToggleSwitch :modelValue="!!row.isActive" @update:modelValue="toggleActive(row)" />
                        <div class="flex gap-1">
                            <Button v-tooltip.top="'Modifier'" icon="pi pi-pencil" severity="secondary" outlined rounded size="small" @click="openEdit(row)" />
                            <Button v-tooltip.top="'Supprimer'" icon="pi pi-trash" severity="danger" outlined rounded size="small" :loading="deletePending" @click="confirmDelete(row)" />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Create -->
        <Dialog v-model:visible="createDialog" header="Nouvelle bannière" modal style="width:32rem" :draggable="false">
            <div class="flex flex-col gap-4 pt-1">
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Image</label>
                    <div class="flex items-center gap-4">
                        <img v-if="createImagePreview" :src="createImagePreview" class="w-20 h-20 rounded-lg object-cover border border-surface-200 dark:border-surface-700" />
                        <div v-else class="w-20 h-20 rounded-lg bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-muted-color">
                            <i class="pi pi-image text-2xl opacity-40" />
                        </div>
                        <input ref="createFileInputRef" type="file" accept="image/*" class="hidden" @change="onCreateFileChange" />
                        <Button label="Choisir une image" icon="pi pi-upload" severity="secondary" outlined size="small" @click="createFileInputRef.click()" />
                    </div>
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Titre <span class="text-red-400">*</span></label>
                    <InputText v-model="createForm.title" placeholder="Ex: Offres Starlink" />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Phrase accrocheuse</label>
                    <InputText v-model="createForm.tagline" placeholder="Ex: Livraison rassurée, partout à Kinshasa" />
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="flex flex-col gap-2">
                        <label class="font-medium text-sm">Lien (route app ou URL)</label>
                        <InputText v-model="createForm.linkUrl" placeholder="/bim-carburant/12" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium text-sm">Ordre d'affichage</label>
                        <InputText v-model.number="createForm.position" type="number" />
                    </div>
                </div>
            </div>
            <template #footer>
                <Button label="Annuler" severity="secondary" outlined @click="createDialog = false" :disabled="createPending" />
                <Button label="Créer" icon="pi pi-check" :loading="createPending" :disabled="!canCreate" @click="submitCreate" />
            </template>
        </Dialog>

        <!-- Edit -->
        <Dialog v-model:visible="editDialog" header="Modifier la bannière" modal style="width:32rem" :draggable="false">
            <div class="flex flex-col gap-4 pt-1">
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Image</label>
                    <div class="flex items-center gap-4">
                        <img v-if="imagePreview" :src="imagePreview" class="w-20 h-20 rounded-lg object-cover border border-surface-200 dark:border-surface-700" />
                        <div v-else class="w-20 h-20 rounded-lg bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-muted-color">
                            <i class="pi pi-image text-2xl opacity-40" />
                        </div>
                        <input ref="fileInputRef" type="file" accept="image/*" class="hidden" @change="onFileChange" />
                        <Button label="Choisir une image" icon="pi pi-upload" severity="secondary" outlined size="small" @click="fileInputRef.click()" />
                    </div>
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Titre <span class="text-red-400">*</span></label>
                    <InputText v-model="editForm.title" />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Phrase accrocheuse</label>
                    <InputText v-model="editForm.tagline" />
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="flex flex-col gap-2">
                        <label class="font-medium text-sm">Lien (route app ou URL)</label>
                        <InputText v-model="editForm.linkUrl" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium text-sm">Ordre d'affichage</label>
                        <InputText v-model.number="editForm.position" type="number" />
                    </div>
                </div>
            </div>
            <template #footer>
                <Button label="Annuler" severity="secondary" outlined @click="editDialog = false" :disabled="updatePending" />
                <Button label="Enregistrer" icon="pi pi-check" :loading="updatePending" :disabled="!canEdit" @click="submitEdit" />
            </template>
        </Dialog>
    </div>
</template>
