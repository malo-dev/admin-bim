<script setup>
import { ref, computed, watch } from 'vue';
import { refDebounced } from '@vueuse/core';
import { useOtpsQuery } from '@/modules/users/queries/users.queries';

const searchInput = ref('');
const search = refDebounced(searchInput, 400);
const selectedStatus = ref(null);
const selectedPeriod = ref(null);
const currentPage = ref(1);
const pageSize = ref(20);

watch([search, selectedStatus, selectedPeriod], () => { currentPage.value = 1; });

const STATUS_OPTIONS = [
    { label: 'Actif',    value: 'active' },
    { label: 'Utilisé', value: 'used' },
    { label: 'Expiré',  value: 'expired' },
];

const PERIOD_OPTIONS = [
    { label: "Aujourd'hui",   value: 'daily' },
    { label: 'Cette semaine', value: 'weekly' },
    { label: 'Ce mois',       value: 'monthly' },
];

const STATUS_SEVERITY = { active: 'success', used: 'secondary', expired: 'danger' };
const STATUS_LABEL    = { active: 'Actif', used: 'Utilisé', expired: 'Expiré' };

const filters = computed(() => ({
    search: search.value || undefined,
    status: selectedStatus.value || undefined,
    period: selectedPeriod.value || undefined,
    page: currentPage.value,
    pageSize: pageSize.value,
}));

const { data, isLoading, isFetching, isError, error } = useOtpsQuery(filters);

const is404 = computed(() => error.value?.response?.status === 404);

const otps = computed(() => {
    const raw = data.value;
    if (!raw) return [];
    return Array.isArray(raw) ? raw : (raw?.data ?? []);
});

const totalRecords = computed(() => {
    const raw = data.value;
    if (!raw) return 0;
    return raw?.pagination?.total ?? raw?.total ?? otps.value.length;
});

const hasActiveFilters = computed(() => !!(searchInput.value || selectedStatus.value || selectedPeriod.value));

function clearFilters() {
    searchInput.value = '';
    selectedStatus.value = null;
    selectedPeriod.value = null;
    currentPage.value = 1;
}

function onPage(event) {
    currentPage.value = event.page + 1;
    pageSize.value = event.rows;
}

function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

function isExpired(otp) {
    if (otp.status === 'expired') return true;
    if (otp.expiresAt) return new Date(otp.expiresAt) < new Date();
    return false;
}

