<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ImagePlus, Layers, LoaderCircle, Pencil, Plus, Save, Store, Trash2, X } from 'lucide-vue-next'
import { api, type Catalogo, type CatalogoProducto, type Combo, type Producto } from '../api.ts'
import { uploadCloudinaryImage } from '../cloudinary.ts'
import ImageCropModal from '../components/ImageCropModal.vue'
import DeleteConfirmModal from '../components/DeleteConfirmModal.vue'

const props = withDefaults(defineProps<{
  usuarioId?: number
  isAdmin?: boolean
}>(), {
  isAdmin: false,
})

const products = ref<Producto[]>([])
const combos = ref<Combo[]>([])
const loading = ref(false)
const saving = ref(false)
const deletingId = ref<number | null>(null)
const deleteTarget = ref<Combo | null>(null)
const showDeleteModal = ref(false)
const error = ref('')
const showForm = ref(false)
const showCatalogPicker = ref(false)
const comboToAdd = ref<Combo | null>(null)
const catalogs = ref<Catalogo[]>([])
const selectedCatalogId = ref<number | null>(null)
const catalogsLoading = ref(false)
const addingToCatalog = ref(false)
const catalogError = ref('')
const editingId = ref<number | null>(null)
const uploadingPhoto = ref(false)
const cropVisible = ref(false)
const pendingImage = ref<File | null>(null)
const imageInput = ref<HTMLInputElement | null>(null)
const form = reactive({
  nombre: '',
  urlFoto: '',
  precio: 0,
  componentes: [] as Array<{ productoId: number | null; cantidad: number }>,
})

const selectedProductIds = computed(() => new Set(form.componentes.map((item) => item.productoId).filter((id): id is number => id !== null)))

async function load() {
  loading.value = true
  error.value = ''
  try {
    ;[products.value, combos.value] = await Promise.all([
      api.list<Producto>('productos'),
      props.isAdmin && props.usuarioId
        ? api.combosAdminUsuario<Combo>(props.usuarioId)
        : api.combos<Combo>(),
    ])
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'No se pudieron cargar los combos.'
  } finally {
    loading.value = false
  }
}

async function openCatalogPicker(combo: Combo) {
  if (!combo.id) return
  comboToAdd.value = combo
  selectedCatalogId.value = null
  catalogError.value = ''
  showCatalogPicker.value = true
  catalogsLoading.value = true
  try {
    catalogs.value = props.isAdmin && props.usuarioId
      ? await api.catalogosAdminUsuario<Catalogo>(props.usuarioId)
      : props.usuarioId
        ? await api.catalogosUsuario<Catalogo>(props.usuarioId)
        : []
  } catch (reason) {
    catalogError.value = reason instanceof Error ? reason.message : 'No se pudieron cargar los catálogos.'
  } finally {
    catalogsLoading.value = false
  }
}

async function addToCatalog() {
  const comboId = comboToAdd.value?.id
  const catalogId = selectedCatalogId.value
  if (!comboId || !catalogId) {
    catalogError.value = 'Selecciona un catálogo.'
    return
  }

  addingToCatalog.value = true
  catalogError.value = ''
  try {
    const catalogItems = await api.catalogoProductos<CatalogoProducto>(catalogId)
    if (catalogItems.some((item) => item.comboId === comboId)) {
      catalogError.value = 'Este combo ya está en el catálogo seleccionado.'
      return
    }
    await api.agregarComboCatalogo(catalogId, {
      comboId,
      orden: catalogItems.length + 1,
    })
    showCatalogPicker.value = false
    comboToAdd.value = null
  } catch (reason) {
    catalogError.value = reason instanceof Error ? reason.message : 'No se pudo añadir el combo al catálogo.'
  } finally {
    addingToCatalog.value = false
  }
}

function resetForm() {
  editingId.value = null
  form.nombre = ''
  form.urlFoto = ''
  form.precio = 0
  form.componentes = [{ productoId: null, cantidad: 1 }]
  error.value = ''
}

