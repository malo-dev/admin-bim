<script setup>
import { ref, computed, watch } from 'vue';
import { refDebounced } from '@vueuse/core';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { useSupportQuery } from '@/modules/support/queries/support.queries';
import { useDeleteSupportMutation } from '@/modules/support/mutations/support.mutations';

const toast = useToast();
const confirm = useConfirm();

const PERIOD_OPTIONS = [
    { label: "Aujourd'hui", value: 'daily' },
    { label: 'Cette semaine', value: 'weekly' },
    { label: 'Ce mois', value: 'monthly' },
    { label: 'Ce trimestre', value: 'quarterly' },
    { label: 'Cette année', value: 'annual' },
];

const SERVER_ROOT = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace('/api/v1', '');
function imgUrl(p) { return p ? (p.startsWith('http') ? p : SERVER_ROOT + p) : null; }

// ── Filters ────────────────────────────────────────────────────────────────────
const searchInput = ref('');
const search = refDebounced(searchInput, 400);
const period = ref(null);
const currentPage = ref(1);
const pageSize = ref(20);

watch([search, period], () => { currentPage.value = 1; });

const filters = computed(() => ({
    search: search.value || undefined,
    period: period.value || undefined,
    page: currentPage.value,
    pageSize: pageSize.value,
}));

const { data, isLoading, isFetching } = useSupportQuery(filters);
const tickets = computed(() => data.value?.data ?? []);
const totalRecords = computed(() => data.value?.total ?? 0);

function onPage(e) { currentPage.value = e.page + 1; pageSize.value = e.rows; }

// ── Mutation ───────────────────────────────────────────────────────────────────
const { mutate: deleteSupport, isPending: deletePending } = useDeleteSupportMutation();

function confirmDelete(row) {
    confirm.require({
        message: `Supprimer le ticket de ${row.email} ?`,
        header: 'Confirmation',
        icon: 'pi pi-exclamation-triangle',
        rejectProps: { label: 'Annuler', severity: 'secondary', outlined: true },
        acceptProps: { label: 'Supprimer', severity: 'danger' },
        accept: () =>
            deleteSupport(row.supportTrackId, {
                onSuccess: () => toast.add({ severity: 'success', summary: 'Supprimé', detail: 'Ticket supprimé', life: 3000 }),
                onError: (err) =>
                    toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
            }),
    });
}

// ── Detail dialog ──────────────────────────────────────────────────────────────
const detailDialog = ref(false);
const selected = ref(null);

function openDetail(row) {
    selected.value = row;
    detailDialog.value = true;
}

