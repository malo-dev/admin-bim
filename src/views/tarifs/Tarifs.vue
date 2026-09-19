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

const { data, isLoading } = useTarifsQuery();
const tiers = computed(() => data.value?.data ?? []);

const { mutate: createTier, isPending: creating } = useCreateTierMutation();
const { mutate: updateTier } = useUpdateTierMutation();
const { mutate: deleteTier, isPending: deleting } = useDeleteTierMutation();

function emptyForm() {
    return { tierKey: '', label: '', base: 0, perKm: 0, seats: 4, etaMin: 3, sortOrder: 0 };
}

const dialogVisible = ref(false);
const editing = ref(false);
const form = ref(emptyForm());

function openCreate() {
    editing.value = false;
    form.value = emptyForm();
    dialogVisible.value = true;
}

function openEdit(row) {
    editing.value = true;
    form.value = { ...row, base: Number(row.base), perKm: Number(row.perKm) };
    dialogVisible.value = true;
}

const canSubmit = computed(() => !!form.value.tierKey && !!form.value.label && form.value.base >= 0 && form.value.perKm >= 0);

function submit() {
    if (editing.value) {
        const { tierKey, ...payload } = form.value;
        updateTier({ tierKey, payload }, {
            onSuccess: () => {
                toast.add({ severity: 'success', summary: 'Mis à jour', detail: 'Tarif mis à jour', life: 3000 });
                dialogVisible.value = false;
            },
            onError: (err) => toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
        });
    } else {
        createTier(form.value, {
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
            <DataTable :value="tiers" :loading="isLoading" stripedRows scrollable>
                <template #empty>
                    <div class="text-center py-12 text-muted-color">
                        <i class="pi pi-dollar text-4xl mb-3 block opacity-30" />
                        <p class="font-medium">Aucune gamme — l'estimation de course ne pourra rien afficher</p>
                    </div>
                </template>

                <Column field="label" header="Gamme" style="min-width:12rem">
                    <template #body="{ data: row }">
                        <div class="font-semibold text-surface-900 dark:text-surface-0">{{ row.label }}</div>
                        <div class="text-xs text-muted-color">{{ row.tierKey }}</div>
                    </template>
                </Column>

                <Column header="Prix de base" style="min-width:9rem">
                    <template #body="{ data: row }">{{ Number(row.base).toFixed(2) }} EC</template>
                </Column>

                <Column header="Prix / km" style="min-width:9rem">
                    <template #body="{ data: row }">{{ Number(row.perKm).toFixed(2) }} EC</template>
                </Column>

                <Column field="seats" header="Places" style="min-width:6rem" />
                <Column header="ETA (min)" style="min-width:7rem">
                    <template #body="{ data: row }">{{ row.etaMin }} min</template>
                </Column>

                <Column header="Actif" style="min-width:6rem">
                    <template #body="{ data: row }">
                        <ToggleSwitch :modelValue="!!row.active" @update:modelValue="toggleActive(row)" />
                    </template>
                </Column>

                <Column header="Actions" style="min-width:8rem" alignHeader="right">
                    <template #body="{ data: row }">
                        <div class="flex gap-1 justify-end">
                            <Button v-tooltip.top="'Modifier'" icon="pi pi-pencil" severity="secondary" outlined rounded size="small" @click="openEdit(row)" />
                            <Button v-tooltip.top="'Supprimer'" icon="pi pi-trash" severity="danger" outlined rounded size="small" :loading="deleting" @click="confirmDelete(row)" />
                        </div>
                    </template>
                </Column>
            </DataTable>
        </div>

        <Dialog v-model:visible="dialogVisible" :header="editing ? 'Modifier la gamme' : 'Nouvelle gamme'" modal style="width:28rem" :draggable="false">
            <div class="flex flex-col gap-4 pt-1">
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
