<script setup>
import { ref, computed } from 'vue';
import { useToast } from 'primevue/usetoast';
import {
    useCreateBimAdminMutation,
    useCreateCompanyAccountMutation,
} from '@/modules/accounts/mutations/account.mutations';

const toast = useToast();

// ── BIM Admin form ────────────────────────────────────────────
const bimForm = ref({ username: '', email: '', password: '' });

const {
    mutate: createBimAdmin,
    isPending: bimPending,
    isError: bimError,
    error: bimErrorData,
    isSuccess: bimSuccess,
    reset: resetBim,
} = useCreateBimAdminMutation();

const bimErrorMsg = computed(
    () => bimErrorData.value?.response?.data?.message || 'Erreur lors de la création'
);

function submitBimAdmin() {
    createBimAdmin(bimForm.value, {
        onSuccess: () => {
            toast.add({ severity: 'success', summary: 'Succès', detail: 'Compte BIM Admin créé', life: 4000 });
            bimForm.value = { username: '', email: '', password: '' };
        },
        onError: () => {
            toast.add({ severity: 'error', summary: 'Erreur', detail: bimErrorMsg.value, life: 5000 });
        },
    });
}

// ── Company Account form ──────────────────────────────────────
const companyForm = ref({
    company: { name: '', email: '', description: '', location: '' },
    admin: { username: '', email: '', password: '' },
});

const {
    mutate: createCompanyAccount,
    isPending: companyPending,
    isError: companyError,
    error: companyErrorData,
    isSuccess: companySuccess,
} = useCreateCompanyAccountMutation();

const companyErrorMsg = computed(
    () => companyErrorData.value?.response?.data?.message || 'Erreur lors de la création'
);

function submitCompanyAccount() {
    createCompanyAccount(companyForm.value, {
        onSuccess: () => {
            toast.add({ severity: 'success', summary: 'Succès', detail: 'Compte entreprise créé', life: 4000 });
            companyForm.value = {
                company: { name: '', email: '', description: '', location: '' },
                admin: { username: '', email: '', password: '' },
            };
        },
        onError: () => {
            toast.add({ severity: 'error', summary: 'Erreur', detail: companyErrorMsg.value, life: 5000 });
        },
    });
}
</script>

