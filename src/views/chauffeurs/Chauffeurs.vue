<script setup>
import { ref, computed } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { useChauffeursQuery } from '@/modules/chauffeurs/queries/chauffeurs.queries';
import {
    useCreateChauffeurMutation,
    useUpdateChauffeurMutation,
    useDeleteChauffeurMutation,
} from '@/modules/chauffeurs/mutations/chauffeurs.mutations';

const toast = useToast();
const confirm = useConfirm();

const SERVER_ROOT = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace('/api/v1', '');
function imageUrl(path) {
    if (!path) return null;
    return path.startsWith('http') ? path : SERVER_ROOT + path;
}

const currentPage = ref(1);
const pageSize = ref(20);
const filters = computed(() => ({ page: currentPage.value, pageSize: pageSize.value }));

const { data, isLoading } = useChauffeursQuery(filters);
const chauffeurs = computed(() => data.value?.data ?? []);
const totalRecords = computed(() => data.value?.total ?? 0);

const { mutate: createChauffeur, isPending: creating } = useCreateChauffeurMutation();
const { mutate: updateChauffeur } = useUpdateChauffeurMutation();
const { mutate: deleteChauffeur, isPending: deleting } = useDeleteChauffeurMutation();

const TIER_OPTIONS = [
    { label: 'Bim Eco', value: 'eco' },
    { label: 'Bim Confort', value: 'confort' },
    { label: 'Bim Green', value: 'green' },
    { label: 'Bim Van', value: 'van' },
    { label: 'Moto Express', value: 'moto' },
];

function emptyForm() {
    return { userId: null, telephone: '', vehicleMake: '', vehicleModel: '', vehicleColor: '', plateNumber: '', vehicleTier: 'eco', seats: 4 };
}

const createDialog = ref(false);
const form = ref(emptyForm());
const imageFile = ref(null);
const imagePreview = ref(null);
const fileInputRef = ref(null);

function openCreate() {
    form.value = emptyForm();
    imageFile.value = null;
    imagePreview.value = null;
    createDialog.value = true;
}

function onFileChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    imageFile.value = file;
    imagePreview.value = URL.createObjectURL(file);
}

const canCreate = computed(() => !!form.value.userId && !!form.value.plateNumber);

function submitCreate() {
    const payload = { ...form.value, ...(imageFile.value && { image: imageFile.value }) };
    createChauffeur(payload, {
        onSuccess: () => {
            toast.add({ severity: 'success', summary: 'Créé', detail: 'Chauffeur ajouté', life: 3000 });
            createDialog.value = false;
        },
        onError: (err) => toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
    });
}

function toggleActive(row) {
    updateChauffeur({ id: row.chauffeurId, payload: { status: row.status === 'active' ? 'pending' : 'active' } });
}

function toggleOnline(row) {
    updateChauffeur({ id: row.chauffeurId, payload: { isOnline: !row.isOnline } });
}

function confirmDelete(row) {
    confirm.require({
        message: `Supprimer ce chauffeur (${row.plateNumber}) ?`,
        header: 'Confirmation',
        icon: 'pi pi-exclamation-triangle',
        rejectProps: { label: 'Annuler', severity: 'secondary', outlined: true },
        acceptProps: { label: 'Supprimer', severity: 'danger' },
        accept: () => deleteChauffeur(row.chauffeurId, {
            onSuccess: () => toast.add({ severity: 'success', summary: 'Supprimé', detail: 'Chauffeur supprimé', life: 3000 }),
            onError: (err) => toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
        }),
    });
}

