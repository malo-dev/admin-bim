<script setup>
import { computed, onMounted, ref } from 'vue'
import apiClient from '@/api/client'
import { useToast } from '@/composables/useToast'

const toast = useToast()

const tutorials = ref([])
const loading = ref(false)
async function loadTutorials() {
  loading.value = true
  try {
    const { data } = await apiClient.get('/tutorial/admin/list')
    tutorials.value = data?.tutorials ?? []
  } catch {
    toast.error('Impossible de charger les tutoriels.')
  } finally {
    loading.value = false
  }
}

const activeCount = computed(() => tutorials.value.filter((t) => t.isActive).length)
const hiddenCount = computed(() => tutorials.value.filter((t) => !t.isActive).length)

function emptyForm() {
  return { id: null, title: '', description: '', youtubeUrl: '', order: 0, isActive: true }
}
const dialog = ref(false)
const dialogMode = ref('create')
const saving = ref(false)
const form = ref(emptyForm())

function openCreate(defaultTitle = '') {
  dialogMode.value = 'create'
  form.value = emptyForm()
  if (defaultTitle) form.value.title = defaultTitle
  dialog.value = true
}
function openEdit(row) {
  dialogMode.value = 'edit'
  form.value = { id: row.id, title: row.title ?? '', description: row.description ?? '', youtubeUrl: row.youtubeUrl ?? '', order: row.order ?? 0, isActive: row.isActive }
  dialog.value = true
}
const canSubmit = computed(() => !!form.value.title && !!form.value.youtubeUrl)

async function save() {
  saving.value = true
  try {
    const payload = { title: form.value.title, description: form.value.description || undefined, youtubeUrl: form.value.youtubeUrl, order: form.value.order, isActive: form.value.isActive }
    if (dialogMode.value === 'create') {
      await apiClient.post('/tutorial/admin/create', payload)
      toast.success('Tutoriel créé.')
    } else {
      await apiClient.put(`/tutorial/admin/${form.value.id}`, payload)
      toast.success('Tutoriel modifié.')
    }
    dialog.value = false
    await loadTutorials()
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  } finally {
    saving.value = false
  }
}

async function toggleActive(row) {
  try {
    await apiClient.put(`/tutorial/admin/${row.id}`, { isActive: !row.isActive })
    row.isActive = !row.isActive
    toast.success(row.isActive ? 'Tutoriel publié.' : 'Tutoriel masqué.')
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  }
}

async function removeTutorial(row) {
  if (!window.confirm(`Supprimer le tutoriel « ${row.title} » ?`)) return
  try {
    await apiClient.delete(`/tutorial/admin/${row.id}`)
    toast.success('Tutoriel supprimé.')
    await loadTutorials()
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  }
}

const SUGGESTIONS = [
  { badge: 'Indispensable', duration: '~3 min', title: 'Activer son Portefeuille & 1er Dépôt Mobile Money', desc: "Guide pas-à-pas pour lier un numéro Airtel Money, Orange Money ou M-Pesa et convertir en e-Francs (EC).", audience: 'Tous clients' },
  { badge: 'Marchands & POS', duration: '~5 min', title: 'Encaissement par QR Code Dynamique & Reçus', desc: 'Génération du QR Code commerçant au point de vente et vérification instantanée des crédits.', audience: 'Commerces' },
  { badge: 'Logistique & Transport', duration: '~4 min', title: 'Prise en charge Course Chauffeur & Clôture', desc: 'Navigation GPS intégrée, taximètre virtuel BIM et validation du paiement client.', audience: 'Chauffeurs' }
]

onMounted(loadTutorials)
</script>

