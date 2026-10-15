import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

import { createPinia } from 'pinia';
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query';

import Aura from '@primeuix/themes/aura';
import { definePreset } from '@primeuix/themes';
import PrimeVue from 'primevue/config';
import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';

// Couleur primaire alignée sur le bleu de marque déjà utilisé dans l'app
// mobile (bim/app/(tabs)/index.tsx et consorts) : #0035C5 — au lieu du bleu
// par défaut du thème Aura.
const BimPreset = definePreset(Aura, {
    semantic: {
        primary: {
            50: '#eef2fc',
            100: '#d9e3f8',
            200: '#b3c7f1',
            300: '#8daae9',
            400: '#678ee2',
            500: '#0035c5',
            600: '#002ea8',
            700: '#00278c',
            800: '#001f6f',
            900: '#001852',
            950: '#000f36',
        },
    },
});

import '@/assets/styles.scss';
import '@/assets/tailwind.css';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            staleTime: 1000 * 60 * 5,
        },
    },
});

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(VueQueryPlugin, { queryClient });
app.use(PrimeVue, {
    theme: {
        preset: BimPreset,
        options: {
            darkModeSelector: '.app-dark',
        },
    },
});
app.use(ToastService);
app.use(ConfirmationService);

app.mount('#app');