function openCreate() {
  resetForm()
  showForm.value = true
}

function openEdit(combo: Combo) {
  if (!combo.id) return
  resetForm()
  editingId.value = combo.id
  form.nombre = combo.nombre
  form.urlFoto = combo.urlFoto || ''
  form.precio = combo.precio
  form.componentes = combo.componentes.map((item) => ({ productoId: item.productoId, cantidad: item.cantidad }))
  showForm.value = true
}

function addComponent() {
  form.componentes.push({ productoId: null, cantidad: 1 })
}

function removeComponent(index: number) {
  if (form.componentes.length > 1) form.componentes.splice(index, 1)
}

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
    form.urlFoto = await uploadCloudinaryImage(file, 'product')
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'No se pudo subir la foto del combo.'
  } finally {
    uploadingPhoto.value = false
    pendingImage.value = null
  }
}

async function save() {
  if (!form.nombre.trim() || form.precio < 0 || !form.componentes.length
    || form.componentes.some((item) => !item.productoId || item.cantidad < 1)) {
    error.value = 'Completa el nombre, el precio y todos los productos con cantidades válidas.'
    return
  }
  if (new Set(form.componentes.map((item) => item.productoId)).size !== form.componentes.length) {
    error.value = 'No repitas productos dentro del combo.'
    return
  }
  saving.value = true
  error.value = ''
  try {
    const payload = {
      nombre: form.nombre.trim(),
      urlFoto: form.urlFoto || null,
      precio: form.precio,
      componentes: form.componentes.map((item) => ({ productoId: item.productoId, cantidad: item.cantidad })),
    }
    if (editingId.value) await api.actualizarCombo(editingId.value, payload)
    else await api.crearCombo(payload)
    showForm.value = false
    await load()
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'No se pudo guardar el combo.'
  } finally {
    saving.value = false
  }
}

async function remove(combo: Combo) {
  deleteTarget.value = combo
  showDeleteModal.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value?.id) return
  deletingId.value = deleteTarget.value.id
  error.value = ''
  try {
    await api.eliminarCombo(deleteTarget.value.id)
    combos.value = combos.value.filter((item) => item.id !== deleteTarget.value!.id)
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'No se pudo eliminar el combo.'
  } finally {
    deletingId.value = null
    deleteTarget.value = null
    showDeleteModal.value = false
  }
}

onMounted(() => void load())
</script>

