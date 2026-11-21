<script setup lang="ts">
import { ref } from 'vue'
import { ImagePlus, LoaderCircle, Plus, Save, Trash2, X } from 'lucide-vue-next'
import { api, type Moneda } from '../api.ts'
import { uploadCloudinaryImage } from '../cloudinary.ts'
import ImageCropModal from './ImageCropModal.vue'

defineProps<{ visible: boolean }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'created', productId: number, withSupplier: boolean): void }>()
const nombre = ref('')
const descripcion = ref('')
const withSupplier = ref(false)
const precioVenta = ref<number | null>(null)
const monedaVenta = ref<Moneda>('CUP')
const urlFoto = ref('')
const productImageInput = ref<HTMLInputElement | null>(null)
const variantImageInputs = ref<Array<HTMLInputElement | null>>([])
const uploadingImage = ref(false)
const cropVisible = ref(false)
const pendingImage = ref<File | null>(null)
const cropTarget = ref<'product' | number>('product')
const variants = ref<Array<{ nombre: string; existencia: number; urlFoto: string }>>([])
const loading = ref(false)
const error = ref('')

function addVariant() {
  variants.value.push({ nombre: '', existencia: 0, urlFoto: '' })
}

function removeVariant(index: number) {
  variants.value.splice(index, 1)
}

function selectProductImage(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  pendingImage.value = file
  cropTarget.value = 'product'
  cropVisible.value = true
  input.value = ''
}

function selectVariantImage(index: number, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  pendingImage.value = file
  cropTarget.value = index
  cropVisible.value = true
  input.value = ''
}

async function uploadImage(file: File) {
  cropVisible.value = false
  uploadingImage.value = true
  error.value = ''
  try {
    const uploadedUrl = await uploadCloudinaryImage(file, 'product')
    if (cropTarget.value === 'product') urlFoto.value = uploadedUrl
    else variants.value[cropTarget.value].urlFoto = uploadedUrl
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'No se pudo subir la imagen.'
  } finally {
    uploadingImage.value = false
    pendingImage.value = null
  }
}

