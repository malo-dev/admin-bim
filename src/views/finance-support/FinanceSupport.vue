<script setup>
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import Transactions from '@/views/transactions/Transactions.vue';
import Recharges from '@/views/recharges/Recharges.vue';
import Wallets from '@/views/wallets/Wallets.vue';
import FinanceStats from '@/views/finance-stats/FinanceStats.vue';
import History from '@/views/history/History.vue';
import Support from '@/views/support/Support.vue';
import Notifications from '@/views/notifications/Notifications.vue';
import Notes from '@/views/notes/Notes.vue';
import BimSOS from '@/views/sos/BimSOS.vue';
import Feedbacks from '@/views/feedbacks/Feedbacks.vue';
import Otps from '@/views/otps/Otps.vue';
import ApiDocs from '@/views/api-docs/ApiDocs.vue';
import Portals from '@/views/portals/Portals.vue';
import Currencies from '@/views/currencies/Currencies.vue';
import Categories from '@/views/categories/Categories.vue';

const route = useRoute();
const router = useRouter();

const TABS = [
    { label: 'Transactions', icon: 'pi pi-arrows-h' },
    { label: 'Recharges', icon: 'pi pi-plus-circle' },
    { label: 'Portefeuilles', icon: 'pi pi-wallet' },
    { label: 'Statistiques financières', icon: 'pi pi-chart-bar' },
    { label: 'Historique', icon: 'pi pi-history' },
    { label: 'Support', icon: 'pi pi-headphones' },
    { label: 'Notifications', icon: 'pi pi-bell' },
    { label: 'Notes entreprises', icon: 'pi pi-file-edit' },
    { label: 'BIM SOS', icon: 'pi pi-exclamation-triangle' },
    { label: 'Feedbacks', icon: 'pi pi-comments' },
    { label: 'OTP envoyés', icon: 'pi pi-shield' },
    { label: 'Développeur', icon: 'pi pi-code' },
];

const activeTab = ref(Number(route.query.tab) || 0);
watch(activeTab, (v) => router.replace({ query: { ...route.query, tab: v } }));
</script>

<template>
    <div class="flex flex-col gap-4">
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <i class="pi pi-dollar text-primary text-lg" />
            </div>
            <div>
                <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Finance &amp; Support</h1>
                <p class="text-sm text-muted-color">Transactions, portefeuilles, support et suivi</p>
            </div>
        </div>

        <!-- `lazy` : chaque onglet ne monte ses composants (et leurs requêtes)
             que lorsqu'il est sélectionné, sinon les 11 sections se
             chargeraient toutes en même temps dès l'arrivée sur la page. -->
        <Tabs v-model:value="activeTab" lazy>
            <TabList>
                <Tab v-for="(t, i) in TABS" :key="t.label" :value="i">
                    <i :class="t.icon" class="mr-2" />{{ t.label }}
                </Tab>
            </TabList>

            <TabPanel :value="0">
                <div class="mt-4"><Transactions /></div>
            </TabPanel>
            <TabPanel :value="1">
                <div class="mt-4"><Recharges /></div>
            </TabPanel>
            <TabPanel :value="2">
                <div class="mt-4"><Wallets /></div>
            </TabPanel>
            <TabPanel :value="3">
                <div class="mt-4"><FinanceStats /></div>
            </TabPanel>
            <TabPanel :value="4">
                <div class="mt-4"><History /></div>
            </TabPanel>
            <TabPanel :value="5">
                <div class="mt-4"><Support /></div>
            </TabPanel>
            <TabPanel :value="6">
                <div class="mt-4"><Notifications /></div>
            </TabPanel>
            <TabPanel :value="7">
                <div class="mt-4"><Notes /></div>
            </TabPanel>
            <TabPanel :value="8">
                <div class="mt-4"><BimSOS /></div>
            </TabPanel>
            <TabPanel :value="9">
                <div class="mt-4"><Feedbacks /></div>
            </TabPanel>
            <TabPanel :value="10">
                <div class="mt-4"><Otps /></div>
            </TabPanel>
            <TabPanel :value="11">
                <div class="flex flex-col gap-6 mt-4">
                    <ApiDocs />
                    <Portals />
                    <Currencies />
                    <Categories />
                </div>
            </TabPanel>
        </Tabs>
    </div>
</template>
