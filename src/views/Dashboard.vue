<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useDashboardStatsQuery } from '@/modules/dashboard/queries/dashboard.queries';
import { useSocketStore } from '@/modules/socket/store/socket.store';
import { useRechargesQuery } from '@/modules/transactions/queries/transactions.queries';
import {
    useApproveRechargeMutation,
    useRejectRechargeMutation,
} from '@/modules/transactions/mutations/transactions.mutations';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';

const router      = useRouter();
const toast       = useToast();
const confirm     = useConfirm();

const socketStore = useSocketStore();

/* ── Pending recharges ── */
const pendingFilters = computed(() => ({ status: 'pending', pageSize: 5 }));
const { data: pendingData, isLoading: pendingLoading, refetch: refetchPending } = useRechargesQuery(pendingFilters);
const pendingRecharges = computed(() => pendingData.value?.data ?? (Array.isArray(pendingData.value) ? pendingData.value : []));
const pendingTotal     = computed(() => pendingData.value?.total ?? pendingRecharges.value.length);

const { mutate: doApprove, isPending: approving } = useApproveRechargeMutation();
const { mutate: doReject }                         = useRejectRechargeMutation();
const actionId = ref(null);

function fmtAmount(row) { return Number(row.amount ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' EC'; }

function quickApprove(row) {
    const id = row.transactionRechargeId ?? row.id ?? row.tsxId;
    confirm.require({
        message: `Approuver ${fmtAmount(row)} pour ${row.user?.username ?? 'cet utilisateur'} ?`,
        header: 'Approuver la recharge',
        icon: 'pi pi-check-circle',
        rejectProps: { label: 'Annuler', severity: 'secondary', outlined: true },
        acceptProps: { label: 'Approuver', severity: 'success' },
        accept: () => {
            actionId.value = id;
            doApprove(id, {
                onSuccess: () => { toast.add({ severity: 'success', summary: 'Approuvée', detail: fmtAmount(row) + ' crédité', life: 3000 }); actionId.value = null; refetchPending(); },
                onError:   (err) => { toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur', life: 4000 }); actionId.value = null; },
            });
        },
    });
}

function quickReject(row) {
    const id = row.transactionRechargeId ?? row.id ?? row.tsxId;
    confirm.require({
        message: `Rejeter la demande de ${fmtAmount(row)} de ${row.user?.username ?? 'cet utilisateur'} ?`,
        header: 'Rejeter la recharge',
        icon: 'pi pi-times-circle',
        rejectProps: { label: 'Annuler', severity: 'secondary', outlined: true },
        acceptProps: { label: 'Rejeter', severity: 'danger' },
        accept: () => {
            actionId.value = id;
            doReject({ id, reason: 'Refusé depuis le tableau de bord' }, {
                onSuccess: () => { toast.add({ severity: 'warn', summary: 'Rejetée', detail: 'Notification envoyée', life: 3000 }); actionId.value = null; refetchPending(); },
                onError:   (err) => { toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur', life: 4000 }); actionId.value = null; },
            });
        },
    });
}

const PERIODS = [
    { label: 'Tout', value: '' },
    { label: "Aujourd'hui", value: 'daily' },
    { label: 'Cette semaine', value: 'weekly' },
    { label: 'Ce mois', value: 'monthly' },
    { label: 'Ce trimestre', value: 'quarterly' },
    { label: 'Ce semestre', value: 'semiannual' },
    { label: 'Cette année', value: 'annual' },
];

const selectedPeriod = ref('');

const { data: stats, isLoading, isError, refetch } = useDashboardStatsQuery(selectedPeriod);

const periodLabel = computed(() => {
    const found = PERIODS.find((p) => p.value === selectedPeriod.value);
    return found?.label || 'Toutes périodes';
});

const kpis = computed(() => {
    if (!stats.value) return [];
    const s = stats.value;
    return [
        {
            label: 'Utilisateurs total',
            value: s.totalUsers,
            icon: 'pi pi-users',
            color: 'bg-blue-100 dark:bg-blue-900/30',
            iconColor: 'text-blue-600 dark:text-blue-400',
            sub: `${s.activeUsers} actifs`,
        },
        {
            label: "Inscrits aujourd'hui",
            value: s.usersToday,
            icon: 'pi pi-user-plus',
            color: 'bg-green-100 dark:bg-green-900/30',
            iconColor: 'text-green-600 dark:text-green-400',
            sub: `${s.blockedUsers} bloqués`,
        },
        {
            label: 'Transactions',
            value: s.totalTransactions,
            icon: 'pi pi-arrows-h',
            color: 'bg-violet-100 dark:bg-violet-900/30',
            iconColor: 'text-violet-600 dark:text-violet-400',
            sub: periodLabel.value,
        },
        {
            label: 'Commandes',
            value: s.totalOrders,
            icon: 'pi pi-shopping-cart',
            color: 'bg-orange-100 dark:bg-orange-900/30',
            iconColor: 'text-orange-600 dark:text-orange-400',
            sub: periodLabel.value,
        },
        {
            label: 'Entreprises',
            value: s.totalCompanies,
            icon: 'pi pi-building',
            color: 'bg-cyan-100 dark:bg-cyan-900/30',
            iconColor: 'text-cyan-600 dark:text-cyan-400',
            sub: 'Total enregistrées',
        },
        {
            label: "Secteurs d'activité",
            value: s.totalSectors,
            icon: 'pi pi-th-large',
            color: 'bg-pink-100 dark:bg-pink-900/30',
            iconColor: 'text-pink-600 dark:text-pink-400',
            sub: 'Catégories business',
        },
        {
            label: 'En ligne maintenant',
            value: socketStore.onlineCount,
            icon: 'pi pi-wifi',
            color: 'bg-emerald-100 dark:bg-emerald-900/30',
            iconColor: 'text-emerald-600 dark:text-emerald-400',
            sub: 'Connexions actives',
            live: true,
        },
    ];
});

function formatNumber(n) {
    if (n === undefined || n === null) return '—';
    return Number(n).toLocaleString('fr-FR');
}
</script>

<template>
    <div class="flex flex-col gap-6">
        <!-- En-tête + filtre période -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
                <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Tableau de bord</h1>
                <p class="text-muted-color text-sm mt-1">Vue globale de la plateforme BIM</p>
            </div>

            <div class="flex items-center gap-3 flex-wrap">
                <SelectButton
                    v-model="selectedPeriod"
                    :options="PERIODS"
                    optionLabel="label"
                    optionValue="value"
                    class="text-sm"
                />
                <Button
                    icon="pi pi-refresh"
                    severity="secondary"
                    text
                    rounded
                    :loading="isLoading"
                    @click="refetch"
                    v-tooltip="'Actualiser'"
                />
            </div>
        </div>

        <!-- Erreur -->
        <Message v-if="isError" severity="error" :closable="false">
            Impossible de charger les statistiques. Vérifiez la connexion au serveur.
        </Message>

        <!-- KPI Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div
                v-for="kpi in kpis"
                :key="kpi.label"
                class="card flex items-start gap-4 p-5 relative overflow-hidden"
            >
                <span v-if="kpi.live" class="absolute top-3 right-3 flex items-center gap-1">
                    <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span class="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Live</span>
                </span>

                <div
                    class="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                    :class="kpi.color"
                >
                    <i :class="[kpi.icon, kpi.iconColor, 'text-xl']" />
                </div>

                <div class="flex-1 min-w-0">
                    <p class="text-sm text-muted-color truncate">{{ kpi.label }}</p>
                    <p class="text-3xl font-bold text-surface-900 dark:text-surface-0 leading-tight">
                        <span v-if="isLoading" class="text-surface-300">…</span>
                        <span v-else>{{ formatNumber(kpi.value) }}</span>
                    </p>
                    <p class="text-xs text-muted-color mt-1">{{ kpi.sub }}</p>
                </div>
            </div>
        </div>

        <!-- ── Demandes de recharge en attente ──────────────────────────── -->
        <ConfirmDialog />
        <div class="card">
            <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                        <i class="pi pi-plus-circle text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-0">Demandes de recharge en attente</h2>
                        <p class="text-xs text-muted-color">Approuvez ou rejetez rapidement depuis le tableau de bord</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <Badge v-if="pendingTotal > 0" :value="pendingTotal + ' en attente'" severity="warn" />
                    <Button label="Voir tout" size="small" severity="secondary" outlined icon="pi pi-arrow-right" iconPos="right" @click="router.push('/recharges')" />
                </div>
            </div>

            <!-- Loading -->
            <div v-if="pendingLoading" class="flex justify-center py-6">
                <i class="pi pi-spin pi-spinner text-2xl text-primary" />
            </div>

            <!-- Empty -->
            <div v-else-if="pendingRecharges.length === 0" class="text-center py-8 text-muted-color">
                <i class="pi pi-check-circle text-3xl mb-2 block text-green-400" />
                <p class="text-sm font-medium">Aucune recharge en attente</p>
            </div>

            <!-- List -->
            <div v-else class="flex flex-col gap-2">
                <div
                    v-for="row in pendingRecharges"
                    :key="row.id ?? row.tsxId"
                    class="flex items-center gap-4 px-4 py-3 rounded-xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                >
                    <!-- Avatar -->
                    <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 font-bold text-primary text-sm">
                        {{ (row.user?.username ?? '?')[0]?.toUpperCase() }}
                    </div>

                    <!-- Info -->
                    <div class="flex-1 min-w-0">
                        <p class="font-semibold text-surface-900 dark:text-surface-0 truncate">
                            {{ row.user?.username ?? row.user?.name ?? '—' }}
                        </p>
                        <p class="text-xs text-muted-color truncate">{{ row.user?.email }}</p>
                    </div>

                    <!-- Amount -->
                    <div class="text-right shrink-0">
                        <p class="font-bold text-lg text-surface-900 dark:text-surface-0">{{ fmtAmount(row) }}</p>
                        <p class="text-xs text-muted-color">{{ row.paymentMethod ?? '—' }}</p>
                    </div>

                    <!-- Actions -->
                    <div class="flex gap-1 shrink-0">
                        <Button
                            icon="pi pi-check"
                            v-tooltip.top="'Approuver'"
                            severity="success"
                            rounded
                            size="small"
                            :loading="actionId === (row.id ?? row.tsxId)"
                            @click="quickApprove(row)"
                        />
                        <Button
                            icon="pi pi-times"
                            v-tooltip.top="'Rejeter'"
                            severity="danger"
                            outlined
                            rounded
                            size="small"
                            @click="quickReject(row)"
                        />
                    </div>
                </div>

                <div v-if="pendingTotal > pendingRecharges.length" class="text-center pt-1">
                    <Button label="Voir toutes les demandes" size="small" text @click="router.push('/recharges')" />
                </div>
            </div>
        </div>

        <!-- Journal connexions temps réel -->
        <div class="card">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-0">
                    Activité de connexion — temps réel
                </h2>
                <Badge :value="socketStore.onlineCount + ' en ligne'" severity="success" />
            </div>

            <div
                v-if="socketStore.connectionLog.length === 0"
                class="text-center text-muted-color py-8 text-sm"
            >
                Aucune activité détectée depuis l'ouverture de session admin.
            </div>

            <div class="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                <div
                    v-for="(entry, i) in socketStore.connectionLog.slice(0, 30)"
                    :key="i"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm"
                    :class="
                        entry.event === 'online'
                            ? 'bg-green-50 dark:bg-green-900/20'
                            : 'bg-red-50 dark:bg-red-900/20'
                    "
                >
                    <span
                        class="w-2 h-2 rounded-full shrink-0"
                        :class="entry.event === 'online' ? 'bg-green-500' : 'bg-red-400'"
                    />
                    <span class="flex-1">
                        <span
                            class="font-semibold"
                            :class="
                                entry.event === 'online'
                                    ? 'text-green-700 dark:text-green-400'
                                    : 'text-red-600 dark:text-red-400'
                            "
                        >
                            User #{{ entry.userId }}
                        </span>
                        <span class="text-surface-500 ml-1">
                            {{
                                entry.event === 'online'
                                    ? 'vient de se connecter'
                                    : 'vient de se déconnecter'
                            }}
                        </span>
                    </span>
                    <span class="text-xs text-muted-color shrink-0">
                        {{ new Date(entry.time).toLocaleTimeString('fr-FR') }}
                    </span>
                </div>
            </div>
        </div>
    </div>
</template>