function onPage(event) {
    currentPage.value = event.page + 1;
    pageSize.value = event.rows;
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <ConfirmDialog />

        <div class="flex items-center justify-between flex-wrap gap-3">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <i class="pi pi-car text-primary text-lg" />
                </div>
                <div>
                    <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Chauffeurs BIM Transport</h1>
                    <p class="text-sm text-muted-color">Chauffeurs disponibles pour le matching automatique des courses</p>
                </div>
            </div>
            <Button label="Ajouter un chauffeur" icon="pi pi-plus" @click="openCreate" />
        </div>

        <div class="card">
            <DataTable :value="chauffeurs" :loading="isLoading" lazy paginator :rows="pageSize" :totalRecords="totalRecords" @page="onPage" :rowsPerPageOptions="[10, 20, 50]" stripedRows scrollable>
                <template #empty>
                    <div class="text-center py-12 text-muted-color">
                        <i class="pi pi-car text-4xl mb-3 block opacity-30" />
                        <p class="font-medium">Aucun chauffeur — le matching des courses ne trouvera personne</p>
                    </div>
                </template>

                <Column header="Chauffeur" style="min-width:16rem">
                    <template #body="{ data: row }">
                        <div class="flex items-center gap-3">
                            <img v-if="imageUrl(row.avatarUrl)" :src="imageUrl(row.avatarUrl)" class="w-10 h-10 rounded-full object-cover" />
                            <div v-else class="w-10 h-10 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-muted-color">
                                <i class="pi pi-user" />
                            </div>
                            <div>
                                <div class="font-semibold text-surface-900 dark:text-surface-0">{{ row.user?.username ?? `User #${row.userId}` }}</div>
                                <div class="text-xs text-muted-color">{{ row.telephone }}</div>
                            </div>
                        </div>
                    </template>
                </Column>

                <Column header="Véhicule" style="min-width:14rem">
                    <template #body="{ data: row }">
                        <div class="text-sm">{{ row.vehicleMake }} {{ row.vehicleModel }} <span class="text-muted-color">· {{ row.vehicleColor }}</span></div>
                        <Tag :value="row.plateNumber" severity="secondary" class="mt-1" />
                    </template>
                </Column>

                <Column header="Gamme" style="min-width:8rem">
                    <template #body="{ data: row }">
                        <Tag :value="TIER_OPTIONS.find(t => t.value === row.vehicleTier)?.label ?? row.vehicleTier" />
                    </template>
                </Column>

                <Column header="Note" style="min-width:7rem">
                    <template #body="{ data: row }">
                        <span class="text-sm">⭐ {{ Number(row.rating ?? 5).toFixed(2) }} <span class="text-muted-color">({{ row.totalRides }})</span></span>
                    </template>
                </Column>

                <Column header="En ligne" style="min-width:6rem">
                    <template #body="{ data: row }">
                        <ToggleSwitch :modelValue="!!row.isOnline" @update:modelValue="toggleOnline(row)" />
                    </template>
                </Column>

                <Column header="Statut" style="min-width:8rem">
                    <template #body="{ data: row }">
                        <ToggleSwitch :modelValue="row.status === 'active'" @update:modelValue="toggleActive(row)" />
                    </template>
                </Column>

                <Column header="Actions" style="min-width:5rem" alignHeader="right">
                    <template #body="{ data: row }">
                        <div class="flex gap-1 justify-end">
                            <Button v-tooltip.top="'Supprimer'" icon="pi pi-trash" severity="danger" outlined rounded size="small" :loading="deleting" @click="confirmDelete(row)" />
                        </div>
                    </template>
                </Column>
            </DataTable>
        </div>

        <Dialog v-model:visible="createDialog" header="Nouveau chauffeur" modal style="width:32rem" :draggable="false">
            <div class="flex flex-col gap-4 pt-1">
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Photo du véhicule / chauffeur</label>
                    <div class="flex items-center gap-3">
                        <img v-if="imagePreview" :src="imagePreview" class="w-20 h-20 rounded-lg object-cover" />
                        <div v-else class="w-20 h-20 rounded-lg bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-muted-color">
                            <i class="pi pi-image text-2xl opacity-40" />
                        </div>
                        <input ref="fileInputRef" type="file" accept="image/*" class="hidden" @change="onFileChange" />
                        <Button label="Choisir une image" icon="pi pi-upload" severity="secondary" outlined size="small" @click="fileInputRef.click()" />
                    </div>
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">ID Utilisateur (compte BIM existant) <span class="text-red-400">*</span></label>
                    <InputText v-model.number="form.userId" type="number" placeholder="Ex: 42 (voir page Utilisateurs)" />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Téléphone</label>
                    <InputText v-model="form.telephone" placeholder="+243..." />
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="flex flex-col gap-2">
                        <label class="font-medium text-sm">Marque</label>
                        <InputText v-model="form.vehicleMake" placeholder="Toyota, Tesla…" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium text-sm">Modèle</label>
                        <InputText v-model="form.vehicleModel" placeholder="Corolla, Model 3…" />
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="flex flex-col gap-2">
                        <label class="font-medium text-sm">Couleur</label>
                        <InputText v-model="form.vehicleColor" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium text-sm">Plaque <span class="text-red-400">*</span></label>
                        <InputText v-model="form.plateNumber" placeholder="AA-123-BB" />
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="flex flex-col gap-2">
                        <label class="font-medium text-sm">Gamme</label>
                        <Select v-model="form.vehicleTier" :options="TIER_OPTIONS" optionLabel="label" optionValue="value" class="w-full" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium text-sm">Places</label>
                        <InputText v-model.number="form.seats" type="number" />
                    </div>
                </div>
            </div>
            <template #footer>
                <Button label="Annuler" severity="secondary" outlined @click="createDialog = false" :disabled="creating" />
                <Button label="Créer" icon="pi pi-check" :loading="creating" :disabled="!canCreate" @click="submitCreate" />
            </template>
        </Dialog>
    </div>
</template>
