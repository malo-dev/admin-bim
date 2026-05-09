<script setup>
import { computed, onMounted, onUnmounted } from 'vue';
import { useSocketStore } from '@/modules/socket/store/socket.store';

const socketStore = useSocketStore();

onMounted(() => socketStore.connect());
onUnmounted(() => {});

const logItems = computed(() =>
    socketStore.connectionLog.map((entry) => ({
        ...entry,
        timeFormatted: new Date(entry.time).toLocaleTimeString('fr-FR'),
        dateFormatted: new Date(entry.time).toLocaleDateString('fr-FR'),
    }))
);
</script>

<template>
    <div class="grid grid-cols-1 gap-6">
        <!-- Header stats -->
        <div class="flex items-center gap-4">
            <div class="flex items-center gap-2">
                <span
                    class="inline-block w-3 h-3 rounded-full"
                    :class="socketStore.isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-400'"
                />
                <span class="text-sm font-medium text-surface-600 dark:text-surface-300">
                    {{ socketStore.isConnected ? 'Temps réel actif' : 'Déconnecté' }}
                </span>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Utilisateurs actuellement en ligne -->
            <div class="card">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-xl font-semibold text-surface-900 dark:text-surface-0">
                        Utilisateurs en ligne
                    </h2>
                    <Badge :value="socketStore.onlineCount" severity="success" />
                </div>

                <DataTable
                    :value="socketStore.onlineUsers"
                    :paginator="socketStore.onlineUsers.length > 10"
                    :rows="10"
                    emptyMessage="Aucun utilisateur connecté"
                    class="text-sm"
                    stripedRows
                >
                    <Column field="userId" header="ID Utilisateur">
                        <template #body="{ data }">
                            <span class="font-mono font-semibold">#{{ data.userId }}</span>
                        </template>
                    </Column>
                    <Column field="connectedAt" header="Connecté depuis">
                        <template #body="{ data }">
                            {{ new Date(data.connectedAt).toLocaleTimeString('fr-FR') }}
                        </template>
                    </Column>
                    <Column header="Statut">
                        <template #body>
                            <Tag value="En ligne" severity="success" icon="pi pi-circle-fill" />
                        </template>
                    </Column>
                </DataTable>
            </div>

            <!-- Historique des connexions -->
            <div class="card">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-xl font-semibold text-surface-900 dark:text-surface-0">
                        Journal des connexions
                    </h2>
                    <span class="text-sm text-muted-color">Session en cours</span>
                </div>

                <div class="flex flex-col gap-2 max-h-[420px] overflow-y-auto">
                    <div
                        v-if="logItems.length === 0"
                        class="text-center text-muted-color py-8 text-sm"
                    >
                        Aucune activité pour le moment
                    </div>

                    <div
                        v-for="(entry, i) in logItems"
                        :key="i"
                        class="flex items-center gap-3 px-3 py-2 rounded-lg"
                        :class="
                            entry.event === 'online'
                                ? 'bg-green-50 dark:bg-green-900/20'
                                : 'bg-red-50 dark:bg-red-900/20'
                        "
                    >
                        <span
                            class="w-2 h-2 rounded-full flex-shrink-0"
                            :class="entry.event === 'online' ? 'bg-green-500' : 'bg-red-400'"
                        />
                        <span class="flex-1 text-sm font-medium">
                            <span
                                :class="
                                    entry.event === 'online'
                                        ? 'text-green-700 dark:text-green-400'
                                        : 'text-red-600 dark:text-red-400'
                                "
                            >
                                User #{{ entry.userId }}
                            </span>
                            <span class="text-surface-500 ml-1">
                                {{ entry.event === 'online' ? 'connecté' : 'déconnecté' }}
                            </span>
                        </span>
                        <span class="text-xs text-muted-color flex-shrink-0">
                            {{ entry.timeFormatted }}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
