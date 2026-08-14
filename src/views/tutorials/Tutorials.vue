<template>
  <div class="tutorials-page">

    <!-- ── Header ──────────────────────────────────────────────── -->
    <div class="page-header">
      <div class="header-left">
        <i class="pi pi-play-circle header-icon"></i>
        <div>
          <h2 class="page-title">Tutoriels Formation</h2>
          <p class="page-sub">Gérez les vidéos YouTube publiées dans l'espace Formation de BIM Next</p>
        </div>
      </div>
      <Button
        label="Ajouter un tutoriel"
        icon="pi pi-plus"
        class="p-button-primary btn-add"
        @click="openCreate"
      />
    </div>

    <!-- ── Stats ───────────────────────────────────────────────── -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-icon" style="background:#EFF6FF"><i class="pi pi-play-circle" style="color:#2563EB"></i></div>
        <div>
          <div class="stat-val">{{ tutorials.length }}</div>
          <div class="stat-label">Total vidéos</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#F0FDF4"><i class="pi pi-check-circle" style="color:#16A34A"></i></div>
        <div>
          <div class="stat-val">{{ activeCount }}</div>
          <div class="stat-label">Actives</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#FFF7ED"><i class="pi pi-eye-slash" style="color:#EA580C"></i></div>
        <div>
          <div class="stat-val">{{ tutorials.length - activeCount }}</div>
          <div class="stat-label">Masquées</div>
        </div>
      </div>
    </div>

    <!-- ── Search ──────────────────────────────────────────────── -->
    <div class="search-row">
      <span class="p-input-icon-left search-wrap">
        <i class="pi pi-search" />
        <InputText v-model="search" placeholder="Rechercher par titre…" class="search-input" />
      </span>
    </div>

    <!-- ── Table ───────────────────────────────────────────────── -->
    <div class="table-card">
      <DataTable
        :value="filtered"
        :loading="isLoading"
        responsiveLayout="scroll"
        dataKey="id"
        rowHover
        stripedRows
        :paginator="filtered.length > 10"
        :rows="10"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink"
        class="tuto-table"
      >
        <template #empty>
          <div class="empty-state">
            <i class="pi pi-play-circle" style="font-size:2.5rem;color:#CBD5E1;margin-bottom:12px"></i>
            <p>Aucun tutoriel trouvé.</p>
          </div>
        </template>

        <!-- Ordre -->
        <Column field="order" header="Ordre" style="width:70px" sortable>
          <template #body="{ data }">
            <span class="order-badge">{{ data.order }}</span>
          </template>
        </Column>

        <!-- Miniature + Titre -->
        <Column header="Vidéo" style="min-width:280px">
          <template #body="{ data }">
            <div class="video-cell">
              <img
                :src="data.thumbnailUrl || '/placeholder.png'"
                class="thumb"
                @error="(e) => (e.target.src = '/placeholder.png')"
              />
              <div class="video-info">
                <span class="video-title">{{ data.title }}</span>
                <span v-if="data.description" class="video-desc">{{ truncate(data.description, 60) }}</span>
              </div>
            </div>
          </template>
        </Column>

        <!-- URL YouTube -->
        <Column header="Lien YouTube" style="min-width:200px">
          <template #body="{ data }">
            <a :href="data.youtubeUrl" target="_blank" rel="noopener" class="yt-link">
              <i class="pi pi-external-link" style="margin-right:5px"></i>
              Ouvrir
            </a>
          </template>
        </Column>

        <!-- Statut -->
        <Column header="Statut" style="width:110px">
          <template #body="{ data }">
            <span :class="['status-badge', data.isActive ? 'active' : 'hidden']">
              {{ data.isActive ? 'Active' : 'Masquée' }}
            </span>
          </template>
        </Column>

        <!-- Date -->
        <Column field="createdAt" header="Créé le" style="width:130px" sortable>
          <template #body="{ data }">
            <span class="date-txt">{{ formatDate(data.createdAt) }}</span>
          </template>
        </Column>

        <!-- Actions -->
        <Column header="Actions" style="width:120px">
          <template #body="{ data }">
            <div class="action-btns">
              <Button
                icon="pi pi-pencil"
                class="p-button-rounded p-button-text p-button-sm btn-edit"
                v-tooltip.top="'Modifier'"
                @click="openEdit(data)"
              />
              <Button
                :icon="data.isActive ? 'pi pi-eye-slash' : 'pi pi-eye'"
                class="p-button-rounded p-button-text p-button-sm btn-toggle"
                v-tooltip.top="data.isActive ? 'Masquer' : 'Afficher'"
                @click="toggleActive(data)"
              />
              <Button
                icon="pi pi-trash"
                class="p-button-rounded p-button-text p-button-sm btn-delete"
                v-tooltip.top="'Supprimer'"
                @click="confirmDelete(data)"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- ── Create / Edit Dialog ────────────────────────────────── -->
    <Dialog
      v-model:visible="showForm"
      :header="editTarget ? 'Modifier le tutoriel' : 'Nouveau tutoriel'"
      :modal="true"
      :style="{ width: '540px', maxWidth: '95vw' }"
      :closable="true"
      :draggable="false"
    >
      <div class="form-grid">
        <!-- Titre -->
        <div class="form-field full">
          <label>Titre <span class="req">*</span></label>
          <InputText v-model="form.title" placeholder="Ex: Comment faire un retrait ?" class="w-full" />
        </div>

        <!-- Description -->
        <div class="form-field full">
          <label>Description</label>
          <Textarea v-model="form.description" rows="3" placeholder="Description courte de la vidéo…" class="w-full" autoResize />
        </div>

        <!-- URL YouTube -->
        <div class="form-field full">
          <label>URL YouTube <span class="req">*</span></label>
          <InputText v-model="form.youtubeUrl" placeholder="https://www.youtube.com/watch?v=..." class="w-full" />
          <small class="hint">Formats acceptés : youtube.com/watch?v=… · youtu.be/… · youtube.com/embed/…</small>
        </div>

        <!-- Miniature personnalisée -->
        <div class="form-field full">
          <label>Miniature personnalisée</label>
          <InputText v-model="form.thumbnailUrl" placeholder="Laisser vide = miniature YouTube auto" class="w-full" />
        </div>

        <!-- Ordre + toggle actif -->
        <div class="form-field half">
          <label>Ordre d'affichage</label>
          <InputNumber v-model="form.order" :min="0" class="w-full" />
        </div>
        <div class="form-field half flex-center">
          <label>Visible dans l'app</label>
          <ToggleButton
            v-model="form.isActive"
            onLabel="Active"
            offLabel="Masquée"
            onIcon="pi pi-eye"
            offIcon="pi pi-eye-slash"
            class="toggle-active"
          />
        </div>

        <!-- Prévisualisation miniature -->
        <div v-if="previewThumb" class="form-field full">
          <label>Aperçu miniature</label>
          <img :src="previewThumb" class="thumb-preview" @error="(e) => (e.target.style.display='none')" />
        </div>

        <!-- Erreur -->
        <div v-if="formError" class="form-field full">
          <Message severity="error" :closable="false">{{ formError }}</Message>
        </div>
      </div>

      <template #footer>
        <Button label="Annuler" class="p-button-text" @click="closeForm" />
        <Button
          :label="editTarget ? 'Enregistrer' : 'Créer'"
          icon="pi pi-check"
          class="p-button-primary"
          :loading="isSaving"
          @click="submitForm"
        />
      </template>
    </Dialog>

    <!-- ── Delete Confirm Dialog ───────────────────────────────── -->
    <Dialog
      v-model:visible="showDeleteConfirm"
      header="Supprimer le tutoriel"
      :modal="true"
      :style="{ width: '400px' }"
      :closable="true"
      :draggable="false"
    >
      <div class="confirm-body">
        <i class="pi pi-exclamation-triangle" style="font-size:2rem;color:#EF4444;margin-bottom:12px"></i>
        <p>Supprimer <strong>{{ deleteTarget?.title }}</strong> ?</p>
        <p style="color:#6B7280;font-size:0.85rem">Cette action est irréversible.</p>
      </div>
      <template #footer>
        <Button label="Annuler" class="p-button-text" @click="showDeleteConfirm = false" />
        <Button
          label="Supprimer"
          icon="pi pi-trash"
          class="p-button-danger"
          :loading="isDeleting"
          @click="doDelete"
        />
      </template>
    </Dialog>

  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import Button       from 'primevue/button';
