<script setup lang="ts">
import { ref } from 'vue'
import { ArrowLeft, ImagePlus, LoaderCircle, Save } from 'lucide-vue-next'
import { api } from '../api.ts'

const props = defineProps<{ usuarioId: number }>()
const emit = defineEmits<{ (e: 'cancel'): void; (e: 'created'): void }>()

const nombre = ref('')
const descripcion = ref('')
const urlFotoPortada = ref('')
const uploadingCover = ref(false)
const loading = ref(false)
const error = ref('')

async function uploadCover(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
  if (!cloudName || !uploadPreset) {
    error.value = 'Falta configurar Cloudinary en el archivo .env.'
    return
  }

  uploadingCover.value = true
  error.value = ''

  try {
    const body = new FormData()
    body.append('file', file)
    body.append('upload_preset', uploadPreset)
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body,
    })
    const result = await response.json()
    if (!response.ok || !result.secure_url) {
      throw new Error(result.error?.message || 'No se pudo subir la portada.')
    }
    urlFotoPortada.value = result.secure_url
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'No se pudo subir la portada.'
  } finally {
    uploadingCover.value = false
    input.value = ''
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
    await api.createCatalogo(props.usuarioId, {
      nombre: nombre.value.trim(),
      descripcion: descripcion.value.trim(),
      urlFotoPortada: urlFotoPortada.value.trim() || null,
      etiquetaIds: [],
    })
    emit('created')
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'No se pudo crear el catálogo.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="create-page">
    <button class="back-action" type="button" @click="emit('cancel')"><ArrowLeft :size="17" /> Volver a mis catálogos</button>
    <div class="form-card">
      <p class="eyebrow">Nuevo catálogo</p>
      <h2>Crear catálogo</h2>
      <p class="muted">Define la información básica de tu nuevo catálogo.</p>
      <div class="field"><label for="catalog-name">Nombre</label><input id="catalog-name" v-model="nombre" type="text" required /></div>
      <div class="field"><label for="catalog-description">Descripción</label><textarea id="catalog-description" v-model="descripcion" rows="4"></textarea></div>
      <div class="field">
        <label for="catalog-cover">Portada</label>
        <input id="catalog-cover" v-model="urlFotoPortada" type="url" placeholder="https://..." />
        <label class="upload-cover" :class="{ disabled: uploadingCover }">
          <LoaderCircle v-if="uploadingCover" :size="17" class="spin" />
          <ImagePlus v-else :size="17" />
          {{ uploadingCover ? 'Subiendo imagen...' : 'Subir portada' }}
          <input type="file" accept="image/*" :disabled="uploadingCover" @change="uploadCover" />
        </label>
      </div>
      <p v-if="error" class="error">{{ error }}</p>
      <button class="primary-action" type="button" :disabled="loading" @click="createCatalog"><Save :size="17" />{{ loading ? 'Guardando...' : 'Guardar catálogo' }}</button>
    </div>
  </section>
</template>

<style scoped>
.create-page { max-width: 680px; margin: 0 auto; padding: 34px 0; }
.back-action { display: inline-flex; align-items: center; gap: 7px; border: 0; background: transparent; color: #1a7655; font-weight: 700; cursor: pointer; }
.form-card { margin-top: 24px; padding: 28px; border: 1px solid #e3e9e2; border-radius: 16px; background: #fff; }
.eyebrow { margin: 0; color: #6c8175; font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
h2 { margin: 8px 0; color: #17332a; font: 700 34px 'Space Grotesk', Arial, sans-serif; }
.muted { margin: 0 0 26px; color: #75847b; }
.field { display: grid; gap: 7px; margin-bottom: 17px; }
.field label { color: #525c55; font-size: 13px; font-weight: 600; }
.field input, .field textarea { width: 100%; border: 1px solid #dfe5df; border-radius: 8px; padding: 12px 13px; background: #fff; color: #20262d; font: inherit; }
.field textarea { resize: vertical; }
.upload-cover { display: inline-flex; align-items: center; gap: 7px; width: fit-content; color: #1a7655; font-size: 13px; font-weight: 700; cursor: pointer; }
.upload-cover.disabled { opacity: .65; cursor: wait; }
.upload-cover input { display: none; }
.primary-action { display: inline-flex; align-items: center; gap: 8px; border: 0; border-radius: 10px; padding: 12px 15px; background: #1a5f47; color: #fff; font-weight: 700; cursor: pointer; }
.primary-action:disabled { opacity: .65; cursor: wait; }
.error { color: #a8584e; font-size: 14px; }
.spin { animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>