<template>
<div class="flex flex-col w-full">
<div class="w-full bg-surface-container-lowest shadow-[0_1px_3px_rgba(15,23,42,0.04)] px-space-lg">
<div class="max-w-[1600px] mx-auto">
<div class="pt-space-md pb-space-xs flex flex-col gap-1">
<div class="flex items-center gap-space-xs text-secondary font-label-md text-label-md">
<span class="material-symbols-outlined text-[16px] text-primary">admin_panel_settings</span>
<span class="tracking-wide uppercase font-semibold">Console d'Administration</span>
<span class="text-outline">/</span>
<span class="text-on-surface font-medium">Gestion</span>
</div>
<div class="flex items-baseline justify-between">
<div>
<h1 class="font-display-lg text-display-lg text-on-surface tracking-tight font-bold">Gestion Plateforme</h1>
<p class="font-body-sm text-body-sm text-secondary mt-0.5">Comptes, utilisateurs, entreprises, modules partenaires, catalogues et ressources d'intégration BIM NEXT</p>
</div>
</div>
</div>
<div class="flex items-center gap-space-xs overflow-x-auto no-scrollbar border-b-0 pt-space-sm text-secondary">
<RouterLink class="flex items-center gap-1.5 px-3 py-2.5 font-label-md text-label-md hover:text-on-surface transition-colors whitespace-nowrap rounded-t-lg hover:bg-surface-container-low" to="/comptes">
<span class="material-symbols-outlined text-[18px]">group</span><span>Comptes</span>
</RouterLink>
<RouterLink class="flex items-center gap-1.5 px-3 py-2.5 font-label-md text-label-md hover:text-on-surface transition-colors whitespace-nowrap rounded-t-lg hover:bg-surface-container-low" to="/entreprises">
<span class="material-symbols-outlined text-[18px]">storefront</span><span>Entreprises &amp; Commerce</span>
</RouterLink>
<RouterLink class="flex items-center gap-1.5 px-3 py-2.5 font-label-md text-label-md hover:text-on-surface transition-colors whitespace-nowrap rounded-t-lg hover:bg-surface-container-low" to="/catalogue">
<span class="material-symbols-outlined text-[18px]">inventory_2</span><span>Catalogue Produits</span>
</RouterLink>
<RouterLink class="flex items-center gap-1.5 px-3 py-2.5 font-label-md text-label-md hover:text-on-surface transition-colors whitespace-nowrap rounded-t-lg hover:bg-surface-container-low" to="/transport">
<span class="material-symbols-outlined text-[18px]">directions_car</span><span>BIM Transport</span>
</RouterLink>
<RouterLink class="flex items-center gap-1.5 px-3 py-2.5 font-label-md text-label-md hover:text-on-surface transition-colors whitespace-nowrap rounded-t-lg hover:bg-surface-container-low" to="/commandes">
<span class="material-symbols-outlined text-[18px]">shopping_bag</span><span>Commandes &amp; Livraisons</span>
</RouterLink>
<RouterLink class="flex items-center gap-1.5 px-3 py-2.5 font-label-md text-label-md hover:text-on-surface transition-colors whitespace-nowrap rounded-t-lg hover:bg-surface-container-low" to="/agents">
<span class="material-symbols-outlined text-[18px]">support_agent</span><span>Agents BIM</span>
</RouterLink>
<RouterLink class="relative flex items-center gap-1.5 px-3.5 py-2.5 font-label-md text-label-md text-primary font-bold whitespace-nowrap bg-surface-container-low rounded-t-lg shadow-sm" to="/formation">
<span class="material-symbols-outlined text-[18px] text-primary" style="font-variation-settings: 'FILL' 1;">play_circle</span><span>Formation</span>
<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"></div>
</RouterLink>
</div>
</div>
</div>

<div class="max-w-[1600px] w-full mx-auto px-space-lg py-space-lg flex flex-col gap-space-lg">
<div class="flex flex-col md:flex-row md:items-center justify-between gap-space-md bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
<div class="flex items-center gap-space-md">
<div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm flex-shrink-0">
<span class="material-symbols-outlined text-[28px]" style="font-variation-settings: 'FILL' 1;">play_circle</span>
</div>
<div>
<div class="flex items-center gap-2">
<h2 class="font-headline-lg text-headline-lg font-bold text-on-surface">Tutoriels Formation</h2>
<span class="px-2 py-0.5 rounded-full bg-surface-container font-label-sm text-label-sm text-primary font-semibold">Canal Officiel</span>
</div>
<p class="font-body-md text-body-md text-secondary mt-0.5">Gérez les vidéos YouTube publiées dans l'espace Formation de l'application et du portail web BIM NEXT</p>
</div>
</div>
<button class="h-10 px-5 rounded-lg bg-primary-container text-on-primary hover:bg-primary transition-all shadow-sm hover:shadow flex items-center gap-2 font-label-md text-label-md font-semibold" type="button" @click="openCreate()">
<span class="material-symbols-outlined text-[20px]">add</span><span>Ajouter un tutoriel</span>
</button>
</div>

