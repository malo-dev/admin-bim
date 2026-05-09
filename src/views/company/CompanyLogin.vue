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
    <div class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-[100vw] overflow-hidden">
        <div class="flex flex-col items-center justify-center">
            <div style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, var(--primary-color) 10%, rgba(33, 150, 243, 0) 30%)">
                <div class="w-full bg-surface-0 dark:bg-surface-900 py-20 px-8 sm:px-20" style="border-radius: 53px">
                    <div class="text-center mb-8">
                        <div class="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                            <i class="pi pi-building text-primary text-2xl" />
                        </div>
                        <div class="text-surface-900 dark:text-surface-0 text-3xl font-bold mb-2">Portail entreprise</div>
                        <span class="text-muted-color font-medium">Connectez-vous à votre espace entreprise</span>
                    </div>

                    <Message v-if="errorMessage" severity="error" class="mb-4" :closable="false">
                        {{ errorMessage }}
                    </Message>

                    <form @submit.prevent="handleLogin">
                        <div class="mb-6">
                            <label for="email" class="block text-surface-900 dark:text-surface-0 text-xl font-medium mb-2">
                                Email
                            </label>
                            <InputText
                                id="email"
                                v-model="email"
                                type="email"
                                placeholder="votre@email.com"
                                class="w-full md:w-[30rem]"
                                :disabled="isPending"
                                autocomplete="email"
                            />
                        </div>

                        <div class="mb-6">
                            <label for="password" class="block text-surface-900 dark:text-surface-0 font-medium text-xl mb-2">
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
                            />
                        </div>

                        <Button
                            type="submit"
                            label="Se connecter"
                            class="w-full"
                            :loading="isPending"
                            :disabled="!email || !password || isPending"
                        />
                    </form>

                    <div class="text-center mt-6 text-sm text-muted-color">
                        Espace réservé aux administrateurs d'entreprise BIM NEXT
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
