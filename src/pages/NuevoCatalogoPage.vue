<script setup lang="ts">
import { ref } from 'vue'
import { ImagePlus, LoaderCircle, Save, Tag, X } from 'lucide-vue-next'
import { api, type Catalogo, type Etiqueta } from '../api.ts'
import { uploadCloudinaryImage } from '../cloudinary.ts'
import ImageCropModal from '../components/ImageCropModal.vue'

const props = defineProps<{ usuarioId: number; catalog?: Catalogo; isAdmin?: boolean }>()
const emit = defineEmits<{ (e: 'cancel'): void; (e: 'created'): void }>()

const nombre = ref(props.catalog?.nombre || '')
const descripcion = ref(props.catalog?.descripcion || '')
const urlFotoPortada = ref(props.catalog?.urlFotoPortada || '')
const uploadingCover = ref(false)
const cropVisible = ref(false)
const pendingCover = ref<File | null>(null)
const loading = ref(false)
const error = ref('')
const etiquetas = ref<Etiqueta[]>([])
const etiquetaIds = ref<number[]>(props.catalog?.etiquetas?.flatMap((tag) =>
  typeof tag === 'string' ? [] : [tag.id],
)?.slice(0, 2) || [])
const etiquetasError = ref('')

async function loadEtiquetas() {
  etiquetasError.value = ''
  try {
    etiquetas.value = await api.etiquetasTodas<Etiqueta>()
  } catch (reason) {
    etiquetasError.value = reason instanceof Error ? reason.message : 'No se pudieron cargar las etiquetas.'
  }
}

function toggleEtiqueta(id: number) {
  if (etiquetaIds.value.includes(id)) {
    etiquetaIds.value = etiquetaIds.value.filter((selectedId) => selectedId !== id)
  } else if (etiquetaIds.value.length < 2) {
    etiquetaIds.value = [...etiquetaIds.value, id]
  }
}

void loadEtiquetas()

function selectCover(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  pendingCover.value = file
  cropVisible.value = true
  input.value = ''
}

async function uploadCover(file: File) {
  cropVisible.value = false
  uploadingCover.value = true
  error.value = ''

  try {
    urlFotoPortada.value = await uploadCloudinaryImage(file, 'catalog')
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'No se pudo subir la portada.'
  } finally {
    uploadingCover.value = false
    pendingCover.value = null
  }
}