function getOtpStatus(otp) {
    if (otp.status) return otp.status;
    if (otp.isUsed) return 'used';
    if (isExpired(otp)) return 'expired';
    return 'active';
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <!-- Header -->
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <i class="pi pi-shield text-primary text-lg" />
            </div>
            <div>
                <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">OTP envoyés</h1>
                <p class="text-sm text-muted-color">Historique des codes OTP générés sur la plateforme</p>
            </div>
        </div>

        <!-- Endpoint 404 -->
        <div v-if="is404" class="card">
            <div class="flex flex-col items-center justify-center py-12 gap-5 text-center">
                <div class="w-16 h-16 rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <i class="pi pi-exclamation-triangle text-orange-500 text-3xl" />
                </div>
                <div>
                    <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-0 mb-1">
                        Endpoint à créer côté serveur
                    </h2>
                    <p class="text-sm text-muted-color max-w-md">
                        Les OTPs sont stockés sur le modèle <strong>User</strong> (champs <code class="bg-surface-100 dark:bg-surface-800 px-1 rounded font-mono text-xs">otp</code> et <code class="bg-surface-100 dark:bg-surface-800 px-1 rounded font-mono text-xs">otpExpires</code>).
                        Une route dédiée doit être créée dans <strong>bim_server</strong> pour les lister.
                    </p>
                </div>
                <div class="p-4 rounded-xl bg-surface-50 dark:bg-surface-800 text-left text-sm max-w-lg w-full">
                    <p class="font-semibold mb-2 text-surface-700 dark:text-surface-200">Route à créer dans le contrôleur auth :</p>
                    <pre class="text-xs font-mono text-primary bg-surface-100 dark:bg-surface-900 p-3 rounded overflow-auto">// GET /api/v1/auth/otps
router.get('/otps', authMiddleware, async (req, res) => {
  const { page = 1, pageSize = 20, status, period } = req.query;
  const where = {};
  if (status === 'active') where.otp = { [Op.ne]: null };
  if (status === 'expired') where.otpExpires = { [Op.lt]: new Date() };
  const users = await User.findAndCountAll({
    where, offset: (page-1)*pageSize, limit: +pageSize,
    attributes: ['id','username','email','otp','otpExpires'],
  });
  res.json({ data: users.rows, pagination: { total: users.count, page, pageSize } });
});</pre>
                </div>
            </div>
        </div>

        <!-- Autre erreur -->
        <div v-else-if="isError && !is404" class="card">
            <Message severity="error" :closable="false">
                Erreur lors du chargement des OTP : {{ error?.message ?? 'Erreur serveur' }}
            </Message>
        </div>

        <!-- Contenu normal -->
        <div v-else class="card">
            <div class="flex flex-wrap items-center gap-3 mb-5">
                <IconField class="flex-1 min-w-52">
                    <InputIcon class="pi pi-search" />
                    <InputText v-model="searchInput" placeholder="Email, téléphone, utilisateur…" class="w-full" />
                </IconField>

                <Select
                    v-model="selectedStatus"
                    :options="STATUS_OPTIONS"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Tous les statuts"
                    showClear
                    style="min-width:11rem"
                />

                <Select
                    v-model="selectedPeriod"
                    :options="PERIOD_OPTIONS"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Toute période"
                    showClear
                    style="min-width:11rem"
                />

                <Button
                    v-if="hasActiveFilters"
                    icon="pi pi-filter-slash"
                    severity="secondary"
                    outlined
                    label="Effacer"
                    @click="clearFilters"
                />

                <span class="text-sm text-muted-color ml-auto whitespace-nowrap">
                    <i v-if="isFetching && !isLoading" class="pi pi-spin pi-spinner text-xs mr-1" />
                    {{ totalRecords }} OTP(s)
                </span>
            </div>

            <!-- Chargement -->
            <div v-if="isLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Skeleton v-for="n in 6" :key="n" height="11rem" borderRadius="1rem" />
            </div>

            <!-- Vide -->
            <div v-else-if="otps.length === 0" class="text-center py-12 text-muted-color">
                <i class="pi pi-shield text-4xl mb-3 block opacity-30" />
                <p class="font-medium">Aucun OTP trouvé</p>
                <p v-if="hasActiveFilters" class="text-sm mt-1">Essayez de modifier les filtres</p>
            </div>

            <!-- Cards -->
            <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div
                    v-for="(row, idx) in otps"
                    :key="row.id ?? idx"
                    class="card mb-0! p-4! flex flex-col gap-3"
                >
                    <!-- En-tête : utilisateur + statut -->
                    <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0">
                            <div v-if="row.user">
                                <div class="font-semibold text-sm text-surface-900 dark:text-surface-0 truncate">{{ row.user.username ?? row.user.email }}</div>
                                <div class="text-xs text-muted-color truncate">{{ row.user.email }}</div>
                            </div>
                            <div v-else-if="row.email">
                                <div class="text-sm truncate">{{ row.email }}</div>
                            </div>
                            <span v-else class="text-muted-color text-sm">—</span>
                        </div>
                        <Tag
                            :value="STATUS_LABEL[getOtpStatus(row)] ?? getOtpStatus(row)"
                            :severity="STATUS_SEVERITY[getOtpStatus(row)] ?? 'secondary'"
                        />
                    </div>

                    <!-- Code OTP -->
                    <code
                        class="text-base font-mono font-bold px-2 py-1 rounded tracking-widest text-center"
                        style="background: var(--p-surface-100); color: var(--p-primary-color)"
                    >
                        {{ row.otp ?? row.code ?? '••••••' }}
                    </code>

                    <!-- Type -->
                    <div class="flex items-center justify-between text-xs">
                        <span class="text-muted-color">Type</span>
                        <span class="text-muted-color capitalize">{{ row.type ?? row.purpose ?? '—' }}</span>
                    </div>

                    <!-- Dates -->
                    <div class="flex flex-col gap-1 text-xs pt-2 border-t border-surface-100 dark:border-surface-800">
                        <div class="flex items-center justify-between">
                            <span class="text-muted-color">Créé le</span>
                            <span>{{ formatDate(row.createdAt) }}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-muted-color">Expire le</span>
                            <span :class="isExpired(row) ? 'text-red-500' : ''">{{ formatDate(row.expiresAt) }}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-muted-color">Utilisé le</span>
                            <span>{{ formatDate(row.usedAt) }}</span>
                        </div>
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
    </div>
</template>
