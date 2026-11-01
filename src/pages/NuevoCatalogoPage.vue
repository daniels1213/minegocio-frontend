<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, Facebook, Globe2, ImagePlus, Instagram, LoaderCircle, MessageCircle, Save, Tag, X } from 'lucide-vue-next'
import { api, type Catalogo, type Etiqueta } from '../api.ts'
import { uploadCloudinaryImage } from '../cloudinary.ts'
import ImageCropModal from '../components/ImageCropModal.vue'
import PhoneInput from '../components/PhoneInput.vue'
import { isValidPhoneNumber } from '../phone.ts'

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
const etiquetasLoading = ref(false)
const etiquetasError = ref('')
let etiquetasLoaded = false
const activeSubmodal = ref<'cover' | 'tags' | 'socials' | null>(null)
const savedWhatsapp = props.catalog?.whatsapp || ''
const whatsappNumberMatch = /wa\.me\/(\d+)/i.exec(savedWhatsapp)
const savedWhatsappIsLink = /^https?:\/\//i.test(savedWhatsapp) && !whatsappNumberMatch
const whatsappMode = ref<'phone' | 'link'>(savedWhatsappIsLink ? 'link' : 'phone')
const whatsappLink = ref(savedWhatsappIsLink ? savedWhatsapp : '')
const socialDraft = ref({
  whatsapp: whatsappNumberMatch ? `+${whatsappNumberMatch[1]}` : savedWhatsappIsLink ? '' : savedWhatsapp,
  instagram: props.catalog?.instagram || '',
  facebook: props.catalog?.facebook || '',
})
const requestedTagName = ref('')
const coverError = ref('')
const socialCount = computed(() =>
  [whatsappMode.value === 'phone' ? socialDraft.value.whatsapp : whatsappLink.value, socialDraft.value.instagram, socialDraft.value.facebook]
    .filter((value) => value.trim()).length,
)
const selectedTagNames = computed(() => etiquetas.value
  .filter((tag) => etiquetaIds.value.includes(tag.id))
  .map((tag) => tag.nombre))

async function loadEtiquetas() {
  if (etiquetasLoading.value || (etiquetasLoaded && !etiquetasError.value)) return
  etiquetasLoading.value = true
  etiquetasError.value = ''
  try {
    etiquetas.value = await api.etiquetasTodas<Etiqueta>()
    etiquetasLoaded = true
    if (props.catalog) {
      etiquetaIds.value = (props.catalog.etiquetas || []).flatMap((tag) => {
        if (typeof tag !== 'string') return [tag.id]
        const found = etiquetas.value.find((item) => item.nombre === tag)
        return found ? [found.id] : []
      }).slice(0, 2)
    }
  } catch (reason) {
    etiquetasError.value = reason instanceof Error ? reason.message : 'No se pudieron cargar las etiquetas.'
  } finally {
    etiquetasLoading.value = false
  }
}

