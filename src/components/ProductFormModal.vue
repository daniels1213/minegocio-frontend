<script setup lang="ts">
import { ref } from 'vue'
import { LoaderCircle, Save, X } from 'lucide-vue-next'
import { api } from '../api.ts'
import { uploadCloudinaryImage } from '../cloudinary.ts'
import ImageCropModal from './ImageCropModal.vue'

defineProps<{ visible: boolean }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'created', productId: number, withSupplier: boolean): void }>()
const nombre = ref('')
const descripcion = ref('')
const urlFoto = ref('')
const uploadingPhoto = ref(false)
const cropVisible = ref(false)
const pendingImage = ref<File | null>(null)
const precioVenta = ref<number | null>(null)
const withSupplier = ref(false)
const loading = ref(false)
const error = ref('')

function selectPhoto(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  pendingImage.value = file
  cropVisible.value = true
  input.value = ''
}

async function uploadPhoto(file: File) {
  cropVisible.value = false
  uploadingPhoto.value = true
  error.value = ''
  try {
    urlFoto.value = await uploadCloudinaryImage(file, 'product')
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'No se pudo subir la imagen del producto.'
  } finally {
    uploadingPhoto.value = false
    pendingImage.value = null
  }
}

async function save() {
  if (!nombre.value.trim() || precioVenta.value === null || precioVenta.value < 0) {
    error.value = 'Nombre y precio de venta válido son obligatorios.'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const product = await api.create<{ id: number }>('productos', { nombre: nombre.value.trim(), descripcion: descripcion.value.trim(), urlFoto: urlFoto.value || undefined, precioVenta: precioVenta.value })
    if (!product.id) throw new Error('El backend no devolvió el producto creado.')
    emit('created', product.id, withSupplier.value)
    emit('close')
  } catch (reason) { error.value = reason instanceof Error ? reason.message : 'No se pudo crear el producto.' }
  finally { loading.value = false }
}
</script>

<template>
  <div v-if="visible" class="modal-layer"><div class="modal"><div class="modal-head"><div><p class="eyebrow">Productos</p><h3>Nuevo producto</h3></div><button type="button" @click="emit('close')"><X :size="18" /></button></div><div class="fields"><label>Nombre<input v-model="nombre" type="text" /></label><label>Descripción<textarea v-model="descripcion" rows="3" /></label><label>Foto del producto<input type="file" accept="image/*" :disabled="uploadingPhoto" @change="selectPhoto" /></label><img v-if="urlFoto" class="product-preview" :src="urlFoto" alt="Vista previa del producto" /><label>Precio de venta<input v-model.number="precioVenta" type="number" min="0" step="0.01" /></label><p class="stock-note">El producto se crea sin stock. Registra existencias en sus variantes o desde un movimiento de inventario.</p><label class="check"><input v-model="withSupplier" type="checkbox" /> Añadir información de proveedor después de guardar</label></div><p v-if="error" class="error">{{ error }}</p><div class="actions"><button class="secondary" type="button" @click="emit('close')">Cancelar</button><button class="primary" type="button" :disabled="loading || uploadingPhoto" @click="save"><LoaderCircle v-if="loading || uploadingPhoto" class="spin" :size="16" /><Save v-else :size="16" /> {{ uploadingPhoto ? 'Subiendo foto...' : 'Crear producto' }}</button></div></div></div>
  <ImageCropModal :visible="cropVisible" :file="pendingImage" @cancel="cropVisible = false; pendingImage = null" @crop="uploadPhoto" />
</template>

<style scoped>
.modal-layer{position:fixed;inset:0;z-index:30;display:grid;place-items:center;padding:20px;background:rgba(0,0,0,.66)}.modal{width:min(600px,100%);max-height:calc(100dvh - 40px);overflow-y:auto;padding:24px;border-radius:16px;background:#fff;box-shadow:0 20px 60px rgba(0,0,0,.2)}.modal-head,.actions{display:flex;align-items:center;justify-content:space-between;gap:14px}.modal-head h3{margin:6px 0 0;color:#171717;font-size:24px}.modal-head button{border:0;background:transparent;color:#777;cursor:pointer}.eyebrow{margin:0;color:#777;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.fields{display:grid;gap:14px;margin:24px 0}.fields label{display:grid;gap:7px;color:#333;font-size:13px;font-weight:700}.fields input,.fields textarea{padding:11px;border:1px solid #e8e8e8;border-radius:8px;font:inherit;font-weight:400}.stock-note{margin:0;color:#777;font-size:13px}.check{display:flex!important;align-items:center;gap:8px}.check input{accent-color:#c65b19}.primary,.secondary{display:inline-flex;align-items:center;gap:7px;border:0;border-radius:9px;padding:11px 14px;font-weight:700;cursor:pointer}.primary{background:#171717;color:#fff}.secondary{background:#fff6f0;color:#c65b19}.error{color:#a8584e}.spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
</style>