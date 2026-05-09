<script setup>
import { ref, computed } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useCreateCompanyAccountMutation } from '@/modules/accounts/mutations/account.mutations';
import { useAllSectorsQuery } from '@/modules/companies/queries/companies.queries';

const toast = useToast();
const { mutate: createCompanyAccount, isPending } = useCreateCompanyAccountMutation();
const { data: sectorsData } = useAllSectorsQuery();

const sectorOptions = computed(() => {
    const raw = sectorsData.value;
    const list = Array.isArray(raw) ? raw : (raw?.data ?? []);
    return list.map((s) => ({ label: s.name, value: s.businessId }));
});

const form = ref({
    company: { name: '', email: '', businessId: null, location: '', logo: '', description: '' },
    admin: { username: '', email: '', password: '' },
});

const showPassword = ref(false);

const canSubmit = computed(() =>
    !!form.value.company.name &&
    !!form.value.company.email &&
    !!form.value.admin.username &&
    !!form.value.admin.email &&
    !!form.value.admin.password
);

function reset() {
    form.value = {
        company: { name: '', email: '', businessId: null, location: '', logo: '', description: '' },
        admin: { username: '', email: '', password: '' },
    };
}

function submit() {
    const payload = {
        company: {
            name: form.value.company.name,
            email: form.value.company.email,
            ...(form.value.company.businessId && { businessId: form.value.company.businessId }),
            ...(form.value.company.location && { location: form.value.company.location }),
            ...(form.value.company.logo && { logo: form.value.company.logo }),
            ...(form.value.company.description && { description: form.value.company.description }),
        },
        admin: {
            username: form.value.admin.username,
            email: form.value.admin.email,
            password: form.value.admin.password,
        },
    };

    createCompanyAccount(payload, {
        onSuccess: (res) => {
            toast.add({
                severity: 'success',
                summary: 'Compte créé',
                detail: `Entreprise « ${res.company?.name} » et admin « ${res.admin?.username} » créés avec succès`,
                life: 5000,
            });
            reset();
        },
        onError: (err) =>
            toast.add({
                severity: 'error',
                summary: 'Erreur',
                detail: err?.response?.data?.message ?? 'Erreur serveur',
                life: 4000,
            }),
    });
}
</script>

<template>
    <div class="flex flex-col gap-6 max-w-3xl mx-auto">
        <!-- Header -->
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <i class="pi pi-building text-primary text-lg" />
            </div>
            <div>
                <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Créer un compte entreprise</h1>
                <p class="text-sm text-muted-color">Crée l'entreprise et son administrateur en une seule opération</p>
            </div>
        </div>

        <!-- Company section -->
        <div class="card flex flex-col gap-5">
            <div class="flex items-center gap-2 pb-2 border-b border-surface-200 dark:border-surface-700">
                <i class="pi pi-building text-primary" />
                <span class="font-semibold text-surface-900 dark:text-surface-0">Informations de l'entreprise</span>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Nom de l'entreprise <span class="text-red-400">*</span></label>
                    <InputText v-model="form.company.name" placeholder="Ex: Acme SARL" />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Email de l'entreprise <span class="text-red-400">*</span></label>
                    <InputText v-model="form.company.email" type="email" placeholder="contact@entreprise.com" />
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Secteur d'activité</label>
                    <Select
                        v-model="form.company.businessId"
                        :options="sectorOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Choisir un secteur"
                        showClear
                        class="w-full"
                    />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Ville / Localisation</label>
                    <InputText v-model="form.company.location" placeholder="Ex: Kinshasa, Bunia…" />
                </div>
            </div>

            <div class="flex flex-col gap-2">
                <label class="font-medium text-sm">Logo (URL)</label>
                <InputText v-model="form.company.logo" placeholder="https://…" />
                <div v-if="form.company.logo" class="flex items-center gap-2 mt-1">
                    <img
                        :src="form.company.logo"
                        alt="aperçu logo"
                        class="w-10 h-10 rounded object-contain border border-surface-200 dark:border-surface-700"
                        @error="form.company.logo = ''"
                    />
                    <span class="text-xs text-muted-color">Aperçu</span>
                </div>
            </div>

            <div class="flex flex-col gap-2">
                <label class="font-medium text-sm">Description</label>
                <Textarea v-model="form.company.description" placeholder="Description de l'entreprise…" rows="3" autoResize />
            </div>
        </div>

        <!-- Admin section -->
        <div class="card flex flex-col gap-5">
            <div class="flex items-center gap-2 pb-2 border-b border-surface-200 dark:border-surface-700">
                <i class="pi pi-user text-primary" />
                <span class="font-semibold text-surface-900 dark:text-surface-0">Compte administrateur</span>
                <span class="text-xs text-muted-color ml-1">(rôle COMPANY_ADMIN)</span>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Nom d'utilisateur <span class="text-red-400">*</span></label>
                    <InputText v-model="form.admin.username" placeholder="Ex: john_doe" />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Email de connexion <span class="text-red-400">*</span></label>
                    <InputText v-model="form.admin.email" type="email" placeholder="admin@entreprise.com" />
                </div>
            </div>

            <div class="flex flex-col gap-2">
                <label class="font-medium text-sm">Mot de passe <span class="text-red-400">*</span></label>
                <IconField>
                    <InputIcon
                        :class="showPassword ? 'pi pi-eye-slash' : 'pi pi-eye'"
                        class="cursor-pointer"
                        @click="showPassword = !showPassword"
                    />
                    <InputText
                        v-model="form.admin.password"
                        :type="showPassword ? 'text' : 'password'"
                        placeholder="Mot de passe sécurisé"
                        class="w-full"
                    />
                </IconField>
            </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3">
            <Button label="Réinitialiser" severity="secondary" outlined icon="pi pi-refresh" :disabled="isPending" @click="reset" />
            <Button
                label="Créer le compte entreprise"
                icon="pi pi-check"
                :loading="isPending"
                :disabled="!canSubmit"
                @click="submit"
            />
        </div>
    </div>
</template>
