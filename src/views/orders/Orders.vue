<script setup>
import { ref, computed, watch } from 'vue';
import { refDebounced } from '@vueuse/core';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { useOrdersQuery, useAllCompaniesForOrderQuery } from '@/modules/orders/queries/orders.queries';
import { useUpdateOrderMutation, useDeleteOrderMutation } from '@/modules/orders/mutations/orders.mutations';

const router = useRouter();

const toast = useToast();
const confirm = useConfirm();

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
    { label: 'En attente', value: 'pending' },
    { label: 'Confirmée', value: 'confirmed' },
    { label: 'Payée', value: 'paid' },
    { label: 'En traitement', value: 'processing' },
    { label: 'Expédiée', value: 'shipped' },
    { label: 'Livrée', value: 'delivered' },
    { label: 'Annulée', value: 'cancelled' },
];

const STATUS_SEVERITY = {
    pending: 'warn',
    confirmed: 'info',
    paid: 'success',
    processing: 'info',
    shipped: 'info',
    delivered: 'success',
    cancelled: 'danger',
};

const STATUS_LABEL = {
    pending: 'En attente',
    confirmed: 'Confirmée',
    paid: 'Payée',
    processing: 'En traitement',
    shipped: 'Expédiée',
    delivered: 'Livrée',
    cancelled: 'Annulée',
};

// ── Filters ────────────────────────────────────────────────────────────────────
const searchInput = ref('');
const search = refDebounced(searchInput, 400);
const selectedCompanyId = ref(null);
const selectedStatus = ref(null);
const dateFrom = ref(null);
const dateTo = ref(null);
const currentPage = ref(1);
const pageSize = ref(20);

watch([search, selectedCompanyId, selectedStatus, dateFrom, dateTo], () => {
    currentPage.value = 1;
});

const filters = computed(() => ({
    search: search.value || undefined,
    companyId: selectedCompanyId.value || undefined,
    status: selectedStatus.value || undefined,
    startDate: dateFrom.value ? new Date(dateFrom.value).toISOString() : undefined,
    endDate: dateTo.value ? new Date(dateTo.value).toISOString() : undefined,
    page: currentPage.value,
    pageSize: pageSize.value,
}));

const { data, isLoading, isFetching } = useOrdersQuery(filters);
const { data: companyOptions } = useAllCompaniesForOrderQuery();

const orders = computed(() => data.value?.data ?? []);
const totalRecords = computed(() => data.value?.total ?? 0);

function onPage(event) {
    currentPage.value = event.page + 1;
    pageSize.value = event.rows;
}

function clearFilters() {
    searchInput.value = '';
    selectedCompanyId.value = null;
    selectedStatus.value = null;
    dateFrom.value = null;
    dateTo.value = null;
}

// ── Mutations ──────────────────────────────────────────────────────────────────
const { mutate: updateOrder, isPending: updatePending } = useUpdateOrderMutation();
const { mutate: deleteOrder, isPending: deletePending } = useDeleteOrderMutation();

// ── Edit dialog ────────────────────────────────────────────────────────────────
const editDialog = ref(false);
const editForm = ref({ id: null, status: '', notes: '', shippingAddress: '', paymentMethod: '' });

function openEdit(row) {
    editForm.value = {
        id: row.orderId,
        status: row.status,
        notes: row.notes ?? '',
        shippingAddress: row.shippingAddress ?? '',
        paymentMethod: row.paymentMethod ?? '',
    };
    editDialog.value = true;
}

function submitEdit() {
    updateOrder(
        {
            id: editForm.value.id,
            payload: {
                status: editForm.value.status,
                notes: editForm.value.notes,
                shippingAddress: editForm.value.shippingAddress,
                paymentMethod: editForm.value.paymentMethod,
            },
        },
        {
            onSuccess: () => {
                toast.add({ severity: 'success', summary: 'Mis à jour', detail: 'Commande mise à jour', life: 3000 });
                editDialog.value = false;
            },
            onError: (err) =>
                toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
        }
    );
}

// ── Quick status update ───────────────────────────────────────────────────────
function quickStatus(row, status) {
    updateOrder(
        { id: row.orderId, payload: { status } },
        {
            onSuccess: () => toast.add({ severity: 'success', summary: 'Statut mis à jour', detail: `→ ${STATUS_LABEL[status]}`, life: 2500 }),
            onError: (err) =>
                toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
        }
    );
}