<div class="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
<div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex items-start justify-between relative overflow-hidden hover:shadow-md transition-all">
<div class="flex flex-col">
<span class="font-label-md text-label-md text-secondary uppercase tracking-wider font-semibold">Total vidéos</span>
<div class="mt-2 font-numeric-kpi text-numeric-kpi text-on-surface font-bold tracking-tight">{{ tutorials.length }}</div>
</div>
<div class="w-11 h-11 rounded-lg bg-surface-container-low text-primary flex items-center justify-center"><span class="material-symbols-outlined text-[24px]">video_library</span></div>
</div>
<div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex items-start justify-between relative overflow-hidden hover:shadow-md transition-all">
<div class="flex flex-col">
<span class="font-label-md text-label-md text-secondary uppercase tracking-wider font-semibold">Actives &amp; Visibles</span>
<div class="mt-2 font-numeric-kpi text-numeric-kpi text-on-surface font-bold tracking-tight">{{ activeCount }}</div>
</div>
<div class="w-11 h-11 rounded-lg bg-primary-fixed/50 text-primary flex items-center justify-center"><span class="material-symbols-outlined text-[24px]" style="font-variation-settings: 'FILL' 1;">check_circle</span></div>
</div>
<div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex items-start justify-between relative overflow-hidden hover:shadow-md transition-all">
<div class="flex flex-col">
<span class="font-label-md text-label-md text-secondary uppercase tracking-wider font-semibold">Masquées</span>
<div class="mt-2 font-numeric-kpi text-numeric-kpi text-on-surface font-bold tracking-tight">{{ hiddenCount }}</div>
</div>
<div class="w-11 h-11 rounded-lg bg-tertiary-fixed text-tertiary-container flex items-center justify-center"><span class="material-symbols-outlined text-[24px]">visibility_off</span></div>
</div>
</div>

<div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-md">
<div v-for="n in 3" :key="n" class="h-56 rounded-2xl bg-surface-container-lowest animate-pulse"></div>
</div>

<!-- Empty state -->
<div v-else-if="tutorials.length === 0" class="bg-surface-container-lowest rounded-2xl p-space-xl flex flex-col items-center justify-center text-center shadow-sm min-h-[320px]">
<div class="relative mb-space-lg">
<div class="w-24 h-24 rounded-full bg-surface-container flex items-center justify-center text-secondary"><span class="material-symbols-outlined text-[48px] ml-1">play_arrow</span></div>
<div class="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center shadow-md"><span class="material-symbols-outlined text-[18px]">smart_display</span></div>
</div>
<h3 class="font-headline-md text-headline-md font-bold text-on-surface mb-2">Aucun tutoriel trouvé.</h3>
<p class="font-body-md text-body-md text-secondary max-w-lg mb-space-lg leading-relaxed">Aucune vidéo de formation n'a encore été ajoutée. Commencez par publier un tutoriel vidéo YouTube pour guider pas à pas vos utilisateurs, chauffeurs et partenaires marchands.</p>
<button class="h-11 px-6 rounded-lg bg-primary-container text-on-primary hover:bg-primary transition-all font-label-md text-label-md font-semibold flex items-center gap-2 shadow-sm hover:shadow" type="button" @click="openCreate()">
<span class="material-symbols-outlined text-[20px]">video_call</span><span>Ajouter votre première vidéo</span>
</button>
</div>

