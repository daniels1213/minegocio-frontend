<script setup lang="ts">
import { ref, watch } from 'vue'
import { ImagePlus, LoaderCircle, Save, X } from 'lucide-vue-next'
import type { Producto } from '../api.ts'
import { uploadCloudinaryImage } from '../cloudinary.ts'
import ImageCropModal from './ImageCropModal.vue'

const props = defineProps<{ product: Producto | null; saving: boolean; error: string }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', value: { nombre: string; descripcion: string; precioVenta: number; urlFoto: string }): void
}>()
const form = ref({ nombre: '', descripcion: '', precioVenta: 0, urlFoto: '' })
const imageInput = ref<HTMLInputElement | null>(null)
const uploadingImage = ref(false)
const imageError = ref('')
const cropVisible = ref(false)
const pendingImage = ref<File | null>(null)

function selectImage(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  pendingImage.value = file
  cropVisible.value = true
  input.value = ''
}

async function uploadImage(file: File) {
  cropVisible.value = false
  uploadingImage.value = true
  imageError.value = ''
  try {
    form.value.urlFoto = await uploadCloudinaryImage(file, 'product')
  } catch (reason) {
    imageError.value = reason instanceof Error ? reason.message : 'No se pudo subir la imagen del producto.'
  } finally {
    uploadingImage.value = false
    pendingImage.value = null
  }
}

watch(() => props.product, (product) => {
  form.value = {
    nombre: product?.nombre || '',
    descripcion: product?.descripcion || '',
    precioVenta: product?.precioVenta || 0,
    urlFoto: product?.urlFoto || '',
  }
}, { immediate: true })
</script>

<template>
  <div v-if="props.product" class="modal-layer" @click.self="emit('close')">
    <form class="modal" role="dialog" aria-modal="true" aria-label="Editar producto" @submit.prevent="emit('save', form)">
      <header class="modal-head"><div><p class="eyebrow">Productos</p><h2>Editar información</h2></div><button class="icon-close" type="button" aria-label="Cerrar" @click="emit('close')"><X :size="18" /></button></header>
      <div class="fields">
        <label>Nombre<input v-model="form.nombre" required type="text" /></label>
        <label>Descripción<textarea v-model="form.descripcion" rows="3" /></label>
        <label>Precio de venta<input v-model.number="form.precioVenta" required type="number" min="0" step="0.01" /></label>
        <div class="image-field">
          <input ref="imageInput" class="file-input" type="file" accept="image/*" :disabled="uploadingImage" @change="selectImage" />
          <button class="image-button" type="button" :disabled="uploadingImage" @click="imageInput?.click()">
            <LoaderCircle v-if="uploadingImage" class="spin" :size="16" />
            <ImagePlus v-else :size="16" />
            {{ uploadingImage ? 'Subiendo imagen...' : 'Subir imagen y ajustar encuadre' }}
          </button>
          <img v-if="form.urlFoto" class="image-preview" :src="form.urlFoto" :alt="`Vista previa de ${form.nombre || 'producto'}`" />
        </div>
      </div>
      <p v-if="imageError" class="error">{{ imageError }}</p>
      <p v-if="props.error" class="error">{{ props.error }}</p>
      <footer class="actions"><button class="secondary" type="button" @click="emit('close')">Cancelar</button><button class="primary" type="submit" :disabled="props.saving || uploadingImage"><Save :size="16" /> {{ props.saving ? 'Guardando...' : 'Guardar cambios' }}</button></footer>
    </form>
  </div>
  <ImageCropModal :visible="cropVisible" :file="pendingImage" :aspect-ratio="1" title="Ajustar foto del producto" @cancel="cropVisible = false; pendingImage = null" @crop="uploadImage" />
</template>

<style scoped>
.modal-layer{position:fixed;inset:0;z-index:100;display:grid;place-items:center;overflow-y:auto;padding:16px;background:rgba(0,0,0,.64)}
.modal{width:min(520px,100%);max-height:calc(100dvh - 32px);overflow-y:auto;padding:24px;border:1px solid #e8e8e8;border-radius:12px;background:#fff;box-shadow:0 22px 70px rgba(0,0,0,.2)}
.modal-head,.actions{display:flex;align-items:center;justify-content:space-between;gap:14px}
.modal-head{margin-bottom:20px}
.modal-head h2{margin:6px 0;color:#171717;font-size:23px}
.eyebrow{margin:0;color:#c65b19;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
.icon-close{display:grid;place-items:center;width:36px;height:36px;flex:0 0 auto;border:0;border-radius:8px;background:#fff6f0;color:#c65b19}
.fields{display:grid;gap:14px;margin:20px 0}
.fields label{display:grid;gap:7px;color:#333;font-size:13px;font-weight:700}
.fields input,.fields textarea{width:100%;min-width:0;padding:11px;border:1px solid #e8e8e8;border-radius:8px;color:#171717;font:inherit;font-weight:400}
.fields textarea{resize:vertical}
.image-field{display:grid;gap:8px;color:#333;font-size:13px;font-weight:700}
.file-input{display:none}
.image-button{display:inline-flex;align-items:center;justify-content:center;justify-self:start;gap:7px;padding:9px 12px;border:0;border-radius:8px;background:#fff6f0;color:#c65b19;font:inherit;font-weight:700;cursor:pointer}
.image-button:disabled{opacity:.6;cursor:wait}
.image-preview{width:100%;max-height:180px;border-radius:8px;object-fit:contain;background:#f0f0f0}
.primary,.secondary{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:0;border-radius:8px;padding:11px 14px;font-weight:700}
.primary{background:#171717;color:#fff}.secondary{background:#fff6f0;color:#c65b19}
.error{color:#a8584e}
.spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:560px){.modal{padding:18px}.actions{flex-direction:column-reverse}.actions button{width:100%}}
</style>
