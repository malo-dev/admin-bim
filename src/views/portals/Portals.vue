<script setup>
import { ref, computed } from 'vue';
import { useToast } from 'primevue/usetoast';

const toast = useToast();

const ADMIN_URL   = window.location.origin; // http://localhost:5173 or prod admin
const API_URL     = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const SERVER_ROOT = API_URL.replace('/api/v1', '');
const COMPANY_URL = SERVER_ROOT.includes('localhost')
    ? 'http://localhost:5173/company'
    : ADMIN_URL + '/company';

function copy(text) {
    navigator.clipboard.writeText(text).then(() => {
        toast.add({ severity: 'success', summary: 'Copié', detail: text, life: 2500 });
    });
}

const portals = computed(() => [
    {
        section: 'Admin BIM',
        icon: 'pi-shield',
        color: '#0035C5',
        items: [
            {
                label: 'Tableau de bord Admin',
                description: 'Interface d\'administration principale de la plateforme BIM',
                url: ADMIN_URL,
                icon: 'pi-home',
            },
            {
                label: 'Documentation API',
                description: 'Liste complète des endpoints de l\'API BIM',
                url: ADMIN_URL + '/#/api-docs',
                icon: 'pi-code',
            },
        ]
    },
    {
        section: 'Portail Entreprise',
        icon: 'pi-building',
        color: '#0035C5',
        items: [
            {
                label: 'Portail Entreprise (login)',
                description: 'Interface de connexion pour les admins d\'entreprise',
                url: COMPANY_URL + '/login',
                icon: 'pi-sign-in',
            },
            {
                label: 'Dashboard Entreprise',
                description: 'Tableau de bord pour les entreprises partenaires',
                url: COMPANY_URL,
                icon: 'pi-chart-bar',
            },
            {
                label: 'Commandes Entreprise',
                description: 'Gestion des commandes reçues par l\'entreprise',
                url: COMPANY_URL + '/orders',
                icon: 'pi-shopping-cart',
            },
        ]
    },
    {
        section: 'API & Serveur',
        icon: 'pi-server',
        color: '#1D4ED8',
        items: [
            {
                label: 'Base URL API',
                description: 'URL de base pour tous les appels API REST',
                url: API_URL,
                icon: 'pi-globe',
            },
            {
                label: 'Serveur racine',
                description: 'Racine du serveur (images, fichiers statiques)',
                url: SERVER_ROOT,
                icon: 'pi-database',
            },
            {
                label: 'Health Check',
                description: 'Vérifier que le serveur est en ligne',
                url: SERVER_ROOT + '/health',
                icon: 'pi-heart',
            },
        ]
    },
    {
        section: 'Application BIM Mobile',
        icon: 'pi-mobile',
        color: '#0035C5',
        items: [
            {
                label: 'Expo Dev Server',
                description: 'Serveur de développement de l\'app mobile BIM (Expo)',
                url: 'http://localhost:8081',
                icon: 'pi-mobile',
            },
            {
                label: 'Expo Go — QR Code',
                description: 'Scanner pour ouvrir l\'app dans Expo Go (dev)',
                url: 'exp://localhost:8081',
                icon: 'pi-qrcode',
            },
        ]
    },
]);
</script>

<template>
    <div class="flex flex-col gap-6">
        <!-- Header -->
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <i class="pi pi-link text-primary text-lg" />
            </div>
            <div>
                <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Portails & Liens</h1>
                <p class="text-sm text-muted-color">Accès rapide à tous les portails et URL de la plateforme BIM</p>
            </div>
        </div>

        <!-- Info banner -->
        <div class="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20 text-sm text-surface-700 dark:text-surface-300">
            <i class="pi pi-info-circle text-primary mt-0.5 shrink-0" />
            <span>Ces liens sont générés automatiquement à partir des variables d'environnement. En production, remplacez les <code class="bg-surface-200 dark:bg-surface-700 px-1 rounded text-xs">localhost</code> par vos domaines réels.</span>
        </div>

        <!-- Sections -->
        <div v-for="section in portals" :key="section.section" class="flex flex-col gap-3">
            <!-- Section header -->
            <div class="flex items-center gap-2">
                <i :class="['pi', section.icon, 'text-lg']" :style="{ color: section.color }" />
                <h2 class="text-base font-bold text-surface-900 dark:text-surface-0">{{ section.section }}</h2>
            </div>

            <!-- Links grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                <div
                    v-for="item in section.items"
                    :key="item.url"
                    class="card flex flex-col gap-3 hover:shadow-md transition-shadow"
                >
                    <div class="flex items-start gap-3">
                        <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" :style="{ backgroundColor: section.color + '15' }">
                            <i :class="['pi', item.icon, 'text-sm']" :style="{ color: section.color }" />
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="font-semibold text-surface-900 dark:text-surface-0 text-sm">{{ item.label }}</p>
                            <p class="text-xs text-muted-color mt-0.5">{{ item.description }}</p>
                        </div>
                    </div>

                    <!-- URL display -->
                    <div class="flex items-center gap-2 bg-surface-50 dark:bg-surface-800 rounded-lg px-3 py-2 border border-surface-200 dark:border-surface-700">
                        <code class="text-xs text-surface-700 dark:text-surface-300 flex-1 truncate font-mono">{{ item.url }}</code>
                        <div class="flex gap-1 shrink-0">
                            <Button
                                icon="pi pi-copy"
                                severity="secondary"
                                text
                                rounded
                                size="small"
                                v-tooltip.top="'Copier'"
                                @click="copy(item.url)"
                            />
                            <a :href="item.url" target="_blank" rel="noopener noreferrer">
                                <Button
                                    icon="pi pi-external-link"
                                    severity="primary"
                                    text
                                    rounded
                                    size="small"
                                    v-tooltip.top="'Ouvrir'"
                                />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
