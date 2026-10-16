<script setup>
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import AccountsList from '@/views/accounts/AccountsList.vue';
import Users from '@/views/users/Users.vue';
import Roles from '@/views/roles/Roles.vue';
import UserRoles from '@/views/user-roles/UserRoles.vue';
import AccessCodes from '@/views/access-codes/AccessCodes.vue';
import Companies from '@/views/companies/Companies.vue';
import Commerces from '@/views/commerces/Commerces.vue';
import Branches from '@/views/branches/Branches.vue';
import BusinessCategories from '@/views/business-categories/BusinessCategories.vue';
import Products from '@/views/products/Products.vue';
import RandomProducts from '@/views/products/RandomProducts.vue';
import ProductCategories from '@/views/product-categories/ProductCategories.vue';
import ProductsSold from '@/views/products-sold/ProductsSold.vue';
import Banners from '@/views/banners/Banners.vue';
import AppVersionSettings from '@/views/app-version/AppVersionSettings.vue';
import Chauffeurs from '@/views/chauffeurs/Chauffeurs.vue';
import Tarifs from '@/views/tarifs/Tarifs.vue';
import Orders from '@/views/orders/Orders.vue';
import Consumption from '@/views/consumption/Consumption.vue';
import Livreurs from '@/views/livreurs/Livreurs.vue';
import Bonus from '@/views/bonus/Bonus.vue';
import Agents from '@/views/agents/Agents.vue';
import Tutorials from '@/views/tutorials/Tutorials.vue';

const route = useRoute();
const router = useRouter();

const TABS = [
    { label: 'Comptes', icon: 'pi pi-user-plus' },
    { label: 'Utilisateurs & Accès', icon: 'pi pi-users' },
    { label: 'Entreprises & Commerce', icon: 'pi pi-building' },
    { label: 'Catalogue Produits', icon: 'pi pi-box' },
    { label: 'Accueil app mobile', icon: 'pi pi-mobile' },
    { label: 'BIM Transport', icon: 'pi pi-car' },
    { label: 'Commandes & Livraisons', icon: 'pi pi-shopping-cart' },
    { label: 'Agents BIM', icon: 'pi pi-id-card' },
    { label: 'Formation', icon: 'pi pi-play-circle' },
];

const activeTab = ref(Number(route.query.tab) || 0);
watch(activeTab, (v) => router.replace({ query: { ...route.query, tab: v } }));
</script>

<template>
    <div class="flex flex-col gap-4">
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <i class="pi pi-cog text-primary text-lg" />
            </div>
            <div>
                <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Gestion</h1>
                <p class="text-sm text-muted-color">Comptes, utilisateurs, entreprises, produits, commandes…</p>
            </div>
        </div>

        <!-- `lazy` : chaque onglet ne monte ses composants (et leurs requêtes)
             que lorsqu'il est sélectionné, sinon les 9 sections se
             chargeraient toutes en même temps dès l'arrivée sur la page. -->
        <Tabs v-model:value="activeTab" lazy>
            <TabList>
                <Tab v-for="(t, i) in TABS" :key="t.label" :value="i">
                    <i :class="t.icon" class="mr-2" />{{ t.label }}
                </Tab>
            </TabList>

            <TabPanel :value="0">
                <div class="flex flex-col gap-6 mt-4">
                    <AccountsList />
                </div>
            </TabPanel>

            <TabPanel :value="1">
                <div class="flex flex-col gap-6 mt-4">
                    <Users />
                    <AccessCodes />
                    <Roles />
                    <UserRoles />
                </div>
            </TabPanel>

            <TabPanel :value="2">
                <div class="flex flex-col gap-6 mt-4">
                    <Companies />
                    <Commerces />
                    <Branches />
                    <BusinessCategories />
                </div>
            </TabPanel>

            <TabPanel :value="3">
                <div class="flex flex-col gap-6 mt-4">
                    <Products />
                    <RandomProducts />
                    <ProductCategories />
                    <ProductsSold />
                </div>
            </TabPanel>

            <TabPanel :value="4">
                <div class="flex flex-col gap-6 mt-4">
                    <Banners />
                    <AppVersionSettings />
                </div>
            </TabPanel>

            <TabPanel :value="5">
                <div class="flex flex-col gap-6 mt-4">
                    <Chauffeurs />
                    <Tarifs />
                </div>
            </TabPanel>

            <TabPanel :value="6">
                <div class="flex flex-col gap-6 mt-4">
                    <Orders />
                    <Consumption />
                    <Livreurs />
                    <Bonus />
                </div>
            </TabPanel>

            <TabPanel :value="7">
                <div class="mt-4">
                    <Agents />
                </div>
            </TabPanel>

            <TabPanel :value="8">
                <div class="mt-4">
                    <Tutorials />
                </div>
            </TabPanel>
        </Tabs>
    </div>
</template>
