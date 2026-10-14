<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ImagePlus, LoaderCircle, PackagePlus, Pencil, Plus, Trash2, X } from 'lucide-vue-next'
import { api, type Producto, type Variante } from '../api.ts'
import { uploadCloudinaryImage } from '../cloudinary.ts'
import ImageCropModal from './ImageCropModal.vue'
import DeleteConfirmModal from './DeleteConfirmModal.vue'

const props = defineProps<{ product: Producto | null }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'updated'): void }>()

const variants = ref<Variante[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const showAddModal = ref(false)
const editingVariant = ref<Variante | null>(null)
const imageInput = ref<HTMLInputElement | null>(null)
const uploadingImage = ref(false)
const cropVisible = ref(false)
const pendingImage = ref<File | null>(null)
const deletingVariantId = ref<number | null>(null)
const deleteTargetVariant = ref<Variante | null>(null)
const showDeleteVariantModal = ref(false)

const deleteVariantMessage = computed(() => deleteTargetVariant.value ? '¿Eliminar la variante "' + deleteTargetVariant.value.nombre + '"? Se quitará de los catálogos y su stock dejará de formar parte del total.' : '¿Eliminar la variante seleccionada?')

const form = reactive({ nombre: '', existencia: 0, urlFoto: '' })

async function loadVariants(productId: number) {
  loading.value = true
  error.value = ''
  try {
    variants.value = await api.variantesProducto<Variante>(productId)
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'No se pudieron cargar las variantes.'
  } finally {
    loading.value = false
  }
}

watch(() => props.product, (product) => {
  variants.value = []
  error.value = ''
  form.nombre = ''
  form.existencia = 0
  form.urlFoto = ''
  editingVariant.value = null
  showAddModal.value = false
  if (product?.id) void loadVariants(product.id)
}, { immediate: true })

function openAddModal() {
  editingVariant.value = null
  form.nombre = ''
  form.existencia = 0
  form.urlFoto = ''
  error.value = ''
  showAddModal.value = true
}

function openEditModal(variant: Variante) {
  editingVariant.value = variant
  form.nombre = variant.nombre
  form.existencia = variant.existencia
  form.urlFoto = variant.urlFoto || ''
  error.value = ''
  showAddModal.value = true
}

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
  error.value = ''
  try {
    form.urlFoto = await uploadCloudinaryImage(file, 'product')
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'No se pudo subir la foto de la variante.'
  } finally {
    uploadingImage.value = false
    pendingImage.value = null
  }
}

async function saveVariant() {
  if (!props.product?.id) return
  saving.value = true
  error.value = ''
  try {
    if (editingVariant.value?.id) {
      await api.actualizarVariante<Variante>(props.product.id, editingVariant.value.id, {
        nombre: form.nombre.trim(),
        urlFoto: form.urlFoto || undefined,
      })
    } else {
      await api.crearVariante<Variante>(props.product.id, {
        nombre: form.nombre.trim(),
        existencia: form.existencia,
        urlFoto: form.urlFoto || undefined,
      })
    }

    showAddModal.value = false
    form.nombre = ''
    form.existencia = 0
    form.urlFoto = ''
    editingVariant.value = null
    await loadVariants(props.product.id)
    emit('updated')
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'No se pudo guardar la variante.'
  } finally {
    saving.value = false
  }
}

async function deleteVariant(variant: Variante) {
  if (!props.product?.id || !variant.id) return
  deleteTargetVariant.value = variant
  showDeleteVariantModal.value = true
}

async function confirmDeleteVariant() {
  if (!deleteTargetVariant.value?.id || !props.product?.id) return
  deletingVariantId.value = deleteTargetVariant.value.id
  error.value = ''
  try {
    await api.eliminarVariante(props.product.id, deleteTargetVariant.value.id)
    await loadVariants(props.product.id)
    emit('updated')
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'No se pudo eliminar la variante.'
  } finally {
    deletingVariantId.value = null
    deleteTargetVariant.value = null
    showDeleteVariantModal.value = false
  }
}
</script>

