<script setup>
import { ref, computed } from 'vue';
import { useCompanyLoginMutation } from '@/modules/auth/mutations/auth.mutations';

const email = ref('');
const password = ref('');

const { mutate: login, isPending, isError, error } = useCompanyLoginMutation();

const errorMessage = computed(() => {
    if (!isError.value) return null;
    return error.value?.message || error.value?.response?.data?.message || 'Une erreur est survenue.';
});

function handleLogin() {
    if (!email.value || !password.value) return;
    login({ email: email.value, password: password.value });
}
</script>

<template>
    <div class="bg-surface-50 dark:bg-surface-950 min-h-screen min-w-screen flex items-center justify-center px-4 py-8">
        <div class="w-full max-w-md">
            <div style="border-radius: 40px; padding: 0.3rem; background: linear-gradient(180deg, var(--primary-color) 10%, rgba(33, 150, 243, 0) 30%)">
                <div class="w-full bg-surface-0 dark:bg-surface-900 py-10 px-6 sm:py-14 sm:px-10" style="border-radius: 38px">

                    <!-- Logo & titre -->
                    <div class="text-center mb-7">
                        <div class="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                            <i class="pi pi-building text-primary text-2xl" />
                        </div>
                        <h1 class="text-surface-900 dark:text-surface-0 text-2xl sm:text-3xl font-bold mb-1">
                            Portail entreprise
                        </h1>
                        <p class="text-muted-color text-sm sm:text-base">
                            Connectez-vous à votre espace
                        </p>
                    </div>

                    <Message v-if="errorMessage" severity="error" class="mb-5" :closable="false">
                        {{ errorMessage }}
                    </Message>

                    <form @submit.prevent="handleLogin" class="flex flex-col gap-5">
                        <div class="flex flex-col gap-2">
                            <label for="email" class="text-surface-900 dark:text-surface-0 font-medium">
                                Email
                            </label>
                            <InputText
                                id="email"
                                v-model="email"
                                type="email"
                                placeholder="votre@email.com"
                                class="w-full"
                                :disabled="isPending"
                                autocomplete="email"
                                size="large"
                            />
                        </div>

                        <div class="flex flex-col gap-2">
                            <label for="password" class="text-surface-900 dark:text-surface-0 font-medium">
                                Mot de passe
                            </label>
                            <Password
                                id="password"
                                v-model="password"
                                placeholder="Mot de passe"
                                :toggleMask="true"
                                fluid
                                :feedback="false"
                                :disabled="isPending"
                                autocomplete="current-password"
                                size="large"
                            />
                        </div>

                        <Button
                            type="submit"
                            label="Se connecter"
                            class="w-full mt-1"
                            size="large"
                            :loading="isPending"
                            :disabled="!email || !password || isPending"
                        />
                    </form>

                    <p class="text-center mt-6 text-xs text-muted-color leading-relaxed">
                        Espace réservé aux administrateurs<br>d'entreprise BIM NEXT
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>
