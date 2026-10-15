<script setup>
import { ref, computed, watch } from 'vue';
import { refDebounced } from '@vueuse/core';
import { useToast } from 'primevue/usetoast';
import { useAgentsQuery } from '@/modules/agents/queries/agents.queries';
import { useCreateAgentMutation, useToggleAgentMutation } from '@/modules/agents/mutations/agents.mutations';

const toast = useToast();

// ── Filtres ────────────────────────────────────────────────────────────────────
const searchInput = ref('');
const search      = refDebounced(searchInput, 400);
const currentPage = ref(1);
const pageSize    = ref(20);

watch([search], () => { currentPage.value = 1; });

const filters = computed(() => ({
    search:   search.value || undefined,
    page:     currentPage.value,
    pageSize: pageSize.value,
}));

const { data, isLoading, isFetching } = useAgentsQuery(filters);

const agents      = computed(() => data.value?.data  ?? []);
const totalRecords = computed(() => data.value?.total ?? 0);

function onPage(event) {
    currentPage.value = event.page + 1;
    pageSize.value    = event.rows;
}

// ── Stats ──────────────────────────────────────────────────────────────────────
const totalAgents   = computed(() => data.value?.total ?? 0);
const activeAgents  = computed(() => agents.value.filter((a) => !a.isBlocked).length);
const blockedAgents = computed(() => agents.value.filter((a) =>  a.isBlocked).length);
const todayTotal    = computed(() =>
    agents.value.reduce((acc, a) => acc + (a.todaySum ?? 0), 0).toFixed(2)
);

// ── Toggle (block/unblock/remove) ─────────────────────────────────────────────
const { mutate: toggleAgent, isPending: toggling } = useToggleAgentMutation();

function doToggle(agent, action) {
    const LABELS = { block: 'bloqué', unblock: 'débloqué', remove: 'retiré' };
    toggleAgent(
        { id: agent.id, action },
        {
            onSuccess: () =>
                toast.add({ severity: 'success', summary: 'Agent mis à jour', detail: `Agent ${LABELS[action]} avec succès`, life: 3000 }),
            onError: (err) =>
                toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
        }
    );
}

// ── Création ───────────────────────────────────────────────────────────────────
const { mutate: createAgent, isPending: creating } = useCreateAgentMutation();

const createDialog = ref(false);
const createForm   = ref({ username: '', email: '', telephone: '' });
const createdCreds = ref(null); // { plainPassword, accountNumber }

function openCreate() {
    createForm.value  = { username: '', email: '', telephone: '' };
    createdCreds.value = null;
    createDialog.value = true;
}

function submitCreate() {
    if (!createForm.value.username || !createForm.value.email || !createForm.value.telephone) {
        toast.add({ severity: 'warn', summary: 'Champs requis', detail: 'Nom, email et téléphone sont obligatoires', life: 3000 });
        return;
    }
    createAgent(createForm.value, {
        onSuccess: (res) => {
            createdCreds.value = {
                plainPassword:  res.plainPassword,
                accountNumber:  res.user?.accountNumber,
                email:          createForm.value.email,
                username:       createForm.value.username,
            };
            toast.add({ severity: 'success', summary: 'Agent créé', detail: 'Les identifiants ont été envoyés par email', life: 4000 });
        },
        onError: (err) =>
            toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
    });
}

function closeCreate() {
    createDialog.value = false;
    createdCreds.value = null;
}

// ── Confirmation suppression ────────────────────────────────────────────────────
const confirmTarget = ref(null);
const confirmAction = ref(null);
const confirmDialog = ref(false);

function askConfirm(agent, action) {
    confirmTarget.value = agent;
    confirmAction.value = action;
    confirmDialog.value = true;
}

