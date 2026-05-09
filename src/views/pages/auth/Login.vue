<script setup>
import { ref, computed } from 'vue';
import { useLoginMutation } from '@/modules/auth/mutations/auth.mutations';

const email = ref('');
const password = ref('');

const { mutate: login, isPending, isError, error } = useLoginMutation();

const errorMessage = computed(() => {
    if (!isError.value) return null;
    return error.value?.message || error.value?.response?.data?.message || 'Une erreur est survenue. Veuillez réessayer.';
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
                        <div class="text-surface-900 dark:text-surface-0 text-3xl font-bold mb-2">BIM Admin</div>
                        <span class="text-muted-color font-medium">Connectez-vous à votre espace administrateur</span>
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

                        <div class="text-center mt-5">
                            <router-link
                                to="/auth/reset"
                                class="text-sm text-primary cursor-pointer hover:underline"
                            >
                                Mot de passe oublié ?
                            </router-link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
</template>