function formatDate(d) {
    return d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <ConfirmDialog />

        <!-- Header -->
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <i class="pi pi-headphones text-primary text-lg" />
            </div>
            <div>
                <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Support</h1>
                <p class="text-sm text-muted-color">Tickets de support soumis par les utilisateurs</p>
            </div>
        </div>

        <div class="card">
            <!-- Toolbar -->
            <div class="flex flex-wrap items-center gap-3 mb-5">
                <IconField class="flex-1 min-w-52">
                    <InputIcon class="pi pi-search" />
                    <InputText v-model="searchInput" placeholder="Email, description…" class="w-full" />
                </IconField>
                <Select v-model="period" :options="PERIOD_OPTIONS" optionLabel="label" optionValue="value"
                    placeholder="Toute période" showClear class="min-w-44" />
                <span class="text-sm text-muted-color whitespace-nowrap ml-auto">
                    <i v-if="isFetching && !isLoading" class="pi pi-spin pi-spinner text-xs mr-1" />
                    {{ totalRecords }} ticket(s)
                </span>
            </div>

            <DataTable :value="tickets" :loading="isLoading" lazy paginator :rows="pageSize"
                :totalRecords="totalRecords" @page="onPage" :rowsPerPageOptions="[10, 20, 50]"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="{first} à {last} sur {totalRecords}" stripedRows scrollable>
                <template #empty>
                    <div class="text-center py-12 text-muted-color">
                        <i class="pi pi-headphones text-4xl mb-3 block opacity-30" />
                        <p class="font-medium">Aucun ticket trouvé</p>
                    </div>
                </template>

                <Column header="Date" style="min-width:10rem">
                    <template #body="{ data: row }">
                        <span class="text-sm">{{ formatDate(row.createdAt) }}</span>
                    </template>
                </Column>

                <Column header="Utilisateur" style="min-width:12rem">
                    <template #body="{ data: row }">
                        <div v-if="row.user">
                            <div class="font-semibold text-sm">{{ row.user.username }}</div>
                            <div class="text-xs text-muted-color">{{ row.user.email }}</div>
                        </div>
                        <span v-else class="text-sm text-muted-color">{{ row.email }}</span>
                    </template>
                </Column>

                <Column header="Sujet" style="min-width:12rem">
                    <template #body="{ data: row }">
                        <span class="font-medium text-sm">{{ row.sujet || '—' }}</span>
                    </template>
                </Column>

                <Column header="Description" style="min-width:18rem">
                    <template #body="{ data: row }">
                        <span class="text-sm text-muted-color line-clamp-2">{{ row.description }}</span>
                    </template>
                </Column>

                <Column header="Image" style="min-width:6rem">
                    <template #body="{ data: row }">
                        <img v-if="imgUrl(row.imageUrl)" :src="imgUrl(row.imageUrl)" alt="ticket"
                            class="w-10 h-10 rounded object-cover cursor-pointer" @click="openDetail(row)" />
                        <span v-else class="text-muted-color text-sm">—</span>
                    </template>
                </Column>

                <Column header="Actions" style="min-width:8rem" alignHeader="right">
                    <template #body="{ data: row }">
                        <div class="flex gap-1 justify-end">
                            <Button v-tooltip.top="'Voir le détail'" icon="pi pi-eye" severity="info" outlined rounded
                                size="small" @click="openDetail(row)" />
                            <Button v-tooltip.top="'Supprimer'" icon="pi pi-trash" severity="danger" outlined rounded
                                size="small" :loading="deletePending" @click="confirmDelete(row)" />
                        </div>
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- Detail Dialog -->
        <Dialog v-model:visible="detailDialog" header="Détail du ticket" modal style="width:38rem" :draggable="false">
            <div v-if="selected" class="flex flex-col gap-4 pt-1">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <i class="pi pi-user text-primary" />
                    </div>
                    <div>
                        <div class="font-semibold">{{ selected.user?.username ?? '—' }}</div>
                        <div class="text-sm text-muted-color">{{ selected.email }}</div>
                    </div>
                    <div class="ml-auto text-sm text-muted-color">{{ formatDate(selected.createdAt) }}</div>
                </div>

                <div v-if="selected.sujet" class="flex flex-col gap-1">
                    <span class="text-xs font-semibold text-muted-color uppercase tracking-wide">Sujet</span>
                    <p class="font-medium">{{ selected.sujet }}</p>
                </div>

                <div class="flex flex-col gap-1">
                    <span class="text-xs font-semibold text-muted-color uppercase tracking-wide">Description</span>
                    <p class="text-sm leading-relaxed">{{ selected.description }}</p>
                </div>

                <div v-if="imgUrl(selected.imageUrl)" class="flex flex-col gap-1">
                    <span class="text-xs font-semibold text-muted-color uppercase tracking-wide">Image jointe</span>
                    <img :src="imgUrl(selected.imageUrl)" alt="image ticket"
                        class="rounded-lg max-h-64 object-contain border border-surface-200 dark:border-surface-700" />
                </div>
            </div>
            <template #footer>
                <Button label="Fermer" severity="secondary" outlined @click="detailDialog = false" />
            </template>
        </Dialog>
    </div>
</template>
