<script setup>
import { ref, computed, watch } from 'vue';
import { refDebounced } from '@vueuse/core';
import { useToast } from 'primevue/usetoast';
import { useLivreursQuery } from '@/modules/livreurs/queries/livreurs.queries';
import { useUpdateLivreurStatusMutation, useCreateLivreurMutation } from '@/modules/livreurs/mutations/livreurs.mutations';
import { useAllCompaniesForOrderQuery } from '@/modules/orders/queries/orders.queries';

const toast = useToast();

// ── Statuts ────────────────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
    { label: 'Tous',           value: null },
    { label: 'En attente',     value: 'pending' },
    { label: 'Accepté',        value: 'accepted' },
    { label: 'Refusé',         value: 'rejected' },
    { label: 'Actif (engagé)', value: 'active' },
];
const STATUS_LABEL    = { pending: 'En attente', accepted: 'Accepté', rejected: 'Refusé', active: 'Actif' };
const STATUS_SEVERITY = { pending: 'warn', accepted: 'info', rejected: 'danger', active: 'success' };

// Actions disponibles selon statut courant
const NEXT_ACTIONS = {
    pending:  [
        { status: 'accepted', label: 'Accepter', icon: 'pi pi-check',     severity: 'success' },
        { status: 'rejected', label: 'Refuser',  icon: 'pi pi-times',     severity: 'danger' },
    ],
    accepted: [
        { status: 'active',   label: 'Engager',  icon: 'pi pi-send',      severity: 'info' },
        { status: 'rejected', label: 'Refuser',  icon: 'pi pi-times',     severity: 'danger' },
    ],
    active: [
        { status: 'rejected', label: 'Désactiver', icon: 'pi pi-ban',     severity: 'danger' },
    ],
};

// ── Filtres ────────────────────────────────────────────────────────────────────
const searchInput     = ref('');
const search          = refDebounced(searchInput, 400);
const selectedStatus  = ref(null);
const selectedCompany = ref(null);
const currentPage     = ref(1);
const pageSize        = ref(20);

watch([search, selectedStatus, selectedCompany], () => { currentPage.value = 1; });

const filters = computed(() => ({
    search:    search.value   || undefined,
    status:    selectedStatus.value  || undefined,
    companyId: selectedCompany.value || undefined,
    page:      currentPage.value,
    pageSize:  pageSize.value,
}));

const { data, isLoading, isFetching } = useLivreursQuery(filters);
const { data: companyOptions }         = useAllCompaniesForOrderQuery();

const livreurs      = computed(() => data.value?.data  ?? []);
const totalRecords  = computed(() => data.value?.total ?? 0);

function onPage(event) {
    currentPage.value = event.page + 1;
    pageSize.value    = event.rows;
}
function clearFilters() {
    searchInput.value     = '';
    selectedStatus.value  = null;
    selectedCompany.value = null;
}

// ── Mutation statut ────────────────────────────────────────────────────────────
const { mutate: updateStatus, isPending: updating } = useUpdateLivreurStatusMutation();

function changeStatus(row, status) {
    updateStatus(
        { id: row.livreurId, status },
        {
            onSuccess: (res) => {
                toast.add({ severity: 'success', summary: 'Statut mis à jour', detail: STATUS_LABEL[status], life: 3000 });
                // Si mot de passe livreur retourné (engagement), le montrer
                if (res?.plainPassword) {
                    toast.add({
                        severity: 'info',
                        summary: '🔑 Mot de passe livreur',
                        detail: `Mot de passe envoyé par email : ${res.plainPassword}`,
                        life: 10000,
                    });
                }
            },
            onError: (err) =>
                toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
        }
    );
}

// ── Création directe ───────────────────────────────────────────────────────────
const { mutate: createLivreur, isPending: creating } = useCreateLivreurMutation();

const createDialog = ref(false);
const createForm   = ref({ username: '', email: '', telephone: '', companyId: null, motivation: '' });

function openCreate() {
    createForm.value = { username: '', email: '', telephone: '', companyId: null, motivation: '' };
    createDialog.value = true;
}