async function save() {
  if (!nombre.value.trim()) {
    error.value = 'El nombre del producto es obligatorio.'
    return
  }
  if (precioVenta.value === null || precioVenta.value < 0) {
    error.value = 'El precio de venta es obligatorio y no puede ser negativo.'
    return
  }
  if (variants.value.some((variant) => !variant.nombre.trim())) {
    error.value = 'Todas las variantes deben tener un nombre.'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const product = await api.create<{ id: number }>('productos', {
      nombre: nombre.value.trim(),
      descripcion: descripcion.value.trim(),
      urlFoto: urlFoto.value || null,
      precioVenta: precioVenta.value,
      monedaVenta: monedaVenta.value,
    })
    if (!product.id) throw new Error('El backend no devolvió el producto creado.')
    for (const variant of variants.value) {
      await api.crearVariante(product.id, {
        nombre: variant.nombre.trim(),
        existencia: variant.existencia,
        urlFoto: variant.urlFoto || undefined,
      })
    }
    emit('created', product.id, withSupplier.value)
    emit('close')
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'No se pudo crear el producto.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div v-if="visible" class="modal-layer" @click.self="emit('close')">
    <form class="modal" role="dialog" aria-modal="true" aria-label="Nuevo producto" @submit.prevent="save">
      <header class="modal-head">
        <div><p class="eyebrow">Productos</p><h3>Nuevo producto</h3></div>
        <button type="button" aria-label="Cerrar" @click="emit('close')"><X :size="18" /></button>
      </header>
      <div class="fields">
        <label>Nombre<input v-model="nombre" type="text" required /></label>
        <label>Descripción<textarea v-model="descripcion" rows="3" /></label>
        <div class="price-grid">
          <label>Precio de venta<input v-model.number="precioVenta" type="number" min="0" step="0.01" required /></label>
          <label>Moneda
            <select v-model="monedaVenta"><option value="CUP">CUP</option><option value="USD">USD</option></select>
          </label>
        </div>
        <div class="image-field">
          <input ref="productImageInput" class="file-input" type="file" accept="image/*" :disabled="uploadingImage" @change="selectProductImage" />
          <button class="image-button" type="button" :disabled="uploadingImage" @click="productImageInput?.click()"><ImagePlus :size="16" /> Subir foto del producto</button>
          <img v-if="urlFoto" class="image-preview" :src="urlFoto" :alt="`Vista previa de ${nombre || 'producto'}`" />
        </div>
        <section class="variants-section">
          <div class="variants-heading"><strong>Variantes</strong><button class="add-variant" type="button" @click="addVariant"><Plus :size="15" /> Añadir variante</button></div>
          <p v-if="!variants.length" class="variant-empty">Este producto no tiene variantes.</p>
          <div v-for="(variant, index) in variants" :key="index" class="variant-row">
            <label>Nombre<input v-model="variant.nombre" type="text" required maxlength="150" placeholder="Ej. Tamaño grande" /></label>
            <label>Stock<input v-model.number="variant.existencia" type="number" min="0" step="1" required /></label>
            <div class="variant-image">
              <input :ref="(el) => { variantImageInputs[index] = el as HTMLInputElement }" class="file-input" type="file" accept="image/*" :disabled="uploadingImage" @change="selectVariantImage(index, $event)" />
              <button type="button" :disabled="uploadingImage" @click="variantImageInputs[index]?.click()">Foto</button>
              <img v-if="variant.urlFoto" :src="variant.urlFoto" :alt="variant.nombre || 'Variante'" />
            </div>
            <button class="remove-variant" type="button" :aria-label="`Eliminar variante ${index + 1}`" @click="removeVariant(index)"><Trash2 :size="15" /></button>
          </div>
        </section>
        <label class="check"><input v-model="withSupplier" type="checkbox" /> Añadir información del proveedor después de guardar</label>
      </div>
      <p v-if="error" class="error">{{ error }}</p>
      <div class="actions">
        <button class="secondary" type="button" @click="emit('close')">Cancelar</button>
        <button class="primary" type="submit" :disabled="loading">
          <LoaderCircle v-if="loading" class="spin" :size="16" /><Save v-else :size="16" />
          {{ loading ? 'Creando...' : 'Crear producto' }}
        </button>
      </div>
    </form>
  </div>
  <ImageCropModal :visible="cropVisible" :file="pendingImage" :aspect-ratio="1" :title="cropTarget === 'product' ? 'Ajustar foto del producto' : 'Ajustar foto de la variante'" @cancel="cropVisible = false; pendingImage = null" @crop="uploadImage" />
</template>

<style scoped>
.modal-layer{position:fixed;inset:0;z-index:30;display:grid;place-items:center;padding:20px;background:rgba(0,0,0,.66)}.modal{width:min(680px,100%);max-height:calc(100dvh - 40px);overflow-y:auto;padding:24px;border-radius:16px;background:#fff;box-shadow:0 20px 60px rgba(0,0,0,.2)}.modal-head,.actions{display:flex;align-items:center;justify-content:space-between;gap:14px}.modal-head h3{margin:6px 0 0;color:#171717;font-size:24px}.modal-head button{border:0;background:transparent;color:#777;cursor:pointer}.eyebrow{margin:0;color:#777;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.fields{display:grid;gap:14px;margin:24px 0}.fields label{display:grid;gap:7px;color:#333;font-size:13px;font-weight:700}.fields input,.fields textarea,.fields select{width:100%;min-width:0;padding:11px;border:1px solid #e8e8e8;border-radius:8px;font:inherit;font-weight:400;background:#fff}.price-grid{display:grid;grid-template-columns:minmax(0,1fr) 180px;gap:12px}.check{display:flex!important;align-items:center;gap:8px}.check input{width:auto}.primary,.secondary{display:inline-flex;align-items:center;gap:7px;border:0;border-radius:9px;padding:11px 14px;font-weight:700;cursor:pointer}.primary{background:#171717;color:#fff}.secondary{background:#fff6f0;color:#c65b19}.error{color:#a8584e}.spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.image-field{display:grid;gap:8px}.file-input{display:none}.image-button,.add-variant{display:inline-flex;align-items:center;justify-content:center;gap:7px;justify-self:start;padding:9px 12px;border:0;border-radius:8px;background:#fff6f0;color:#c65b19;font:inherit;font-weight:700}.image-preview{width:100%;height:180px;border-radius:8px;object-fit:cover}.variants-section{display:grid;gap:10px;padding:14px;border:1px solid #eee;border-radius:10px}.variants-heading{display:flex;align-items:center;justify-content:space-between}.variant-empty{margin:0;color:#777;font-size:13px}.variant-row{display:grid;grid-template-columns:minmax(0,1fr) 110px 80px 36px;align-items:end;gap:8px;padding:8px;border:1px solid #eee;border-radius:8px}.variant-row label{min-width:0}.variant-row input{box-sizing:border-box}.variant-image{display:grid;gap:5px}.variant-image button,.remove-variant{height:38px;border:0;border-radius:8px;background:#fff6f0;color:#c65b19;font-weight:700}.variant-image img{width:38px;height:38px;border-radius:6px;object-fit:cover}.remove-variant{display:grid;place-items:center;color:#a23d31;background:#fff2ef}@media(max-width:560px){.price-grid{grid-template-columns:1fr}.variant-row{grid-template-columns:minmax(0,1fr) 90px 36px}.variant-row .variant-image{grid-column:1;grid-row:2}.variant-row .remove-variant{grid-column:3;grid-row:1}.actions{flex-direction:column-reverse}.actions button{width:100%}}
</style>