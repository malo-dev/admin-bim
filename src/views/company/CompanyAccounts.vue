<script setup>
import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { useAuthStore } from '@/modules/auth/store/auth.store';
import { useMyCompanyAdminsQuery } from '@/modules/company-portal/queries/company-portal.queries';
import { useUpdateCompanyAdminMutation, useDeleteCompanyAdminMutation } from '@/modules/company-portal/mutations/company-portal.mutations';

const toast = useToast();
const confirm = useConfirm();
const authStore = useAuthStore();

const { data: admins, isLoading } = useMyCompanyAdminsQuery();
const { mutate: updateAdmin, isPending: updatePending } = useUpdateCompanyAdminMutation();
const { mutate: deleteAdmin, isPending: deletePending } = useDeleteCompanyAdminMutation();

// ── Dialog édition ──────────────────────────────────────────────────────────
const editDialog = ref(false);
const editForm = ref({ id: null, username: '', email: '', password: '' });
const showPassword = ref(false);

function openEdit(row) {
    editForm.value = { id: row.id, username: row.username, email: row.email, password: '' };
    showPassword.value = false;
    editDialog.value = true;
}

function submitEdit() {
    const payload = { id: editForm.value.id, username: editForm.value.username, email: editForm.value.email };
    if (editForm.value.password) payload.password = editForm.value.password;
    updateAdmin(payload, {
        onSuccess: () => {
            toast.add({ severity: 'success', summary: 'Mis à jour', detail: 'Compte modifié avec succès', life: 3000 });
            editDialog.value = false;
        },
        onError: (err) => toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
    });
}

// ── Suppression ─────────────────────────────────────────────────────────────
function confirmDelete(row) {
    if (row.id === authStore.user?.userId) {
        toast.add({ severity: 'warn', summary: 'Impossible', detail: 'Vous ne pouvez pas supprimer votre propre compte', life: 4000 });
        return;
    }
    confirm.require({
        message: `Supprimer le compte de ${row.username} ?`,
        header: 'Confirmation',
        icon: 'pi pi-exclamation-triangle',
        rejectProps: { label: 'Annuler', severity: 'secondary', outlined: true },
        acceptProps: { label: 'Supprimer', severity: 'danger' },
        accept: () =>
            deleteAdmin(row.id, {
                onSuccess: () => toast.add({ severity: 'success', summary: 'Supprimé', detail: 'Compte supprimé', life: 3000 }),
                onError: (err) => toast.add({ severity: 'error', summary: 'Erreur', detail: err?.response?.data?.message ?? 'Erreur serveur', life: 4000 }),
            }),
    });
}

function formatDate(d) {
    return d ? new Date(d).toLocaleDateString('fr-FR') : '—';
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <ConfirmDialog />

        <!-- Header -->
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <i class="pi pi-users text-primary text-lg" />
            </div>
            <div>
                <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Comptes administrateurs</h1>
                <p class="text-sm text-muted-color">Gérez les administrateurs de votre entreprise</p>
            </div>
        </div>

        <div class="card">
            <DataTable :value="admins ?? []" :loading="isLoading" stripedRows>
                <template #empty>
                    <div class="text-center py-12 text-muted-color">
                        <i class="pi pi-users text-4xl mb-3 block opacity-30" />
                        <p class="font-medium">Aucun administrateur trouvé</p>
                    </div>
                </template>

                <Column header="Administrateur" style="min-width:14rem">
                    <template #body="{ data: row }">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <i class="pi pi-user text-primary text-sm" />
                            </div>
                            <div>
                                <div class="font-semibold text-sm flex items-center gap-2">
                                    {{ row.username }}
                                    <Tag v-if="row.id === authStore.user?.userId" value="Vous" severity="info" class="text-xs" />
                                </div>
                                <div class="text-xs text-muted-color">{{ row.email }}</div>
                            </div>
                        </div>
                    </template>
                </Column>

                <Column header="Créé le" style="min-width:9rem">
                    <template #body="{ data: row }">
                        <span class="text-sm">{{ formatDate(row.createdAt) }}</span>
                    </template>
                </Column>

                <Column header="Statut" style="min-width:8rem">
                    <template #body="{ data: row }">
                        <Tag :value="row.isActive ? 'Actif' : 'Inactif'"
                            :severity="row.isActive ? 'success' : 'secondary'" />
                    </template>
                </Column>

                <Column header="Actions" style="min-width:9rem" alignHeader="right">
                    <template #body="{ data: row }">
                        <div class="flex gap-1 justify-end">
                            <Button v-tooltip.top="'Modifier'" icon="pi pi-pencil" severity="info" outlined rounded
                                size="small" @click="openEdit(row)" />
                            <Button v-tooltip.top="'Supprimer'" icon="pi pi-trash" severity="danger" outlined rounded
                                size="small" :loading="deletePending"
                                :disabled="row.id === authStore.user?.userId"
                                @click="confirmDelete(row)" />
                        </div>
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- Dialog édition -->
        <Dialog v-model:visible="editDialog" header="Modifier le compte" modal style="width:32rem" :draggable="false">
            <div class="flex flex-col gap-4 pt-1">
                <div class="flex flex-col gap-1">
                    <label class="text-sm font-medium">Nom d'utilisateur</label>
                    <InputText v-model="editForm.username" placeholder="username" class="w-full" />
                </div>
                <div class="flex flex-col gap-1">
                    <label class="text-sm font-medium">Email</label>
                    <InputText v-model="editForm.email" type="email" placeholder="email@exemple.com" class="w-full" />
                </div>
                <div class="flex flex-col gap-1">
                    <label class="text-sm font-medium">Nouveau mot de passe <span class="text-muted-color font-normal">(laisser vide pour ne pas changer)</span></label>
                    <Password v-model="editForm.password" placeholder="Nouveau mot de passe"
                        :toggleMask="true" fluid :feedback="false" />
                </div>
            </div>
            <template #footer>
                <Button label="Annuler" severity="secondary" outlined @click="editDialog = false" />
                <Button label="Enregistrer" icon="pi pi-check" :loading="updatePending"
                    :disabled="!editForm.username || !editForm.email" @click="submitEdit" />
            </template>
        </Dialog>
    </div>
</template>
