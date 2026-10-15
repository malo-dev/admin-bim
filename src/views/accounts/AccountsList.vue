<script setup>
import { ref, computed, watch } from 'vue';
import { refDebounced } from '@vueuse/core';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { useAdminAccountsQuery } from '@/modules/accounts/queries/account.queries';
import {
    useToggleUserActiveMutation,
    useToggleUserBlockMutation,
    useDeleteUserMutation,
    useUpdateUserProfileMutation,
} from '@/modules/users/mutations/users.mutations';
import {
    useCreateBimAdminMutation,
    useCreateCompanyAccountMutation,
} from '@/modules/accounts/mutations/account.mutations';
import { useAllSectorsQuery } from '@/modules/companies/queries/companies.queries';

const toast = useToast();
const confirm = useConfirm();

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

const { data, isLoading, isFetching } = useAdminAccountsQuery(filters);

const accounts = computed(() => data.value?.data ?? []);
const totalRecords = computed(() => data.value?.pagination?.total ?? 0);

function onPage(event) {
    currentPage.value = event.page + 1;
    pageSize.value = event.rows;
}

// Mutations
const { mutate: toggleActive, isPending: activePending } = useToggleUserActiveMutation();
const { mutate: toggleBlock, isPending: blockPending } = useToggleUserBlockMutation();
const { mutate: deleteUser, isPending: deletePending } = useDeleteUserMutation();
const { mutate: updateProfile, isPending: updatePending } = useUpdateUserProfileMutation();

function doToggleActive(user) {
    toggleActive(user.id, {
        onSuccess: () =>
            toast.add({
                severity: user.isActive ? 'warn' : 'success',
                summary: user.isActive ? 'Désactivé' : 'Activé',
                detail: `Compte ${user.isActive ? 'désactivé' : 'activé'} avec succès`,
                life: 3000,
            }),
        onError: (err) =>
            toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
    });
}

function doToggleBlock(user) {
    toggleBlock(user.id, {
        onSuccess: () =>
            toast.add({
                severity: user.isBlocked ? 'success' : 'warn',
                summary: user.isBlocked ? 'Débloqué' : 'Bloqué',
                detail: `Compte ${user.isBlocked ? 'débloqué' : 'bloqué'} avec succès`,
                life: 3000,
            }),
        onError: (err) =>
            toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
    });
}

function confirmDelete(user) {
    confirm.require({
        message: `Supprimer définitivement le compte de « ${user.username} » ? Cette action est irréversible.`,
        header: 'Confirmation de suppression',
        icon: 'pi pi-exclamation-triangle',
        rejectProps: { label: 'Annuler', severity: 'secondary', outlined: true },
        acceptProps: { label: 'Supprimer', severity: 'danger' },
        accept: () =>
            deleteUser(user.id, {
                onSuccess: () => toast.add({ severity: 'success', summary: 'Supprimé', detail: 'Compte supprimé', life: 3000 }),
                onError: (err) =>
                    toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
            }),
    });
}

// Edit dialog
const editDialog = ref(false);
const editForm = ref({ id: null, username: '', email: '', fullname: '', telephone: '' });

function openEdit(user) {
    editForm.value = {
        id: user.id,
        username: user.username ?? '',
        email: user.email ?? '',
        fullname: user.fullname ?? '',
        telephone: user.telephone ?? '',
    };
    editDialog.value = true;
}

function saveEdit() {
    const { id, ...payload } = editForm.value;
    updateProfile(
        { id, payload },
        {
            onSuccess: () => {
                toast.add({ severity: 'success', summary: 'Mis à jour', detail: 'Compte modifié avec succès', life: 3000 });
                editDialog.value = false;
            },
            onError: (err) =>
                toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
        }
    );
}

// ── Création de compte : popup avec choix BIM Admin / Entreprise ────────────
const createDialog = ref(false);
const createStep = ref('choice'); // 'choice' | 'bim' | 'company'

function openCreateDialog() {
    createStep.value = 'choice';
    createDialog.value = true;
}

// Étape "Compte BIM Admin"
const bimForm = ref({ username: '', email: '', password: '' });
const { mutate: createBimAdmin, isPending: bimPending } = useCreateBimAdminMutation();

function submitBimAdmin() {
    createBimAdmin(bimForm.value, {
        onSuccess: () => {
            toast.add({ severity: 'success', summary: 'Compte créé', detail: 'Compte BIM Admin créé avec succès', life: 4000 });
            bimForm.value = { username: '', email: '', password: '' };
            createDialog.value = false;
        },
        onError: (err) =>
            toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
    });
}

// Étape "Compte Entreprise" (crée l'entreprise + son admin en une opération)
const { data: sectorsData } = useAllSectorsQuery();
const sectorOptions = computed(() => {
    const raw = sectorsData.value;
    const list = Array.isArray(raw) ? raw : (raw?.data ?? []);
    return list.map((s) => ({ label: s.name, value: s.businessId }));
});

