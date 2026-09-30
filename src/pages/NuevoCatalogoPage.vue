<script setup lang="ts">
import { ref } from 'vue'
import { ImagePlus, LoaderCircle, Save, X } from 'lucide-vue-next'
import { api, type Catalogo } from '../api.ts'
import { uploadCloudinaryImage } from '../cloudinary.ts'

const props = defineProps<{ usuarioId: number; catalog?: Catalogo }>()
const emit = defineEmits<{ (e: 'cancel'): void; (e: 'created'): void }>()

const nombre = ref(props.catalog?.nombre || '')
const descripcion = ref(props.catalog?.descripcion || '')
const urlFotoPortada = ref(props.catalog?.urlFotoPortada || '')
const uploadingCover = ref(false)
const loading = ref(false)
const error = ref('')

async function uploadCover(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  uploadingCover.value = true
  error.value = ''

  try {
    urlFotoPortada.value = await uploadCloudinaryImage(file, 'catalog')
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
    const payload = {
      nombre: nombre.value.trim(),
      descripcion: descripcion.value.trim(),
      urlFotoPortada: urlFotoPortada.value.trim() || null,
      ...(!props.catalog ? { etiquetaIds: [] } : {}),
    }
    if (props.catalog?.id) {
      await api.updateCatalogo(props.usuarioId, props.catalog.id, payload)
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
      <div class="form-actions"><button class="secondary-action" type="button" @click="emit('cancel')">Cancelar</button><button class="primary-action" type="submit" :disabled="loading || uploadingCover"><LoaderCircle v-if="loading || uploadingCover" :size="17" class="spin" /><Save v-else :size="17" />{{ uploadingCover ? 'Subiendo portada...' : loading ? 'Guardando...' : props.catalog ? 'Guardar cambios' : 'Guardar catálogo' }}</button></div>
    </form>
  </div>
</template>

<style scoped>
.catalog-modal-layer { position: fixed; inset: 0; z-index: 90; display: grid; place-items: center; overflow-y: auto; padding: 16px; background: rgba(16, 35, 49, .64); }
.form-card { position: relative; width: min(680px, 100%); max-height: calc(100dvh - 32px); overflow-y: auto; padding: 26px; border: 1px solid #d1dfe3; border-radius: 12px; background: #fff; box-shadow: 0 22px 70px rgba(10, 31, 44, .24); }
.form-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding-right: 40px; }
.close-modal { position: absolute; top: 18px; right: 18px; display: grid; place-items: center; width: 36px; height: 36px; border: 0; border-radius: 8px; background: #e8f2f3; color: #075a6c; cursor: pointer; }
.eyebrow { margin: 0; color: #6c8175; font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
h2 { margin: 8px 0; color: #17332a; font: 700 34px 'Space Grotesk', Arial, sans-serif; }
.muted { margin: 0 0 26px; color: #75847b; }
.field { display: grid; gap: 7px; margin-bottom: 17px; }
.field label { color: #525c55; font-size: 13px; font-weight: 600; }
.field input, .field textarea { width: 100%; border: 1px solid #d1dfe3; border-radius: 8px; padding: 12px 13px; background: #fff; color: #18323d; font: inherit; }
.field textarea { resize: vertical; }
.upload-cover { display: inline-flex; align-items: center; gap: 7px; width: fit-content; color: #075a6c; font-size: 13px; font-weight: 700; cursor: pointer; }
.upload-cover.disabled { opacity: .65; cursor: wait; }
.upload-cover input { display: none; }
.form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px; }
.primary-action, .secondary-action { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 0; border-radius: 8px; padding: 12px 15px; font-weight: 700; cursor: pointer; }
.primary-action { background: #075a6c; color: #fff; }
.secondary-action { background: #dceff0; color: #064653; }
.primary-action:disabled { opacity: .65; cursor: wait; }
.error { color: #a8584e; font-size: 14px; }
.spin { animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 560px) { .form-card { padding: 20px 17px; } .form-actions { flex-direction: column-reverse; } .form-actions button { width: 100%; } }
</style>