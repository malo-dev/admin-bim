<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import apiClient from '@/api/client'
import { authStore, BIM_ADMIN_ROLE } from '@/stores/auth'

const LOGO_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBfHE5alymZzfcFhrSpiHLEyEG8UV74YlnnrropEYwde0v85FhstE8FdCDyhwSb9nastaD0bPJInOpjcEQWS9TNYU9WjtLW4_Mlmilet6NisJangsII8tGR3LZPWRYhY6EzhmV34cpISjfdhT8W6HBbwKXA8RpFc4viLvgPXjek07Li8GTuXeiD-hpqno7nYuZOU16uaVmJiWCPb52ck1QVS-bTI8BigmGAJabNVRePaceJHSyF9HbnLffoPIP8AFwl8mY'

const features = [
  {
    title: 'Surveillance & flux en temps réel',
    text: 'Moteur de réconciliation instantanée multi-comptes',
    iconClass: 'bg-blue-500/20 text-blue-300 border-blue-400/20',
    path: 'M13 10V3L4 14h7v7l9-11h-7z'
  },
  {
    title: 'Sécurité & authentification 2FA renforcée',
    text: "Chiffrement matériel conforme aux normes d'audit financier",
    iconClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/20',
    path: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
  },
  {
    title: 'Gestion multi-entités & partenaires',
    text: 'Contrôle granulaire des habilitations et traçabilité absolue',
    iconClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/20',
    path: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10'
  }
]

const authMode = ref('password') // 'password' | 'fido'
const locale = ref('FR')
const showPassword = ref(false)

const form = reactive({
  email: '',
  password: '',
  remember: true
})

const router = useRouter()
const loading = ref(false)
const errorMessage = ref('')