const companyForm = ref({
    company: { name: '', email: '', businessId: null, location: '', logo: '', description: '' },
    admin: { username: '', email: '', password: '' },
});
const { mutate: createCompanyAccount, isPending: companyPending } = useCreateCompanyAccountMutation();

const canSubmitCompany = computed(() =>
    !!companyForm.value.company.name &&
    !!companyForm.value.company.email &&
    !!companyForm.value.admin.username &&
    !!companyForm.value.admin.email &&
    !!companyForm.value.admin.password
);

function resetCompanyForm() {
    companyForm.value = {
        company: { name: '', email: '', businessId: null, location: '', logo: '', description: '' },
        admin: { username: '', email: '', password: '' },
    };
}

function submitCompanyAccount() {
    const payload = {
        company: {
            name: companyForm.value.company.name,
            email: companyForm.value.company.email,
            ...(companyForm.value.company.businessId && { businessId: companyForm.value.company.businessId }),
            ...(companyForm.value.company.location && { location: companyForm.value.company.location }),
            ...(companyForm.value.company.logo && { logo: companyForm.value.company.logo }),
            ...(companyForm.value.company.description && { description: companyForm.value.company.description }),
        },
        admin: {
            username: companyForm.value.admin.username,
            email: companyForm.value.admin.email,
            password: companyForm.value.admin.password,
        },
    };
    createCompanyAccount(payload, {
        onSuccess: (res) => {
            toast.add({
                severity: 'success',
                summary: 'Entreprise créée',
                detail: `Entreprise « ${res.company?.name ?? companyForm.value.company.name} » et administrateur créés avec succès`,
                life: 5000,
            });
            resetCompanyForm();
            createDialog.value = false;
        },
        onError: (err) =>
            toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
    });
}

