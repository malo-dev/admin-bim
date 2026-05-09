<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import {
    useRequestBimResetMutation,
    useResetBimPasswordMutation,
} from '@/modules/accounts/mutations/account.mutations';

const router = useRouter();

// étape : 1 = email, 2 = otp + nouveau mdp
const step = ref(1);
const email = ref('');
const otp = ref('');
const newPassword = ref('');
const confirm = ref('');

// ── Étape 1 ──────────────────────────────────────────────────
const {
    mutate: requestReset,
    isPending: step1Pending,
    isError: step1Error,
    error: step1ErrorData,
} = useRequestBimResetMutation();

const step1ErrorMsg = computed(
    () => step1ErrorData.value?.response?.data?.message || 'Une erreur est survenue.'
);

function submitEmail() {
    if (!email.value) return;
    requestReset({ email: email.value }, { onSuccess: () => (step.value = 2) });
}

// ── Étape 2 ──────────────────────────────────────────────────
const {
    mutate: resetPassword,
    isPending: step2Pending,
    isError: step2Error,
    error: step2ErrorData,
    isSuccess,
} = useResetBimPasswordMutation();

const step2ErrorMsg = computed(
    () => step2ErrorData.value?.response?.data?.message || 'Une erreur est survenue.'
);

const passwordMismatch = computed(
    () => confirm.value.length > 0 && confirm.value !== newPassword.value
);

const canSubmit = computed(
    () =>
        otp.value.length === 6 &&
        newPassword.value.length >= 6 &&
        newPassword.value === confirm.value &&
        !step2Pending.value
);

function submitReset() {
    if (!canSubmit.value) return;
    resetPassword(
        { email: email.value, otp: otp.value, newPassword: newPassword.value },
        { onSuccess: () => setTimeout(() => router.push('/auth/login'), 2500) }
    );
}
</script>

<template>
    <div class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-screen overflow-hidden">
        <div class="flex flex-col items-center justify-center w-full max-w-md px-4">
            <div
                style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, var(--primary-color) 10%, rgba(33,150,243,0) 30%)"
                class="w-full"
            >
                <div class="w-full bg-surface-0 dark:bg-surface-900 py-14 px-8 sm:px-12" style="border-radius: 53px">

                    <!-- En-tête -->
                    <div class="text-center mb-8">
                        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-100 dark:bg-orange-900/30 mb-4">
                            <i class="pi pi-lock text-3xl text-orange-500" />
                        </div>
                        <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">
                            Réinitialisation du mot de passe
                        </h1>
                        <p class="text-muted-color text-sm mt-2">Administrateurs BIM uniquement</p>
                    </div>

                    <!-- Indicateur d'étapes -->
                    <div class="flex items-center justify-center gap-3 mb-8">
                        <div class="flex items-center gap-2">
                            <div
                                class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors"
                                :class="step >= 1 ? 'bg-primary text-white' : 'bg-surface-200 text-surface-500'"
                            >1</div>
                            <span class="text-sm" :class="step === 1 ? 'text-primary font-medium' : 'text-muted-color'">
                                Email
                            </span>
                        </div>
                        <div class="h-px w-8 bg-surface-200" />
                        <div class="flex items-center gap-2">
                            <div
                                class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors"
                                :class="step >= 2 ? 'bg-primary text-white' : 'bg-surface-200 text-surface-500'"
                            >2</div>
                            <span class="text-sm" :class="step === 2 ? 'text-primary font-medium' : 'text-muted-color'">
                                OTP + nouveau mot de passe
                            </span>
                        </div>
                    </div>

                    <!-- ── ÉTAPE 1 : Email ── -->
                    <form v-if="step === 1" @submit.prevent="submitEmail" class="flex flex-col gap-5">
                        <Message v-if="step1Error" severity="error" :closable="false">
                            {{ step1ErrorMsg }}
                        </Message>

                        <div class="flex flex-col gap-2">
                            <label class="font-medium text-surface-900 dark:text-surface-0">
                                Email administrateur BIM
                            </label>
                            <InputText
                                v-model="email"
                                type="email"
                                placeholder="votre@email.com"
                                :disabled="step1Pending"
                                required
                                autocomplete="email"
                            />
                            <small class="text-muted-color">
                                Un code OTP valable 15 minutes sera envoyé à cette adresse.
                            </small>
                        </div>

                        <Button
                            type="submit"
                            label="Envoyer le code OTP"
                            icon="pi pi-send"
                            class="w-full"
                            :loading="step1Pending"
                            :disabled="!email || step1Pending"
                        />
                    </form>

                    <!-- ── ÉTAPE 2 : OTP + nouveau mot de passe ── -->
                    <form v-else-if="step === 2 && !isSuccess" @submit.prevent="submitReset" class="flex flex-col gap-5">
                        <Message severity="info" :closable="false">
                            Code envoyé à <strong>{{ email }}</strong>. Vérifiez votre boîte mail.
                        </Message>

                        <Message v-if="step2Error" severity="error" :closable="false">
                            {{ step2ErrorMsg }}
                        </Message>

                        <div class="flex flex-col gap-2">
                            <label class="font-medium text-surface-900 dark:text-surface-0">
                                Code OTP (6 chiffres)
                            </label>
                            <InputOtp
                                v-model="otp"
                                :length="6"
                                integerOnly
                                :disabled="step2Pending"
                            />
                        </div>

                        <div class="flex flex-col gap-2">
                            <label class="font-medium text-surface-900 dark:text-surface-0">
                                Nouveau mot de passe
                            </label>
                            <Password
                                v-model="newPassword"
                                placeholder="Minimum 6 caractères"
                                :toggleMask="true"
                                fluid
                                :disabled="step2Pending"
                                required
                                autocomplete="new-password"
                            />
                        </div>

                        <div class="flex flex-col gap-2">
                            <label class="font-medium text-surface-900 dark:text-surface-0">
                                Confirmer le mot de passe
                            </label>
                            <Password
                                v-model="confirm"
                                placeholder="Répétez le mot de passe"
                                :toggleMask="true"
                                :feedback="false"
                                fluid
                                :disabled="step2Pending"
                                required
                                autocomplete="new-password"
                                :invalid="passwordMismatch"
                            />
                            <small v-if="passwordMismatch" class="text-red-500">
                                Les mots de passe ne correspondent pas.
                            </small>
                        </div>

                        <div class="flex gap-3">
                            <Button
                                label="Retour"
                                icon="pi pi-arrow-left"
                                severity="secondary"
                                outlined
                                :disabled="step2Pending"
                                @click="step = 1"
                            />
                            <Button
                                type="submit"
                                label="Réinitialiser"
                                icon="pi pi-check"
                                class="flex-1"
                                :loading="step2Pending"
                                :disabled="!canSubmit"
                            />
                        </div>
                    </form>

                    <!-- ── SUCCÈS ── -->
                    <div v-else-if="isSuccess" class="flex flex-col items-center gap-4 py-4">
                        <div class="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <i class="pi pi-check text-3xl text-green-500" />
                        </div>
                        <p class="text-center font-medium text-surface-900 dark:text-surface-0">
                            Mot de passe mis à jour avec succès !
                        </p>
                        <p class="text-sm text-muted-color">Redirection vers la connexion…</p>
                    </div>

                    <!-- Lien retour login -->
                    <div class="text-center mt-6" v-if="!isSuccess">
                        <router-link to="/auth/login" class="text-sm text-primary hover:underline">
                            Retour à la connexion
                        </router-link>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
