<script setup>
import { ref, computed } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { useTarifsQuery } from '@/modules/tarifs/queries/tarifs.queries';
import {
    useCreateTierMutation,
    useUpdateTierMutation,
    useDeleteTierMutation,
} from '@/modules/tarifs/mutations/tarifs.mutations';

const toast = useToast();
const confirm = useConfirm();

const SERVER_ROOT = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace('/api/v1', '');

function imageUrl(path) {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return SERVER_ROOT + path;
}

const { data, isLoading } = useTarifsQuery();
const tiers = computed(() => data.value?.data ?? []);

const { mutate: createTier, isPending: creating } = useCreateTierMutation();
const { mutate: updateTier } = useUpdateTierMutation();
const { mutate: deleteTier, isPending: deleting } = useDeleteTierMutation();

function emptyForm() {
    return { tierKey: '', label: '', base: 0, perKm: 0, seats: 4, etaMin: 3, sortOrder: 0, imageUrl: null };
}

const dialogVisible = ref(false);
const editing = ref(false);
const form = ref(emptyForm());
const imageFile = ref(null);
const imagePreview = ref(null);

function onImageSelected(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    imageFile.value = file;
    imagePreview.value = URL.createObjectURL(file);
}

function openCreate() {
    editing.value = false;
    form.value = emptyForm();
    imageFile.value = null;
    imagePreview.value = null;
    dialogVisible.value = true;
}

function openEdit(row) {
    editing.value = true;
    form.value = { ...row, base: Number(row.base), perKm: Number(row.perKm) };
    imageFile.value = null;
    imagePreview.value = null;
    dialogVisible.value = true;
}

const canSubmit = computed(() => !!form.value.tierKey && !!form.value.label && form.value.base >= 0 && form.value.perKm >= 0);

function submit() {
    if (editing.value) {
        const { tierKey, imageUrl, ...payload } = form.value;
        updateTier({ tierKey, payload, imageFile: imageFile.value }, {
            onSuccess: () => {
                toast.add({ severity: 'success', summary: 'Mis à jour', detail: 'Tarif mis à jour', life: 3000 });
                dialogVisible.value = false;
            },
            onError: (err) => toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
        });
    } else {
        const { imageUrl, ...payload } = form.value;
        createTier({ payload, imageFile: imageFile.value }, {
            onSuccess: () => {
                toast.add({ severity: 'success', summary: 'Créé', detail: 'Gamme ajoutée', life: 3000 });
                dialogVisible.value = false;
            },
            onError: (err) => toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
        });
    }
}

function toggleActive(row) {
    updateTier({ tierKey: row.tierKey, payload: { active: !row.active } });
}