<template>
  <div v-if="props.product" class="modal-layer" @click.self="emit('close')">
    <section class="modal" role="dialog" aria-modal="true" :aria-label="`Variantes de ${props.product.nombre}`">
      <header class="modal-head">
        <div><p class="eyebrow">Producto</p><h2>Variantes</h2><p class="product-name">{{ props.product.nombre }}</p></div>
        <button class="icon-close" type="button" aria-label="Cerrar" @click="emit('close')"><X :size="18" /></button>
      </header>

      <section class="variant-list" aria-label="Variantes existentes">
        <div class="list-heading"><h3>Variantes del producto</h3><button class="primary" type="button" @click="openAddModal"><Plus :size="16" /> Añadir variante</button></div>
        <div v-if="loading" class="state"><LoaderCircle class="spin" :size="18" /> Cargando variantes...</div>
        <p v-else-if="!variants.length" class="empty">Este producto todavía no tiene variantes.</p>
        <div v-else class="table-wrap">
          <table>
            <thead><tr><th>Variante</th><th>Stock</th><th>Acciones</th></tr></thead>
            <tbody>
              <tr v-for="variant in variants" :key="variant.id">
                <td><div class="variant-name"><img v-if="variant.urlFoto" :src="variant.urlFoto" :alt="variant.nombre" /><PackagePlus v-else :size="18" /><strong>{{ variant.nombre }}</strong></div></td>
                <td>{{ variant.existencia }}</td>
                <td><div class="variant-actions"><button class="edit-button" type="button" :aria-label="`Editar ${variant.nombre}`" title="Editar variante" @click="openEditModal(variant)"><Pencil :size="15" /></button><button class="delete-button" type="button" :aria-label="`Eliminar ${variant.nombre}`" title="Eliminar variante" :disabled="deletingVariantId === variant.id" @click="deleteVariant(variant)"><LoaderCircle v-if="deletingVariantId === variant.id" class="spin" :size="15" /><Trash2 v-else :size="15" /></button></div></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <p v-if="error" class="error">{{ error }}</p>
      <footer class="actions"><button class="secondary" type="button" @click="emit('close')">Cerrar</button></footer>
    </section>

    <div v-if="showAddModal" class="modal-layer add-layer" @click.self="showAddModal = false">
      <form class="modal add-modal" role="dialog" aria-modal="true" :aria-label="editingVariant ? 'Editar variante' : 'Añadir variante'" @submit.prevent="saveVariant">
        <header class="modal-head">
          <div><p class="eyebrow">Producto</p><h2>{{ editingVariant ? 'Editar variante' : 'Añadir variante' }}</h2><p class="product-name">{{ props.product.nombre }}</p></div>
          <button class="icon-close" type="button" aria-label="Cerrar" @click="showAddModal = false"><X :size="18" /></button>
        </header>
        <div class="fields">
          <label>Nombre de la variante<input v-model="form.nombre" required maxlength="150" placeholder="Ej. Gallina ponedora" /></label>
          <label v-if="!editingVariant">Stock inicial<input v-model.number="form.existencia" required type="number" min="0" step="1" /></label>
          <p v-if="!editingVariant && !variants.length && props.product.stockActual > 0" class="info">El stock general actual se incluirá en esta primera variante.</p>
          <input ref="imageInput" class="file-input" type="file" accept="image/*" :disabled="uploadingImage" @change="selectImage" />
          <button class="image-button" type="button" :disabled="uploadingImage" @click="imageInput?.click()">
            <LoaderCircle v-if="uploadingImage" class="spin" :size="16" />
            <ImagePlus v-else :size="16" />
            {{ uploadingImage ? 'Subiendo foto...' : 'Subir foto y ajustar encuadre' }}
          </button>
          <img v-if="form.urlFoto" class="image-preview" :src="form.urlFoto" :alt="`Vista previa de ${form.nombre || 'variante'}`" />
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <footer class="actions">
          <button class="secondary" type="button" @click="showAddModal = false">Cancelar</button>
          <button class="primary" type="submit" :disabled="saving || loading || uploadingImage">
            <LoaderCircle v-if="saving" class="spin" :size="16" />
            <Plus v-else :size="16" />
            {{ saving ? 'Guardando...' : editingVariant ? 'Guardar cambios' : 'Guardar variante' }}
          </button>
        </footer>
      </form>
    </div>
  </div>
  <ImageCropModal :visible="cropVisible" :file="pendingImage" :aspect-ratio="1" title="Ajustar foto de la variante" @cancel="cropVisible = false; pendingImage = null" @crop="uploadImage" />
  <DeleteConfirmModal
    :visible="showDeleteVariantModal"
    :title="'Eliminar variante'"
    :message="deleteVariantMessage"
    :loading="deletingVariantId !== null"
    @confirm="confirmDeleteVariant"
    @cancel="showDeleteVariantModal = false; deleteTargetVariant = null"
  />
