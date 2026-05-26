<script setup>
import { ref, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useAuthStore } from '@/modules/auth/store/auth.store';
import apiClient from '@/api/axios';

const toast   = useToast();
const auth    = useAuthStore();
const loading = ref(false);
const saving  = ref(false);

const company        = ref(null);
const commissionRate = ref(10);

async function loadCompany() {
    const id = auth.companyId;
    if (!id) return;
    loading.value = true;
    try {
        const res = await apiClient.get(`/company/${id}`);
        company.value        = res.data?.data ?? res.data;
        commissionRate.value = parseFloat(company.value?.commissionRate ?? 10);
    } catch {
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les paramètres', life: 3000 });
    } finally {
        loading.value = false;
    }
}

async function saveCommissionRate() {
    if (commissionRate.value < 0 || commissionRate.value > 50) {
        toast.add({ severity: 'warn', summary: 'Valeur invalide', detail: 'Le taux doit être compris entre 0 % et 50 %', life: 3000 });
        return;
    }
    saving.value = true;
    try {
        await apiClient.put(`/company/update/${auth.companyId}`, { commissionRate: commissionRate.value });
        toast.add({ severity: 'success', summary: 'Enregistré', detail: `Taux de commission mis à jour : ${commissionRate.value} %`, life: 3000 });
    } catch (e) {
        toast.add({ severity: 'error', summary: 'Erreur', detail: e?.response?.data?.message ?? 'Erreur serveur', life: 3000 });
    } finally {
        saving.value = false;
    }
}

onMounted(loadCompany);
</script>

<template>
    <div class="p-4 md:p-6 max-w-xl">
        <div class="mb-6">
            <h2 class="text-xl font-bold text-surface-900 dark:text-surface-0">Paramètres de l'entreprise</h2>
            <p class="text-surface-500 text-sm mt-1">Configurez les options de votre espace entreprise</p>
        </div>

        <div v-if="loading" class="flex justify-center py-12">
            <ProgressSpinner style="width:40px;height:40px" />
        </div>

        <div v-else>
            <!-- Infos entreprise (lecture seule) -->
            <div class="card mb-4 p-4 border border-surface-200 dark:border-surface-700 rounded-xl">
                <div class="flex items-center gap-3 mb-2">
                    <i class="pi pi-building text-primary text-lg"></i>
                    <span class="font-semibold text-surface-800 dark:text-surface-100">{{ company?.name ?? '—' }}</span>
                </div>
                <p class="text-surface-500 text-sm">{{ company?.email ?? '—' }}</p>
                <p class="text-surface-500 text-sm" v-if="company?.location">{{ company.location }}</p>
            </div>

            <!-- Commission livreur -->
            <div class="card p-5 border border-surface-200 dark:border-surface-700 rounded-xl">
                <div class="flex items-center gap-2 mb-1">
                    <i class="pi pi-percentage text-green-600"></i>
                    <span class="font-bold text-surface-800 dark:text-surface-100">Taux de commission livreur</span>
                </div>
                <p class="text-surface-500 text-sm mb-4">
                    Ce pourcentage est prélevé sur chaque commande payée et reversé directement dans le compte BIM NEXT du livreur.
                    Les livreurs voient ce taux avant de postuler.
                </p>

                <div class="flex items-center gap-3">
                    <InputNumber
                        v-model="commissionRate"
                        :min="0"
                        :max="50"
                        :step="0.5"
                        suffix=" %"
                        :minFractionDigits="1"
                        :maxFractionDigits="2"
                        class="w-40"
                        showButtons
                        buttonLayout="horizontal"
                        decrementButtonClass="p-button-secondary"
                        incrementButtonClass="p-button-secondary"
                        incrementButtonIcon="pi pi-plus"
                        decrementButtonIcon="pi pi-minus"
                    />
                    <Button
                        label="Enregistrer"
                        icon="pi pi-check"
                        severity="success"
                        :loading="saving"
                        @click="saveCommissionRate"
                    />
                </div>

                <div class="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <p class="text-green-700 dark:text-green-300 text-sm">
                        <i class="pi pi-info-circle mr-1"></i>
                        Taux actuel : <strong>{{ commissionRate }} %</strong> — Sur une commande de 100 EC,
                        le livreur reçoit <strong>{{ commissionRate }} EC</strong> et votre compte reçoit
                        <strong>{{ (100 - commissionRate).toFixed(2) }} EC</strong>.
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>