import DataTable    from 'primevue/datatable';
import Column       from 'primevue/column';
import Dialog       from 'primevue/dialog';
import InputText    from 'primevue/inputtext';
import InputNumber  from 'primevue/inputnumber';
import Textarea     from 'primevue/textarea';
import ToggleButton from 'primevue/togglebutton';
import Message      from 'primevue/message';
import { useTutorialsQuery }        from '@/modules/tutorials/queries/tutorials.queries';
import {
  useCreateTutorialMutation,
  useUpdateTutorialMutation,
  useDeleteTutorialMutation,
} from '@/modules/tutorials/mutations/tutorials.mutations';

/* ── Data ────────────────────────────────────────────────── */
const { data, isLoading } = useTutorialsQuery();

const tutorials  = computed(() => data.value?.tutorials ?? []);
const activeCount = computed(() => tutorials.value.filter(t => t.isActive).length);

/* ── Search ──────────────────────────────────────────────── */
const search  = ref('');
const filtered = computed(() => {
  const q = search.value.toLowerCase().trim();
  if (!q) return tutorials.value;
  return tutorials.value.filter(t =>
    t.title.toLowerCase().includes(q) ||
    (t.description || '').toLowerCase().includes(q)
  );
});

/* ── Mutations ───────────────────────────────────────────── */
const createMut = useCreateTutorialMutation();
const updateMut = useUpdateTutorialMutation();
const deleteMut = useDeleteTutorialMutation();