<!-- Tutorials grid -->
<div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-md">
<div v-for="row in tutorials" :key="row.id" class="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm hover:shadow-md transition-all flex flex-col gap-space-sm">
<div class="relative w-full aspect-video rounded-lg overflow-hidden bg-surface-container-high flex items-center justify-center">
<img v-if="row.thumbnailUrl" :src="row.thumbnailUrl" alt="" class="w-full h-full object-cover"/>
<span v-else class="material-symbols-outlined text-[36px] text-secondary">smart_display</span>
<a :href="row.youtubeUrl" target="_blank" rel="noopener" class="absolute inset-0 bg-primary/0 hover:bg-primary/20 flex items-center justify-center transition-colors">
<div class="w-9 h-9 rounded-full bg-surface-container-lowest/90 text-primary flex items-center justify-center shadow"><span class="material-symbols-outlined text-[18px]">play_arrow</span></div>
</a>
</div>
<div>
<div class="flex items-center justify-between gap-2">
<h5 class="font-headline-sm text-body-md font-bold text-on-surface line-clamp-1">{{ row.title }}</h5>
<span class="px-2 py-0.5 rounded font-label-sm text-[10px] font-semibold shrink-0" :class="row.isActive ? 'bg-primary-fixed text-primary' : 'bg-surface-container text-secondary'">{{ row.isActive ? 'En ligne' : 'Masqué' }}</span>
</div>
<p v-if="row.description" class="font-body-sm text-body-sm text-secondary mt-1 line-clamp-2">{{ row.description }}</p>
</div>
<div class="mt-auto pt-space-sm border-t border-surface-container flex items-center justify-between">
<span class="font-label-sm text-label-sm text-secondary">Ordre : {{ row.order }}</span>
<div class="flex items-center gap-1">
<button class="w-8 h-8 rounded-lg text-secondary hover:text-primary hover:bg-surface-container flex items-center justify-center transition-colors" :title="row.isActive ? 'Masquer' : 'Publier'" type="button" @click="toggleActive(row)">
<span class="material-symbols-outlined text-[18px]">{{ row.isActive ? 'visibility_off' : 'visibility' }}</span>
</button>
<button class="w-8 h-8 rounded-lg text-secondary hover:text-primary hover:bg-surface-container flex items-center justify-center transition-colors" title="Modifier" type="button" @click="openEdit(row)">
<span class="material-symbols-outlined text-[18px]">edit</span>
</button>
<button class="w-8 h-8 rounded-lg text-secondary hover:text-error hover:bg-error-container/30 flex items-center justify-center transition-colors" title="Supprimer" type="button" @click="removeTutorial(row)">
<span class="material-symbols-outlined text-[18px]">delete</span>
</button>
</div>
</div>
</div>
</div>

<!-- Suggested topics -->
<div class="bg-surface-container-lowest p-space-md rounded-2xl shadow-sm">
<div class="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-space-md">
<div>
<h4 class="font-headline-sm text-headline-sm font-bold text-on-surface">Modules Recommandés pour Démarrer</h4>
<p class="font-body-sm text-body-sm text-secondary">Gagnez du temps en initialisant les tutoriels essentiels les plus demandés au support technique</p>
</div>
</div>
<div class="grid grid-cols-1 md:grid-cols-3 gap-space-md">
<div v-for="s in SUGGESTIONS" :key="s.title" class="p-space-md rounded-xl bg-surface hover:bg-surface-container-low transition-all duration-200 flex flex-col justify-between group">
<div>
<div class="flex items-center justify-between mb-space-xs">
<span class="px-2 py-0.5 rounded bg-primary-container text-on-primary font-label-sm text-[10px] font-semibold">{{ s.badge }}</span>
<span class="text-secondary font-label-sm text-[11px]">Durée idéale : {{ s.duration }}</span>
</div>
<h5 class="font-headline-sm text-body-lg font-bold text-on-surface mt-1 group-hover:text-primary transition-colors">{{ s.title }}</h5>
<p class="font-body-sm text-body-sm text-secondary mt-1">{{ s.desc }}</p>
</div>
<div class="mt-space-md pt-space-sm flex items-center justify-between">
<span class="font-label-sm text-label-sm text-secondary">Public : {{ s.audience }}</span>
<button class="text-primary hover:text-on-primary hover:bg-primary px-3 py-1.5 rounded-lg text-label-sm font-semibold transition-colors flex items-center gap-1" type="button" @click="openCreate(s.title)">
<span class="material-symbols-outlined text-[16px]">add</span><span>Pré-remplir</span>
</button>
</div>
</div>
</div>
</div>
</div>

