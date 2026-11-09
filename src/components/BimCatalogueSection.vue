<script setup>
/**
 * Catalogue BIM NEXT — produits EAU, GAZ et CARBURANT affichés dans l'écran
 * « Commander » de l'app (GET /product/bim-catalogue).
 * Création / modification : /product/bim-admin (multipart, rôle BIM).
 * Sans entreprise, le produit est vendu par BIM NEXT (paiement EC → compte BIM).
 */
import { computed, onMounted, ref, watch } from 'vue'
import apiClient from '@/api/client'
import { useToast } from '@/composables/useToast'

const props = defineProps({
  companyOptions: { type: Array, default: () => [] },
  compressImage: { type: Function, required: true },
  imageUrl: { type: Function, required: true }
})
const emit = defineEmits(['changed'])
const toast = useToast()

const TYPES = [
  { value: 'eau', label: 'Eau', icon: 'water_drop', subs: 'Bonbonne 20 L, Pack, Sachet…' },
  { value: 'gaz', label: 'Gaz', icon: 'local_fire_department', subs: 'Bouteille 6 kg, Bouteille 12 kg, Détendeur…' },
  { value: 'carburant', label: 'Carburant', icon: 'local_gas_station', subs: 'Essence, Gasoil, Bidon…' }
]
const typeLabel = (t) => TYPES.find((x) => x.value === t)?.label ?? t

/* Liste */
const filterType = ref('')
const search = ref('')
const items = ref([])
const counts = ref({ eau: 0, gaz: 0, carburant: 0 })
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const { data } = await apiClient.get('/product/bim-admin', {
      params: { type: filterType.value || undefined, search: search.value.trim() || undefined }
    })
    items.value = data?.data ?? []
    counts.value = data?.counts ?? counts.value
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Impossible de charger le catalogue Eau · Gaz · Carburant.')
  } finally {
    loading.value = false
  }
}
let debounce = null
watch(search, () => { clearTimeout(debounce); debounce = setTimeout(load, 400) })
watch(filterType, load)
const totalAll = computed(() => counts.value.eau + counts.value.gaz + counts.value.carburant)

/* Formulaire */
function emptyForm(type = 'eau') {
  return { id: null, bimType: type, name: '', bimSub: '', price: null, reduction: null, unityMesure: '', description: '', warning: '', companyId: '', available: true }
}
const dialog = ref(false)
const saving = ref(false)
const form = ref(emptyForm())
const imageFile = ref(null)
const imagePreview = ref(null)
const fileInput = ref(null)
const currentType = computed(() => TYPES.find((t) => t.value === form.value.bimType))

const finalPrice = computed(() => {
  const p = Number(form.value.price) || 0
  const r = Number(form.value.reduction) || 0
  return r > 0 && r <= 100 ? +(p * (1 - r / 100)).toFixed(2) : +p.toFixed(2)
})

function openCreate() {
  form.value = emptyForm(filterType.value || 'eau')
  imageFile.value = null
  imagePreview.value = null
  dialog.value = true
}
function openEdit(row) {
  form.value = {
    id: row.productId,
    bimType: row.type,
    name: row.name ?? '',
    bimSub: row.bimSub ?? '',
    price: row.price != null ? Number(row.price) : null,
    reduction: row.reduction ?? null,
    unityMesure: row.unityMesure ?? '',
    description: row.description ?? '',
    warning: row.Warning ?? '',
    companyId: row.companyId ?? '',
    available: !!row.available
  }
  imageFile.value = null
  imagePreview.value = props.imageUrl(row.imageUrl)
  dialog.value = true
}
async function onFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) { toast.warn('Choisissez une image (JPG ou PNG).'); return }
  imageFile.value = await props.compressImage(file)
  imagePreview.value = URL.createObjectURL(imageFile.value)
}

