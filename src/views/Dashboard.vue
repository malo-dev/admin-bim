<script setup>
import { ref, computed } from 'vue';
import { useDashboardStatsQuery } from '@/modules/dashboard/queries/dashboard.queries';
import { useSocketStore } from '@/modules/socket/store/socket.store';

const socketStore = useSocketStore();

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