<!-- Dialog Tutoriel -->
<div v-if="dialog" class="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm p-4" @click.self="dialog = false">
<div class="w-full max-w-2xl bg-surface-container-lowest rounded-2xl shadow-2xl overflow-hidden">
<div class="px-space-lg py-space-md bg-surface-container-low flex items-center justify-between">
<div class="flex items-center gap-space-sm">
<div class="w-9 h-9 rounded-lg bg-primary-container text-on-primary flex items-center justify-center"><span class="material-symbols-outlined text-[20px]">video_call</span></div>
<h3 class="font-headline-sm text-headline-sm font-bold text-on-surface">{{ dialogMode === 'create' ? 'Ajouter un nouveau tutoriel' : 'Modifier le tutoriel' }}</h3>
</div>
<button class="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:bg-surface-container hover:text-on-surface transition-colors" type="button" @click="dialog = false">
<span class="material-symbols-outlined text-[20px]">close</span>
</button>
</div>
<div class="p-space-lg space-y-space-md max-h-[75vh] overflow-y-auto">
<div class="space-y-1">
<label class="block font-label-md text-label-md text-on-surface font-semibold">Lien direct YouTube (Vidéo ou Short) *</label>
<input v-model="form.youtubeUrl" class="w-full h-10 px-3 rounded-lg bg-surface font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="https://www.youtube.com/watch?v=..." type="url"/>
<span class="font-label-sm text-label-sm text-secondary">La miniature sera générée automatiquement à partir du lien.</span>
</div>
<div class="space-y-1">
<label class="block font-label-md text-label-md text-on-surface font-semibold">Titre officiel du tutoriel *</label>
<input v-model="form.title" class="w-full h-10 px-3 rounded-lg bg-surface font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Ex : Guide complet de recharge du portefeuille BIM NEXT" type="text"/>
</div>
<div class="grid grid-cols-2 gap-space-md">
<div class="space-y-1">
<label class="block font-label-md text-label-md text-on-surface font-semibold">Ordre d'affichage</label>
<input v-model.number="form.order" class="w-full h-10 px-3 rounded-lg bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20" type="number"/>
</div>
</div>
<div class="space-y-1">
<label class="block font-label-md text-label-md text-on-surface font-semibold">Description &amp; Chapitres (optionnel)</label>
<textarea v-model="form.description" class="w-full p-3 rounded-lg bg-surface font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" rows="3"></textarea>
</div>
<div class="p-space-sm rounded-xl bg-surface-container-low flex items-center justify-between">
<div class="flex items-center gap-2">
<span class="material-symbols-outlined text-primary text-[20px]">visibility</span>
<div class="flex flex-col">
<span class="font-label-md text-label-md text-on-surface font-semibold">Publier immédiatement sur l'application</span>
<span class="font-label-sm text-label-sm text-secondary">La vidéo sera visible en temps réel par tous les utilisateurs connectés.</span>
</div>
</div>
<label class="relative inline-flex items-center cursor-pointer">
<input v-model="form.isActive" class="sr-only peer" type="checkbox"/>
<div class="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container relative"></div>
</label>
</div>
<div class="pt-space-sm flex items-center justify-end gap-space-sm">
<button class="h-10 px-4 rounded-lg bg-surface text-secondary hover:text-on-surface hover:bg-surface-container font-label-md text-label-md transition-colors" type="button" :disabled="saving" @click="dialog = false">Annuler</button>
<button class="h-10 px-5 rounded-lg bg-primary-container text-on-primary hover:bg-primary font-label-md text-label-md font-semibold transition-all shadow-sm disabled:opacity-60" type="button" :disabled="saving || !canSubmit" @click="save">{{ saving ? 'Enregistrement…' : 'Enregistrer' }}</button>
</div>
</div>
</div>
</div>
</div>
</template>