function roleSeverity(name) {
    return name === 'BIM' ? 'danger' : 'info';
}
function roleLabel(name) {
    return name === 'BIM' ? 'BIM Admin' : 'Admin Entreprise';
}
function formatDate(d) {
    return d ? new Date(d).toLocaleDateString('fr-FR') : '—';
}
function getInitials(name) {
    return name ? name[0].toUpperCase() : '?';
}
function isCompanyAdmin(row) {
    return row.role?.some(r => r.name !== 'BIM');
}
function companyRating(row) {
    return Number(row.company?.note ?? row.company?.rating ?? 0);
}
function companyReviews(row) {
    return row.company?._count?.reviews ?? row.company?.reviewCount ?? row.company?.avisCount ?? 0;
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
                    <i class="pi pi-id-card text-primary text-lg" />
                </div>
                <div>
                    <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Liste des comptes</h1>
                    <p class="text-sm text-muted-color">Administrateurs BIM et Entreprise</p>
                </div>
            </div>
            <Button label="Créer un compte" icon="pi pi-plus" @click="openCreateDialog" />
        </div>

        <div class="card">
            <!-- Toolbar -->
            <div class="flex items-center gap-3 mb-5 flex-wrap">
                <IconField class="flex-1 min-w-56">
                    <InputIcon class="pi pi-search" />
                    <InputText v-model="searchInput" placeholder="Rechercher par nom, email…" class="w-full" />
                </IconField>
                <span class="text-sm text-muted-color ml-auto">
                    <span v-if="isFetching && !isLoading" class="mr-2"><i class="pi pi-spin pi-spinner text-xs" /></span>
                    {{ totalRecords }} compte(s)
                </span>
            </div>

            <!-- Chargement -->
            <div v-if="isLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Skeleton v-for="n in 6" :key="n" height="11rem" borderRadius="1rem" />
            </div>

            <!-- Vide -->
            <div v-else-if="accounts.length === 0" class="text-center py-12 text-muted-color">
                <i class="pi pi-users text-4xl mb-3 block opacity-30" />
                <p class="font-medium">Aucun compte trouvé</p>
            </div>

            <!-- Cards -->
            <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div
                    v-for="row in accounts"
                    :key="row.id"
                    class="card mb-0! p-4! flex flex-col gap-3"
                >
                    <!-- En-tête -->
                    <div class="flex items-center gap-3">
                        <Avatar
                            :label="getInitials(row.username)"
                            shape="circle"
                            :style="{ backgroundColor: 'var(--p-primary-100)', color: 'var(--p-primary-700)', fontWeight: '700' }"
                        />
                        <div class="flex-1 min-w-0">
                            <div class="font-semibold text-surface-900 dark:text-surface-0 truncate">{{ row.username }}</div>
                            <div class="text-xs text-muted-color truncate">{{ row.email }}</div>
                        </div>
                        <Tag :value="row.isActive ? 'Actif' : 'Inactif'" :severity="row.isActive ? 'success' : 'secondary'" />
                    </div>

                    <!-- Rôle -->
                    <div class="flex flex-wrap gap-1">
                        <Tag
                            v-for="r in row.role"
                            :key="r.id"
                            :value="roleLabel(r.name)"
                            :severity="roleSeverity(r.name)"
                        />
                    </div>

                    <!-- Note entreprise -->
                    <div v-if="isCompanyAdmin(row)" class="flex flex-col gap-0.5">
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
                            {{ companyReviews(row) > 0 ? `${companyReviews(row)} avis` : 'Aucun avis' }}
                        </span>
                    </div>

                    <!-- Accès + date -->
                    <div class="flex items-center gap-2">
                        <Tag v-if="row.isBlocked" value="Bloqué" severity="danger" />
                        <Tag v-else value="Normal" severity="secondary" />
                        <span class="text-xs text-muted-color ml-auto whitespace-nowrap">
                            Créé le {{ formatDate(row.createdAt) }}
                        </span>
                    </div>

                    <!-- Actions -->
                    <div class="flex gap-1 flex-wrap justify-end pt-2 border-t border-surface-100 dark:border-surface-800">
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
                            v-tooltip.top="row.isActive ? 'Désactiver' : 'Activer'"
                            :icon="row.isActive ? 'pi pi-power-off' : 'pi pi-check-circle'"
                            :severity="row.isActive ? 'warning' : 'success'"
                            outlined
                            rounded
                            size="small"
                            :loading="activePending"
                            @click="doToggleActive(row)"
                        />
                        <Button
                            v-tooltip.top="row.isBlocked ? 'Débloquer' : 'Bloquer'"
                            :icon="row.isBlocked ? 'pi pi-lock-open' : 'pi pi-ban'"
                            :severity="row.isBlocked ? 'success' : 'danger'"
                            outlined
                            rounded
                            size="small"
                            :loading="blockPending"
                            @click="doToggleBlock(row)"
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

        <!-- Edit Dialog -->
        <Dialog
            v-model:visible="editDialog"
            header="Modifier le compte"
            modal
            style="width: 34rem"
            :draggable="false"
        >
            <div class="flex flex-col gap-4 pt-1">
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm text-surface-900 dark:text-surface-0">Nom d'utilisateur</label>
                    <InputText v-model="editForm.username" placeholder="username" />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm text-surface-900 dark:text-surface-0">Email</label>
                    <InputText v-model="editForm.email" type="email" placeholder="email@example.com" />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm text-surface-900 dark:text-surface-0">Nom complet</label>
                    <InputText v-model="editForm.fullname" placeholder="Prénom Nom" />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm text-surface-900 dark:text-surface-0">Téléphone</label>
                    <InputText v-model="editForm.telephone" placeholder="+XXX XXXXXXXXX" />
                </div>
            </div>
            <template #footer>
                <Button label="Annuler" severity="secondary" outlined @click="editDialog = false" :disabled="updatePending" />
                <Button label="Enregistrer" icon="pi pi-check" @click="saveEdit" :loading="updatePending" />
            </template>
        </Dialog>

        <!-- Create Account Dialog : parcours Choix → BIM Admin / Entreprise -->
        <Dialog
            v-model:visible="createDialog"
            modal
            :draggable="false"
            :style="{ width: createStep === 'choice' ? '26rem' : '36rem' }"
            :header="createStep === 'choice' ? 'Créer un compte' : (createStep === 'bim' ? 'Compte BIM Admin' : 'Compte Entreprise')"
        >
            <!-- Étape 1 : choix du type de compte -->
            <div v-if="createStep === 'choice'" class="flex flex-col gap-3 pt-1">
                <p class="text-sm text-muted-color mb-1">Quel type de compte voulez-vous créer ?</p>

                <button
                    type="button"
                    class="card mb-0! p-4! flex items-center gap-3 text-left cursor-pointer hover:border-primary border border-surface-200 dark:border-surface-700 transition-colors"
                    @click="createStep = 'bim'"
                >
                    <div class="w-11 h-11 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                        <i class="pi pi-shield text-red-500 text-lg" />
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="font-semibold text-surface-900 dark:text-surface-0">Compte BIM Admin</div>
                        <div class="text-xs text-muted-color">Gère utilisateurs, commandes et tout l'espace Gestion</div>
                    </div>
                    <i class="pi pi-chevron-right text-muted-color" />
                </button>

                <button
                    type="button"
                    class="card mb-0! p-4! flex items-center gap-3 text-left cursor-pointer hover:border-primary border border-surface-200 dark:border-surface-700 transition-colors"
                    @click="createStep = 'company'"
                >
                    <div class="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <i class="pi pi-building text-primary text-lg" />
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="font-semibold text-surface-900 dark:text-surface-0">Compte Entreprise</div>
                        <div class="text-xs text-muted-color">Crée une nouvelle entreprise et son administrateur</div>
                    </div>
                    <i class="pi pi-chevron-right text-muted-color" />
                </button>
            </div>

            <!-- Étape 2a : formulaire BIM Admin -->
            <div v-else-if="createStep === 'bim'" class="flex flex-col gap-4 pt-1">
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm text-surface-900 dark:text-surface-0">Nom d'utilisateur</label>
                    <InputText v-model="bimForm.username" placeholder="ex: john_bim" :disabled="bimPending" />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm text-surface-900 dark:text-surface-0">Email</label>
                    <InputText v-model="bimForm.email" type="email" placeholder="admin@bimreseau.com" :disabled="bimPending" />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm text-surface-900 dark:text-surface-0">Mot de passe</label>
                    <Password v-model="bimForm.password" placeholder="Mot de passe fort" :toggleMask="true" fluid :disabled="bimPending" />
                </div>
            </div>

            <!-- Étape 2b : formulaire Entreprise -->
            <div v-else class="flex flex-col gap-5 pt-1">
                <div>
                    <p class="text-xs font-semibold text-primary uppercase tracking-wide mb-3">Informations de l'entreprise</p>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div class="flex flex-col gap-2">
                            <label class="font-medium text-sm">Nom <span class="text-red-400">*</span></label>
                            <InputText v-model="companyForm.company.name" placeholder="Ex: Acme SARL" :disabled="companyPending" />
                        </div>
                        <div class="flex flex-col gap-2">
                            <label class="font-medium text-sm">Email <span class="text-red-400">*</span></label>
                            <InputText v-model="companyForm.company.email" type="email" placeholder="contact@entreprise.com" :disabled="companyPending" />
                        </div>
                        <div class="flex flex-col gap-2">
                            <label class="font-medium text-sm">Secteur</label>
                            <Select
                                v-model="companyForm.company.businessId"
                                :options="sectorOptions"
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Choisir un secteur"
                                showClear
                                class="w-full"
                                :disabled="companyPending"
                            />
                        </div>
                        <div class="flex flex-col gap-2">
                            <label class="font-medium text-sm">Localisation</label>
                            <InputText v-model="companyForm.company.location" placeholder="Ex: Kinshasa" :disabled="companyPending" />
                        </div>
                    </div>
                    <div class="flex flex-col gap-2 mt-4">
                        <label class="font-medium text-sm">Logo (URL)</label>
                        <InputText v-model="companyForm.company.logo" placeholder="https://…" :disabled="companyPending" />
                    </div>
                    <div class="flex flex-col gap-2 mt-4">
                        <label class="font-medium text-sm">Description</label>
                        <Textarea v-model="companyForm.company.description" placeholder="Description…" rows="2" autoResize :disabled="companyPending" />
                    </div>
                </div>

                <Divider />

                <div>
                    <p class="text-xs font-semibold text-primary uppercase tracking-wide mb-3">Administrateur de l'entreprise</p>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div class="flex flex-col gap-2">
                            <label class="font-medium text-sm">Nom d'utilisateur <span class="text-red-400">*</span></label>
                            <InputText v-model="companyForm.admin.username" placeholder="Ex: john_doe" :disabled="companyPending" />
                        </div>
                        <div class="flex flex-col gap-2">
                            <label class="font-medium text-sm">Email <span class="text-red-400">*</span></label>
                            <InputText v-model="companyForm.admin.email" type="email" placeholder="admin@entreprise.com" :disabled="companyPending" />
                        </div>
                    </div>
                    <div class="flex flex-col gap-2 mt-4">
                        <label class="font-medium text-sm">Mot de passe <span class="text-red-400">*</span></label>
                        <Password v-model="companyForm.admin.password" placeholder="Mot de passe sécurisé" :toggleMask="true" fluid :disabled="companyPending" />
                    </div>
                </div>
            </div>

            <template #footer>
                <Button v-if="createStep !== 'choice'" label="Retour" icon="pi pi-arrow-left" severity="secondary" text @click="createStep = 'choice'" />
                <Button label="Annuler" severity="secondary" outlined @click="createDialog = false" />
                <Button
                    v-if="createStep === 'bim'"
                    label="Créer le compte"
                    icon="pi pi-shield"
                    :loading="bimPending"
                    :disabled="!bimForm.username || !bimForm.email || !bimForm.password"
                    @click="submitBimAdmin"
                />
                <Button
                    v-if="createStep === 'company'"
                    label="Créer l'entreprise"
                    icon="pi pi-building"
                    :loading="companyPending"
                    :disabled="!canSubmitCompany"
                    @click="submitCompanyAccount"
                />
            </template>
        </Dialog>
    </div>
</template>