<template>
  <section class="combos-page">
    <div class="heading">
      <div><p class="eyebrow">Inventario</p><h2>Combos</h2><p class="muted">Crea ofertas con precio propio y productos de tu inventario.</p></div>
      <button class="primary create-button !w-auto !p-1" type="button" title="Crear combo" aria-label="Crear combo" @click="openCreate"> Crear Combo<Plus :size="19" /></button>
    </div>
    <p v-if="error && !showForm" class="error">{{ error }}</p>
    <div v-if="loading" class="state"><LoaderCircle class="spin" :size="22" /> Cargando combos...</div>
    <div v-else-if="!combos.length" class="state empty"><Layers :size="30" /><p>Aún no has creado combos.</p><button class="primary" type="button" @click="openCreate"><Plus :size="16" /> Crear el primero</button></div>
    <div v-else class="combo-grid">
      <article v-for="combo in combos" :key="combo.id" class="combo-card">
        <div class="combo-image"><img v-if="combo.urlFoto" :src="combo.urlFoto" :alt="combo.nombre" /><Layers v-else :size="32" /></div>
        <div class="combo-copy">
          <div class="combo-title"><h3>{{ combo.nombre }}</h3><strong>{{ combo.precio }}</strong></div>
          <ul><li v-for="component in combo.componentes" :key="component.productoId">{{ component.cantidad }} × {{ component.productoNombre }}</li></ul>
          <div class="actions">
            <button class="catalog-action" type="button" title="Añadir a un catálogo" :aria-label="`Añadir ${combo.nombre} a un catálogo`" @click="openCatalogPicker(combo)"><Store :size="16" /></button>
            <button class="secondary icon-action" type="button" title="Editar combo" :aria-label="`Editar ${combo.nombre}`" @click="openEdit(combo)"><Pencil :size="16" /></button>
            <button class="danger icon-action" type="button" :title="`Eliminar ${combo.nombre}`" :aria-label="`Eliminar ${combo.nombre}`" :disabled="deletingId === combo.id" @click="remove(combo)"><LoaderCircle v-if="deletingId === combo.id" class="spin" :size="16" /><Trash2 v-else :size="16" /></button>
          </div>
        </div>
      </article>
    </div>

    <div v-if="showCatalogPicker" class="modal-layer" @click.self="showCatalogPicker = false">
      <section class="modal catalog-modal" role="dialog" aria-modal="true" aria-labelledby="add-combo-catalog-title">
        <header><div><p class="eyebrow">Catálogo</p><h3 id="add-combo-catalog-title">Añadir combo al catálogo</h3></div><button class="close" type="button" aria-label="Cerrar" @click="showCatalogPicker = false"><X :size="18" /></button></header>
        <p class="catalog-help">Elige dónde publicar «{{ comboToAdd?.nombre }}».</p>
        <div v-if="catalogsLoading" class="catalog-state"><LoaderCircle class="spin" :size="20" /> Cargando catálogos...</div>
        <label v-else-if="catalogs.length" class="catalog-field">Catálogo
          <select v-model.number="selectedCatalogId">
            <option :value="null">Selecciona un catálogo</option>
            <option v-for="catalog in catalogs" :key="catalog.id" :value="catalog.id">{{ catalog.nombre }}</option>
          </select>
        </label>
        <p v-else-if="!catalogError" class="catalog-state">Todavía no tienes catálogos disponibles.</p>
        <p v-if="catalogError" class="error">{{ catalogError }}</p>
        <footer><button class="secondary" type="button" @click="showCatalogPicker = false">Cancelar</button><button class="primary" type="button" :disabled="catalogsLoading || addingToCatalog || !selectedCatalogId" @click="addToCatalog"><LoaderCircle v-if="addingToCatalog" class="spin" :size="16" /><Store v-else :size="16" />{{ addingToCatalog ? 'Añadiendo...' : 'Añadir al catálogo' }}</button></footer>
      </section>
    </div>

    <div v-if="showForm" class="modal-layer" @click.self="showForm = false">
      <form class="modal" role="dialog" aria-modal="true" :aria-label="editingId ? 'Editar combo' : 'Crear combo'" @submit.prevent="save">
        <header><div><p class="eyebrow">Inventario</p><h3>{{ editingId ? 'Editar combo' : 'Crear combo' }}</h3></div><button class="close" type="button" aria-label="Cerrar" @click="showForm = false"><X :size="18" /></button></header>
        <div class="fields">
          <label>Nombre del combo<input v-model="form.nombre" required maxlength="150" /></label>
          <label>Precio del combo<input v-model.number="form.precio" required type="number" min="0" step="0.01" /></label>
          <div class="image-field"><input ref="imageInput" type="file" accept="image/*" :disabled="uploadingPhoto" @change="selectPhoto" /><button class="secondary" type="button" :disabled="uploadingPhoto" @click="imageInput?.click"><LoaderCircle v-if="uploadingPhoto" class="spin" :size="16" /><ImagePlus v-else :size="16" />{{ uploadingPhoto ? 'Subiendo foto...' : 'Elegir y ajustar foto' }}</button><img v-if="form.urlFoto" :src="form.urlFoto" alt="Vista previa del combo" /></div>
          <div class="component-heading"><strong>Productos del combo</strong><button class="secondary" type="button" @click="addComponent"><Plus :size="15" /> Agregar producto</button></div>
          <div v-for="(component, index) in form.componentes" :key="index" class="component-row">
            <select v-model.number="component.productoId" required aria-label="Producto componente">
              <option :value="null">Selecciona un producto</option>
              <option v-for="product in products.filter((item) => item.id && (!selectedProductIds.has(item.id) || item.id === component.productoId))" :key="product.id" :value="product.id">{{ product.nombre }}</option>
            </select>
            <label>Cantidad<input v-model.number="component.cantidad" type="number" min="1" step="1" required /></label>
            <button class="remove" type="button" aria-label="Quitar producto del combo" :disabled="form.componentes.length === 1" @click="removeComponent(index)"><Trash2 :size="16" /></button>
          </div>
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <footer><button class="secondary" type="button" @click="showForm = false">Cancelar</button><button class="primary" type="submit" :disabled="saving || uploadingPhoto || loading"><LoaderCircle v-if="saving" class="spin" :size="16" /><Save v-else :size="16" />{{ saving ? 'Guardando...' : 'Guardar combo' }}</button></footer>
      </form>
    </div>
    <ImageCropModal :visible="cropVisible" :file="pendingImage" :aspect-ratio="1" title="Ajustar foto del combo" @cancel="cropVisible = false; pendingImage = null" @crop="uploadPhoto" />
    <DeleteConfirmModal
      :visible="showDeleteModal"
      :title="`Eliminar combo`"
      :message="deleteTarget ? `¿Eliminar el combo «${deleteTarget.nombre}»? Se quitará también de los catálogos.` : '¿Eliminar el combo seleccionado?'"
      :loading="deletingId !== null"
      @confirm="confirmDelete"
      @cancel="showDeleteModal = false; deleteTarget = null"
    />
  </section>
