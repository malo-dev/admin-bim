<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import apiClient from '@/api/client'
import { useToast } from '@/composables/useToast'
import SectionTabs from '@/components/SectionTabs.vue'

const toast = useToast()

const MODULE_META = {
  BIM: { label: 'Espace Gestion', desc: "Révèle l'espace Gestion dans Réglages de l'app mobile.", moduleNo: '01' },
  LIVREUR: { label: 'Espace Livreur', desc: "Révèle l'interface de livraison express et assignation des commandes.", moduleNo: '02' },
  CHAUFFEUR: { label: 'Espace Chauffeur', desc: 'Révèle le module Chauffeur BIM Transport et validation des courses.', moduleNo: '03' }
}
const ROLE_ORDER = ['BIM', 'LIVREUR', 'CHAUFFEUR']

const codes = ref([])
const codesLoading = ref(false)
const hiddenCodes = reactive(new Set())
function toggleCode(role) {
  hiddenCodes.has(role) ? hiddenCodes.delete(role) : hiddenCodes.add(role)
}

async function loadCodes() {
  codesLoading.value = true
  try {
    const { data } = await apiClient.get('/access-code')
    codes.value = data?.data ?? []
  } catch {
    toast.error("Impossible de charger les codes d'accès staff.")
  } finally {
    codesLoading.value = false
  }
}

const orderedCodes = computed(() =>
  ROLE_ORDER.map((role) => codes.value.find((c) => c.role === role) ?? { role, code: '——————' })
)

onMounted(loadCodes)

const editDialog = ref(false)
const editSaving = ref(false)
const editForm = ref({})
function openEditDialog() {
  editForm.value = Object.fromEntries(ROLE_ORDER.map((role) => [role, orderedCodes.value.find((c) => c.role === role)?.code ?? '']))
  editDialog.value = true
}
async function saveCodes() {
  editSaving.value = true
  try {
    for (const role of ROLE_ORDER) {
      const code = String(editForm.value[role] ?? '').trim()
      if (!code) continue
      await apiClient.put(`/access-code/${role}`, { code })
    }
    toast.success("Codes d'accès staff mis à jour.")
    editDialog.value = false
    await loadCodes()
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  } finally {
    editSaving.value = false
  }
}

const staffSectionTabs = [
  { key: 'codes', label: "Codes d'accès Staff", icon: 'pin' },
  { key: 'roles', label: 'Rôles & sécurité', icon: 'admin_panel_settings' }
]
const staffSection = ref('codes')
</script>

<template>
<div class="flex flex-col w-full">
<div class="max-w-[1600px] w-full mx-auto px-space-lg py-space-lg space-y-space-lg">
<div class="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
<div>
<div class="flex items-center gap-2 mb-1.5 text-secondary">
<span class="material-symbols-outlined text-[18px]">admin_panel_settings</span>
<span class="font-label-sm text-label-sm uppercase tracking-wider font-semibold">Portail d'Administration</span>
<span class="text-outline">/</span>
<span class="font-label-sm text-label-sm text-primary font-semibold">Codes d'accès &amp; Gouvernance</span>
</div>
<h1 class="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">Codes d'accès Staff</h1>
<p class="font-body-md text-body-md text-secondary mt-1">
Sécurité mobile et codes d'accès staff révélant les espaces opérationnels dédiés dans l'application mobile.
</p>
</div>
</div>

<div class="bg-surface-container-lowest rounded-xl shadow-sm p-1.5 overflow-x-auto">
<nav class="flex items-center gap-1 min-w-max">
<RouterLink class="flex items-center gap-2 px-3.5 py-2 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container-low transition-colors font-body-sm text-body-sm font-medium" to="/comptes">
<span class="material-symbols-outlined text-[18px]">account_box</span><span>Comptes</span>
</RouterLink>
<RouterLink class="flex items-center gap-2 px-3.5 py-2 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container-low transition-colors font-body-sm text-body-sm font-medium" to="/utilisateurs-acces">
<span class="material-symbols-outlined text-[18px]">group</span><span>Utilisateurs &amp; Accès</span>
</RouterLink>
<a class="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-primary-container text-on-primary font-body-sm text-body-sm font-medium shadow-sm" href="#">
<span class="material-symbols-outlined text-[18px]">pin</span><span>Codes d'accès Staff</span>
</a>
<RouterLink class="flex items-center gap-2 px-3.5 py-2 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container-low transition-colors font-body-sm text-body-sm font-medium" to="/entreprises">
<span class="material-symbols-outlined text-[18px]">storefront</span><span>Entreprises &amp; Commerce</span>
</RouterLink>
<RouterLink class="flex items-center gap-2 px-3.5 py-2 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container-low transition-colors font-body-sm text-body-sm font-medium" to="/transport">
<span class="material-symbols-outlined text-[18px]">directions_car</span><span>BIM Transport</span>
</RouterLink>
</nav>
</div>

<SectionTabs v-model="staffSection" :tabs="staffSectionTabs" />