<template>
    <Toast />

    <div class="max-w-3xl mx-auto">
        <div class="mb-6">
            <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Créer un compte</h1>
            <p class="text-muted-color mt-1">
                Créez un compte administrateur BIM ou un compte pour une nouvelle entreprise.
            </p>
        </div>

        <TabView>
            <!-- ── Tab 1 : Compte BIM Admin ── -->
            <TabPanel header="Compte BIM Admin">
                <div class="pt-4">
                    <Message v-if="bimSuccess" severity="success" :closable="false" class="mb-4">
                        Compte BIM Admin créé avec succès.
                    </Message>
                    <Message v-if="bimError" severity="error" :closable="false" class="mb-4">
                        {{ bimErrorMsg }}
                    </Message>

                    <form @submit.prevent="submitBimAdmin" class="flex flex-col gap-5">
                        <div class="flex flex-col gap-2">
                            <label class="font-medium">Nom d'utilisateur</label>
                            <InputText
                                v-model="bimForm.username"
                                placeholder="ex: john_bim"
                                :disabled="bimPending"
                                required
                            />
                        </div>

                        <div class="flex flex-col gap-2">
                            <label class="font-medium">Email</label>
                            <InputText
                                v-model="bimForm.email"
                                type="email"
                                placeholder="admin@bimreseau.com"
                                :disabled="bimPending"
                                required
                            />
                        </div>

                        <div class="flex flex-col gap-2">
                            <label class="font-medium">Mot de passe</label>
                            <Password
                                v-model="bimForm.password"
                                placeholder="Mot de passe fort"
                                :toggleMask="true"
                                fluid
                                :disabled="bimPending"
                                required
                            />
                        </div>

                        <div class="flex justify-end">
                            <Button
                                type="submit"
                                label="Créer le compte BIM Admin"
                                icon="pi pi-shield"
                                :loading="bimPending"
                                :disabled="!bimForm.username || !bimForm.email || !bimForm.password || bimPending"
                            />
                        </div>
                    </form>
                </div>
            </TabPanel>

            <!-- ── Tab 2 : Compte Entreprise ── -->
            <TabPanel header="Compte Entreprise">
                <div class="pt-4">
                    <Message v-if="companySuccess" severity="success" :closable="false" class="mb-4">
                        Compte entreprise créé avec succès.
                    </Message>
                    <Message v-if="companyError" severity="error" :closable="false" class="mb-4">
                        {{ companyErrorMsg }}
                    </Message>

                    <form @submit.prevent="submitCompanyAccount" class="flex flex-col gap-6">
                        <!-- Section Entreprise -->
                        <div>
                            <p class="text-sm font-semibold text-primary uppercase tracking-wide mb-3">
                                Informations de l'entreprise
                            </p>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div class="flex flex-col gap-2">
                                    <label class="font-medium">Nom de l'entreprise <span class="text-red-500">*</span></label>
                                    <InputText
                                        v-model="companyForm.company.name"
                                        placeholder="ex: Acme Corp"
                                        :disabled="companyPending"
                                        required
                                    />
                                </div>
                                <div class="flex flex-col gap-2">
                                    <label class="font-medium">Email entreprise <span class="text-red-500">*</span></label>
                                    <InputText
                                        v-model="companyForm.company.email"
                                        type="email"
                                        placeholder="contact@acme.com"
                                        :disabled="companyPending"
                                        required
                                    />
                                </div>
                                <div class="flex flex-col gap-2">
                                    <label class="font-medium">Localisation</label>
                                    <InputText
                                        v-model="companyForm.company.location"
                                        placeholder="ex: Kinshasa, RDC"
                                        :disabled="companyPending"
                                    />
                                </div>
                                <div class="flex flex-col gap-2">
                                    <label class="font-medium">Description</label>
                                    <InputText
                                        v-model="companyForm.company.description"
                                        placeholder="Brève description"
                                        :disabled="companyPending"
                                    />
                                </div>
                            </div>
                        </div>

                        <Divider />

                        <!-- Section Admin Entreprise -->
                        <div>
                            <p class="text-sm font-semibold text-primary uppercase tracking-wide mb-3">
                                Compte administrateur de l'entreprise
                            </p>
                            <div class="flex flex-col gap-4">
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div class="flex flex-col gap-2">
                                        <label class="font-medium">Nom d'utilisateur <span class="text-red-500">*</span></label>
                                        <InputText
                                            v-model="companyForm.admin.username"
                                            placeholder="ex: admin_acme"
                                            :disabled="companyPending"
                                            required
                                        />
                                    </div>
                                    <div class="flex flex-col gap-2">
                                        <label class="font-medium">Email admin <span class="text-red-500">*</span></label>
                                        <InputText
                                            v-model="companyForm.admin.email"
                                            type="email"
                                            placeholder="admin@acme.com"
                                            :disabled="companyPending"
                                            required
                                        />
                                    </div>
                                </div>
                                <div class="flex flex-col gap-2">
                                    <label class="font-medium">Mot de passe <span class="text-red-500">*</span></label>
                                    <Password
                                        v-model="companyForm.admin.password"
                                        placeholder="Mot de passe fort"
                                        :toggleMask="true"
                                        fluid
                                        :disabled="companyPending"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div class="flex justify-end">
                            <Button
                                type="submit"
                                label="Créer le compte entreprise"
                                icon="pi pi-building"
                                :loading="companyPending"
                                :disabled="
                                    !companyForm.company.name ||
                                    !companyForm.company.email ||
                                    !companyForm.admin.username ||
                                    !companyForm.admin.email ||
                                    !companyForm.admin.password ||
                                    companyPending
                                "
                            />
                        </div>
                    </form>
                </div>
            </TabPanel>
        </TabView>
    </div>
</template>