// ── Delete ────────────────────────────────────────────────────────────────────
function confirmDelete(row) {
    confirm.require({
        message: `Supprimer la commande « ${row.orderNumber} » ?`,
        header: 'Confirmation',
        icon: 'pi pi-exclamation-triangle',
        rejectProps: { label: 'Annuler', severity: 'secondary', outlined: true },
        acceptProps: { label: 'Supprimer', severity: 'danger' },
        accept: () =>
            deleteOrder(row.orderId, {
                onSuccess: () => toast.add({ severity: 'success', summary: 'Supprimée', detail: 'Commande supprimée', life: 3000 }),
                onError: (err) =>
                    toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
            }),
    });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(d) {
    return d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
}

function formatAmount(amount, currency) {
    if (amount == null) return '—';
    const sym = currency?.symbol ?? currency?.code ?? '';
    return `${Number(amount).toLocaleString('fr-FR')} ${sym}`;
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <ConfirmDialog />

        <!-- Header -->
        <div class="flex items-center justify-between flex-wrap gap-3">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <i class="pi pi-shopping-cart text-primary text-lg" />
                </div>
                <div>
                    <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Commandes</h1>
                    <p class="text-sm text-muted-color">Suivi et gestion des commandes BIM</p>
                </div>
            </div>
        </div>

        <div class="card">
            <!-- Toolbar -->
            <div class="flex flex-wrap items-center gap-3 mb-5">
                <IconField class="flex-1 min-w-52">
                    <InputIcon class="pi pi-search" />
                    <InputText v-model="searchInput" placeholder="N° commande, adresse, notes…" class="w-full" />
                </IconField>

                <Select
                    v-model="selectedCompanyId"
                    :options="companyOptions ?? []"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Toutes les entreprises"
                    showClear
                    class="min-w-48"
                    filter
                />

                <Select
                    v-model="selectedStatus"
                    :options="STATUS_OPTIONS"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Tous les statuts"
                    showClear
                    class="min-w-44"
                />

                <DatePicker
                    v-model="dateFrom"
                    placeholder="Du"
                    dateFormat="dd/mm/yy"
                    class="min-w-32"
                    showClear
                />
                <DatePicker
                    v-model="dateTo"
                    placeholder="Au"
                    dateFormat="dd/mm/yy"
                    class="min-w-32"
                    showClear
                />

                <Button
                    v-if="selectedCompanyId || selectedStatus || dateFrom || dateTo || searchInput"
                    icon="pi pi-filter-slash"
                    severity="secondary"
                    outlined
                    v-tooltip.top="'Effacer les filtres'"
                    @click="clearFilters"
                />

                <span class="text-sm text-muted-color whitespace-nowrap">
                    <i v-if="isFetching && !isLoading" class="pi pi-spin pi-spinner text-xs mr-1" />
                    {{ totalRecords }} commande(s)
                </span>
            </div>

            <!-- DataTable -->
            <DataTable
                :value="orders"
                :loading="isLoading"
                lazy
                paginator
                :rows="pageSize"
                :totalRecords="totalRecords"
                @page="onPage"
                :rowsPerPageOptions="[10, 20, 50]"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="{first} à {last} sur {totalRecords}"
                stripedRows
                scrollable
            >
                <template #empty>
                    <div class="text-center py-12 text-muted-color">
                        <i class="pi pi-shopping-cart text-4xl mb-3 block opacity-30" />
                        <p class="font-medium">Aucune commande trouvée</p>
                    </div>
                </template>

                <!-- N° commande — cliquable → detail -->
                <Column header="N° Commande" style="min-width:12rem">
                    <template #body="{ data: row }">
                        <div
                            class="cursor-pointer hover:text-primary transition-colors"
                            @click="router.push(`/orders/${row.orderId}`)"
                        >
                            <div class="font-mono font-semibold text-surface-900 dark:text-surface-0 text-sm hover:text-primary">
                                {{ row.orderNumber }}
                            </div>
                            <div class="text-xs text-muted-color">{{ formatDate(row.createdAt) }}</div>
                        </div>
                    </template>
                </Column>

                <!-- Client -->
                <Column header="Client" style="min-width:12rem">
                    <template #body="{ data: row }">
                        <div v-if="row.user">
                            <div class="font-semibold text-sm">{{ row.user.username }}</div>
                            <div class="text-xs text-muted-color">{{ row.user.email }}</div>
                        </div>
                        <span v-else class="text-muted-color text-sm">—</span>
                    </template>
                </Column>

                <!-- Entreprise -->
                <Column header="Entreprise" style="min-width:10rem">
                    <template #body="{ data: row }">
                        <Tag v-if="row.company?.name" :value="row.company.name" severity="secondary" />
                        <span v-else class="text-muted-color text-sm">—</span>
                    </template>
                </Column>

                <!-- Produit -->
                <Column header="Produit" style="min-width:11rem">
                    <template #body="{ data: row }">
                        <div v-if="row.product">
                            <div class="text-sm font-medium">{{ row.product.name }}</div>
                            <div class="text-xs text-muted-color">
                                {{ formatAmount(row.product.price, row.product.currency) }}
                            </div>
                        </div>
                        <span v-else class="text-muted-color text-sm">—</span>
                    </template>
                </Column>

                <!-- Montant total -->
                <Column header="Total" style="min-width:9rem">
                    <template #body="{ data: row }">
                        <span class="font-semibold">
                            {{ formatAmount(row.totalAmount, row.product?.currency) }}
                        </span>
                    </template>
                </Column>

                <!-- Statut -->
                <Column header="Statut" style="min-width:10rem">
                    <template #body="{ data: row }">
                        <Tag
                            :value="STATUS_LABEL[row.status] ?? row.status"
                            :severity="STATUS_SEVERITY[row.status] ?? 'secondary'"
                        />
                    </template>
                </Column>

                <!-- Livreur -->
                <Column header="Livreur" style="min-width:10rem">
                    <template #body="{ data: row }">
                        <div v-if="row.livreur?.user" class="flex items-center gap-2">
                            <span
                                class="w-2 h-2 rounded-full shrink-0"
                                :class="row.livreur.isOnline ? 'bg-green-500' : 'bg-gray-400'"
                            />
                            <span class="text-sm">{{ row.livreur.user.username }}</span>
                        </div>
                        <span v-else class="text-muted-color text-sm">—</span>
                    </template>
                </Column>

                <!-- Actions -->
                <Column header="Actions" style="min-width:9rem" alignHeader="right">
                    <template #body="{ data: row }">
                        <div class="flex gap-1 justify-end">
                            <!-- Voir détails -->
                            <Button
                                v-tooltip.top="'Voir détails'"
                                icon="pi pi-eye"
                                severity="info"
                                outlined
                                rounded
                                size="small"
                                @click="router.push(`/orders/${row.orderId}`)"
                            />
                            <!-- Quick confirm -->
                            <Button
                                v-if="row.status === 'pending'"
                                v-tooltip.top="'Confirmer'"
                                icon="pi pi-check"
                                severity="success"
                                outlined
                                rounded
                                size="small"
                                @click="quickStatus(row, 'confirmed')"
                            />
                            <!-- Quick cancel -->
                            <Button
                                v-if="!['cancelled', 'delivered'].includes(row.status)"
                                v-tooltip.top="'Annuler'"
                                icon="pi pi-times"
                                severity="warn"
                                outlined
                                rounded
                                size="small"
                                @click="quickStatus(row, 'cancelled')"
                            />
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
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- ── Edit Dialog ─────────────────────────────────────────────────── -->
        <Dialog v-model:visible="editDialog" header="Modifier la commande" modal style="width:36rem" :draggable="false">
            <div class="flex flex-col gap-4 pt-1">
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Statut</label>
                    <Select
                        v-model="editForm.status"
                        :options="STATUS_OPTIONS"
                        optionLabel="label"
                        optionValue="value"
                        class="w-full"
                    />
                </div>

                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Méthode de paiement</label>
                    <InputText v-model="editForm.paymentMethod" placeholder="Ex: BIM Pay, Espèces, Mobile Money…" />
                </div>

                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Adresse de livraison</label>
                    <Textarea v-model="editForm.shippingAddress" rows="2" autoResize />
                </div>

                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Notes internes</label>
                    <Textarea v-model="editForm.notes" placeholder="Notes sur la commande…" rows="3" autoResize />
                </div>
            </div>
            <template #footer>
                <Button label="Annuler" severity="secondary" outlined @click="editDialog = false" :disabled="updatePending" />
                <Button label="Enregistrer" icon="pi pi-check" :loading="updatePending" @click="submitEdit" />
            </template>
        </Dialog>
    </div>
</template>