async function createCatalog() {
  if (!nombre.value.trim()) {
    error.value = 'Escribe un nombre para el catálogo.'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const payload = {
      nombre: nombre.value.trim(),
      descripcion: descripcion.value.trim(),
      urlFotoPortada: urlFotoPortada.value.trim() || null,
      etiquetaIds: etiquetaIds.value,
    }

    if (props.catalog?.id) {
      if (props.isAdmin) await api.updateCatalogoAdmin(props.catalog.id, payload)
      else await api.updateCatalogo(props.usuarioId, props.catalog.id, payload)
    } else {
      await api.createCatalogo(props.usuarioId, payload)
    }
    emit('created')
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'No se pudo crear el catálogo.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="catalog-modal-layer" @click.self="emit('cancel')">
    <form class="form-card" role="dialog" aria-modal="true" :aria-label="props.catalog ? 'Editar catálogo' : 'Crear catálogo'" @submit.prevent="createCatalog">
      <div class="form-heading">
      <p class="eyebrow">Nuevo catálogo</p>
        <button class="close-modal" type="button" aria-label="Cerrar" @click="emit('cancel')"><X :size="19" /></button>
      </div>
      <h2>{{ props.catalog ? 'Editar catálogo' : 'Crear catálogo' }}</h2>
      <p class="muted">{{ props.catalog ? 'Actualiza los datos y la portada del catálogo.' : 'Define la información básica de tu nuevo catálogo.' }}</p>
      <div class="field"><label for="catalog-name">Nombre</label><input id="catalog-name" v-model="nombre" type="text" required /></div>
      <div class="field"><label for="catalog-description">Descripción</label><textarea id="catalog-description" v-model="descripcion" rows="4"></textarea></div>
      <div class="field cover-field">
        <label>Portada del catálogo</label>
        <img v-if="urlFotoPortada" class="catalog-cover-preview" :src="urlFotoPortada" alt="Portada actual del catálogo" />
        <div v-else class="catalog-cover-empty"><ImagePlus :size="25" /><span>Aún no hay una foto de portada</span></div>
        <label class="upload-cover" :class="{ disabled: uploadingCover }">
          <LoaderCircle v-if="uploadingCover" :size="17" class="spin" />
          <ImagePlus v-else :size="17" />
          {{ uploadingCover ? 'Subiendo imagen...' : urlFotoPortada ? 'Cambiar y ajustar foto de portada' : 'Subir foto de portada' }}
          <input type="file" accept="image/*" :disabled="uploadingCover" @change="selectCover" />
        </label>
      </div>
      <div class="field">
        <label>Etiquetas <span class="selection-count">{{ etiquetaIds.length }}/2 seleccionadas</span></label>
        <div v-if="etiquetasError" class="tag-error">{{ etiquetasError }} <button type="button" @click="loadEtiquetas">Reintentar</button></div>
        <div v-else-if="etiquetas.length" class="tag-picker" aria-label="Elige hasta dos etiquetas">
          <button v-for="etiqueta in etiquetas" :key="etiqueta.id" type="button" class="tag-option" :class="{ selected: etiquetaIds.includes(etiqueta.id) }" :aria-pressed="etiquetaIds.includes(etiqueta.id)" :disabled="etiquetaIds.length >= 2 && !etiquetaIds.includes(etiqueta.id)" @click="toggleEtiqueta(etiqueta.id)">
            <Tag :size="13" /> {{ etiqueta.nombre }}
          </button>
        </div>
        <p v-else class="tag-empty">No hay etiquetas disponibles.</p>
      </div>
      <p v-if="error" class="error">{{ error }}</p>
      <div class="form-actions"><button class="secondary-action" type="button" @click="emit('cancel')">Cancelar</button><button class="primary-action" type="submit" :disabled="loading || uploadingCover"><LoaderCircle v-if="loading || uploadingCover" :size="17" class="spin" /><Save v-else :size="17" />{{ uploadingCover ? 'Subiendo portada...' : loading ? 'Guardando...' : props.catalog ? 'Guardar cambios' : 'Guardar catálogo' }}</button></div>
    </form>
  </div>
  <ImageCropModal :visible="cropVisible" :file="pendingCover" :aspect-ratio="16 / 9" title="Ajustar portada del catálogo" @cancel="cropVisible = false; pendingCover = null" @crop="uploadCover" />
</template>

<style scoped>
.catalog-modal-layer { position: fixed; inset: 0; z-index: 130; display: grid; place-items: center; overflow-y: auto; padding: 16px; background: rgba(0, 0, 0, .64); }
.form-card { position: relative; width: min(680px, 100%); max-height: calc(100dvh - 32px); overflow-y: auto; padding: 26px; border: 1px solid #e8e8e8; border-radius: 12px; background: #fff; box-shadow: 0 22px 70px rgba(0, 0, 0, .24); }
.form-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding-right: 40px; }
.close-modal { position: absolute; top: 18px; right: 18px; display: grid; place-items: center; width: 36px; height: 36px; border: 0; border-radius: 8px; background: #fff6f0; color: #c65b19; cursor: pointer; }
.eyebrow { margin: 0; color: #777; font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
h2 { margin: 8px 0; color: #171717; font: 700 34px 'Space Grotesk', Arial, sans-serif; }
.muted { margin: 0 0 26px; color: #777; }
.field { display: grid; gap: 7px; margin-bottom: 17px; }
.field label { color: #333; font-size: 13px; font-weight: 600; }
.field input, .field textarea { width: 100%; border: 1px solid #e8e8e8; border-radius: 8px; padding: 12px 13px; background: #fff; color: #171717; font: inherit; }
.field textarea { resize: vertical; }
.cover-field { gap:10px; }
.catalog-cover-preview,.catalog-cover-empty { width:100%;height:190px;overflow:hidden;border:1px solid #e8e8e8;border-radius:12px;background:linear-gradient(135deg,#fff6f0,#f0f0f0); }
.catalog-cover-preview { object-fit:cover; }
.catalog-cover-empty { display:grid;place-content:center;justify-items:center;gap:8px;color:#777;font-size:13px; }
.selection-count { float:right;color:#777;font-size:11px;font-weight:600; }
.tag-picker { display:flex;flex-wrap:wrap;gap:8px; }
.tag-option { display:inline-flex;align-items:center;gap:6px;padding:8px 11px;border:1px solid #e8e8e8;border-radius:999px;background:#fafafa;color:#777;font:inherit;font-size:12px;cursor:pointer; }
.tag-option.selected { border-color:#c65b19;background:#fff6f0;color:#c65b19;font-weight:800; }
.tag-option:disabled { opacity:.45;cursor:not-allowed; }
.tag-empty { margin:0;color:#777;font-size:12px;line-height:1.5; }
.tag-error button { border:0;border-radius:8px;padding:10px 12px;background:#fff6f0;color:#c65b19;font-size:12px;font-weight:700;cursor:pointer; }
.tag-error { color:#a8584e;font-size:12px; }
.upload-cover { display: inline-flex; align-items: center; gap: 7px; width: fit-content; color: #c65b19; font-size: 13px; font-weight: 700; cursor: pointer; }
.upload-cover.disabled { opacity: .65; cursor: wait; }
.upload-cover input { display: none; }
.form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px; }
.primary-action, .secondary-action { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 0; border-radius: 8px; padding: 12px 15px; font-weight: 700; cursor: pointer; }
.primary-action { background: #171717; color: #fff; }
.secondary-action { background: #fff6f0; color: #c65b19; }
.primary-action:disabled { opacity: .65; cursor: wait; }
.error { color: #a8584e; font-size: 14px; }
.spin { animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 560px) { .form-card { padding: 20px 17px; } .form-actions { flex-direction: column-reverse; } .form-actions button { width: 100%; } }
</style>