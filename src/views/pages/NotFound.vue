<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

function goBack() {
    if (window.history.length > 1) router.back();
    else router.push('/');
}
</script>

<template>
    <div class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-screen">
        <div class="flex flex-col items-center justify-center text-center px-6">
            <div style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, var(--primary-color) 10%, rgba(33, 150, 243, 0) 30%)">
                <div class="bg-surface-0 dark:bg-surface-900 py-16 px-12 sm:px-24 flex flex-col items-center" style="border-radius: 53px">
                    <div class="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                        <i class="pi pi-exclamation-triangle text-primary text-4xl" />
                    </div>
                    <span class="text-8xl font-black text-primary mb-2">404</span>
                    <h1 class="text-surface-900 dark:text-surface-0 font-bold text-2xl lg:text-3xl mb-3">
                        Page introuvable
                    </h1>
                    <p class="text-muted-color mb-8 max-w-sm">
                        La page que vous recherchez n'existe pas ou a été déplacée.
                    </p>

                    <div class="flex gap-3">
                        <Button label="Retour" icon="pi pi-arrow-left" severity="secondary" outlined @click="goBack" />
                        <Button label="Accueil" icon="pi pi-home" as="router-link" to="/" />
                    </div>
                </div>
            </div>
            <p class="text-xs text-muted-color mt-6">BIM NEXT — Administration</p>
        </div>
    </div>
</template>
