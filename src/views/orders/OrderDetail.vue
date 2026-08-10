<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQueryClient } from '@tanstack/vue-query';
import { useToast } from 'primevue/usetoast';
import { useOrderByIdQuery } from '@/modules/orders/queries/orders.queries';
import { useUpdateOrderMutation } from '@/modules/orders/mutations/orders.mutations';

const route = useRoute();
const router = useRouter();
const toast  = useToast();
const qc     = useQueryClient();

const orderId = computed(() => route.params.id);
const { data: order, isLoading, isError } = useOrderByIdQuery(orderId);

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
    { label: 'En attente',    value: 'pending' },
    { label: 'Confirmée',     value: 'confirmed' },
    { label: 'Payée',         value: 'paid' },
    { label: 'En traitement', value: 'processing' },
    { label: 'Expédiée',      value: 'shipped' },
    { label: 'Livrée',        value: 'delivered' },
    { label: 'Annulée',       value: 'cancelled' },
];
const STATUS_SEVERITY = {
    pending: 'warn', confirmed: 'info', paid: 'success',
    processing: 'info', shipped: 'info', delivered: 'success', cancelled: 'danger',
};
const STATUS_LABEL = {
    pending: 'En attente', confirmed: 'Confirmée', paid: 'Payée',
    processing: 'En traitement', shipped: 'Expédiée', delivered: 'Livrée', cancelled: 'Annulée',
};

// ── Mutation ───────────────────────────────────────────────────────────────────
const { mutate: updateOrder, isPending: saving } = useUpdateOrderMutation();

const editStatus  = ref(null);
const editNotes   = ref('');
const editAddress = ref('');

// Sync form when data loads
import { watch } from 'vue';
watch(order, (o) => {
    if (!o) return;
    editStatus.value  = o.status  ?? null;
    editNotes.value   = o.notes   ?? '';
    editAddress.value = o.shippingAddress ?? '';
}, { immediate: true });

function saveChanges() {
    updateOrder(
        { id: order.value.orderId, payload: { status: editStatus.value, notes: editNotes.value, shippingAddress: editAddress.value } },
        {
            onSuccess: () => {
                toast.add({ severity: 'success', summary: 'Enregistré', detail: 'Commande mise à jour', life: 3000 });
                qc.invalidateQueries({ queryKey: ['order', orderId.value] });
            },
            onError: (err) =>
                toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
        }
    );
}