</template>

<style scoped>
.modal-layer{position:fixed;inset:0;z-index:100;display:grid;place-items:center;overflow-y:auto;padding:16px;background:rgba(0,0,0,.64)}
.modal{width:min(760px,100%);max-height:calc(100dvh - 32px);overflow-y:auto;padding:24px;border:1px solid #e8e8e8;border-radius:12px;background:#fff;box-shadow:0 22px 70px rgba(0,0,0,.2)}
.add-layer{z-index:101}
.add-modal{width:min(520px,100%)}
.modal-head,.actions{display:flex;align-items:center;justify-content:space-between;gap:14px}
.modal-head{margin-bottom:20px}
.modal-head h2{margin:6px 0;color:#171717;font-size:23px}
.eyebrow{margin:0;color:#c65b19;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
.icon-close{display:grid;place-items:center;width:36px;height:36px;flex:0 0 auto;border:0;border-radius:8px;background:#fff6f0;color:#c65b19;cursor:pointer}
.product-name{margin:5px 0 0;color:#777}
.variant-list{padding:16px;border:1px solid #e8e8e8;border-radius:10px}
.list-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
.variant-list h3{margin:0;color:#171717;font-size:16px}
.variant-name{display:flex;align-items:center;gap:9px}
.variant-name img{width:42px;height:42px;border-radius:6px;object-fit:cover;background:#f0f0f0}
.edit-button{display:grid;place-items:center;width:32px;height:32px;border:0;border-radius:7px;background:#fff6f0;color:#c65b19;cursor:pointer}
.variant-actions{display:flex;gap:7px}
.delete-button{display:grid;place-items:center;width:32px;height:32px;border:0;border-radius:7px;background:#fff2ef;color:#a23d31;cursor:pointer}
.delete-button:disabled{opacity:.55;cursor:wait}
.fields{display:grid;gap:12px}
.fields label{display:grid;gap:7px;color:#333;font-size:13px;font-weight:700}
.fields input{width:100%;min-width:0;padding:10px;border:1px solid #e8e8e8;border-radius:8px;color:#171717;font:inherit;font-weight:400}
.fields .file-input{display:none}
.image-button{display:inline-flex;align-items:center;justify-self:start;gap:7px;padding:9px 12px;border:0;border-radius:8px;background:#fff6f0;color:#c65b19;font:inherit;font-weight:700;cursor:pointer}
.image-button:disabled{opacity:.6;cursor:wait}
.image-preview{width:100%;max-height:180px;border-radius:8px;object-fit:contain;background:#f0f0f0}
.table-wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse;text-align:left}
th,td{padding:10px;border-bottom:1px solid #edf1ed;white-space:nowrap}
th{color:#777;font-size:11px;text-transform:uppercase}
.empty,.state{color:#777}
.state{display:flex;align-items:center;gap:8px}
.actions{justify-content:flex-end;margin-top:16px}
.primary,.secondary{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:0;border-radius:8px;padding:10px 14px;font-weight:700;cursor:pointer}
.primary{background:#171717;color:#fff}.secondary{background:#fff6f0;color:#c65b19}
.primary:disabled{opacity:.6;cursor:wait}
.error{color:#a8584e}.info{margin:0;color:#777;font-size:13px}
.spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:560px){.modal{padding:18px}.list-heading{align-items:flex-start;flex-direction:column}.list-heading .primary{width:100%;justify-content:center}.actions{flex-direction:column-reverse}.actions button{width:100%}}
</style>
