<script setup>
import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useAccessCodesQuery } from '@/modules/access-codes/queries/accessCodes.queries';
import { useUpdateAccessCodeMutation } from '@/modules/access-codes/mutations/accessCodes.mutations';

const toast = useToast();

const ROLE_META = {
    BIM:       { label: 'Espace Gestion',  icon: 'pi-shield',   color: 'text-red-500' },
    LIVREUR:   { label: 'Espace Livreur',  icon: 'pi-truck',    color: 'text-primary' },
    CHAUFFEUR: { label: 'Espace Chauffeur', icon: 'pi-car',      color: 'text-amber-500' },
};

const { data, isLoading } = useAccessCodesQuery();
const { mutate: updateCode, isPending } = useUpdateAccessCodeMutation();

const editingRole = ref(null);
const editValue    = ref('');
const savingRole   = ref(null);

function startEdit(row) {
    editingRole.value = row.role;
    editValue.value = row.code;
}

function cancelEdit() {
    editingRole.value = null;
    editValue.value = '';
}

function saveEdit(row) {
    if (!editValue.value.trim()) return;
    savingRole.value = row.role;
    updateCode(
        { role: row.role, code: editValue.value.trim() },
        {
            onSuccess: () => {
                toast.add({ severity: 'success', summary: 'Code mis à jour', detail: `${ROLE_META[row.role]?.label ?? row.role} : nouveau code enregistré`, life: 3000 });
                editingRole.value = null;
                savingRole.value = null;
            },
            onError: (err) => {
                toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 });
                savingRole.value = null;
            },
        }
    );
}
</script>

<template>
    <div class="card">
        <div class="flex items-center gap-3 mb-5">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <i class="pi pi-key text-primary text-lg" />
            </div>
            <div>
                <h2 class="text-lg font-bold text-surface-900 dark:text-surface-0">Codes d'accès staff</h2>
                <p class="text-sm text-muted-color">
                    Codes qui révèlent les espaces Livreur / Chauffeur / Gestion dans Réglages sur l'app mobile.
                    Changez-les ici — aucune mise à jour de l'app n'est nécessaire.
                </p>
            </div>
        </div>

        <div v-if="isLoading" class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Skeleton v-for="n in 3" :key="n" height="7rem" borderRadius="1rem" />
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div
                v-for="row in (data?.data ?? [])"
                :key="row.role"
                class="card mb-0! p-4! flex flex-col gap-3"
            >
                <div class="flex items-center gap-2">
                    <i class="pi text-lg" :class="[ROLE_META[row.role]?.icon, ROLE_META[row.role]?.color]" />
                    <span class="font-semibold text-surface-900 dark:text-surface-0">
                        {{ ROLE_META[row.role]?.label ?? row.role }}
                    </span>
                </div>

                <template v-if="editingRole === row.role">
                    <InputText v-model="editValue" class="w-full font-mono" :disabled="isPending && savingRole === row.role" />
                    <div class="flex gap-2 justify-end">
                        <Button label="Annuler" severity="secondary" outlined size="small" @click="cancelEdit" />
                        <Button
                            label="Enregistrer"
                            icon="pi pi-check"
                            size="small"
                            :loading="isPending && savingRole === row.role"
                            :disabled="!editValue.trim()"
                            @click="saveEdit(row)"
                        />
                    </div>
                </template>
                <template v-else>
                    <code class="text-xl font-bold font-mono tracking-widest text-center py-2 rounded-lg bg-surface-50 dark:bg-surface-800">
                        {{ row.code }}
                    </code>
                    <Button label="Modifier" icon="pi pi-pencil" severity="secondary" outlined size="small" @click="startEdit(row)" />
                </template>
            </div>
        </div>
    </div>
</template>