</template>

<style scoped>
.combos-page{padding:34px 0;color:#171717}
.heading{display:flex;align-items:end;justify-content:space-between;gap:16px;margin-bottom:28px}.eyebrow{margin:0;color:#777;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}h2{margin:8px 0 7px;font:700 clamp(28px,4vw,42px) 'Space Grotesk',Arial,sans-serif;color:#171717}.muted{margin:0;color:#777}.primary,.secondary,.danger{display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:10px 13px;border:0;border-radius:9px;font-weight:700;cursor:pointer}.primary{background:#171717;color:#fff}.secondary{background:#fff6f0;color:#c65b19}.danger{background:#fff2ef;color:#a8584e}
.create-button{width:40px;height:40px;padding:0;border-radius:10px}
.state{min-height:250px;display:grid;place-content:center;justify-items:center;gap:12px;border:1px solid #e8e8e8;border-radius:14px;background:#fff;color:#777}.state p{margin:0}.combo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,270px),1fr));gap:12px}.combo-card{overflow:hidden;border:1px solid #e8e8e8;border-radius:12px;background:#fff}.combo-image{height:125px;display:grid;place-items:center;overflow:hidden;background:#fff6f0;color:#c65b19}.combo-image img{width:100%;height:100%;object-fit:cover}.combo-copy{padding:12px}.combo-title{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.combo-title h3{margin:0;color:#171717;font-size:16px}.combo-title strong{color:#c65b19;white-space:nowrap;font-size:14px}.combo-copy ul{display:grid;gap:4px;margin:10px 0 12px;padding-left:18px;color:#777;font-size:12px}.actions{display:flex;justify-content:flex-end;gap:7px}.icon-action,.catalog-action{width:34px;height:34px;padding:0}.catalog-action{display:grid;place-items:center;border:0;border-radius:9px;background:#171717;color:#fff;cursor:pointer}.catalog-action:hover{background:#000}.icon-action:hover{filter:brightness(.96)}button:focus-visible{outline:3px solid rgba(198,91,25,.4);outline-offset:2px}.modal-layer{position:fixed;inset:0;z-index:40;display:grid;place-items:center;overflow-y:auto;padding:20px;background:rgba(0,0,0,.77)}.modal{width:min(520px,100%);max-height:calc(100dvh - 40px);overflow-y:auto;padding:24px;border-radius:12px;background:#fff;box-shadow:0 20px 60px rgba(0,0,0,.2)}.modal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:20px}.modal-head h3{margin:6px 0;color:#171717;font-size:23px}.modal-close{display:grid;place-items:center;width:34px;height:34px;border:0;border-radius:8px;background:#fff6f0;color:#c65b19;cursor:pointer}.fields{display:grid;gap:14px;margin:20px 0}.fields label{display:grid;gap:7px;color:#333;font-size:13px;font-weight:700}.fields input,.fields select,.fields textarea{width:100%;padding:11px;border:1px solid #e8e8e8;border-radius:8px;background:#fff;color:#171717;font:inherit;font-weight:400}.fields textarea{resize:vertical}.modal-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:18px}.error{color:#a8584e}.spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:700px){.heading{align-items:start;flex-direction:column}.heading-actions{width:100%;align-items:stretch}.actions .primary{width:100%}}
/* ==============================
   RESPONSIVE PARA COMBOS
   ============================== */

.combos-page {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.combos-page *,
.combos-page *::before,
.combos-page *::after {
  box-sizing: border-box;
}

/* Tarjetas */

.combo-grid {
  grid-template-columns: repeat(
    auto-fill,
    minmax(min(100%, 260px), 1fr)
  );
}

.combo-card {
  min-width: 0;
}

.combo-copy {
  min-width: 0;
}

.combo-title h3 {
  min-width: 0;
  overflow-wrap: anywhere;
}

.combo-copy ul {
  overflow-wrap: anywhere;
}

/* Modales */

.modal-layer {
  padding: 16px;
  overflow-y: auto;
}

.modal {
  width: 100%;
  max-width: 540px;
  max-height: calc(100vh - 32px);
  max-height: calc(100dvh - 32px);
  min-width: 0;
  overflow-x: hidden;
  overflow-y: auto;
}

.modal > header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.modal > header > div {
  min-width: 0;
}

.modal > header h3 {
  overflow-wrap: anywhere;
}

.modal > footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

/* Campos del formulario */

.fields {
  min-width: 0;
}

.fields input,
.fields select,
.fields textarea {
  max-width: 100%;
  min-width: 0;
}

.component-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(70px, 100px) 36px;
  gap: 8px;
  min-width: 0;
}

.component-row > select {
  width: 100%;
  min-width: 0;
}

.component-row > label {
  min-width: 0;
}

.component-row > label input {
  width: 100%;
  min-width: 0;
}

/* Tablets y móviles */

@media (max-width: 700px) {
  .heading > button.create-button {
    margin-left: auto;
    flex-shrink: 0;
  }
  .combos-page {
    padding-top: 20px;
  }

  .heading {
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
  }

  .heading > div {
    min-width: 0;
  }

  .heading h2 {
    font-size: clamp(26px, 7vw, 34px);
  }

  .muted {
    font-size: 13px;
    line-height: 1.5;
  }

  .combo-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .combo-image {
    height: 115px;
  }

  .combo-copy {
    padding: 10px;
  }

  .combo-title {
    flex-wrap: wrap;
    gap: 6px;
  }

  .combo-title h3 {
    font-size: 14px;
  }

  .combo-title strong {
    font-size: 13px;
  }

  .combo-copy ul {
    font-size: 11px;
  }

  .actions {
    flex-wrap: wrap;
    gap: 6px;
  }

  .modal-layer {
    padding: 10px;
  }

  .modal {
    max-height: calc(100vh - 20px);
    max-height: calc(100dvh - 20px);
    padding: 18px;
  }

  .modal > footer button {
    flex: 1 1 auto;
  }
}

/* Teléfonos pequeños */

@media (max-width: 350px) {
  .combo-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .combo-image {
    height: 160px;
  }

  .component-row {
    grid-template-columns: minmax(0, 1fr) 65px 32px;
    gap: 5px;
  }
}
</style>
