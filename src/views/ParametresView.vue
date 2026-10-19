<script setup>
import { onMounted, reactive, ref } from 'vue'
import apiClient from '@/api/client'
import { useToast } from '@/composables/useToast'

const toast = useToast()

const tabs = [
  { key: 'general', label: 'Application mobile', icon: 'smartphone' },
  { key: 'finance', label: 'Devises', icon: 'currency_exchange' },
  { key: 'security', label: 'Sécurité & Accès', icon: 'shield_lock' }
]
const activeTab = ref('general')

const inputClass =
  'w-full h-10 px-3 rounded-lg bg-surface-container-low font-body-sm text-body-sm text-on-surface placeholder:text-outline border-0 focus:outline-none focus:ring-2 focus:ring-primary/20'
const labelClass = 'block font-label-md text-label-md text-on-surface-variant mb-1.5'

/* ---------- Versions de l'application mobile (réel : /app_version) ---------- */
const loadingVersions = ref(false)
const versions = ref([])
const PLATFORMS = [
  { key: 'android', label: 'Android', icon: 'android' },
  { key: 'ios', label: 'iOS', icon: 'phone_iphone' }
]
function emptyVersion(platform) {
  return { platform, latestVersion: '', minSupportedVersion: '', storeUrl: '', releaseNotes: '', forceUpdate: false, promptEnabled: true }
}
const versionForms = reactive({
  android: emptyVersion('android'),
  ios: emptyVersion('ios')
})
async function loadVersions() {
  loadingVersions.value = true
  try {
    const { data } = await apiClient.get('/app_version')
    versions.value = data?.data ?? []
    for (const p of PLATFORMS) {
      const found = versions.value.find((v) => v.platform === p.key)
      versionForms[p.key] = found ? { ...emptyVersion(p.key), ...found } : emptyVersion(p.key)
    }
  } catch {
    toast.error('Impossible de charger les versions de l’application.')
  } finally {
    loadingVersions.value = false
  }
}
const savingVersion = reactive({ android: false, ios: false })
async function saveVersion(platform) {
  const form = versionForms[platform]
  if (!form.latestVersion) {
    toast.error('La dernière version est obligatoire.')
    return
  }
  savingVersion[platform] = true
  try {
    await apiClient.post('/app_version/upsert', {
      platform,
      latestVersion: form.latestVersion,
      minSupportedVersion: form.minSupportedVersion || null,
      storeUrl: form.storeUrl || null,
      releaseNotes: form.releaseNotes || null,
      forceUpdate: form.forceUpdate,
      promptEnabled: form.promptEnabled
    })
    toast.success(`Version ${platform === 'android' ? 'Android' : 'iOS'} enregistrée.`)
    await loadVersions()
  } catch {
    toast.error('Enregistrement impossible.')
  } finally {
    savingVersion[platform] = false
  }
}

/* ---------- Devises (réel : /currency) ---------- */
const loadingCurrencies = ref(false)
const currencies = ref([])
async function loadCurrencies() {
  loadingCurrencies.value = true
  try {
    const { data } = await apiClient.get('/currency')
    currencies.value = (data?.data ?? []).map((c) => ({ ...c, _rate: c.rate, _symbol: c.symbol ?? '' }))
  } catch {
    toast.error('Impossible de charger les devises.')
  } finally {
    loadingCurrencies.value = false
  }
}
const savingCurrency = ref(null)
async function saveCurrency(currency) {
  savingCurrency.value = currency.currencyId
  try {
    await apiClient.put(`/currency/update/${currency.currencyId}`, { rate: currency._rate, symbol: currency._symbol })
    toast.success(`Taux de ${currency.code} mis à jour.`)
    await loadCurrencies()
  } catch {
    toast.error('Mise à jour impossible.')
  } finally {
    savingCurrency.value = null
  }
}

const showNewCurrency = ref(false)
const newCurrency = reactive({ code: '', name: '', symbol: '', rate: null, description: '' })
const creatingCurrency = ref(false)
async function createCurrency() {
  if (!newCurrency.code || !newCurrency.name) {
    toast.error('Code et nom sont obligatoires.')
    return
  }
  creatingCurrency.value = true
  try {
    await apiClient.post('/currency/create', { ...newCurrency, code: newCurrency.code.toUpperCase() })
    toast.success('Devise ajoutée.')
    showNewCurrency.value = false
    Object.assign(newCurrency, { code: '', name: '', symbol: '', rate: null, description: '' })
    await loadCurrencies()
  } catch (e) {
    toast.error(e?.response?.data?.message ?? 'Création impossible.')
  } finally {
    creatingCurrency.value = false
  }
}