async function save() {
  const f = form.value
  const missing = []
  if (!f.bimType) missing.push('la catégorie')
  if (!f.name.trim()) missing.push('le titre')
  if (!(Number(f.price) > 0)) missing.push('un prix supérieur à 0')
  if (missing.length) { toast.warn(`À compléter : ${missing.join(', ')}.`); return }
  if (f.reduction !== null && f.reduction !== '' && (!Number.isInteger(Number(f.reduction)) || f.reduction < 0 || f.reduction > 100)) {
    toast.warn('La réduction doit être un entier entre 0 et 100.'); return
  }

  const fd = new FormData()
  fd.append('bimType', f.bimType)
  fd.append('name', f.name.trim())
  fd.append('bimSub', f.bimSub.trim())
  fd.append('price', String(f.price))
  fd.append('reduction', f.reduction === null || f.reduction === '' ? '' : String(f.reduction))
  fd.append('unityMesure', f.unityMesure.trim())
  fd.append('description', f.description.trim())
  fd.append('warning', f.warning.trim())
  fd.append('companyId', f.companyId === '' || f.companyId === null ? '' : String(f.companyId))
  fd.append('available', f.available ? 'true' : 'false')
  if (imageFile.value) fd.append('image', imageFile.value)

  saving.value = true
  try {
    const cfg = { headers: { 'Content-Type': 'multipart/form-data' } }
    if (f.id) await apiClient.put(`/product/bim-admin/${f.id}`, fd, cfg)
    else await apiClient.post('/product/bim-admin', fd, cfg)
    toast.success(f.id ? 'Produit modifié — visible dans l\'app.' : 'Produit ajouté — visible dans l\'app.')
    dialog.value = false
    await load()
    emit('changed')
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Enregistrement impossible.')
  } finally {
    saving.value = false
  }
}