<div v-show="staffSection === 'codes'" class="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg space-y-space-md">
<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-2">
<div class="flex items-start gap-3">
<div class="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-primary">
<span class="material-symbols-outlined text-[22px]">pin</span>
</div>
<div>
<h2 class="font-headline-md text-headline-md text-on-surface font-bold">Codes d'accès Staff (Application Mobile)</h2>
<p class="font-body-sm text-body-sm text-secondary">
Codes secrets révélant les modules opérationnels dédiés dans les paramètres de l'application mobile sans mise à jour nécessaire.
</p>
</div>
</div>
<button class="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-primary font-body-sm text-body-sm font-semibold transition-colors" type="button" @click="openEditDialog">
<span class="material-symbols-outlined text-[18px]">sync_lock</span>
<span>Régénérer ou modifier les codes staff</span>
</button>
</div>

<div v-if="codesLoading" class="grid grid-cols-1 md:grid-cols-3 gap-space-md">
<div v-for="n in 3" :key="n" class="h-40 rounded-xl bg-surface-container-low animate-pulse"></div>
</div>

<div v-else class="grid grid-cols-1 md:grid-cols-3 gap-space-md">
<div v-for="entry in orderedCodes" :key="entry.role" class="bg-surface-container-low/60 rounded-xl p-space-md space-y-3">
<div class="flex items-center justify-between">
<span class="font-label-sm text-label-sm uppercase tracking-wider font-semibold text-secondary">Module {{ MODULE_META[entry.role]?.moduleNo }}</span>
<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary-container text-primary font-label-sm text-label-sm font-medium">Actif</span>
</div>
<div>
<div class="font-headline-sm text-body-lg font-semibold text-on-surface">{{ MODULE_META[entry.role]?.label }}</div>
<div class="font-body-sm text-body-sm text-secondary mt-0.5">{{ MODULE_META[entry.role]?.desc }}</div>
</div>
<div class="flex items-center justify-between bg-surface-container-lowest p-2.5 rounded-lg">
<div class="font-mono text-headline-sm font-bold tracking-widest text-primary">{{ hiddenCodes.has(entry.role) ? '••••••' : entry.code }}</div>
<button class="text-secondary hover:text-on-surface transition-colors p-1" title="Masquer / Démasquer" type="button" @click="toggleCode(entry.role)">
<span class="material-symbols-outlined text-[18px]">{{ hiddenCodes.has(entry.role) ? 'visibility_off' : 'visibility' }}</span>
</button>
</div>
</div>
</div>
</div>

<div v-show="staffSection === 'roles'" class="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg">
<div class="space-y-space-sm">
<div class="flex items-center justify-between">
<div class="flex items-center gap-2">
<span class="material-symbols-outlined text-primary text-[22px]">policy</span>
<h3 class="font-headline-sm text-headline-sm font-bold text-on-surface">Attribution des rôles &amp; privilèges</h3>
</div>
<span class="px-2 py-0.5 rounded-md bg-surface-container text-primary font-label-sm text-label-sm font-semibold">v4.9 En cours de finalisation</span>
</div>
<p class="font-body-sm text-body-sm text-secondary">
La granularité des profils d'accès permettra de définir des privilèges distincts pour les caissiers, les contrôleurs financiers et les directeurs de succursale.
</p>
<div class="grid grid-cols-2 gap-2 pt-2 max-w-xl">
<div class="p-2.5 rounded-lg bg-surface-container-low flex items-center gap-2"><span class="material-symbols-outlined text-secondary text-[18px]">shield</span><span class="font-body-sm text-body-sm text-on-surface font-medium">RBAC Granulaire</span></div>
<div class="p-2.5 rounded-lg bg-surface-container-low flex items-center gap-2"><span class="material-symbols-outlined text-secondary text-[18px]">history</span><span class="font-body-sm text-body-sm text-on-surface font-medium">Audit logs immuables</span></div>
<div class="p-2.5 rounded-lg bg-surface-container-low flex items-center gap-2"><span class="material-symbols-outlined text-secondary text-[18px]">lock_clock</span><span class="font-body-sm text-body-sm text-on-surface font-medium">Sessions éphémères</span></div>
<div class="p-2.5 rounded-lg bg-surface-container-low flex items-center gap-2"><span class="material-symbols-outlined text-secondary text-[18px]">fingerprint</span><span class="font-body-sm text-body-sm text-on-surface font-medium">Validation OTP obligatoire</span></div>
</div>
</div>
</div>

<div v-if="editDialog" class="fixed inset-0 z-[90] flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm p-4" @click.self="editDialog = false">
<div class="w-full max-w-md bg-white rounded-2xl shadow-xl p-space-lg space-y-space-md">
<h2 class="font-headline-md text-headline-md font-bold text-on-surface">Modifier les codes d'accès staff</h2>
<div class="space-y-space-sm">
<div v-for="role in ROLE_ORDER" :key="role">
<label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">{{ MODULE_META[role].label }}</label>
<input v-model="editForm[role]" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface font-mono text-body-sm tracking-widest focus:outline-none" maxlength="6" placeholder="6 chiffres" type="text"/>
</div>
</div>
<div class="flex justify-end gap-space-sm pt-space-sm">
<button class="h-10 px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm font-medium" type="button" :disabled="editSaving" @click="editDialog = false">Annuler</button>
<button class="h-10 px-space-md rounded-lg bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold disabled:opacity-60" type="button" :disabled="editSaving" @click="saveCodes">{{ editSaving ? 'Enregistrement…' : 'Enregistrer' }}</button>
</div>
</div>
</div>
</div>
</div>
</template>
