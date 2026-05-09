<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useResetBimPasswordMutation } from '@/modules/accounts/mutations/account.mutations';

const router = useRouter();
const form = ref({ email: '', newPassword: '', confirm: '' });

const { mutate: resetPassword, isPending, isError, isSuccess, error } = useResetBimPasswordMutation();

const errorMessage = computed(
    () => error.value?.response?.data?.message || 'Une erreur est survenue.'
);

const passwordMismatch = computed(
    () => form.value.confirm.length > 0 && form.value.confirm !== form.value.newPassword
);

const canSubmit = computed(
    () =>
        form.value.email &&
        form.value.newPassword.length >= 6 &&
        form.value.newPassword === form.value.confirm &&
        !isPending.value
);

function handleSubmit() {
    if (!canSubmit.value) return;
    resetPassword(
        { email: form.value.email, newPassword: form.value.newPassword },
        { onSuccess: () => setTimeout(() => router.push('/auth/login'), 2500) }
    );
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
                    <div class="text-center mb-8">
                        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-100 dark:bg-orange-900/30 mb-4">
                            <i class="pi pi-lock text-3xl text-orange-500" />
                        </div>
                        <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">
                            Réinitialiser le mot de passe
                        </h1>
                        <p class="text-muted-color text-sm mt-2">
                            Réservé aux administrateurs BIM uniquement.
                        </p>
                    </div>

                    <Message v-if="isSuccess" severity="success" :closable="false" class="mb-4">
                        Mot de passe mis à jour ! Redirection vers la connexion…
                    </Message>

                    <Message v-if="isError" severity="error" :closable="false" class="mb-4">
                        {{ errorMessage }}
                    </Message>

                    <form v-if="!isSuccess" @submit.prevent="handleSubmit" class="flex flex-col gap-5">
                        <div class="flex flex-col gap-2">
                            <label class="font-medium text-surface-900 dark:text-surface-0">
                                Email administrateur
                            </label>
                            <InputText
                                v-model="form.email"
                                type="email"
                                placeholder="votre@email.com"
                                :disabled="isPending"
                                required
                                autocomplete="email"
                            />
                        </div>

                        <div class="flex flex-col gap-2">
                            <label class="font-medium text-surface-900 dark:text-surface-0">
                                Nouveau mot de passe
                            </label>
                            <Password
                                v-model="form.newPassword"
                                placeholder="Minimum 6 caractères"
                                :toggleMask="true"
                                fluid
                                :disabled="isPending"
                                required
                                autocomplete="new-password"
                            />
                        </div>

                        <div class="flex flex-col gap-2">
                            <label class="font-medium text-surface-900 dark:text-surface-0">
                                Confirmer le mot de passe
                            </label>
                            <Password
                                v-model="form.confirm"
                                placeholder="Répétez le mot de passe"
                                :toggleMask="true"
                                :feedback="false"
                                fluid
                                :disabled="isPending"
                                required
                                autocomplete="new-password"
                                :class="passwordMismatch ? 'p-invalid' : ''"
                            />
                            <small v-if="passwordMismatch" class="text-red-500">
                                Les mots de passe ne correspondent pas.
                            </small>
                        </div>

                        <Button
                            type="submit"
                            label="Mettre à jour le mot de passe"
                            icon="pi pi-check"
                            class="w-full mt-1"
                            :loading="isPending"
                            :disabled="!canSubmit"
                        />

                        <div class="text-center">
                            <router-link
                                to="/auth/login"
                                class="text-sm text-primary cursor-pointer hover:underline"
                            >
                                Retour à la connexion
                            </router-link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
</template>