function doConfirm() {
    if (confirmTarget.value && confirmAction.value) {
        doToggle(confirmTarget.value, confirmAction.value);
    }
    confirmDialog.value = false;
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <Toast />

        <!-- ── Header ──────────────────────────────────────────────────────── -->
        <div class="flex items-center justify-between flex-wrap gap-3">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <i class="pi pi-id-card text-primary text-lg" />
                </div>
                <div>
                    <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Agents BIM</h1>
                    <p class="text-sm text-muted-color">Gestion des agents de retrait BIM NEXT</p>
                </div>
            </div>
            <Button label="Créer un agent" icon="pi pi-plus" @click="openCreate" />
        </div>

        <!-- ── Stats rapides ──────────────────────────────────────────────── -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="card !py-3 flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <i class="pi pi-users text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                    <div class="text-xl font-bold">{{ totalAgents }}</div>
                    <div class="text-xs text-muted-color">Total agents</div>
                </div>
            </div>
            <div class="card !py-3 flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <i class="pi pi-check-circle text-green-600 dark:text-green-400" />
                </div>
                <div>
                    <div class="text-xl font-bold">{{ activeAgents }}</div>
                    <div class="text-xs text-muted-color">Actifs</div>
                </div>
            </div>
            <div class="card !py-3 flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <i class="pi pi-ban text-red-600 dark:text-red-400" />
                </div>
                <div>
                    <div class="text-xl font-bold">{{ blockedAgents }}</div>
                    <div class="text-xs text-muted-color">Bloqués</div>
                </div>
            </div>
            <div class="card !py-3 flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <i class="pi pi-arrow-down-left text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                    <div class="text-xl font-bold">{{ todayTotal }} EC</div>
                    <div class="text-xs text-muted-color">Retraits aujourd'hui</div>
                </div>
            </div>
        </div>

        <!-- ── Table ──────────────────────────────────────────────────────── -->
        <div class="card">
            <!-- Toolbar -->
            <div class="flex flex-wrap items-center gap-3 mb-5">
                <IconField class="flex-1 min-w-52">
                    <InputIcon class="pi pi-search" />
                    <InputText v-model="searchInput" placeholder="Nom, email, numéro de compte…" class="w-full" />
                </IconField>
                <div class="flex items-center gap-2 text-sm text-muted-color">
                    <i v-if="isFetching && !isLoading" class="pi pi-spin pi-spinner text-xs" />
                    {{ totalRecords }} agent{{ totalRecords !== 1 ? 's' : '' }}
                </div>
            </div>

            <!-- Chargement -->
            <div v-if="isLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Skeleton v-for="n in 6" :key="n" height="11rem" borderRadius="1rem" />
            </div>

            <!-- Vide -->
            <div v-else-if="agents.length === 0" class="text-center py-12 text-muted-color">
                <i class="pi pi-id-card text-4xl mb-3 block opacity-30" />
                <p class="font-medium">Aucun agent trouvé</p>
            </div>

            <!-- Cards -->
            <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div
                    v-for="row in agents"
                    :key="row.id"
                    class="card mb-0! p-4! flex flex-col gap-3"
                >
                    <!-- En-tête -->
                    <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <i class="pi pi-user text-primary text-sm" />
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="font-semibold text-surface-900 dark:text-surface-0 truncate">{{ row.username }}</div>
                            <div class="text-xs text-muted-color truncate">{{ row.email }}</div>
                        </div>
                        <Tag
                            :value="row.isBlocked ? 'Bloqué' : 'Actif'"
                            :severity="row.isBlocked ? 'danger' : 'success'"
                        />
                    </div>

                    <!-- Téléphone + N° compte -->
                    <div class="flex items-center justify-between gap-2">
                        <span class="text-sm text-muted-color">{{ row.telephone ?? '—' }}</span>
                        <code class="text-xs bg-surface-100 dark:bg-surface-700 px-2 py-0.5 rounded">{{ row.accountNumber ?? '—' }}</code>
                    </div>

                    <!-- Commission + aujourd'hui -->
                    <div class="flex items-center justify-between gap-2">
                        <span class="text-xs text-muted-color">Commission cumulée</span>
                        <span class="font-semibold text-emerald-600 dark:text-emerald-400">
                            {{ Number(row.soldNumber ?? 0).toFixed(2) }} EC
                        </span>
                    </div>
                    <div class="flex items-center justify-between gap-2">
                        <span class="text-xs text-muted-color">
                            Aujourd'hui · {{ row.todayCount ?? 0 }} retrait{{ (row.todayCount ?? 0) !== 1 ? 's' : '' }}
                        </span>
                        <span class="text-sm text-emerald-600 dark:text-emerald-400">{{ Number(row.todaySum ?? 0).toFixed(2) }} EC</span>
                    </div>

                    <!-- Date création -->
                    <div class="text-xs text-muted-color">
                        Créé le {{ new Date(row.createdAt).toLocaleDateString('fr-FR') }}
                    </div>

                    <!-- Actions -->
                    <div class="flex gap-1 flex-wrap justify-end pt-2 border-t border-surface-100 dark:border-surface-800">
                        <Button
                            v-if="!row.isBlocked"
                            icon="pi pi-ban"
                            label="Bloquer"
                            severity="danger"
                            size="small"
                            outlined
                            :loading="toggling"
                            @click="askConfirm(row, 'block')"
                        />
                        <Button
                            v-else
                            icon="pi pi-check"
                            label="Débloquer"
                            severity="success"
                            size="small"
                            outlined
                            :loading="toggling"
                            @click="askConfirm(row, 'unblock')"
                        />
                        <Button
                            icon="pi pi-user-minus"
                            severity="secondary"
                            size="small"
                            outlined
                            v-tooltip.top="'Retirer statut agent'"
                            :loading="toggling"
                            @click="askConfirm(row, 'remove')"
                        />
                    </div>
                </div>
            </div>

            <!-- Pagination -->
            <Paginator
                v-if="totalRecords > pageSize"
                :rows="pageSize"
                :totalRecords="totalRecords"
                :rowsPerPageOptions="[10, 20, 50]"
                @page="onPage"
                class="mt-4"
            />
        </div>

        <!-- ── Dialog création ────────────────────────────────────────────── -->
        <Dialog
            v-model:visible="createDialog"
            :style="{ width: '480px' }"
            header="Créer un agent BIM"
            modal
            :closable="!creating"
            @hide="closeCreate"
        >
            <!-- Formulaire -->
            <div v-if="!createdCreds" class="flex flex-col gap-4 pt-2">
                <div class="flex flex-col gap-1">
                    <label class="text-sm font-medium">Nom d'utilisateur *</label>
                    <InputText v-model="createForm.username" placeholder="ex: Jean Mukeba" class="w-full" />
                </div>
                <div class="flex flex-col gap-1">
                    <label class="text-sm font-medium">Email *</label>
                    <InputText v-model="createForm.email" type="email" placeholder="ex: agent@email.com" class="w-full" />
                </div>
                <div class="flex flex-col gap-1">
                    <label class="text-sm font-medium">Téléphone *</label>
                    <InputText v-model="createForm.telephone" placeholder="ex: +243 9XX XXX XXX" class="w-full" />
                </div>
                <p class="text-xs text-muted-color">
                    Un mot de passe temporaire sera généré et envoyé à l'adresse email saisie.
                    L'agent pourra se connecter à l'application mobile BIM NEXT avec ces identifiants.
                </p>
            </div>

            <!-- Credentials affichés après création -->
            <div v-else class="flex flex-col gap-4 pt-2">
                <div class="flex items-center gap-2 text-green-600 dark:text-green-400 font-semibold">
                    <i class="pi pi-check-circle text-lg" />
                    Agent créé avec succès !
                </div>
                <div class="bg-surface-50 dark:bg-surface-800 rounded-xl p-4 flex flex-col gap-2 text-sm">
                    <div class="flex justify-between">
                        <span class="text-muted-color">Nom</span>
                        <span class="font-semibold">{{ createdCreds.username }}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-muted-color">Email</span>
                        <span class="font-semibold">{{ createdCreds.email }}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-muted-color">N° compte</span>
                        <code class="font-semibold text-primary">{{ createdCreds.accountNumber }}</code>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-muted-color">Mot de passe</span>
                        <code class="font-semibold text-primary">{{ createdCreds.plainPassword }}</code>
                    </div>
                </div>
                <p class="text-xs text-muted-color">
                    Ces identifiants ont été envoyés à <strong>{{ createdCreds.email }}</strong>.
                    Communiquez le numéro de compte à l'agent — les clients en auront besoin pour effectuer des retraits.
                </p>
            </div>

            <template #footer>
                <div v-if="!createdCreds" class="flex justify-end gap-2">
                    <Button label="Annuler" severity="secondary" outlined @click="closeCreate" :disabled="creating" />
                    <Button label="Créer l'agent" icon="pi pi-plus" @click="submitCreate" :loading="creating" />
                </div>
                <div v-else class="flex justify-end">
                    <Button label="Fermer" @click="closeCreate" />
                </div>
            </template>
        </Dialog>

        <!-- ── Dialog confirmation action ─────────────────────────────────── -->
        <Dialog
            v-model:visible="confirmDialog"
            :style="{ width: '360px' }"
            header="Confirmer l'action"
            modal
        >
            <div class="flex items-start gap-3 py-2">
                <i class="pi pi-exclamation-triangle text-yellow-500 text-2xl mt-0.5" />
                <p class="text-sm leading-relaxed">
                    <template v-if="confirmAction === 'block'">
                        Bloquer <strong>{{ confirmTarget?.username }}</strong> ? Il ne pourra plus traiter de retraits.
                    </template>
                    <template v-else-if="confirmAction === 'unblock'">
                        Débloquer <strong>{{ confirmTarget?.username }}</strong> ?
                    </template>
                    <template v-else-if="confirmAction === 'remove'">
                        Retirer le statut agent de <strong>{{ confirmTarget?.username }}</strong> ?
                        L'utilisateur restera dans le système mais perdra l'accès à l'espace agent.
                    </template>
                </p>
            </div>
            <template #footer>
                <div class="flex justify-end gap-2">
                    <Button label="Annuler" severity="secondary" outlined @click="confirmDialog = false" />
                    <Button
                        label="Confirmer"
                        :severity="confirmAction === 'unblock' ? 'success' : 'danger'"
                        @click="doConfirm"
                        :loading="toggling"
                    />
                </div>
            </template>
        </Dialog>
    </div>
</template>