function submitCreate() {
    if (!createForm.value.username || !createForm.value.email || !createForm.value.telephone) {
        toast.add({ severity: 'warn', summary: 'Champs requis', detail: 'Nom, email et téléphone sont obligatoires', life: 3000 });
        return;
    }
    createLivreur(
        {
            username:   createForm.value.username,
            email:      createForm.value.email,
            telephone:  createForm.value.telephone,
            companyId:  createForm.value.companyId || null,
            motivation: createForm.value.motivation || null,
        },
        {
            onSuccess: (res) => {
                createDialog.value = false;
                toast.add({ severity: 'success', summary: 'Livreur créé', detail: `Compte activé. Identifiants envoyés par email.`, life: 4000 });
                if (res?.plainPassword) {
                    toast.add({
                        severity: 'info',
                        summary: '🔑 Mot de passe livreur',
                        detail: `${createForm.value.email} → ${res.plainPassword}`,
                        life: 12000,
                    });
                }
            },
            onError: (err) =>
                toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
        }
    );
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatDate(d) {
    return d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
}

// Stats rapides
const stats = computed(() => {
    const all = livreurs.value;
    return {
        total:    totalRecords.value,
        pending:  livreurs.value.filter(l => l.status === 'pending').length,
        active:   livreurs.value.filter(l => l.status === 'active').length,
        online:   livreurs.value.filter(l => l.isOnline).length,
    };
});
</script>

<template>
    <div class="flex flex-col gap-4">
        <Toast />

        <!-- Header -->
        <div class="flex items-center justify-between flex-wrap gap-3">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <i class="pi pi-truck text-primary text-lg" />
                </div>
                <div>
                    <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Livreurs</h1>
                    <p class="text-sm text-muted-color">Candidatures et gestion des livreurs BIM</p>
                </div>
            </div>
            <Button label="Créer un livreur" icon="pi pi-plus" @click="openCreate" />
        </div>

        <!-- Stats rapides -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="card !py-3 flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <i class="pi pi-users text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                    <div class="text-xl font-bold">{{ stats.total }}</div>
                    <div class="text-xs text-muted-color">Total</div>
                </div>
            </div>
            <div class="card !py-3 flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                    <i class="pi pi-clock text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                    <div class="text-xl font-bold">{{ stats.pending }}</div>
                    <div class="text-xs text-muted-color">En attente</div>
                </div>
            </div>
            <div class="card !py-3 flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <i class="pi pi-check-circle text-green-600 dark:text-green-400" />
                </div>
                <div>
                    <div class="text-xl font-bold">{{ stats.active }}</div>
                    <div class="text-xs text-muted-color">Actifs</div>
                </div>
            </div>
            <div class="card !py-3 flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <i class="pi pi-wifi text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                    <div class="text-xl font-bold">{{ stats.online }}</div>
                    <div class="text-xs text-muted-color">En ligne</div>
                </div>
            </div>
        </div>

        <div class="card">
            <!-- Toolbar -->
            <div class="flex flex-wrap items-center gap-3 mb-5">
                <IconField class="flex-1 min-w-52">
                    <InputIcon class="pi pi-search" />
                    <InputText v-model="searchInput" placeholder="Nom, email…" class="w-full" />
                </IconField>

                <Select
                    v-model="selectedStatus"
                    :options="STATUS_OPTIONS"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Tous les statuts"
                    class="min-w-44"
                />

                <Select
                    v-model="selectedCompany"
                    :options="companyOptions ?? []"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Toutes les entreprises"
                    showClear
                    class="min-w-48"
                    filter
                />

                <Button
                    v-if="selectedStatus || selectedCompany || searchInput"
                    icon="pi pi-filter-slash"
                    severity="secondary"
                    outlined
                    v-tooltip.top="'Effacer les filtres'"
                    @click="clearFilters"
                />

                <span class="text-sm text-muted-color whitespace-nowrap">
                    <i v-if="isFetching && !isLoading" class="pi pi-spin pi-spinner text-xs mr-1" />
                    {{ totalRecords }} livreur(s)
                </span>
            </div>

            <!-- Chargement -->
            <div v-if="isLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Skeleton v-for="n in 6" :key="n" height="11rem" borderRadius="1rem" />
            </div>

            <!-- Vide -->
            <div v-else-if="livreurs.length === 0" class="text-center py-12 text-muted-color">
                <i class="pi pi-truck text-4xl mb-3 block opacity-30" />
                <p class="font-medium">Aucun livreur trouvé</p>
            </div>

            <!-- Cards -->
            <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div
                    v-for="row in livreurs"
                    :key="row.livreurId"
                    class="card mb-0! p-4! flex flex-col gap-3"
                >
                    <!-- En-tête -->
                    <div class="flex items-center gap-3">
                        <div class="relative">
                            <img
                                v-if="row.user?.imageUrl"
                                :src="row.user.imageUrl"
                                class="w-9 h-9 rounded-full object-cover"
                            />
                            <div
                                v-else
                                class="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold"
                            >
                                {{ row.user?.username?.charAt(0)?.toUpperCase() ?? '?' }}
                            </div>
                            <!-- Online dot -->
                            <span
                                v-if="row.isOnline"
                                class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white dark:border-surface-900"
                            />
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="font-semibold text-sm text-surface-900 dark:text-surface-0 truncate">
                                {{ row.user?.username ?? '—' }}
                            </div>
                            <div class="text-xs text-muted-color truncate">{{ row.user?.email ?? '' }}</div>
                        </div>
                        <Tag
                            :value="STATUS_LABEL[row.status] ?? row.status"
                            :severity="STATUS_SEVERITY[row.status] ?? 'secondary'"
                        />
                    </div>

                    <!-- Téléphone + entreprise -->
                    <div class="flex items-center justify-between gap-2">
                        <span class="text-sm text-muted-color">{{ row.telephone ?? '—' }}</span>
                        <Tag v-if="row.company?.name" :value="row.company.name" severity="secondary" />
                        <span v-else class="text-muted-color text-sm">BIM (tous)</span>
                    </div>

                    <!-- Note + candidature -->
                    <div class="flex items-center justify-between gap-2">
                        <div class="flex items-center gap-1 text-sm">
                            <i class="pi pi-star-fill text-yellow-400 text-xs" />
                            <span class="font-medium">{{ row.rating ?? '0.00' }}</span>
                            <span class="text-muted-color text-xs">({{ row.ratingCount ?? 0 }})</span>
                        </div>
                        <span class="text-xs text-muted-color">{{ formatDate(row.createdAt) }}</span>
                    </div>

                    <!-- Actions -->
                    <div class="flex gap-1 flex-wrap justify-end pt-2 border-t border-surface-100 dark:border-surface-800">
                        <Button
                            v-for="action in (NEXT_ACTIONS[row.status] ?? [])"
                            :key="action.status"
                            :label="action.label"
                            :icon="action.icon"
                            :severity="action.severity"
                            outlined
                            size="small"
                            :loading="updating"
                            @click="changeStatus(row, action.status)"
                        />
                        <span v-if="!NEXT_ACTIONS[row.status]?.length" class="text-xs text-muted-color italic">
                            Aucune action
                        </span>
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

        <!-- ── Dialog création ──────────────────────────────────────────────── -->
        <Dialog
            v-model:visible="createDialog"
            header="Créer un livreur directement"
            modal
            style="width:36rem"
            :draggable="false"
        >
            <p class="text-sm text-muted-color mb-4">
                Le compte BIM NEXT sera créé si l'email n'existe pas encore. Les identifiants livreur seront envoyés par email.
            </p>
            <div class="flex flex-col gap-4 pt-1">
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Nom d'utilisateur <span class="text-red-500">*</span></label>
                    <InputText v-model="createForm.username" placeholder="Ex: Jean Dupont" class="w-full" />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Email <span class="text-red-500">*</span></label>
                    <InputText v-model="createForm.email" type="email" placeholder="jean@example.com" class="w-full" />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Téléphone <span class="text-red-500">*</span></label>
                    <InputText v-model="createForm.telephone" placeholder="+243 ..." class="w-full" />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Entreprise associée</label>
                    <Select
                        v-model="createForm.companyId"
                        :options="companyOptions ?? []"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="BIM (aucune entreprise spécifique)"
                        showClear
                        class="w-full"
                        filter
                    />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Motivation (optionnel)</label>
                    <Textarea v-model="createForm.motivation" rows="2" autoResize class="w-full" />
                </div>
            </div>
            <template #footer>
                <Button label="Annuler" severity="secondary" outlined @click="createDialog = false" :disabled="creating" />
                <Button label="Créer & Activer" icon="pi pi-check" :loading="creating" @click="submitCreate" />
            </template>
        </Dialog>
    </div>
</template>