/* ── Form state ──────────────────────────────────────────── */
const showForm   = ref(false);
const editTarget = ref(null);
const formError  = ref('');
const isSaving   = ref(false);

const blankForm = () => ({
  title:        '',
  description:  '',
  youtubeUrl:   '',
  thumbnailUrl: '',
  order:        0,
  isActive:     true,
});

const form = ref(blankForm());

/* Auto-thumbnail preview */
const previewThumb = computed(() => {
  if (form.value.thumbnailUrl) return form.value.thumbnailUrl;
  const url = form.value.youtubeUrl || '';
  const patterns = [/[?&]v=([^&#]+)/, /youtu\.be\/([^?&#]+)/, /\/embed\/([^?&#]+)/];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg`;
  }
  return null;
});

function openCreate() {
  editTarget.value = null;
  form.value       = blankForm();
  formError.value  = '';
  showForm.value   = true;
}

function openEdit(tuto) {
  editTarget.value = tuto;
  form.value = {
    title:        tuto.title,
    description:  tuto.description || '',
    youtubeUrl:   tuto.youtubeUrl,
    thumbnailUrl: tuto.thumbnailUrl || '',
    order:        tuto.order,
    isActive:     tuto.isActive,
  };
  formError.value = '';
  showForm.value  = true;
}

function closeForm() {
  showForm.value  = false;
  editTarget.value = null;
}

async function submitForm() {
  formError.value = '';
  if (!form.value.title.trim())      { formError.value = 'Le titre est requis.'; return; }
  if (!form.value.youtubeUrl.trim()) { formError.value = "L'URL YouTube est requise."; return; }

  isSaving.value = true;
  try {
    if (editTarget.value) {
      await updateMut.mutateAsync({ id: editTarget.value.id, payload: form.value });
    } else {
      await createMut.mutateAsync(form.value);
    }
    closeForm();
  } catch (err) {
    formError.value = err?.response?.data?.message || 'Erreur lors de l\'enregistrement.';
  } finally {
    isSaving.value = false;
  }
}

/* ── Toggle active ───────────────────────────────────────── */
async function toggleActive(tuto) {
  try {
    await updateMut.mutateAsync({ id: tuto.id, payload: { isActive: !tuto.isActive } });
  } catch {}
}

/* ── Delete ──────────────────────────────────────────────── */
const showDeleteConfirm = ref(false);
const deleteTarget      = ref(null);
const isDeleting        = ref(false);

function confirmDelete(tuto) {
  deleteTarget.value    = tuto;
  showDeleteConfirm.value = true;
}

async function doDelete() {
  if (!deleteTarget.value) return;
  isDeleting.value = true;
  try {
    await deleteMut.mutateAsync(deleteTarget.value.id);
    showDeleteConfirm.value = false;
    deleteTarget.value = null;
  } catch {}
  isDeleting.value = false;
}

/* ── Utils ───────────────────────────────────────────────── */
function truncate(str, n) {
  return str && str.length > n ? str.slice(0, n) + '…' : str;
}
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}
</script>

<style scoped>
.tutorials-page { padding: 28px 24px; min-height: 100vh; background: #F8FAFF; }

/* ── Header ── */
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; flex-wrap: wrap; gap: 12px; }
.header-left { display: flex; align-items: center; gap: 14px; }
.header-icon { font-size: 2.2rem; color: #2563EB; background: #EFF6FF; padding: 12px; border-radius: 14px; }
.page-title  { font-size: 1.45rem; font-weight: 700; color: #1E293B; margin: 0 0 4px; }
.page-sub    { font-size: 0.85rem; color: #64748B; margin: 0; }
.btn-add     { background: #2563EB; border-color: #2563EB; font-weight: 600; border-radius: 12px; padding: 10px 20px; }

/* ── Stats ── */
.stats-row { display: flex; gap: 14px; margin-bottom: 22px; flex-wrap: wrap; }
.stat-card { display: flex; align-items: center; gap: 14px; background: #fff; border-radius: 16px;
  padding: 16px 22px; flex: 1; min-width: 150px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.05); border: 1px solid #EEF2FF; }
.stat-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; flex-shrink: 0; }
.stat-val   { font-size: 1.6rem; font-weight: 800; color: #1E293B; line-height: 1; }
.stat-label { font-size: 0.78rem; color: #64748B; margin-top: 3px; }

/* ── Search ── */
.search-row  { margin-bottom: 18px; }
.search-wrap { display: flex; align-items: center; }
.search-input { width: 320px; border-radius: 12px; padding-left: 2.2rem; }

/* ── Table card ── */
.table-card { background: #fff; border-radius: 20px; overflow: hidden;
  box-shadow: 0 2px 20px rgba(0,0,0,0.06); border: 1px solid #EEF2FF; }

/* ── Video cell ── */
.video-cell  { display: flex; align-items: center; gap: 12px; }
.thumb       { width: 88px; height: 58px; border-radius: 8px; object-fit: cover; background: #F1F5F9; flex-shrink: 0; }
.video-info  { display: flex; flex-direction: column; gap: 3px; }
.video-title { font-weight: 600; font-size: 0.88rem; color: #1E293B; line-height: 1.3; }
.video-desc  { font-size: 0.78rem; color: #64748B; line-height: 1.35; }

/* ── Order badge ── */
.order-badge { display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 8px; background: #EFF6FF; color: #2563EB;
  font-size: 0.8rem; font-weight: 700; }

/* ── YT link ── */
.yt-link { color: #2563EB; font-size: 0.83rem; font-weight: 600; text-decoration: none; }
.yt-link:hover { text-decoration: underline; }

/* ── Status badge ── */
.status-badge { display: inline-block; padding: 3px 12px; border-radius: 999px; font-size: 0.78rem; font-weight: 600; }
.status-badge.active { background: #DCFCE7; color: #16A34A; }
.status-badge.hidden { background: #FEF3C7; color: #D97706; }

/* ── Date ── */
.date-txt { font-size: 0.82rem; color: #64748B; }

/* ── Action buttons ── */
.action-btns { display: flex; gap: 4px; align-items: center; }
.btn-edit   :deep(.p-button) { color: #2563EB !important; }
.btn-toggle :deep(.p-button) { color: #D97706 !important; }
.btn-delete :deep(.p-button) { color: #EF4444 !important; }

/* ── Empty ── */
.empty-state { text-align: center; padding: 40px 20px; color: #94A3B8; }

/* ── Form ── */
.form-grid  { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-field { display: flex; flex-direction: column; gap: 6px; }
.form-field.full  { grid-column: 1 / -1; }
.form-field.half  { grid-column: span 1; }
.form-field.flex-center { justify-content: flex-end; }
.form-field label { font-size: 0.83rem; font-weight: 600; color: #374151; }
.req        { color: #EF4444; margin-left: 2px; }
.hint       { color: #9CA3AF; font-size: 0.76rem; }
.toggle-active { width: 100%; }
.thumb-preview { width: 100%; max-height: 200px; object-fit: cover; border-radius: 10px; border: 1px solid #E2E8F0; }
.w-full { width: 100%; }

/* ── Confirm ── */
.confirm-body { text-align: center; padding: 12px 0; display: flex; flex-direction: column; align-items: center; }
</style>
