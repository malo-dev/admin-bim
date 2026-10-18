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
import UsersService from '@/modules/users/services/users.service';

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
const selectedUser = ref(null);
const userSuggestions = ref([]);

function openCreate() {
    form.value = emptyForm();
    imageFile.value = null;
    imagePreview.value = null;
    selectedUser.value = null;
    userSuggestions.value = [];
    createDialog.value = true;
}

// Rechercher un compte BIM par nom/email au lieu d'exiger de connaître son ID
// numérique à l'avance (il fallait avant aller le chercher sur la page Utilisateurs).
async function searchUsers(event) {
    try {
        const res = await UsersService.getUsers({ search: event.query, paginate: 'true', pageSize: 10 });
        userSuggestions.value = res?.data ?? [];
    } catch {
        userSuggestions.value = [];
    }
}

function onUserSelect(event) {
    form.value.userId = event.value.id;
    if (!form.value.telephone) form.value.telephone = event.value.telephone ?? '';
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
            <!-- Chargement -->
            <div v-if="isLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Skeleton v-for="n in 6" :key="n" height="13rem" borderRadius="1rem" />
            </div>

            <!-- Vide -->
            <div v-else-if="chauffeurs.length === 0" class="text-center py-12 text-muted-color">
                <i class="pi pi-car text-4xl mb-3 block opacity-30" />
                <p class="font-medium">Aucun chauffeur — le matching des courses ne trouvera personne</p>
            </div>

            <!-- Cards -->
            <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div
                    v-for="row in chauffeurs"
                    :key="row.chauffeurId"
                    class="card mb-0! p-4! flex flex-col gap-3"
                >
                    <!-- En-tête -->
                    <div class="flex items-center gap-3">
                        <img v-if="imageUrl(row.avatarUrl)" :src="imageUrl(row.avatarUrl)" class="w-10 h-10 rounded-full object-cover shrink-0" />
                        <div v-else class="w-10 h-10 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-muted-color shrink-0">
                            <i class="pi pi-user" />
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="font-semibold text-surface-900 dark:text-surface-0 truncate">{{ row.user?.username ?? `User #${row.userId}` }}</div>
                            <div class="text-xs text-muted-color truncate">{{ row.telephone }}</div>
                        </div>
                        <Tag :value="TIER_OPTIONS.find(t => t.value === row.vehicleTier)?.label ?? row.vehicleTier" />
                    </div>

                    <!-- Véhicule -->
                    <div class="flex items-center justify-between gap-2">
                        <div class="text-sm">{{ row.vehicleMake }} {{ row.vehicleModel }} <span class="text-muted-color">· {{ row.vehicleColor }}</span></div>
                        <Tag :value="row.plateNumber" severity="secondary" />
                    </div>

                    <!-- Note -->
                    <div class="text-sm text-muted-color">
                        ⭐ {{ Number(row.rating ?? 5).toFixed(2) }} <span>({{ row.totalRides }} courses)</span>
                    </div>

                    <!-- En ligne / Statut -->
                    <div class="flex items-center justify-between gap-2 pt-2 border-t border-surface-100 dark:border-surface-800">
                        <div class="flex items-center gap-2">
                            <span class="text-xs text-muted-color">En ligne</span>
                            <ToggleSwitch :modelValue="!!row.isOnline" @update:modelValue="toggleOnline(row)" />
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-xs text-muted-color">Actif</span>
                            <ToggleSwitch :modelValue="row.status === 'active'" @update:modelValue="toggleActive(row)" />
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="flex gap-1 flex-wrap justify-end">
                        <Button v-tooltip.top="'Supprimer'" icon="pi pi-trash" severity="danger" outlined rounded size="small" :loading="deleting" @click="confirmDelete(row)" />
                    </div>
                </div>
            </div>

            <Paginator
                v-if="totalRecords > 0"
                class="mt-4"
                :rows="pageSize"
                :totalRecords="totalRecords"
                :rowsPerPageOptions="[10, 20, 50]"
                template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="{first} à {last} sur {totalRecords}"
                @page="onPage"
            />
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
                    <label class="font-medium text-sm">Compte BIM (nom ou email) <span class="text-red-400">*</span></label>
                    <AutoComplete
                        v-model="selectedUser"
                        :suggestions="userSuggestions"
                        optionLabel="username"
                        placeholder="Rechercher par nom ou email…"
                        class="w-full"
                        inputClass="w-full"
                        @complete="searchUsers"
                        @item-select="onUserSelect"
                    >
                        <template #option="{ option }">
                            <div class="flex flex-col">
                                <span class="font-medium">{{ option.username }}</span>
                                <span class="text-xs text-muted-color">{{ option.email }}</span>
                            </div>
                        </template>
                    </AutoComplete>
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