/* ---------- Sécurité & Accès (résumé réel) ---------- */
const loadingSecurity = ref(false)
const security = ref({ bimAdmins: 0, totalAdmins: 0, accessCodes: 0 })
async function loadSecurity() {
  loadingSecurity.value = true
  try {
    const [admins, codes] = await Promise.all([apiClient.get('/auth/admin-accounts'), apiClient.get('/access-code')])
    const adminRows = admins.data?.data ?? []
    security.value = {
      totalAdmins: admins.data?.total ?? adminRows.length,
      bimAdmins: adminRows.filter((u) => u.role?.name === 'BIM').length,
      accessCodes: (codes.data?.data ?? codes.data ?? []).length
    }
  } catch {
    /* non bloquant */
  } finally {
    loadingSecurity.value = false
  }
}

onMounted(() => {
  loadVersions()
  loadCurrencies()
  loadSecurity()
})
</script>

<template>
  <div class="p-space-lg space-y-space-lg max-w-[1600px] mx-auto w-full">
    <!-- En-tête -->
    <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-space-md">
      <div>
        <div class="flex items-center gap-space-xs mb-1">
          <span class="material-symbols-outlined text-[16px] text-primary">settings</span>
          <span class="font-label-sm text-label-sm text-secondary uppercase tracking-widest font-semibold">Système &amp; Support</span>
        </div>
        <h1 class="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">Paramètres</h1>
        <p class="font-body-md text-body-md text-secondary">Versions de l'application mobile, devises et accès — configuration réelle de la plateforme.</p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
      <!-- Onglets -->
      <nav class="lg:col-span-3 bg-surface-container-lowest rounded-2xl p-space-sm shadow-sm space-y-0.5">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          class="w-full flex items-center gap-space-sm px-space-sm py-space-sm rounded-lg transition-all text-left"
          :class="activeTab === tab.key ? 'bg-primary-container text-on-primary font-medium shadow-sm' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'"
          @click="activeTab = tab.key"
        >
          <span class="material-symbols-outlined text-[20px]">{{ tab.icon }}</span>
          <span class="font-body-sm text-body-sm font-medium">{{ tab.label }}</span>
        </button>
      </nav>

      <div class="lg:col-span-9 space-y-space-md">
        <!-- Application mobile -->
        <template v-if="activeTab === 'general'">
          <section v-for="p in PLATFORMS" :key="p.key" class="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm space-y-space-md">
            <div class="flex items-center gap-space-sm">
              <div class="w-10 h-10 rounded-lg bg-primary-fixed/40 text-primary flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-[22px]">{{ p.icon }}</span>
              </div>
              <div>
                <h2 class="font-headline-sm text-headline-sm text-on-surface">{{ p.label }}</h2>
                <p class="font-body-sm text-body-sm text-secondary">Version publiée sur le store, utilisée par l'app pour proposer une mise à jour.</p>
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              <div>
                <label :class="labelClass">Dernière version publiée</label>
                <input v-model="versionForms[p.key].latestVersion" :class="inputClass" placeholder="ex: 2.4.0" type="text" />
              </div>
              <div>
                <label :class="labelClass">Version minimale supportée</label>
                <input v-model="versionForms[p.key].minSupportedVersion" :class="inputClass" placeholder="ex: 2.0.0" type="text" />
              </div>
              <div class="md:col-span-2">
                <label :class="labelClass">Lien vers le store</label>
                <input v-model="versionForms[p.key].storeUrl" :class="inputClass" placeholder="https://..." type="text" />
              </div>
              <div class="md:col-span-2">
                <label :class="labelClass">Notes de version</label>
                <textarea v-model="versionForms[p.key].releaseNotes" rows="2" class="w-full px-3 py-2 rounded-lg bg-surface-container-low font-body-sm text-body-sm text-on-surface border-0 focus:outline-none focus:ring-2 focus:ring-primary/20"></textarea>
              </div>
            </div>
            <div class="flex flex-col sm:flex-row gap-space-md">
              <div class="flex items-center justify-between flex-1 p-space-sm rounded-lg bg-surface-container-low">
                <div>
                  <div class="font-body-sm text-body-sm font-semibold text-on-surface">Mise à jour forcée</div>
                  <div class="font-label-sm text-label-sm text-secondary">Bloque l'app tant que l'utilisateur n'a pas mis à jour.</div>
                </div>
                <button type="button" role="switch" :aria-checked="versionForms[p.key].forceUpdate" class="relative w-11 h-6 rounded-full transition-colors shrink-0" :class="versionForms[p.key].forceUpdate ? 'bg-error' : 'bg-surface-container-highest'" @click="versionForms[p.key].forceUpdate = !versionForms[p.key].forceUpdate">
                  <span class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform" :class="{ 'translate-x-5': versionForms[p.key].forceUpdate }"></span>
                </button>
              </div>
              <div class="flex items-center justify-between flex-1 p-space-sm rounded-lg bg-surface-container-low">
                <div>
                  <div class="font-body-sm text-body-sm font-semibold text-on-surface">Bannière activée</div>
                  <div class="font-label-sm text-label-sm text-secondary">Affiche la proposition de mise à jour dans l'app.</div>
                </div>
                <button type="button" role="switch" :aria-checked="versionForms[p.key].promptEnabled" class="relative w-11 h-6 rounded-full transition-colors shrink-0" :class="versionForms[p.key].promptEnabled ? 'bg-primary-container' : 'bg-surface-container-highest'" @click="versionForms[p.key].promptEnabled = !versionForms[p.key].promptEnabled">
                  <span class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform" :class="{ 'translate-x-5': versionForms[p.key].promptEnabled }"></span>
                </button>
              </div>
            </div>
            <div class="flex justify-end pt-1">
              <button
                class="h-9 px-space-md flex items-center gap-1.5 rounded-lg bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold shadow-sm hover:opacity-95 transition-all disabled:opacity-50"
                type="button"
                :disabled="savingVersion[p.key]"
                @click="saveVersion(p.key)"
              >
                <span class="material-symbols-outlined text-[18px]">{{ savingVersion[p.key] ? 'autorenew' : 'save' }}</span>
                {{ savingVersion[p.key] ? 'Enregistrement...' : 'Enregistrer' }}
              </button>
            </div>
          </section>
        </template>

        <!-- Devises -->
        <template v-else-if="activeTab === 'finance'">
          <section class="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm space-y-space-md">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="font-headline-sm text-headline-sm text-on-surface">Devises & taux de conversion</h2>
                <p class="font-body-sm text-body-sm text-secondary">1 EC = 1 USD. Les autres devises convertissent depuis l'EC via leur taux.</p>
              </div>
              <button
                class="h-9 px-space-md flex items-center gap-1.5 rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm font-semibold hover:bg-surface-container transition-all"
                type="button"
                @click="showNewCurrency = !showNewCurrency"
              >
                <span class="material-symbols-outlined text-[18px]">add</span>
                Nouvelle devise
              </button>
            </div>

            <div v-if="showNewCurrency" class="p-space-md rounded-xl bg-surface-container-low grid grid-cols-1 md:grid-cols-4 gap-space-sm">
              <input v-model="newCurrency.code" :class="inputClass" placeholder="Code (ex: CDF)" maxlength="10" type="text" />
              <input v-model="newCurrency.name" :class="inputClass" placeholder="Nom (ex: Franc Congolais)" type="text" />
              <input v-model="newCurrency.symbol" :class="inputClass" placeholder="Symbole (ex: FC)" type="text" />
              <input v-model.number="newCurrency.rate" :class="inputClass" placeholder="Taux depuis 1 EC" type="number" step="0.0001" />
              <div class="md:col-span-4 flex justify-end gap-space-sm">
                <button class="h-9 px-space-md rounded-lg text-secondary hover:bg-surface-container font-body-sm text-body-sm" type="button" @click="showNewCurrency = false">Annuler</button>
                <button class="h-9 px-space-md rounded-lg bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold disabled:opacity-50" type="button" :disabled="creatingCurrency" @click="createCurrency">
                  {{ creatingCurrency ? 'Création...' : 'Créer' }}
                </button>
              </div>
            </div>

            <div v-if="loadingCurrencies" class="text-center py-space-lg text-secondary font-body-sm text-body-sm">Chargement...</div>
            <div v-else-if="!currencies.length" class="text-center py-space-lg text-secondary font-body-sm text-body-sm">Aucune devise enregistrée.</div>
            <div v-else class="space-y-space-sm">
              <div v-for="c in currencies" :key="c.currencyId" class="flex flex-col sm:flex-row sm:items-center gap-space-sm p-space-sm rounded-lg bg-surface-container-low">
                <div class="flex items-center gap-space-sm flex-1 min-w-0">
                  <div class="w-9 h-9 rounded-lg bg-surface-container-lowest flex items-center justify-center font-bold text-primary shrink-0">{{ c.code }}</div>
                  <div class="min-w-0">
                    <p class="font-body-sm text-body-sm font-semibold text-on-surface truncate">{{ c.name }}</p>
                    <p class="font-label-sm text-label-sm text-secondary">1 EC = {{ c._rate ?? '—' }} {{ c.symbol || c.code }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <input v-model.number="c._rate" :class="inputClass" class="w-32" placeholder="Taux" step="0.0001" type="number" />
                  <input v-model="c._symbol" :class="inputClass" class="w-24" placeholder="Symbole" type="text" />
                  <button
                    class="h-10 px-3 rounded-lg bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold disabled:opacity-50 shrink-0"
                    type="button"
                    :disabled="savingCurrency === c.currencyId"
                    @click="saveCurrency(c)"
                  >
                    {{ savingCurrency === c.currencyId ? '...' : 'Enregistrer' }}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </template>

        <!-- Sécurité & Accès -->
        <template v-else>
          <section class="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm space-y-space-md">
            <div>
              <h2 class="font-headline-sm text-headline-sm text-on-surface">Comptes administrateurs</h2>
              <p class="font-body-sm text-body-sm text-secondary">Aperçu réel des accès à la console.</p>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
              <div class="p-space-md rounded-xl bg-surface-container-low flex items-center justify-between">
                <div>
                  <p class="font-label-sm text-label-sm uppercase font-semibold tracking-wider text-secondary">Comptes admin</p>
                  <p class="font-numeric-kpi text-numeric-kpi font-bold text-on-surface mt-1">{{ loadingSecurity ? '—' : security.totalAdmins }}</p>
                  <p v-if="!loadingSecurity" class="font-label-sm text-label-sm text-secondary mt-0.5">dont {{ security.bimAdmins }} BIM</p>
                </div>
                <span class="material-symbols-outlined text-[28px] text-primary">admin_panel_settings</span>
              </div>
              <div class="p-space-md rounded-xl bg-surface-container-low flex items-center justify-between">
                <div>
                  <p class="font-label-sm text-label-sm uppercase font-semibold tracking-wider text-secondary">Codes d'accès actifs</p>
                  <p class="font-numeric-kpi text-numeric-kpi font-bold text-on-surface mt-1">{{ loadingSecurity ? '—' : security.accessCodes }}</p>
                </div>
                <span class="material-symbols-outlined text-[28px] text-primary">vpn_key</span>
              </div>
            </div>
            <RouterLink
              to="/codes-acces-staff"
              class="flex items-center justify-between p-space-md rounded-xl bg-primary-fixed/20 hover:bg-primary-fixed/30 transition-colors"
            >
              <div class="flex items-center gap-space-sm">
                <span class="material-symbols-outlined text-[22px] text-primary">key</span>
                <div>
                  <p class="font-body-sm text-body-sm font-semibold text-on-surface">Gérer les codes d'accès Staff</p>
                  <p class="font-label-sm text-label-sm text-secondary">Codes BIM / Livreur / Chauffeur utilisés dans l'app mobile</p>
                </div>
              </div>
              <span class="material-symbols-outlined text-[20px] text-primary">arrow_forward</span>
            </RouterLink>
            <RouterLink
              to="/comptes"
              class="flex items-center justify-between p-space-md rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors"
            >
              <div class="flex items-center gap-space-sm">
                <span class="material-symbols-outlined text-[22px] text-secondary">manage_accounts</span>
                <div>
                  <p class="font-body-sm text-body-sm font-semibold text-on-surface">Gérer les comptes administrateurs</p>
                  <p class="font-label-sm text-label-sm text-secondary">Créer, bloquer ou supprimer un accès BIM / entreprise</p>
                </div>
              </div>
              <span class="material-symbols-outlined text-[20px] text-secondary">arrow_forward</span>
            </RouterLink>
          </section>
        </template>
      </div>
    </div>
  </div>
</template>
