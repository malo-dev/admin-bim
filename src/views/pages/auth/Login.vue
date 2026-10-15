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
    <div class="min-h-screen min-w-[100vw] flex bg-surface-0 dark:bg-surface-950">
        <!-- ── Panneau de marque (visible dès lg) ─────────────────────────── -->
        <div
            class="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 text-white relative overflow-hidden"
            style="background: linear-gradient(160deg, var(--primary-color) 0%, color-mix(in srgb, var(--primary-color) 70%, #000) 100%)"
        >
            <div class="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/10"></div>
            <div class="absolute -bottom-32 -left-16 w-96 h-96 rounded-full bg-white/5"></div>

            <div class="relative z-10 flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                    <i class="pi pi-shield text-xl" />
                </div>
                <span class="text-lg font-bold tracking-tight">BIM NEXT</span>
            </div>

            <div class="relative z-10 max-w-md">
                <h1 class="text-4xl font-bold leading-tight mb-4">Pilotez votre plateforme en toute confiance</h1>
                <p class="text-white/80 text-base leading-relaxed mb-8">
                    Comptes, commandes, transactions, support : tout votre écosystème BIM NEXT, centralisé dans un seul espace d'administration.
                </p>
                <div class="flex flex-col gap-4">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                            <i class="pi pi-bolt text-sm" />
                        </div>
                        <span class="text-sm text-white/90">Suivi en temps réel</span>
                    </div>
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                            <i class="pi pi-lock text-sm" />
                        </div>
                        <span class="text-sm text-white/90">Sécurité et rôles d'accès</span>
                    </div>
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                            <i class="pi pi-chart-line text-sm" />
                        </div>
                        <span class="text-sm text-white/90">Vue d'ensemble complète</span>
                    </div>
                </div>
            </div>

            <span class="relative z-10 text-xs text-white/60">© {{ new Date().getFullYear() }} BIM NEXT</span>
        </div>

        <!-- ── Formulaire ──────────────────────────────────────────────────── -->
        <div class="flex-1 flex items-center justify-center px-6 py-10">
            <div class="w-full max-w-sm">
                <div class="mb-8">
                    <div class="lg:hidden w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                        <i class="pi pi-shield text-primary text-xl" />
                    </div>
                    <div class="text-surface-900 dark:text-surface-0 text-2xl font-bold mb-1">Connexion</div>
                    <span class="text-muted-color">Accédez à votre espace administrateur</span>
                </div>

                <Message v-if="errorMessage" severity="error" class="mb-4" :closable="false">
                    {{ errorMessage }}
                </Message>

                <form @submit.prevent="handleLogin">
                    <div class="mb-5">
                        <label for="email" class="block text-surface-700 dark:text-surface-200 text-sm font-medium mb-2">
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
                        />
                    </div>

                    <div class="mb-5">
                        <label for="password" class="block text-surface-700 dark:text-surface-200 text-sm font-medium mb-2">
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
</template>