async function handleLogin() {
  errorMessage.value = ''
  loading.value = true
  try {
    const { data } = await apiClient.post('/auth/login', {
      email: form.email,
      password: form.password
    })
    if (data.role !== BIM_ADMIN_ROLE) {
      errorMessage.value = 'Accès refusé. Ce compte ne dispose pas des droits administrateur BIM.'
      return
    }
    authStore.setAuth({ ...data, email: form.email })
    router.push('/tableau-de-bord')
  } catch (err) {
    errorMessage.value = err?.response?.data?.message || 'Identifiants invalides. Veuillez réessayer.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-full flex flex-col lg:flex-row bg-slate-50 font-sans text-slate-800 selection:bg-blue-600 selection:text-white">
    <!-- Panneau gauche : vitrine de marque -->
    <aside
      class="relative hidden lg:flex lg:w-1/2 xl:w-7/12 flex-col justify-between p-10 xl:p-14 bg-mesh-pattern subtle-grid overflow-hidden text-white border-r border-slate-800/40"
    >
      <div class="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-blue-500/15 blur-3xl"></div>
      <div class="pointer-events-none absolute -left-20 bottom-1/4 h-80 w-80 rounded-full bg-blue-600/10 blur-3xl"></div>

      <header class="relative z-10 flex items-center justify-between">
        <div class="flex items-center gap-4 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/15 shadow-sm">
          <img
            alt="Logo Business Investment Meeting"
            class="h-9 w-auto object-contain bg-white px-2 py-0.5 rounded-lg shadow-sm"
            :src="LOGO_URL"
          />
          <div class="h-6 w-px bg-white/20"></div>
          <div class="flex items-center gap-2">
            <span class="font-bold tracking-wider text-sm uppercase text-slate-100 font-display">BIM NEXT</span>
            <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/30 text-blue-200 border border-blue-400/30">
              Console Enterprise v4.8
            </span>
          </div>
        </div>
        <div class="flex items-center gap-2 text-xs text-slate-300/80 bg-slate-900/40 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-sm">
          <span class="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Core API : Sécurisée</span>
        </div>
      </header>

      <section class="relative z-10 my-auto max-w-xl py-12">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/25 text-blue-200 text-xs font-medium mb-6 backdrop-blur-sm">
          <svg class="w-3.5 h-3.5 text-blue-300" fill="currentColor" viewBox="0 0 20 20">
            <path
              clip-rule="evenodd"
              fill-rule="evenodd"
              d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z"
            />
          </svg>
          Gouvernance &amp; Infrastructure Bancaire Dédiée
        </div>

        <h1 class="text-3xl xl:text-4xl font-extrabold tracking-tight text-white font-display leading-[1.2]">
          Pilotez votre écosystème <br />
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-white to-blue-300">
            financier &amp; opérationnel
          </span>
          en toute confiance.
        </h1>

        <p class="mt-4 text-base xl:text-lg text-slate-300 leading-relaxed font-normal">
          Comptes, validation des flux de trésorerie, transactions bidevises
          <span class="text-white font-medium">(EC / FC)</span> et gouvernance des partenaires unifiés dans un environnement
          sécurisé de haute précision.
        </p>

        <div class="mt-8 space-y-4">
          <div
            v-for="feature in features"
            :key="feature.title"
            class="flex items-center gap-3.5 p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm hover:bg-white/[0.07] transition-colors"
          >
            <div class="w-9 h-9 rounded-lg border flex items-center justify-center shrink-0" :class="feature.iconClass">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path :d="feature.path" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
              </svg>
            </div>
            <div>
              <p class="text-sm font-semibold text-white">{{ feature.title }}</p>
              <p class="text-xs text-slate-300">{{ feature.text }}</p>
            </div>
          </div>
        </div>

        <div class="mt-8 glass-card rounded-2xl p-4 shadow-xl shadow-black/20">
          <div class="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div class="flex items-center gap-2">
              <span class="relative flex h-2.5 w-2.5">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span class="font-medium text-slate-200">Système opérationnel</span>
            </div>
            <div class="text-slate-400">|</div>
            <div class="font-medium text-slate-200">
              Taux du jour : <span class="text-blue-300 font-semibold">1 EC = 2 350 FC</span>
            </div>
            <div class="text-slate-400">|</div>
            <div class="text-slate-300 flex items-center gap-1 font-mono">
              <svg class="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
              </svg>
              Latence 24ms
            </div>
          </div>
        </div>
      </section>

      <footer class="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
        <p>© 2026 BIM NEXT Platform • Propulsé par Business Investment Meeting</p>
        <span class="text-slate-500 font-mono">Build 26.10-PROD</span>
      </footer>
    </aside>

    <!-- Panneau droit : authentification -->
    <main class="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 bg-white min-h-screen lg:min-h-0">
      <header class="flex items-center justify-between w-full max-w-xl mx-auto">
        <div class="flex lg:hidden items-center gap-2">
          <img alt="BIM Logo" class="h-8 w-auto" :src="LOGO_URL" />
        </div>
        <div class="hidden lg:flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Cluster Kinshasa Central (Nœud 01) en ligne
        </div>
        <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold ml-auto">
          <button
            v-for="lang in ['FR', 'EN']"
            :key="lang"
            type="button"
            class="px-2.5 py-1 rounded transition-colors"
            :class="locale === lang ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-900'"
            @click="locale = lang"
          >
            {{ lang }}
          </button>
        </div>
      </header>

      <div class="w-full max-w-md mx-auto my-auto py-8">
        <div class="mb-8 text-center sm:text-left">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-3">
            <svg class="w-3.5 h-3.5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
            </svg>
            Espace Sécurisé Console
          </div>
          <h2 class="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display tracking-tight">Connexion Administrateur</h2>
          <p class="text-sm text-slate-500 mt-2">Accédez à votre console de gestion et supervision de réseau.</p>
        </div>

        <!-- Onglets du mode d'authentification -->
        <div class="flex rounded-xl bg-slate-100 p-1 mb-6 border border-slate-200/80">
          <button
            type="button"
            class="w-1/2 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
            :class="authMode === 'password' ? 'bg-white text-blue-800 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-800'"
            @click="authMode = 'password'"
          >
            <svg class="w-4 h-4" :class="authMode === 'password' ? 'text-blue-700' : 'text-slate-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
            </svg>
            Identifiant / Email
          </button>
          <button
            type="button"
            class="w-1/2 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
            :class="authMode === 'fido' ? 'bg-white text-blue-800 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-800'"
            @click="authMode = 'fido'"
          >
            <svg class="w-4 h-4" :class="authMode === 'fido' ? 'text-blue-700' : 'text-slate-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
            </svg>
            Clé Sécurité FIDO2 / SSO
          </button>
        </div>

        <form class="space-y-5" @submit.prevent="handleLogin">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5" for="admin-email">
              Adresse Email Professionnelle
            </label>
            <div class="relative rounded-xl shadow-sm">
              <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
                </svg>
              </div>
              <input
                id="admin-email"
                v-model="form.email"
                name="email"
                type="email"
                required
                placeholder="nom@bimreseau.com"
                class="form-input block w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:bg-white transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wide" for="admin-password">Mot de passe</label>
              <a class="text-xs font-semibold text-blue-700 hover:text-blue-900 transition-colors" href="#">Mot de passe oublié ?</a>
            </div>
            <div class="relative rounded-xl shadow-sm">
              <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
                </svg>
              </div>
              <input
                id="admin-password"
                v-model="form.password"
                name="password"
                :type="showPassword ? 'text' : 'password'"
                required
                placeholder="••••••••••••"
                class="form-input block w-full pl-10 pr-10 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:bg-white transition-all tracking-widest font-mono"
              />
              <button
                type="button"
                class="absolute inset-y-0 right-0 pr-3.5 flex items-center hover:text-slate-600 transition-colors"
                :class="showPassword ? 'text-blue-600' : 'text-slate-400'"
                :title="showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
                @click="showPassword = !showPassword"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
                  <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
                </svg>
              </button>
            </div>
          </div>

          <div class="flex items-center justify-between text-xs pt-1">
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input v-model="form.remember" type="checkbox" class="form-checkbox w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600 cursor-pointer" />
              <span class="text-slate-600 font-medium">Mémoriser cet appareil (30 j)</span>
            </label>
            <span class="text-slate-400 font-normal">Session chiffrée SSL</span>
          </div>

          <p v-if="errorMessage" class="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
            {{ errorMessage }}
          </p>

          <div class="pt-2">
            <button
              type="submit"
              :disabled="loading"
              class="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 text-white font-semibold text-sm shadow-md shadow-blue-800/20 hover:shadow-lg hover:shadow-blue-900/30 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span>{{ loading ? 'Connexion…' : 'Se connecter à la console' }}</span>
              <svg v-if="!loading" class="w-4 h-4 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M14 5l7 7m0 0l-7 7m7-7H3" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
              </svg>
            </button>
          </div>

          <div class="p-3 bg-amber-50 rounded-xl border border-amber-200/70 flex items-start gap-2.5 text-xs text-amber-800">
            <svg class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
            </svg>
            <p>L’authentification à double facteur (2FA) est obligatoire pour tous les comptes dotés de privilèges d’approbation de trésorerie.</p>
          </div>
        </form>

        <div class="relative my-7">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-slate-200"></div>
          </div>
          <div class="relative flex justify-center text-xs">
            <span class="px-3 bg-white text-slate-400 font-medium uppercase tracking-wider">Assistance Sécurisée</span>
          </div>
        </div>

        <div class="text-center">
          <p class="text-xs text-slate-500">
            Problème de jeton d'authentification ou accès restreint ?<br />
            <a class="font-semibold text-blue-700 hover:text-blue-800 hover:underline inline-flex items-center gap-1 mt-1" href="mailto:support-it@bimreseau.com">
              <span>Contacter le Support IT BIM</span>
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
              </svg>
            </a>
          </p>
        </div>
      </div>

      <footer class="w-full max-w-xl mx-auto pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
        <div>
          <span>ID Session: <span class="font-mono text-slate-600">SEC-99824-BIM</span></span>
        </div>
        <div class="flex items-center gap-4">
          <a class="hover:text-slate-600 transition-colors" href="#">Politique de Sécurité</a>
          <span>•</span>
          <a class="hover:text-slate-600 transition-colors" href="#">Audit &amp; Conformité</a>
          <span>•</span>
          <a class="hover:text-slate-600 transition-colors" href="#">Conditions Générales</a>
        </div>
      </footer>
    </main>
  </div>
</template>

<style scoped>
.bg-mesh-pattern {
  background-color: #0b132b;
  background-image:
    radial-gradient(at 0% 0%, rgba(37, 99, 235, 0.45) 0px, transparent 55%),
    radial-gradient(at 100% 100%, rgba(30, 64, 175, 0.35) 0px, transparent 50%),
    radial-gradient(at 50% 50%, rgba(15, 23, 42, 0.9) 0px, transparent 100%);
}

.subtle-grid {
  background-size: 38px 38px;
  background-image:
    linear-gradient(to right, rgba(255, 255, 255, 0.035) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
}

.glass-card {
  background: rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.12);
}
</style>
