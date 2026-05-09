<script setup>
import { ref, computed, watch } from 'vue';
import { refDebounced } from '@vueuse/core';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { useNotesQuery, useAllCompaniesForNotesQuery } from '@/modules/notes/queries/notes.queries';
import { useMutation, useQueryClient } from '@tanstack/vue-query';
import NotesService from '@/modules/notes/services/notes.service';

const toast = useToast();
const confirm = useConfirm();
const queryClient = useQueryClient();

const { mutate: deleteNote, isPending: deletePending } = useMutation({
    mutationFn: (id) => NotesService.deleteNote(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
});

const PERIOD_OPTIONS = [
    { label: "Aujourd'hui", value: 'daily' },
    { label: 'Cette semaine', value: 'weekly' },
    { label: 'Ce mois', value: 'monthly' },
    { label: 'Ce trimestre', value: 'quarterly' },
    { label: 'Cette année', value: 'annual' },
];

// ── Filters ────────────────────────────────────────────────────────────────────
const searchInput = ref('');
const search = refDebounced(searchInput, 400);
const selectedCompanyId = ref(null);
const period = ref(null);
const currentPage = ref(1);
const pageSize = ref(20);

watch([search, selectedCompanyId, period], () => { currentPage.value = 1; });

const filters = computed(() => ({
    search: search.value || undefined,
    companyId: selectedCompanyId.value || undefined,
    period: period.value || undefined,
    page: currentPage.value,
    pageSize: pageSize.value,
}));

const { data, isLoading, isFetching } = useNotesQuery(filters);
const { data: companyOptions } = useAllCompaniesForNotesQuery();

const notes = computed(() => data.value?.data ?? []);
const totalRecords = computed(() => data.value?.total ?? 0);

function onPage(e) { currentPage.value = e.page + 1; pageSize.value = e.rows; }

function confirmDelete(row) {
    confirm.require({
        message: `Supprimer cette note de ${row.user?.username ?? 'cet utilisateur'} ?`,
        header: 'Confirmation',
        icon: 'pi pi-exclamation-triangle',
        rejectProps: { label: 'Annuler', severity: 'secondary', outlined: true },
        acceptProps: { label: 'Supprimer', severity: 'danger' },
        accept: () =>
            deleteNote(row.noteId, {
                onSuccess: () => toast.add({ severity: 'success', summary: 'Supprimée', detail: 'Note supprimée', life: 3000 }),
                onError: (err) =>
                    toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
            }),
    });
}

function formatDate(d) {
    return d ? new Date(d).toLocaleDateString('fr-FR') : '—';
}

function starsArray(n) {
    return Array.from({ length: 5 }, (_, i) => i < (n ?? 0));
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <ConfirmDialog />

        <!-- Header -->
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <i class="pi pi-star text-primary text-lg" />
            </div>
            <div>
                <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Notes entreprises</h1>
                <p class="text-sm text-muted-color">Avis et évaluations reçus par les entreprises</p>
            </div>
        </div>

        <div class="card">
            <!-- Toolbar -->
            <div class="flex flex-wrap items-center gap-3 mb-5">
                <IconField class="flex-1 min-w-52">
                    <InputIcon class="pi pi-search" />
                    <InputText v-model="searchInput" placeholder="Commentaire…" class="w-full" />
                </IconField>
                <Select v-model="selectedCompanyId" :options="companyOptions ?? []" optionLabel="label" optionValue="value"
                    placeholder="Toutes les entreprises" showClear class="min-w-52" filter />
                <Select v-model="period" :options="PERIOD_OPTIONS" optionLabel="label" optionValue="value"
                    placeholder="Toute période" showClear class="min-w-44" />
                <span class="text-sm text-muted-color whitespace-nowrap ml-auto">
                    <i v-if="isFetching && !isLoading" class="pi pi-spin pi-spinner text-xs mr-1" />
                    {{ totalRecords }} note(s)
                </span>
            </div>

            <DataTable :value="notes" :loading="isLoading" lazy paginator :rows="pageSize"
                :totalRecords="totalRecords" @page="onPage" :rowsPerPageOptions="[10, 20, 50]"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="{first} à {last} sur {totalRecords}" stripedRows scrollable>
                <template #empty>
                    <div class="text-center py-12 text-muted-color">
                        <i class="pi pi-star text-4xl mb-3 block opacity-30" />
                        <p class="font-medium">Aucune note trouvée</p>
                    </div>
                </template>

                <Column header="Date" style="min-width:9rem">
                    <template #body="{ data: row }">{{ formatDate(row.createdAt) }}</template>
                </Column>

                <Column header="Utilisateur" style="min-width:12rem">
                    <template #body="{ data: row }">
                        <div v-if="row.user">
                            <div class="font-semibold text-sm">{{ row.user.username }}</div>
                            <div class="text-xs text-muted-color">{{ row.user.email }}</div>
                        </div>
                        <span v-else class="text-muted-color text-sm">—</span>
                    </template>
                </Column>

                <Column header="Entreprise" style="min-width:11rem">
                    <template #body="{ data: row }">
                        <Tag v-if="row.company?.name" :value="row.company.name" severity="secondary" />
                        <span v-else class="text-muted-color text-sm">—</span>
                    </template>
                </Column>

                <Column header="Produit" style="min-width:10rem">
                    <template #body="{ data: row }">
                        <span v-if="row.product?.name" class="text-sm">{{ row.product.name }}</span>
                        <span v-else class="text-muted-color text-sm">—</span>
                    </template>
                </Column>

                <Column header="Note" style="min-width:9rem">
                    <template #body="{ data: row }">
                        <div v-if="row.totalStars" class="flex items-center gap-1">
                            <i v-for="(filled, i) in starsArray(row.totalStars)" :key="i"
                                :class="['pi text-sm', filled ? 'pi-star-fill text-yellow-400' : 'pi-star text-surface-300']" />
                            <span class="text-xs text-muted-color ml-1">{{ row.totalStars }}/5</span>
                        </div>
                        <span v-else class="text-muted-color text-sm">—</span>
                    </template>
                </Column>

                <Column header="Commentaire" style="min-width:16rem">
                    <template #body="{ data: row }">
                        <span class="text-sm line-clamp-2">{{ row.notes || '—' }}</span>
                    </template>
                </Column>

                <Column header="Actions" style="min-width:7rem" alignHeader="right">
                    <template #body="{ data: row }">
                        <div class="flex gap-1 justify-end">
                            <Button v-tooltip.top="'Supprimer'" icon="pi pi-trash" severity="danger" outlined rounded
                                size="small" :loading="deletePending" @click="confirmDelete(row)" />
                        </div>
                    </template>
                </Column>
            </DataTable>
        </div>
    </div>
</template>