const togglingId = ref(null)
async function toggleAvailable(row) {
  togglingId.value = row.productId
  const fd = new FormData()
  fd.append('available', row.available ? 'false' : 'true')
  try {
    await apiClient.put(`/product/bim-admin/${row.productId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    row.available = !row.available
    toast.success(row.available ? 'Produit de nouveau commandable.' : 'Produit masqué de l\'app.')
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur serveur.')
  } finally {
    togglingId.value = null
  }
}

async function remove(row) {
  if (!window.confirm(`Supprimer « ${row.name} » ?`)) return
  try {
    await apiClient.delete(`/product/delete/${row.productId}`)
    toast.success('Produit supprimé.')
    await load()
    emit('changed')
  } catch (err) {
    // Déjà commandé : on propose de le masquer plutôt que de le supprimer.
    toast.error(err?.response?.data?.message ?? 'Suppression impossible.')
  }
}

const price = (v) => Number(v ?? 0).toFixed(2)
onMounted(load)
</script>

<template>
<div class="bg-surface-container-lowest rounded-xl shadow-sm p-space-md space-y-space-md">
  <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-space-sm">
    <div>
      <h2 class="font-headline-sm text-headline-sm text-on-surface font-bold">Eau · Gaz · Carburant</h2>
      <p class="font-body-sm text-body-sm text-secondary">Produits affichés dans l'écran « Commander » de l'app BIM NEXT. Prix en EC.</p>
    </div>
    <button class="inline-flex items-center gap-space-xs px-4 py-2 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-sm hover:bg-primary-container transition-all" type="button" @click="openCreate">
      <span class="material-symbols-outlined text-[18px]">add_box</span><span>Ajouter un produit</span>
    </button>
  </div>

  <div class="flex flex-col lg:flex-row lg:items-center gap-space-sm">
    <div class="flex items-center gap-1 bg-surface-container-low rounded-xl p-1 w-fit flex-wrap">
      <button type="button" class="px-3 py-1.5 rounded-lg text-body-sm font-semibold" :class="filterType === '' ? 'bg-primary text-on-primary' : 'text-secondary hover:text-on-surface'" @click="filterType = ''">Tout ({{ totalAll }})</button>
      <button v-for="t in TYPES" :key="t.value" type="button" class="px-3 py-1.5 rounded-lg text-body-sm font-semibold flex items-center gap-1" :class="filterType === t.value ? 'bg-primary text-on-primary' : 'text-secondary hover:text-on-surface'" @click="filterType = t.value">
        <span class="material-symbols-outlined text-[16px]">{{ t.icon }}</span>{{ t.label }} ({{ counts[t.value] }})
      </button>
    </div>
    <div class="relative flex-1">
      <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
      <input v-model="search" class="w-full h-10 pl-10 pr-4 rounded-lg bg-surface-container-low text-body-sm text-on-surface placeholder:text-outline focus:outline-none" placeholder="Rechercher un produit…" type="text"/>
    </div>
  </div>

  <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
    <div v-for="n in 3" :key="n" class="h-48 rounded-xl bg-surface-container-low animate-pulse"></div>
  </div>
  <div v-else-if="items.length === 0" class="text-center py-12 text-secondary">
    <span class="material-symbols-outlined text-[40px] mb-2 block opacity-30">inventory_2</span>
    <p class="font-body-md text-body-md font-medium">Aucun produit {{ filterType ? typeLabel(filterType).toLowerCase() : '' }} pour l'instant</p>
    <p class="font-body-sm text-body-sm">Cliquez sur « Ajouter un produit » pour le rendre commandable dans l'app.</p>
  </div>
  <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
    <div v-for="row in items" :key="row.productId" class="rounded-xl bg-surface-container-low p-space-md shadow-sm flex flex-col justify-between" :class="{ 'opacity-60': !row.available }">
      <div class="flex items-start gap-space-sm mb-3">
        <img v-if="imageUrl(row.imageUrl)" :src="imageUrl(row.imageUrl)" alt="" class="w-16 h-16 rounded-lg object-cover flex-shrink-0 bg-surface-container"/>
        <div v-else class="w-16 h-16 rounded-lg bg-surface-container flex items-center justify-center text-primary flex-shrink-0">
          <span class="material-symbols-outlined text-[28px]">{{ TYPES.find((t) => t.value === row.type)?.icon }}</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-primary-fixed text-on-primary-fixed">{{ typeLabel(row.type) }}</span>
            <span v-if="row.sub" class="px-2 py-0.5 rounded text-[11px] font-semibold bg-surface-container-lowest text-secondary">{{ row.sub }}</span>
            <span v-if="!row.bimType" class="px-2 py-0.5 rounded text-[11px] font-semibold bg-surface-container-lowest text-outline" title="Classé automatiquement (secteur de l'entreprise ou nom). Modifiez-le pour fixer sa catégorie.">auto</span>
          </div>
          <h3 class="font-headline-sm text-headline-sm font-bold text-on-surface mt-1 truncate">{{ row.name }}</h3>
          <p class="font-label-sm text-label-sm text-secondary truncate">{{ row.company?.name ?? 'Vendu par BIM NEXT' }}</p>
        </div>
      </div>
      <div class="p-2.5 rounded-lg bg-surface-container-lowest flex items-center justify-between mb-3">
        <div>
          <span class="font-label-sm text-label-sm text-outline block">Prix client</span>
          <span class="font-headline-md text-headline-md font-bold text-primary">{{ price(row.effectivePrice) }} <span class="text-body-sm font-medium text-secondary">EC</span></span>
          <span v-if="Number(row.reduction) > 0" class="ml-1 text-label-sm text-outline line-through">{{ price(row.price) }}</span>
        </div>
        <span v-if="row.unityMesure" class="font-label-md text-body-sm text-secondary">/ {{ row.unityMesure }}</span>
      </div>
      <div class="pt-3 border-t border-surface-container flex items-center justify-between">
        <label class="inline-flex items-center gap-2 cursor-pointer" :class="{ 'opacity-50': togglingId === row.productId }">
          <input :checked="row.available" class="sr-only peer" type="checkbox" :disabled="togglingId === row.productId" @change="toggleAvailable(row)"/>
          <div class="w-8 h-4 bg-surface-container rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-3 after:w-3 after:transition-all relative"></div>
          <span class="font-label-sm text-label-sm" :class="row.available ? 'text-primary font-semibold' : 'text-secondary'">{{ row.available ? 'Disponible' : 'Indisponible' }}</span>
        </label>
        <div class="flex items-center gap-1">
          <button class="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:text-primary hover:bg-surface-container" title="Modifier" type="button" @click="openEdit(row)"><span class="material-symbols-outlined text-[18px]">edit</span></button>
          <button class="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:text-error hover:bg-error-container" title="Supprimer" type="button" @click="remove(row)"><span class="material-symbols-outlined text-[18px]">delete</span></button>
        </div>
      </div>
    </div>
  </div>

  <!-- Formulaire -->
  <div v-if="dialog" class="fixed inset-0 z-[90] flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm p-4" @click.self="!saving && (dialog = false)">
    <div class="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-space-lg space-y-space-md overflow-y-auto max-h-[90vh]">
      <h2 class="font-headline-md text-headline-md font-bold text-on-surface">{{ form.id ? 'Modifier le produit' : 'Nouveau produit Eau · Gaz · Carburant' }}</h2>

      <div>
        <label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Catégorie *</label>
        <div class="grid grid-cols-3 gap-space-sm">
          <button v-for="t in TYPES" :key="t.value" type="button" class="h-12 rounded-lg flex items-center justify-center gap-2 font-semibold text-body-sm border" :class="form.bimType === t.value ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container-low text-on-surface border-transparent'" @click="form.bimType = t.value">
            <span class="material-symbols-outlined text-[20px]">{{ t.icon }}</span>{{ t.label }}
          </button>
        </div>
      </div>

      <div>
        <label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Image</label>
        <div class="flex items-center gap-space-sm">
          <img v-if="imagePreview" :src="imagePreview" alt="" class="w-16 h-16 rounded-lg object-cover"/>
          <div v-else class="w-16 h-16 rounded-lg bg-surface-container-low flex items-center justify-center text-secondary"><span class="material-symbols-outlined text-[24px] opacity-50">image</span></div>
          <input ref="fileInput" accept="image/png,image/jpeg" class="hidden" type="file" @change="onFile"/>
          <button class="h-9 px-space-sm rounded-lg bg-surface-container-low text-on-surface text-body-sm font-medium" type="button" @click="fileInput.click()">Choisir une image</button>
          <span class="text-label-sm text-outline">Compressée automatiquement</span>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
        <div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Titre *</label><input v-model="form.name" maxlength="200" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface text-body-sm focus:outline-none" placeholder="Ex. Bonbonne d'eau 20 L" type="text"/></div>
        <div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Sous-catégorie (puce dans l'app)</label><input v-model="form.bimSub" maxlength="100" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface text-body-sm focus:outline-none" :placeholder="currentType?.subs" type="text"/></div>
      </div>

      <div class="grid grid-cols-3 gap-space-sm">
        <div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Prix (EC) *</label><input v-model.number="form.price" min="0" step="0.01" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface text-body-sm focus:outline-none" type="number"/></div>
        <div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Réduction (%)</label><input v-model.number="form.reduction" min="0" max="100" step="1" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface text-body-sm focus:outline-none" type="number"/></div>
        <div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Unité</label><input v-model="form.unityMesure" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface text-body-sm focus:outline-none" placeholder="Bonbonne, Litre, Bouteille…" type="text"/></div>
      </div>
      <p class="text-body-sm text-secondary -mt-2">Prix payé par le client : <span class="font-bold text-primary">{{ finalPrice.toFixed(2) }} EC</span></p>

      <div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Description</label><textarea v-model="form.description" class="w-full px-space-md py-2 rounded-lg bg-surface-container-low text-on-surface text-body-sm focus:outline-none" rows="2" placeholder="Ce que le client reçoit, délai de livraison…"></textarea></div>
      <div><label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Avertissement / conditions</label><textarea v-model="form.warning" maxlength="400" class="w-full px-space-md py-2 rounded-lg bg-surface-container-low text-on-surface text-body-sm focus:outline-none" rows="2" placeholder="Ex. Consigne de la bouteille non incluse"></textarea></div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-space-sm items-end">
        <div>
          <label class="font-label-sm text-label-sm font-semibold text-secondary block mb-1">Vendu par</label>
          <select v-model="form.companyId" class="h-10 w-full px-space-md rounded-lg bg-surface-container-low text-on-surface text-body-sm focus:outline-none">
            <option value="">BIM NEXT (paiement sur le compte BIM)</option>
            <option v-for="c in companyOptions" :key="c.value" :value="c.value">{{ c.label }}</option>
          </select>
        </div>
        <label class="inline-flex items-center gap-2 h-10 cursor-pointer">
          <input v-model="form.available" type="checkbox" class="w-4 h-4 accent-primary"/>
          <span class="text-body-sm text-on-surface">Disponible à la commande</span>
        </label>
      </div>

      <div class="flex justify-end gap-space-sm pt-space-sm">
        <button class="h-10 px-space-md rounded-lg bg-surface-container-low text-on-surface text-body-sm font-medium" type="button" :disabled="saving" @click="dialog = false">Annuler</button>
        <button class="h-10 px-space-md rounded-lg bg-primary-container text-on-primary text-body-sm font-semibold disabled:opacity-60" type="button" :disabled="saving" @click="save">{{ saving ? 'Enregistrement…' : 'Enregistrer' }}</button>
      </div>
    </div>
  </div>
</div>
</template>