function normalizeSocialValue(value: string, type: 'whatsapp' | 'instagram' | 'facebook') {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (type === 'whatsapp') {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
    const digits = trimmed.replace(/\D+/g, '')
    if (digits) return `https://wa.me/${digits}`
    return `https://${trimmed}`
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  return `https://${trimmed}`
}

function requestTag() {
  const tagName = requestedTagName.value.trim()
  if (!tagName) return
  const message = `Hola, quisiera solicitar la creación de la etiqueta "${tagName}" para mis catálogos.`
  window.open(`https://wa.me/5359292460?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
  requestedTagName.value = ''
}

function toggleEtiqueta(id: number) {
  if (etiquetaIds.value.includes(id)) {
    etiquetaIds.value = etiquetaIds.value.filter((selectedId) => selectedId !== id)
  } else if (etiquetaIds.value.length < 2) {
    etiquetaIds.value = [...etiquetaIds.value, id]
  }
}

function selectCover(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  coverError.value = ''
  pendingCover.value = file
  cropVisible.value = true
  input.value = ''
}

async function uploadCover(file: File) {
  cropVisible.value = false
  uploadingCover.value = true
  coverError.value = ''

  try {
    urlFotoPortada.value = await uploadCloudinaryImage(file, 'catalog')
  } catch (reason) {
    coverError.value = reason instanceof Error ? reason.message : 'No se pudo subir la portada.'
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
  if (props.catalog?.id && whatsappMode.value === 'phone' && socialDraft.value.whatsapp && !isValidPhoneNumber(socialDraft.value.whatsapp)) {
    error.value = 'Introduce un WhatsApp válido para el prefijo seleccionado.'
    activeSubmodal.value = 'socials'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const payload: Record<string, unknown> = {
      nombre: nombre.value.trim(),
      descripcion: descripcion.value.trim(),
    }

    if (props.catalog?.id) {
      Object.assign(payload, {
        urlFotoPortada: urlFotoPortada.value.trim() || null,
        urlLogo: props.catalog.urlLogo || null,
        whatsapp: normalizeSocialValue(whatsappMode.value === 'phone' ? socialDraft.value.whatsapp : whatsappLink.value, 'whatsapp') || null,
        instagram: normalizeSocialValue(socialDraft.value.instagram, 'instagram') || null,
        facebook: normalizeSocialValue(socialDraft.value.facebook, 'facebook') || null,
        etiquetaIds: etiquetaIds.value,
      })
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
      <p class="eyebrow">{{ props.catalog ? 'Editar catálogo' : 'Nuevo catálogo' }}</p>
        <button class="close-modal" type="button" aria-label="Cerrar" @click="emit('cancel')"><X :size="19" /></button>
      </div>
      <h2>{{ props.catalog ? 'Editar catálogo' : 'Crear catálogo' }}</h2>
      <p class="muted">{{ props.catalog ? 'Actualiza la información y organiza las opciones del catálogo.' : 'Define la información básica de tu nuevo catálogo.' }}</p>
      <div class="field"><label for="catalog-name">Nombre</label><input id="catalog-name" v-model="nombre" type="text" required /></div>
      <div class="field"><label for="catalog-description">Descripción</label><textarea id="catalog-description" v-model="descripcion" rows="4"></textarea></div>
      <section v-if="props.catalog" class="settings-section" aria-label="Opciones del catálogo">
        <p class="section-label">Personaliza tu catálogo</p>
        <div class="settings-grid">
          <button class="settings-card" type="button" @click="activeSubmodal = 'cover'">
            <span class="settings-icon"><ImagePlus :size="18" /></span>
            <span class="settings-copy"><strong>Imagen de portada</strong><small>{{ urlFotoPortada ? 'Fondo añadido' : 'Sin imagen' }}</small></span>
            <Check v-if="urlFotoPortada" class="settings-check" :size="16" />
          </button>
          <button class="settings-card" type="button" @click="activeSubmodal = 'tags'; void loadEtiquetas()">
            <span class="settings-icon"><Tag :size="18" /></span>
            <span class="settings-copy"><strong>Etiquetas</strong><small>{{ etiquetaIds.length ? `${etiquetaIds.length} seleccionada${etiquetaIds.length === 1 ? '' : 's'}` : 'Sin etiquetas' }}</small></span>
            <Check v-if="etiquetaIds.length" class="settings-check" :size="16" />
          </button>
          <button class="settings-card" type="button" @click="activeSubmodal = 'socials'">
            <span class="settings-icon"><Globe2 :size="18" /></span>
            <span class="settings-copy"><strong>Redes sociales</strong><small>{{ socialCount ? `${socialCount} enlace${socialCount === 1 ? '' : 's'} añadido${socialCount === 1 ? '' : 's'}` : 'Sin enlaces' }}</small></span>
            <Check v-if="socialCount" class="settings-check" :size="16" />
          </button>
        </div>
      </section>
      <p v-if="error" class="error">{{ error }}</p>
      <div class="form-actions"><button class="secondary-action" type="button" @click="emit('cancel')">Cancelar</button><button class="primary-action" type="submit" :disabled="loading || uploadingCover"><LoaderCircle v-if="loading || uploadingCover" :size="17" class="spin" /><Save v-else :size="17" />{{ uploadingCover ? 'Subiendo portada...' : loading ? 'Guardando...' : props.catalog ? 'Guardar cambios' : 'Guardar catálogo' }}</button></div>
    </form>
  </div>
  <div v-if="activeSubmodal" class="submodal-layer" @click.self="activeSubmodal = null" @keydown.esc.stop="activeSubmodal = null">
    <section v-if="activeSubmodal === 'cover'" class="submodal" role="dialog" aria-modal="true" aria-labelledby="cover-submodal-title">
      <header><div><p class="eyebrow">Personalización</p><h3 id="cover-submodal-title">Imagen de portada</h3></div><button class="submodal-close" type="button" aria-label="Cerrar" @click="activeSubmodal = null"><X :size="18" /></button></header>
      <div class="cover-status" :class="{ added: urlFotoPortada }"><ImagePlus :size="20" /><span>{{ urlFotoPortada ? 'Hay una imagen de fondo añadida.' : 'Aún no se ha añadido una imagen de fondo.' }}</span></div>
      <label class="upload-cover" :class="{ disabled: uploadingCover }">
        <LoaderCircle v-if="uploadingCover" :size="17" class="spin" />
        <ImagePlus v-else :size="17" />
        {{ uploadingCover ? 'Subiendo imagen...' : urlFotoPortada ? 'Cambiar imagen de fondo' : 'Añadir imagen de fondo' }}
        <input type="file" accept="image/*" :disabled="uploadingCover" @change="selectCover" />
      </label>
      <p v-if="coverError" class="error">{{ coverError }}</p>
      <button v-if="urlFotoPortada" class="remove-cover" type="button" :disabled="uploadingCover" @click="urlFotoPortada = ''">Quitar imagen</button>
      <footer><button class="secondary-action" type="button" @click="activeSubmodal = null">Listo</button></footer>
    </section>
    <section v-else-if="activeSubmodal === 'tags'" class="submodal" role="dialog" aria-modal="true" aria-labelledby="tags-submodal-title">
      <header><div><p class="eyebrow">Personalización</p><h3 id="tags-submodal-title">Etiquetas <span class="tag-count">{{ etiquetaIds.length }}/2</span></h3></div><button class="submodal-close" type="button" aria-label="Cerrar" @click="activeSubmodal = null"><X :size="18" /></button></header>
      <p class="submodal-copy">Elige hasta dos etiquetas para que tus clientes encuentren este catálogo.</p>
      <div v-if="etiquetasError" class="tag-error">{{ etiquetasError }} <button type="button" @click="loadEtiquetas">Reintentar</button></div>
      <p v-else-if="etiquetasLoading" class="tag-empty"><LoaderCircle :size="15" class="spin" /> Cargando etiquetas...</p>
      <div v-else-if="etiquetas.length" class="tag-picker" aria-label="Elige hasta dos etiquetas">
        <button v-for="etiqueta in etiquetas" :key="etiqueta.id" type="button" class="tag-option" :class="{ selected: etiquetaIds.includes(etiqueta.id) }" :aria-pressed="etiquetaIds.includes(etiqueta.id)" :disabled="etiquetaIds.length >= 2 && !etiquetaIds.includes(etiqueta.id)" @click="toggleEtiqueta(etiqueta.id)"><Tag :size="13" /> {{ etiqueta.nombre }}</button>
      </div>
      <p v-else class="tag-empty">No hay etiquetas disponibles.</p>
      <div v-if="selectedTagNames.length" class="selected-tags"><span v-for="name in selectedTagNames" :key="name">{{ name }}</span></div>
      <div class="request-tag">
        <label for="requested-tag-name">¿No encuentras la etiqueta?</label>
        <div><input id="requested-tag-name" v-model="requestedTagName" type="text" maxlength="100" placeholder="Solicitar una nueva etiqueta" /><button type="button" :disabled="!requestedTagName.trim()" @click="requestTag">Solicitar</button></div>
      </div>
      <footer><button class="secondary-action" type="button" @click="activeSubmodal = null">Listo</button></footer>
    </section>
    <section v-else class="submodal" role="dialog" aria-modal="true" aria-labelledby="socials-submodal-title">
      <header><div><p class="eyebrow">Personalización</p><h3 id="socials-submodal-title">Redes sociales</h3></div><button class="submodal-close" type="button" aria-label="Cerrar" @click="activeSubmodal = null"><X :size="18" /></button></header>
      <p class="submodal-copy">Añade enlaces para que tus clientes puedan contactarte.</p>
      <div class="social-fields">
        <div class="whatsapp-field">
          <span><MessageCircle :size="15" /> WhatsApp</span>
          <div class="whatsapp-modes" role="group" aria-label="Tipo de contacto de WhatsApp">
            <button type="button" :class="{ active: whatsappMode === 'phone' }" @click="whatsappMode = 'phone'">Número</button>
            <button type="button" :class="{ active: whatsappMode === 'link' }" @click="whatsappMode = 'link'">Enlace</button>
          </div>
          <PhoneInput v-if="whatsappMode === 'phone'" v-model="socialDraft.whatsapp" label="WhatsApp" />
          <input v-else v-model="whatsappLink" type="url" placeholder="https://wa.me/..." />
          <small v-if="error && error.includes('WhatsApp')" class="social-error">{{ error }}</small>
        </div>
        <label><span><Instagram :size="15" /> Instagram</span><input v-model="socialDraft.instagram" type="text" placeholder="https://instagram.com/usuario" /></label>
        <label><span><Facebook :size="15" /> Facebook</span><input v-model="socialDraft.facebook" type="text" placeholder="https://facebook.com/usuario" /></label>
      </div>
      <footer><button class="secondary-action" type="button" @click="activeSubmodal = null">Listo</button></footer>
    </section>
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
.settings-section { margin: 22px 0 4px; padding-top: 18px; border-top: 1px solid #eee; }
.section-label { margin: 0 0 10px; color: #777; font-size: 12px; font-weight: 700; }
.settings-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 9px; }
.settings-card { display: flex; align-items: center; gap: 9px; min-width: 0; padding: 11px; border: 1px solid #e8e8e8; border-radius: 10px; background: #fff; color: #171717; text-align: left; cursor: pointer; }
.settings-card:hover { border-color: #e4b79c; background: #fffaf7; }
.settings-icon { display: grid; place-items: center; width: 34px; height: 34px; flex: 0 0 34px; border-radius: 9px; background: #fff6f0; color: #c65b19; }
.settings-copy { display: grid; gap: 4px; min-width: 0; flex: 1; }
.settings-copy strong { overflow: hidden; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.settings-copy small { overflow: hidden; color: #777; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.settings-check { flex: 0 0 auto; color: #39805b; }
.submodal-layer { position: fixed; inset: 0; z-index: 160; display: grid; place-items: center; overflow-y: auto; padding: 16px; background: rgba(0,0,0,.56); }
.submodal { display: grid; gap: 16px; width: min(460px, 100%); max-height: calc(100dvh - 32px); overflow-y: auto; padding: 22px; border: 1px solid #e8e8e8; border-radius: 14px; background: #fff; box-shadow: 0 18px 54px rgba(0,0,0,.24); }
.submodal>header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.submodal h3 { margin: 5px 0 0; color: #171717; font-size: 20px; }
.submodal-close { display: grid; place-items: center; width: 34px; height: 34px; flex: 0 0 auto; border: 0; border-radius: 8px; background: #fff6f0; color: #c65b19; cursor: pointer; }
.submodal-copy { margin: -6px 0 0; color: #777; font-size: 13px; line-height: 1.5; }
.cover-status { display: flex; align-items: center; gap: 11px; padding: 14px; border: 1px dashed #e2c6b5; border-radius: 10px; background: #fffaf7; color: #777; font-size: 13px; }
.cover-status.added { border-style: solid; background: #f5faf6; color: #39805b; }
.cover-status svg { flex: 0 0 auto; }
.upload-cover { display: inline-flex; align-items: center; gap: 7px; width: fit-content; color: #c65b19; font-size: 13px; font-weight: 700; cursor: pointer; }
.upload-cover.disabled { opacity: .65; cursor: wait; }
.upload-cover input { display: none; }
.remove-cover { justify-self: start; padding: 0; border: 0; background: transparent; color: #a8584e; font-size: 12px; font-weight: 700; cursor: pointer; }
.remove-cover:disabled { opacity: .6; cursor: wait; }
.tag-count { display: inline-grid; place-items: center; min-width: 23px; height: 23px; margin-left: 4px; padding: 0 6px; border-radius: 999px; background: #f0f0f0; color: #555; font-size: 11px; vertical-align: middle; }
.tag-picker { display:flex;flex-wrap:wrap;gap:8px; }
.tag-option { display:inline-flex;align-items:center;gap:6px;padding:8px 11px;border:1px solid #e8e8e8;border-radius:999px;background:#fafafa;color:#777;font:inherit;font-size:12px;cursor:pointer; }
.tag-option.selected { border-color:#c65b19;background:#fff6f0;color:#c65b19;font-weight:800; }
.tag-option:disabled { opacity:.45;cursor:not-allowed; }
.selected-tags { display: flex; flex-wrap: wrap; gap: 7px; }
.selected-tags span { padding: 5px 9px; border-radius: 999px; background: #fff6f0; color: #c65b19; font-size: 11px; font-weight: 700; }
.tag-empty { margin:0;color:#777;font-size:12px;line-height:1.5; }
.tag-error button { border:0;border-radius:8px;padding:10px 12px;background:#fff6f0;color:#c65b19;font-size:12px;font-weight:700;cursor:pointer; }
.tag-error { color:#a8584e;font-size:12px; }
.request-tag { display: grid; gap: 7px; padding-top: 14px; border-top: 1px solid #eee; }
.request-tag>label,.social-fields label>span,.whatsapp-field>span { color: #444; font-size: 12px; font-weight: 700; }
.request-tag>div { display: flex; gap: 8px; }
.request-tag input,.social-fields input { min-width: 0; width: 100%; padding: 10px 11px; border: 1px solid #e8e8e8; border-radius: 8px; background: #fff; color: #171717; font: inherit; font-size: 13px; }
.request-tag button { flex: 0 0 auto; padding: 9px 12px; border: 0; border-radius: 8px; background: #fff6f0; color: #c65b19; font-size: 12px; font-weight: 700; cursor: pointer; }
.request-tag button:disabled { opacity: .5; cursor: not-allowed; }
.social-fields { display: grid; gap: 13px; }
.social-fields label { display: grid; gap: 7px; }
.social-fields label>span { display: flex; align-items: center; gap: 6px; }
.social-fields label>span svg { color: #c65b19; }
.whatsapp-field { display: grid; gap: 7px; }
.whatsapp-field>span { display: flex; align-items: center; gap: 6px; }
.whatsapp-field>span svg { color: #c65b19; }
.whatsapp-modes { display: flex; gap: 6px; }
.whatsapp-modes button { border: 1px solid #e8e8e8; border-radius: 7px; padding: 6px 10px; background: #fff; color: #666; font-size: 12px; cursor: pointer; }
.whatsapp-modes button.active { border-color: #e7b08c; background: #fff6f0; color: #c65b19; font-weight: 700; }
.social-error { color: #a8584e; font-size: 12px; }
.submodal>footer { display: flex; justify-content: flex-end; padding-top: 3px; }
.form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px; }
.primary-action, .secondary-action { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 0; border-radius: 8px; padding: 12px 15px; font-weight: 700; cursor: pointer; }
.primary-action { background: #171717; color: #fff; }
.secondary-action { background: #fff6f0; color: #c65b19; }
.primary-action:disabled { opacity: .65; cursor: wait; }
.error { color: #a8584e; font-size: 14px; }
.spin { animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 560px) { .form-card { padding: 20px 17px; } .settings-grid { grid-template-columns: 1fr; } .form-actions { flex-direction: column-reverse; } .form-actions button { width: 100%; } .submodal { padding: 19px; } }
</style>