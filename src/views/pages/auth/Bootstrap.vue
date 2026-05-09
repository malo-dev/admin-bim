<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useBootstrapMutation } from '@/modules/accounts/mutations/account.mutations';

const router = useRouter();
const form = ref({ username: '', email: '', password: '' });

const { mutate: bootstrap, isPending, isError, isSuccess, error } = useBootstrapMutation();

const errorMessage = computed(
    () => error.value?.response?.data?.message || 'Une erreur est survenue.'
);

function handleSubmit() {
    bootstrap(form.value, {
        onSuccess: () => {
            setTimeout(() => router.push('/auth/login'), 2000);
        },
    });
}
</script>

<template>
    <div class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-[100vw] overflow-hidden">
        <div class="flex flex-col items-center justify-center w-full max-w-md px-4">
            <div
                style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, var(--primary-color) 10%, rgba(33,150,243,0) 30%)"
                class="w-full"
            >
                <div class="w-full bg-surface-0 dark:bg-surface-900 py-14 px-8 sm:px-12" style="border-radius: 53px">
                    <!-- Header -->
                    <div class="text-center mb-8">
                        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
                            <i class="pi pi-shield text-3xl text-primary" />
                        </div>
                        <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">
                            Configuration initiale
                        </h1>
                        <p class="text-muted-color text-sm mt-2">
                            Créez le premier compte administrateur BIM.<br />
                            Cette page sera désactivée ensuite.
                        </p>
                    </div>

                    <!-- Succès -->
                    <Message v-if="isSuccess" severity="success" :closable="false" class="mb-4">
                        Compte créé avec succès ! Redirection vers la connexion…
                    </Message>

                    <!-- Erreur (ex: admin existe déjà) -->
                    <Message v-if="isError" severity="error" :closable="false" class="mb-4">
                        {{ errorMessage }}
                    </Message>

                    <form v-if="!isSuccess" @submit.prevent="handleSubmit" class="flex flex-col gap-5">
                        <div class="flex flex-col gap-2">
                            <label class="font-medium text-surface-900 dark:text-surface-0">
                                Nom d'utilisateur
                            </label>
                            <InputText
                                v-model="form.username"
                                placeholder="ex: admin_bim"
                                :disabled="isPending"
                                required
                                autocomplete="username"
                            />
                        </div>

                        <div class="flex flex-col gap-2">
                            <label class="font-medium text-surface-900 dark:text-surface-0">
                                Email
                            </label>
                            <InputText
                                v-model="form.email"
                                type="email"
                                placeholder="admin@bimreseau.com"
                                :disabled="isPending"
                                required
                                autocomplete="email"
                            />
                        </div>

                        <div class="flex flex-col gap-2">
                            <label class="font-medium text-surface-900 dark:text-surface-0">
                                Mot de passe
                            </label>
                            <Password
                                v-model="form.password"
                                placeholder="Mot de passe fort"
                                :toggleMask="true"
                                fluid
                                :disabled="isPending"
                                required
                                autocomplete="new-password"
                            />
                        </div>

                        <Button
                            type="submit"
                            label="Créer l'administrateur BIM"
                            icon="pi pi-check"
                            class="w-full mt-2"
                            :loading="isPending"
                            :disabled="!form.username || !form.email || !form.password || isPending"
                        />

                        <div class="text-center">
                            <router-link
                                to="/auth/login"
                                class="text-sm text-primary cursor-pointer hover:underline"
                            >
                                J'ai déjà un compte → Se connecter
                            </router-link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
</template>