function confirmDelete(row) {
    confirm.require({
        message: `Supprimer la gamme "${row.label}" ? Les courses déjà en cours ne sont pas affectées.`,
        header: 'Confirmation',
        icon: 'pi pi-exclamation-triangle',
        rejectProps: { label: 'Annuler', severity: 'secondary', outlined: true },
        acceptProps: { label: 'Supprimer', severity: 'danger' },
        accept: () => deleteTier(row.tierKey, {
            onSuccess: () => toast.add({ severity: 'success', summary: 'Supprimé', detail: 'Gamme supprimée', life: 3000 }),
            onError: (err) => toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
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
                    <i class="pi pi-dollar text-primary text-lg" />
                </div>
                <div>
                    <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Tarifs BIM Transport</h1>
                    <p class="text-sm text-muted-color">Prix de base et prix au kilomètre par gamme de véhicule (en EC)</p>
                </div>
            </div>
            <Button label="Ajouter une gamme" icon="pi pi-plus" @click="openCreate" />
        </div>

        <div class="card">
            <!-- Chargement -->
            <div v-if="isLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Skeleton v-for="n in 6" :key="n" height="11rem" borderRadius="1rem" />
            </div>

            <!-- Vide -->
            <div v-else-if="tiers.length === 0" class="text-center py-12 text-muted-color">
                <i class="pi pi-dollar text-4xl mb-3 block opacity-30" />
                <p class="font-medium">Aucune gamme — l'estimation de course ne pourra rien afficher</p>
            </div>

            <!-- Cards -->
            <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div
                    v-for="row in tiers"
                    :key="row.tierKey"
                    class="card mb-0! p-4! flex flex-col gap-3"
                >
                    <!-- En-tête -->
                    <div class="flex items-center justify-between gap-2">
                        <div class="flex items-center gap-3 min-w-0">
                            <img
                                v-if="imageUrl(row.imageUrl)"
                                :src="imageUrl(row.imageUrl)"
                                class="w-12 h-12 rounded-lg object-cover border border-surface-200 dark:border-surface-700"
                            />
                            <div v-else class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <i class="pi pi-car text-primary" />
                            </div>
                            <div class="min-w-0">
                                <div class="font-semibold text-surface-900 dark:text-surface-0 truncate">{{ row.label }}</div>
                                <div class="text-xs text-muted-color">{{ row.tierKey }}</div>
                            </div>
                        </div>
                        <ToggleSwitch :modelValue="!!row.active" @update:modelValue="toggleActive(row)" />
                    </div>

                    <!-- Prix -->
                    <div class="flex items-center justify-between gap-2">
                        <span class="text-sm text-muted-color">Prix de base</span>
                        <span class="font-semibold text-sm">{{ Number(row.base).toFixed(2) }} EC</span>
                    </div>
                    <div class="flex items-center justify-between gap-2">
                        <span class="text-sm text-muted-color">Prix / km</span>
                        <span class="font-semibold text-sm">{{ Number(row.perKm).toFixed(2) }} EC</span>
                    </div>

                    <!-- Places + ETA -->
                    <div class="flex items-center gap-2 flex-wrap">
                        <Tag :value="`${row.seats} places`" severity="secondary" />
                        <Tag :value="`${row.etaMin} min ETA`" severity="secondary" />
                    </div>

                    <!-- Actions -->
                    <div class="flex gap-1 flex-wrap justify-end pt-2 border-t border-surface-100 dark:border-surface-800">
                        <Button v-tooltip.top="'Modifier'" icon="pi pi-pencil" severity="secondary" outlined rounded size="small" @click="openEdit(row)" />
                        <Button v-tooltip.top="'Supprimer'" icon="pi pi-trash" severity="danger" outlined rounded size="small" :loading="deleting" @click="confirmDelete(row)" />
                    </div>
                </div>
            </div>
        </div>

        <Dialog v-model:visible="dialogVisible" :header="editing ? 'Modifier la gamme' : 'Nouvelle gamme'" modal style="width:28rem" :draggable="false">
            <div class="flex flex-col gap-4 pt-1">
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Image du véhicule</label>
                    <div class="flex items-center gap-3">
                        <img
                            v-if="imagePreview || imageUrl(form.imageUrl)"
                            :src="imagePreview || imageUrl(form.imageUrl)"
                            class="w-16 h-16 rounded-lg object-cover border border-surface-200 dark:border-surface-700"
                        />
                        <div v-else class="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <i class="pi pi-car text-primary text-xl" />
                        </div>
                        <label class="cursor-pointer">
                            <span class="p-button p-button-outlined p-button-sm">Choisir une image</span>
                            <input type="file" accept="image/*" class="hidden" @change="onImageSelected" />
                        </label>
                    </div>
                </div>
                <div class="flex flex-col gap-2" v-if="!editing">
                    <label class="font-medium text-sm">Clé technique (unique, sans espace) <span class="text-red-400">*</span></label>
                    <InputText v-model="form.tierKey" placeholder="ex: xl, business…" />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Nom affiché <span class="text-red-400">*</span></label>
                    <InputText v-model="form.label" placeholder="Bim XL" />
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="flex flex-col gap-2">
                        <label class="font-medium text-sm">Prix de base (EC)</label>
                        <InputNumber v-model="form.base" :minFractionDigits="2" :maxFractionDigits="2" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium text-sm">Prix / km (EC)</label>
                        <InputNumber v-model="form.perKm" :minFractionDigits="2" :maxFractionDigits="2" />
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="flex flex-col gap-2">
                        <label class="font-medium text-sm">Places</label>
                        <InputText v-model.number="form.seats" type="number" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium text-sm">ETA estimé (min)</label>
                        <InputText v-model.number="form.etaMin" type="number" />
                    </div>
                </div>
            </div>
            <template #footer>
                <Button label="Annuler" severity="secondary" outlined @click="dialogVisible = false" :disabled="creating" />
                <Button label="Enregistrer" icon="pi pi-check" :loading="creating" :disabled="!canSubmit" @click="submit" />
            </template>
        </Dialog>
    </div>
</template>
