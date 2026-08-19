<script setup>
import { ref, computed, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useAppVersionsQuery } from '@/modules/app-version/queries/appVersion.queries';
import { useUpsertAppVersionMutation } from '@/modules/app-version/mutations/appVersion.mutations';

const toast = useToast();
const { data } = useAppVersionsQuery();
const versions = computed(() => data.value?.data ?? []);

const { mutate: upsertVersion, isPending } = useUpsertAppVersionMutation();

function emptyForm(platform) {
    return { platform, latestVersion: '', minSupportedVersion: '', storeUrl: '', releaseNotes: '', forceUpdate: false };
}

const android = ref(emptyForm('android'));
const ios = ref(emptyForm('ios'));

watch(versions, (list) => {
    const a = list.find((v) => v.platform === 'android');
    const i = list.find((v) => v.platform === 'ios');
    if (a) android.value = { ...a };
    if (i) ios.value = { ...i };
}, { immediate: true });

function save(form) {
    if (!form.latestVersion) {
        toast.add({ severity: 'warn', summary: 'Version requise', detail: "Indique le numéro de la dernière version publiée", life: 3000 });
        return;
    }
    upsertVersion(form, {
        onSuccess: () =>
            toast.add({ severity: 'success', summary: 'Enregistré', detail: `L'app sera notifiée : nouvelle version ${form.platform}`, life: 3000 }),
        onError: (err) =>
            toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
    });
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <i class="pi pi-mobile text-primary text-lg" />
            </div>
            <div>
                <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Version de l'app</h1>
                <p class="text-sm text-muted-color">
                    À chaque publication sur le PlayStore / App Store, mets à jour le numéro ici : l'app détecte
                    l'écart de version et invite l'utilisateur à mettre à jour.
                </p>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <!-- Android -->
            <div class="card flex flex-col gap-4">
                <div class="flex items-center gap-2">
                    <i class="pi pi-android text-lg text-green-500" />
                    <h2 class="font-bold text-surface-900 dark:text-surface-0">Android (PlayStore)</h2>
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Dernière version publiée <span class="text-red-400">*</span></label>
                    <InputText v-model="android.latestVersion" placeholder="Ex: 1.0.3" />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Version minimale supportée</label>
                    <InputText v-model="android.minSupportedVersion" placeholder="Ex: 1.0.0" />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Lien PlayStore</label>
                    <InputText v-model="android.storeUrl" placeholder="https://play.google.com/store/apps/details?id=com.bimnext.app" />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Notes de version</label>
                    <Textarea v-model="android.releaseNotes" rows="2" autoResize placeholder="Ex: Correctifs recharge Android, suivi des commandes" />
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-sm">Mise à jour obligatoire</span>
                    <ToggleSwitch v-model="android.forceUpdate" />
                </div>
                <Button label="Enregistrer Android" icon="pi pi-check" :loading="isPending" @click="save(android)" />
            </div>

            <!-- iOS -->
            <div class="card flex flex-col gap-4">
                <div class="flex items-center gap-2">
                    <i class="pi pi-apple text-lg" />
                    <h2 class="font-bold text-surface-900 dark:text-surface-0">iOS (App Store)</h2>
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Dernière version publiée <span class="text-red-400">*</span></label>
                    <InputText v-model="ios.latestVersion" placeholder="Ex: 1.0.3" />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Version minimale supportée</label>
                    <InputText v-model="ios.minSupportedVersion" placeholder="Ex: 1.0.0" />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Lien App Store</label>
                    <InputText v-model="ios.storeUrl" placeholder="https://apps.apple.com/app/id..." />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-medium text-sm">Notes de version</label>
                    <Textarea v-model="ios.releaseNotes" rows="2" autoResize />
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-sm">Mise à jour obligatoire</span>
                    <ToggleSwitch v-model="ios.forceUpdate" />
                </div>
                <Button label="Enregistrer iOS" icon="pi pi-check" :loading="isPending" @click="save(ios)" />
            </div>
        </div>
    </div>
</template>