// ── Map ────────────────────────────────────────────────────────────────────────
const mapIframe = computed(() => {
    const l = order.value?.livreur;
    if (!l?.latitude || !l?.longitude) return null;
    const lat = parseFloat(l.latitude);
    const lng = parseFloat(l.longitude);
    // OpenStreetMap embed (no API key needed)
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}`;
});

const mapLink = computed(() => {
    const l = order.value?.livreur;
    if (!l?.latitude || !l?.longitude) return null;
    return `https://www.openstreetmap.org/?mlat=${l.latitude}&mlon=${l.longitude}#map=16/${l.latitude}/${l.longitude}`;
});

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatDate(d) {
    return d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
}
function formatAmount(amount, currency) {
    if (amount == null) return '—';
    const sym = currency?.symbol ?? currency?.code ?? 'EC';
    return `${Number(amount).toLocaleString('fr-FR')} ${sym}`;
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <Toast />

        <!-- Breadcrumb / back -->
        <div class="flex items-center gap-3 flex-wrap">
            <Button icon="pi pi-arrow-left" severity="secondary" text @click="router.push('/orders')" />
            <div class="flex items-center gap-2 text-sm text-muted-color">
                <span class="cursor-pointer hover:text-primary" @click="router.push('/orders')">Commandes</span>
                <i class="pi pi-chevron-right text-xs" />
                <span class="text-surface-900 dark:text-surface-0 font-semibold">
                    {{ order?.orderNumber ?? '…' }}
                </span>
            </div>
        </div>

        <!-- Loading -->
        <div v-if="isLoading" class="flex justify-center py-20">
            <ProgressSpinner style="width:48px;height:48px" />
        </div>

        <!-- Error -->
        <div v-else-if="isError" class="card text-center py-12 text-muted-color">
            <i class="pi pi-exclamation-circle text-4xl block mb-3 text-red-400" />
            <p>Commande introuvable ou erreur serveur.</p>
        </div>

        <template v-else-if="order">
            <div class="grid grid-cols-12 gap-4">

                <!-- ── LEFT: Order info + Edit ──────────────────────────────── -->
                <div class="col-span-12 lg:col-span-7 flex flex-col gap-4">

                    <!-- Order header card -->
                    <div class="card">
                        <div class="flex items-start justify-between flex-wrap gap-3 mb-4">
                            <div>
                                <h2 class="text-xl font-bold text-surface-900 dark:text-surface-0 font-mono">
                                    {{ order.orderNumber }}
                                </h2>
                                <div class="text-sm text-muted-color mt-1">
                                    Créée le {{ formatDate(order.createdAt) }}
                                    <span v-if="order.updatedAt !== order.createdAt">
                                        · Modifiée le {{ formatDate(order.updatedAt) }}
                                    </span>
                                </div>
                            </div>
                            <Tag
                                :value="STATUS_LABEL[order.status] ?? order.status"
                                :severity="STATUS_SEVERITY[order.status] ?? 'secondary'"
                                class="text-sm"
                            />
                        </div>

                        <!-- Info grid -->
                        <div class="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                            <div>
                                <div class="text-muted-color text-xs font-medium uppercase tracking-wide mb-1">Client</div>
                                <div class="font-semibold">{{ order.user?.username ?? '—' }}</div>
                                <div class="text-muted-color text-xs">{{ order.user?.email ?? '' }}</div>
                            </div>
                            <div>
                                <div class="text-muted-color text-xs font-medium uppercase tracking-wide mb-1">Entreprise</div>
                                <div class="font-semibold">{{ order.company?.name ?? '—' }}</div>
                            </div>
                            <div>
                                <div class="text-muted-color text-xs font-medium uppercase tracking-wide mb-1">Produit</div>
                                <div class="font-semibold">{{ order.product?.name ?? '—' }}</div>
                                <div class="text-muted-color text-xs">
                                    {{ formatAmount(order.product?.price, order.product?.currency) }}
                                </div>
                            </div>
                            <div>
                                <div class="text-muted-color text-xs font-medium uppercase tracking-wide mb-1">Quantité · Total</div>
                                <div class="font-semibold">
                                    {{ order.quantity }} × {{ formatAmount(order.unitPrice, order.product?.currency) }}
                                    = <span class="text-primary">{{ formatAmount(order.totalAmount, order.product?.currency) }}</span>
                                </div>
                            </div>
                            <div>
                                <div class="text-muted-color text-xs font-medium uppercase tracking-wide mb-1">Paiement</div>
                                <div class="font-semibold capitalize">{{ order.paymentMethod ?? '—' }}</div>
                                <Tag
                                    v-if="order.paymentStatus"
                                    :value="order.paymentStatus === 'paid' ? 'Payée' : 'Non payée'"
                                    :severity="order.paymentStatus === 'paid' ? 'success' : 'warn'"
                                    class="text-xs mt-1"
                                />
                            </div>
                            <div v-if="order.clientPhone">
                                <div class="text-muted-color text-xs font-medium uppercase tracking-wide mb-1">Téléphone client</div>
                                <div class="font-semibold">{{ order.clientPhone }}</div>
                            </div>
                        </div>

                        <Divider />

                        <div v-if="order.shippingAddress" class="text-sm">
                            <div class="text-muted-color text-xs font-medium uppercase tracking-wide mb-1">
                                <i class="pi pi-map-marker mr-1" />Adresse de livraison
                            </div>
                            <div>{{ order.shippingAddress }}</div>
                        </div>
                        <div v-if="order.notes" class="text-sm mt-3">
                            <div class="text-muted-color text-xs font-medium uppercase tracking-wide mb-1">
                                <i class="pi pi-comment mr-1" />Notes
                            </div>
                            <div>{{ order.notes }}</div>
                        </div>
                    </div>

                    <!-- Edit card -->
                    <div class="card">
                        <h3 class="font-bold text-surface-900 dark:text-surface-0 mb-4">
                            <i class="pi pi-pencil mr-2 text-primary" />Modifier la commande
                        </h3>
                        <div class="flex flex-col gap-4">
                            <div class="flex flex-col gap-2">
                                <label class="font-medium text-sm">Statut</label>
                                <Select
                                    v-model="editStatus"
                                    :options="STATUS_OPTIONS"
                                    optionLabel="label"
                                    optionValue="value"
                                    class="w-full"
                                />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="font-medium text-sm">Adresse de livraison</label>
                                <Textarea v-model="editAddress" rows="2" autoResize class="w-full" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="font-medium text-sm">Notes internes</label>
                                <Textarea v-model="editNotes" placeholder="Notes sur la commande…" rows="3" autoResize class="w-full" />
                            </div>
                            <div class="flex justify-end">
                                <Button
                                    label="Enregistrer"
                                    icon="pi pi-check"
                                    :loading="saving"
                                    @click="saveChanges"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ── RIGHT: Livreur + Map ─────────────────────────────────── -->
                <div class="col-span-12 lg:col-span-5 flex flex-col gap-4">

                    <!-- Livreur card -->
                    <div class="card">
                        <h3 class="font-bold text-surface-900 dark:text-surface-0 mb-4">
                            <i class="pi pi-truck mr-2 text-primary" />Livreur associé
                        </h3>

                        <div v-if="order.livreur" class="flex flex-col gap-3">
                            <!-- Avatar + name -->
                            <div class="flex items-center gap-3">
                                <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                                    {{ order.livreur.user?.username?.charAt(0)?.toUpperCase() ?? '?' }}
                                </div>
                                <div>
                                    <div class="font-semibold text-surface-900 dark:text-surface-0">
                                        {{ order.livreur.user?.username ?? '—' }}
                                    </div>
                                    <div class="text-xs text-muted-color">{{ order.livreur.user?.email ?? '' }}</div>
                                </div>
                                <div class="ml-auto flex flex-col items-end gap-1">
                                    <Tag
                                        :value="order.livreur.isOnline ? 'En ligne' : 'Hors ligne'"
                                        :severity="order.livreur.isOnline ? 'success' : 'secondary'"
                                        class="text-xs"
                                    />
                                </div>
                            </div>

                            <Divider class="my-1" />

                            <div class="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <div class="text-muted-color text-xs uppercase tracking-wide mb-1">Téléphone</div>
                                    <div class="font-medium">{{ order.livreur.telephone ?? '—' }}</div>
                                </div>
                                <div>
                                    <div class="text-muted-color text-xs uppercase tracking-wide mb-1">Note</div>
                                    <div class="font-medium flex items-center gap-1">
                                        <i class="pi pi-star-fill text-yellow-400 text-xs" />
                                        {{ order.livreur.rating ?? '—' }}
                                        <span class="text-muted-color text-xs">({{ order.livreur.ratingCount ?? 0 }} avis)</span>
                                    </div>
                                </div>
                                <div v-if="order.livreur.latitude">
                                    <div class="text-muted-color text-xs uppercase tracking-wide mb-1">Position GPS</div>
                                    <div class="text-xs font-mono text-muted-color">
                                        {{ Number(order.livreur.latitude).toFixed(5) }},
                                        {{ Number(order.livreur.longitude).toFixed(5) }}
                                    </div>
                                </div>
                            </div>

                            <!-- Map -->
                            <div v-if="mapIframe" class="mt-2">
                                <div class="text-xs text-muted-color mb-2 flex items-center justify-between">
                                    <span><i class="pi pi-map mr-1" />Position en temps réel (rafraîchit toutes les 10 s)</span>
                                    <a :href="mapLink" target="_blank" class="text-primary text-xs hover:underline">
                                        Ouvrir dans OSM <i class="pi pi-external-link text-xs ml-1" />
                                    </a>
                                </div>
                                <iframe
                                    :src="mapIframe"
                                    width="100%"
                                    height="260"
                                    style="border:none;border-radius:12px;"
                                    allowfullscreen
                                    loading="lazy"
                                />
                            </div>
                            <div v-else class="bg-surface-100 dark:bg-surface-800 rounded-xl p-4 text-center text-sm text-muted-color">
                                <i class="pi pi-map-marker text-2xl block mb-2 opacity-30" />
                                Position GPS non disponible
                            </div>
                        </div>

                        <!-- No livreur assigned -->
                        <div v-else class="text-center py-6 text-muted-color text-sm">
                            <i class="pi pi-truck text-3xl block mb-3 opacity-25" />
                            Aucun livreur assigné à cette commande
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>
