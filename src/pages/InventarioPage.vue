<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ArrowDownUp, Eye, History, Package, PackagePlus, Pencil, Plus, RefreshCw, Search, Trash2, X } from 'lucide-vue-next'
import { api, type Catalogo, type Movimiento, type Producto, type TipoMovimiento, type Variante, ApiError } from '../api.ts'
import ProductFormModal from '../components/ProductFormModal.vue'
import ProductDetailModal from '../components/ProductDetailModal.vue'
import ProductEditModal from '../components/ProductEditModal.vue'
import SupplierModal from '../components/SupplierModal.vue'
import StockMovementModal from '../components/StockMovementModal.vue'
import AddProductToCatalogModal from '../components/AddProductToCatalogModal.vue'
import ProductVariantsModal from '../components/ProductVariantsModal.vue'
import DeleteConfirmModal from '../components/DeleteConfirmModal.vue'
import { formatDate } from '../date.ts'

const props = defineProps<{ usuarioId: number }>()

const products = ref<Producto[]>([])
const search = ref('')
const loading = ref(false)
const error = ref('')
const showProductModal = ref(false)
const showMovementHistory = ref(false)
const showSupplierModal = ref(false)
const supplierProductId = ref<number | null>(null)
const detailProduct = ref<Producto | null>(null)
const editingProduct = ref<Producto | null>(null)
const movementProduct = ref<Producto | null>(null)
const savingInfo = ref(false)
const savingMovement = ref(false)
const deletingProductId = ref<number | null>(null)
const deleteTargetProduct = ref<Producto | null>(null)
const showDeleteProductModal = ref(false)
const modalError = ref('')
const catalogs = ref<Catalogo[]>([])
const catalogsLoading = ref(false)
const catalogsError = ref('')
const productToCatalog = ref<Producto | null>(null)
const movements = ref<Movimiento[]>([])
const movementsLoading = ref(false)
const movementsError = ref('')
const variantProduct = ref<Producto | null>(null)
const movementVariants = ref<Variante[]>([])
const movementVariantsLoading = ref(false)
const movementVariantsError = ref('')

const filteredProducts = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()
  if (!query) return products.value
  return products.value.filter((product) => product.nombre.toLocaleLowerCase().includes(query))
})

async function load() {
  loading.value = true
  error.value = ''
  try { products.value = await api.list<Producto>('productos') }
  catch (reason) { error.value = reason instanceof Error ? reason.message : 'No se pudieron cargar los productos.' }
  finally { loading.value = false }
}

async function loadCatalogs() {
  if (!props.usuarioId) {
    catalogs.value = []
    return
  }

  catalogsLoading.value = true
  catalogsError.value = ''
  try {
    catalogs.value = await api.catalogosUsuario<Catalogo>(props.usuarioId)
  } catch (reason) {
    catalogsError.value = reason instanceof Error ? reason.message : 'No se pudieron cargar tus catálogos.'
  } finally {
    catalogsLoading.value = false
  }
}

async function loadMovements() {
  movementsLoading.value = true
  movementsError.value = ''
  try {
    movements.value = await api.movimientos<Movimiento>('')
  } catch (reason) {
    movementsError.value = reason instanceof Error ? reason.message : 'No se pudo cargar el historial de movimientos.'
  } finally {
    movementsLoading.value = false
  }
}

function openMovementHistory() {
  showMovementHistory.value = true
  void loadMovements()
}

async function refreshAfterVariantChange() {
  await Promise.all([load(), loadMovements()])
}

function productCreated(productId: number, withSupplier: boolean) {
  if (withSupplier) { supplierProductId.value = productId; showSupplierModal.value = true }
  load()
}

function openEdit(product: Producto) {
  editingProduct.value = product
  modalError.value = ''
}

async function saveInfo(form: { nombre: string; descripcion: string; precioVenta: number; urlFoto: string }) {
  if (!editingProduct.value?.id || !form.nombre.trim() || form.precioVenta < 0) {
    modalError.value = 'Nombre y precio válido son obligatorios.'
    return
  }
  savingInfo.value = true
  modalError.value = ''
  try {
    await api.update('productos', editingProduct.value.id, {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim(),
      precioVenta: form.precioVenta,
      urlFoto: form.urlFoto.trim() || null,
    })
    editingProduct.value = null
    await load()
  } catch (reason) {
    modalError.value = reason instanceof Error ? reason.message : 'No se pudo guardar la información.'
  } finally {
    savingInfo.value = false
  }
}

async function deleteProduct(product: Producto) {
  if (!product.id) return
  deleteTargetProduct.value = product
  showDeleteProductModal.value = true
}

async function confirmDeleteProduct() {
  if (!deleteTargetProduct.value?.id) return
  deletingProductId.value = deleteTargetProduct.value.id
  error.value = ''
  try {
    await api.delete('productos', deleteTargetProduct.value.id)
    if (detailProduct.value?.id === deleteTargetProduct.value.id) detailProduct.value = null
    if (editingProduct.value?.id === deleteTargetProduct.value.id) editingProduct.value = null
    if (movementProduct.value?.id === deleteTargetProduct.value.id) movementProduct.value = null
    if (variantProduct.value?.id === deleteTargetProduct.value.id) variantProduct.value = null
    if (productToCatalog.value?.id === deleteTargetProduct.value.id) productToCatalog.value = null
    await Promise.all([load(), loadMovements()])
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'No se pudo eliminar el producto.'
  } finally {
    deletingProductId.value = null
    deleteTargetProduct.value = null
    showDeleteProductModal.value = false
  }
}

async function openMovement(product: Producto) {
  movementProduct.value = product
  movementVariants.value = []
  modalError.value = ''
  movementVariantsError.value = ''
  movementVariantsLoading.value = true
  try {
    if (!product.id) throw new Error('No se encontró el identificador del producto.')
    movementVariants.value = await api.variantesProducto<Variante>(product.id)
  } catch (reason) {
    movementVariantsError.value = reason instanceof Error ? reason.message : 'No se pudieron cargar las variantes del producto.'
  } finally {
    movementVariantsLoading.value = false
  }
}

async function saveMovement(form: { tipo: TipoMovimiento; cantidad: number; nuevoStock: number; entrada: boolean; varianteId?: number | null }) {
  if (!movementProduct.value?.id) return

  // Validar stock del lado del cliente antes de enviar
  if (form.tipo !== 'AJUSTE_INVENTARIO' && form.tipo !== 'COMPRA' && form.tipo !== 'DEVOLUCION') {
    if (form.tipo === 'OTRO' && form.entrada) {
      // OTRO con entrada=true es aumento de stock, no validar
    } else {
      // VENTA, MERMA, REGALO, OTRO (entrada=false) - son salidas de stock
      const product = movementProduct.value
      let availableStock = product.stockActual
      if (form.varianteId) {
        const variant = movementVariants.value.find(v => v.id === form.varianteId)
        availableStock = variant?.existencia ?? 0
      }
      if (form.cantidad > availableStock) {
        modalError.value = `Stock insuficiente. Disponible: ${availableStock}, solicitado: ${form.cantidad}.`
        return
      }
    }
  }

  savingMovement.value = true
  modalError.value = ''
  try {
    await api.movement({
      productoId: movementProduct.value.id,
      tipo: form.tipo,
      cantidad: form.cantidad,
      nuevoStock: form.nuevoStock,
      entrada: form.entrada,
      varianteId: form.varianteId ?? undefined,
    })
    movementProduct.value = null
    await load()
    await loadMovements()
  } catch (reason) {
    if (reason instanceof ApiError) {
      if (reason.status === 400) {
        modalError.value = `Stock insuficiente: ${reason.message}`
        return
      }
      if (reason.status === 404) {
        modalError.value = 'Producto o variante no encontrado.'
        return
      }
    }
    modalError.value = reason instanceof Error ? reason.message : 'No se pudo registrar el movimiento.'
  } finally {
    savingMovement.value = false
  }
}

onMounted(() => {
  void load()
  void loadMovements()
})

watch(() => props.usuarioId, (usuarioId) => {
  if (usuarioId > 0) void loadCatalogs()
}, { immediate: true })
</script>

<template>
  <section class="products-page">
    <div class="heading">
      <div><p class="eyebrow">Gestión</p><h2>Inventario</h2><p class="muted">Administra productos y movimientos de existencia.</p></div>
      <div class="heading-actions"><button class="secondary" type="button" @click="openMovementHistory"><History :size="16" /> Historial</button><button class="secondary" type="button" @click="load"><RefreshCw :size="16" /> Actualizar</button><button class="primary" type="button" @click="showProductModal = true"><Plus :size="17" /> Añadir producto</button></div>
    </div>
    <div class="toolbar">
      <label class="search-box"><Search :size="17" /><input v-model="search" type="search" placeholder="Filtrar por nombre" aria-label="Filtrar inventario por nombre" /><button v-if="search" type="button" title="Limpiar búsqueda" @click="search = ''"><X :size="15" /></button></label>
      <span class="result-count">{{ filteredProducts.length }} productos</span>
    </div>
    <p v-if="catalogsError" class="error">{{ catalogsError }}</p>
    <div v-else-if="catalogsLoading" class="catalog-loading"><RefreshCw :size="16" class="spin" /> Cargando tus catálogos...</div>
    <p v-if="error" class="error">{{ error }}</p>
    <div v-if="loading" class="state"><RefreshCw :size="24" class="spin" /> Cargando productos...</div>
    <div v-else-if="!products.length" class="state"><Package :size="30" /><p>Aún no hay productos.</p><button class="primary" type="button" @click="showProductModal = true"><Plus :size="16" /> Crear producto</button></div>
    <div v-else-if="!filteredProducts.length" class="state"><Search :size="26" /><p>No hay productos que coincidan con “{{ search }}”.</p></div>
    <div v-else class="table-wrap"><table><thead><tr><th>Nombre</th><th>Stock</th><th>Estado</th><th>Acciones</th></tr></thead><tbody><tr v-for="product in filteredProducts" :key="product.id"><td><div class="product-cell"><img v-if="product.urlFoto" :src="product.urlFoto" :alt="`Foto de ${product.nombre}`" loading="lazy" /><Package v-else :size="20" /><strong>{{ product.nombre }}</strong></div></td><td>{{ product.stockActual }}</td><td><span :class="product.stockActual <= 0 ? 'low' : 'ok'">{{ product.stockActual <= 0 ? 'Agotado' : 'Disponible' }}</span></td><td><div class="row-actions"><button class="add-product-action" type="button" title="Agregar a catálogo" aria-label="Agregar a catálogo" :disabled="!usuarioId || catalogsLoading || Boolean(catalogsError)" @click="productToCatalog = product"><Plus :size="16" /></button><button type="button" title="Variantes" :aria-label="`Variantes: ${product.nombre}`" @click="variantProduct = product"><PackagePlus :size="16" /></button><button type="button" title="Registrar movimiento de inventario" :aria-label="`Movimiento de inventario: ${product.nombre}`" @click="openMovement(product)"><ArrowDownUp :size="16" /></button><button type="button" title="Ver información" :aria-label="`Ver información de ${product.nombre}`" @click="detailProduct = product"><Eye :size="16" /></button><button type="button" title="Editar información" :aria-label="`Editar información de ${product.nombre}`" @click="openEdit(product)"><Pencil :size="16" /></button><button class="delete-product-action" type="button" :title="`Eliminar ${product.nombre}`" :aria-label="`Eliminar permanentemente ${product.nombre}`" :disabled="deletingProductId === product.id" @click="deleteProduct(product)"><RefreshCw v-if="deletingProductId === product.id" class="spin" :size="16" /><Trash2 v-else :size="16" /></button></div></td></tr></tbody></table></div>
    <div v-if="showMovementHistory" class="history-modal-layer" @click.self="showMovementHistory = false">
      <section class="history-modal" role="dialog" aria-modal="true" aria-labelledby="movement-history-title">
        <header class="history-heading">
          <div><p class="eyebrow">Inventario</p><h3 id="movement-history-title"><History :size="19" /> Historial de movimientos</h3><p class="muted">Consulta los cambios de existencia más recientes.</p></div>
          <div class="history-actions">
            <button class="secondary" type="button" :disabled="movementsLoading" @click="loadMovements"><RefreshCw :size="15" :class="{ spin: movementsLoading }" /> Actualizar</button>
            <button class="history-close" type="button" aria-label="Cerrar historial" @click="showMovementHistory = false"><X :size="19" /></button>
          </div>
        </header>
        <p v-if="movementsError" class="error">{{ movementsError }}</p>
        <div v-else-if="movementsLoading" class="history-state"><RefreshCw :size="20" class="spin" /> Cargando movimientos...</div>
        <div v-else-if="!movements.length" class="history-state">Todavía no hay movimientos registrados.</div>
        <div v-else class="table-wrap history-table-wrap">
          <table>
            <thead><tr><th>Fecha</th><th>Producto</th><th>Variante</th><th>Tipo</th><th>Cantidad</th><th>Stock anterior</th><th>Stock nuevo</th></tr></thead>
            <tbody>
              <tr v-for="movement in movements" :key="movement.id">
                <td>{{ formatDate(movement.fecha) }}</td>
                <td>{{ movement.productoNombre }}</td>
                <td>{{ movement.varianteNombre || '—' }}</td>
                <td>{{ movement.tipo.replaceAll('_', ' ') }}</td>
                <td>{{ movement.cantidad }}</td>
                <td>{{ movement.stockAnterior }}</td>
                <td>{{ movement.stockNuevo }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <ProductFormModal :visible="showProductModal" @close="showProductModal = false" @created="productCreated" />
    <SupplierModal :visible="showSupplierModal" :product-id="supplierProductId" @close="showSupplierModal = false" @saved="load" />

    <ProductDetailModal :product="detailProduct" @close="detailProduct = null" />

    <ProductEditModal :product="editingProduct" :saving="savingInfo" :error="modalError" @close="editingProduct = null" @save="saveInfo" />
    <StockMovementModal :product="movementProduct" :variants="movementVariants" :variants-loading="movementVariantsLoading" :variants-error="movementVariantsError" :saving="savingMovement" :error="modalError" @close="movementProduct = null" @save="saveMovement" />
    <AddProductToCatalogModal
      :visible="Boolean(productToCatalog)"
      :catalogs="catalogs"
      :fixed-product="productToCatalog || undefined"
      @close="productToCatalog = null"
    />
    <ProductVariantsModal :product="variantProduct" @close="variantProduct = null" @updated="refreshAfterVariantChange" />
    <DeleteConfirmModal
      :visible="showDeleteProductModal"
      :title="`Eliminar producto`"
      :message="deleteTargetProduct ? `¿Eliminar permanentemente «${deleteTargetProduct.nombre}»? Se borrarán el producto, sus variantes, el stock y su historial de movimientos. Esta acción no se puede deshacer.` : '¿Eliminar el producto seleccionado?'"
      :loading="deletingProductId !== null"
      @confirm="confirmDeleteProduct"
      @cancel="showDeleteProductModal = false; deleteTargetProduct = null"
    />
  </section>
</template>

<style scoped>
/* =========================
   ESTRUCTURA GENERAL
========================= */

.products-page {
  width: 100%;
  min-width: 0;
  padding: 30px 0;
  color: #171717;
  box-sizing: border-box;
}

.products-page *,
.products-page *::before,
.products-page *::after {
  box-sizing: border-box;
}

/* =========================
   ENCABEZADO
========================= */

.heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 26px;
}

.heading > div:first-child {
  min-width: 0;
}

.eyebrow {
  margin: 0;
  color: #777;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

h2 {
  margin: 8px 0 7px;
  color: #171717;
  font: 700 clamp(28px, 4vw, 42px) 'Space Grotesk', Arial, sans-serif;
  overflow-wrap: anywhere;
}

.muted {
  margin: 0;
  color: #777;
  line-height: 1.5;
}

.heading-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
  flex-shrink: 0;
}

.primary,
.secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 40px;
  padding: 10px 14px;
  border: 0;
  border-radius: 9px;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background 0.2s ease,
    transform 0.2s ease;
}

.primary {
  background: #171717;
  color: #fff;
}

.primary:hover {
  background: #333;
}

.secondary {
  background: #fff6f0;
  color: #c65b19;
}

.secondary:hover {
  background: #ffe9dc;
}

.primary:active,
.secondary:active {
  transform: scale(0.98);
}

/* =========================
   BUSCADOR
========================= */

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 9px;
  width: min(460px, 100%);
  min-width: 0;
  padding: 0 12px;
  border: 1px solid #e8e8e8;
  border-radius: 9px;
  background: #fff;
  color: #777;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.search-box:focus-within {
  border-color: #c65b19;
  box-shadow: 0 0 0 3px #c65b1918;
}

.search-box > svg {
  flex-shrink: 0;
}

.search-box input {
  width: 100%;
  min-width: 0;
  padding: 12px 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #171717;
  font: inherit;
}

.search-box input:focus {
  outline: 0;
}

.search-box button {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #777;
  cursor: pointer;
}

.search-box button:hover {
  background: #f5f5f5;
}

.result-count {
  flex-shrink: 0;
  color: #777;
  font-size: 13px;
}

/* =========================
   ESTADOS Y MENSAJES
========================= */

.state {
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 12px;
  min-height: 260px;
  padding: 24px;
  border: 1px solid #e8e8e8;
  border-radius: 14px;
  background: #fff;
  color: #777;
  text-align: center;
}

.state p {
  margin: 0;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.state .primary {
  margin-top: 4px;
}

.error {
  margin: 12px 0;
  color: #a8584e;
  font-size: 13px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.catalog-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0 14px;
  color: #777;
  font-size: 13px;
}

.spin {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* =========================
   TABLA DE PRODUCTOS
========================= */

.table-wrap {
  width: 100%;
  min-width: 0;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  border: 1px solid #e8e8e8;
  border-radius: 14px;
  background: #fff;
  -webkit-overflow-scrolling: touch;
}

.table-wrap table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.table-wrap th,
.table-wrap td {
  padding: 15px;
  border-bottom: 1px solid #edf1ed;
  vertical-align: middle;
}

.table-wrap th {
  background: #fafafa;
  color: #777;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.table-wrap td {
  color: #333;
  font-size: 13px;
}

.table-wrap tbody tr:last-child td {
  border-bottom: 0;
}

.table-wrap tbody tr:hover {
  background: #fdfbf9;
}

/* Nombre e imagen */

.product-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 150px;
}

.product-cell > svg {
  flex-shrink: 0;
  color: #888;
}

.product-cell img {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  border-radius: 7px;
  background: #f0f0f0;
  object-fit: cover;
}

.product-cell strong {
  min-width: 0;
  color: #171717;
  font-size: 13px;
  font-weight: 700;
  overflow-wrap: anywhere;
}

/* Estado del stock */

.ok,
.low {
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.ok {
  color: #c65b19;
}

.low {
  color: #a8584e;
}

/* =========================
   BOTONES DE ACCIONES
========================= */

.row-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: max-content;
}

.row-actions button {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: #fff6f0;
  color: #c65b19;
  cursor: pointer;
  transition:
    background 0.2s ease,
    transform 0.2s ease;
}

.row-actions button:hover {
  background: #ffe7d8;
}

.row-actions button:active {
  transform: scale(0.94);
}

.row-actions button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.row-actions .add-product-action {
  background: #171717;
  color: #fff;
}

.row-actions .add-product-action:hover {
  background: #333;
}

.row-actions .delete-product-action {
  background: #fff0ed;
  color: #a23d31;
}

.row-actions .delete-product-action:hover {
  background: #ffe1dc;
}

/* =========================
   MODALES GENERALES
========================= */

.modal-layer {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  overflow-y: auto;
  padding: 20px;
  background: rgba(0, 0, 0, 0.77);
}

.modal {
  width: min(520px, 100%);
  max-height: calc(100dvh - 40px);
  overflow-y: auto;
  padding: 24px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 20px;
}

.modal-head h3 {
  margin: 6px 0;
  color: #171717;
  font-size: 23px;
  overflow-wrap: anywhere;
}

.icon-close {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border: 0;
  border-radius: 8px;
  background: #fff6f0;
  color: #c65b19;
  cursor: pointer;
}

.fields {
  display: grid;
  gap: 14px;
  margin: 20px 0;
}

.fields label {
  display: grid;
  gap: 7px;
  color: #333;
  font-size: 13px;
  font-weight: 700;
}

.fields input,
.fields select,
.fields textarea {
  width: 100%;
  min-width: 0;
  padding: 11px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  background: #fff;
  color: #171717;
  font: inherit;
  font-weight: 400;
}

.fields input:focus,
.fields select:focus,
.fields textarea:focus {
  outline: 0;
  border-color: #c65b19;
  box-shadow: 0 0 0 3px #c65b1918;
}

.fields textarea {
  resize: vertical;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.detail-photo {
  display: block;
  width: 100%;
  max-height: 220px;
  margin-bottom: 16px;
  border-radius: 8px;
  background: #f0f0f0;
  object-fit: contain;
}

.detail-list {
  display: grid;
  gap: 0;
  margin: 0;
}

.detail-list div {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  padding: 11px 0;
  border-top: 1px solid #edf1ed;
}

.detail-list dt {
  color: #777;
  font-size: 13px;
}

.detail-list dd {
  margin: 0;
  color: #171717;
  font-weight: 700;
  text-align: right;
  overflow-wrap: anywhere;
}

/* =========================
   HISTORIAL DE MOVIMIENTOS
========================= */

.history-modal-layer {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  overflow-y: auto;
  padding: 20px;
  background: rgba(0, 0, 0, 0.77);
}

.history-modal {
  display: grid;
  gap: 16px;
  width: min(1100px, 100%);
  max-height: calc(100dvh - 40px);
  overflow: auto;
  padding: 24px;
  border: 1px solid #e8e8e8;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.history-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.history-heading > div:first-child {
  min-width: 0;
}

.history-heading h3 {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin: 6px 0;
  color: #171717;
  font-size: 20px;
  overflow-wrap: anywhere;
}

.history-heading h3 svg {
  flex-shrink: 0;
}

.history-heading .muted {
  font-size: 13px;
}

.history-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.history-close {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border: 0;
  border-radius: 8px;
  background: #fff6f0;
  color: #c65b19;
  cursor: pointer;
}

.history-close:hover {
  background: #ffe9dc;
}

.history-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 100px;
  padding: 20px;
  color: #777;
  text-align: center;
}

.history-table-wrap {
  border: 0;
}

/* =========================
   FILTROS DE FECHA
   Si los utiliza algún modal,
   conserva su presentación.
========================= */

.date-filter-modal {
  max-width: 420px;
}

.filter-mode-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.mode-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s;
}

.mode-option:hover {
  border-color: #c65b19;
  background: #fff6f0;
}

.mode-option input[type='radio'] {
  accent-color: #c65b19;
}

.mode-label {
  color: #171717;
  font-size: 13px;
  font-weight: 600;
}

.date-inputs {
  display: grid;
  gap: 12px;
}

.date-field {
  display: flex;
  align-items: center;
  gap: 10px;
}

.date-field input {
  flex: 1;
  width: 100%;
  min-width: 0;
  padding: 11px 12px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  background: #fff;
  color: #171717;
  font: inherit;
  font-size: 13px;
}

.date-field input:focus {
  outline: 0;
  border-color: #c65b19;
  box-shadow: 0 0 0 3px #c65b191f;
}

.field-label {
  color: #777;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.date-error {
  margin: 0;
  color: #a8584e;
  font-size: 12px;
}

.filter-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid #edf1ed;
}

/* =========================
   TABLET
========================= */

@media (max-width: 1024px) {
  .products-page {
    padding-top: 24px;
  }

  .heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 18px;
  }

  .heading-actions {
    justify-content: flex-start;
    width: 100%;
  }

  .table-wrap th,
  .table-wrap td {
    padding: 12px;
  }

  .history-modal {
    padding: 20px;
  }
}

/* =========================
   MÓVILES
========================= */

@media (max-width: 700px) {
  .products-page {
    padding: 20px 0;
  }

  .heading {
    gap: 16px;
    margin-bottom: 22px;
  }

  h2 {
    font-size: clamp(27px, 7vw, 34px);
  }

  .heading .muted {
    max-width: 100%;
    font-size: 13px;
  }

  .heading-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .heading-actions button {
    width: 100%;
    min-width: 0;
    padding: 10px 8px;
    font-size: 12px;
  }

  .heading-actions .primary {
    grid-column: 1 / -1;
  }

  .toolbar {
    align-items: stretch;
    flex-direction: column;
    gap: 10px;
  }

  .search-box {
    width: 100%;
  }

  .result-count {
    align-self: flex-end;
  }

  .table-wrap {
    border-radius: 10px;
  }

  .table-wrap table {
    min-width: 650px;
  }

  .table-wrap th,
  .table-wrap td {
    padding: 11px 10px;
  }

  .product-cell {
    gap: 8px;
  }

  .product-cell img {
    width: 36px;
    height: 36px;
  }

  .product-cell strong {
    max-width: 190px;
    white-space: normal;
  }

  .row-actions {
    gap: 5px;
  }

  .row-actions button {
    width: 32px;
    height: 32px;
  }

  .state {
    min-height: 220px;
    padding: 20px 14px;
  }

  /* Historial */

  .history-modal-layer {
    place-items: start center;
    padding: 12px;
  }

  .history-modal {
    gap: 14px;
    width: 100%;
    max-height: calc(100dvh - 24px);
    padding: 16px;
    border-radius: 12px;
  }

  .history-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }

  .history-heading h3 {
    font-size: 18px;
  }

  .history-heading .muted {
    font-size: 12px;
  }

  .history-actions {
    justify-content: space-between;
    width: 100%;
  }

  .history-actions .secondary {
    padding: 9px 12px;
  }

  .history-close {
    width: 34px;
    height: 34px;
  }

  .history-table-wrap {
    width: 100%;
    overflow-x: auto;
  }

  .history-table-wrap table {
    min-width: 760px;
  }

  /* Modales auxiliares */

  .modal-layer {
    place-items: center;
    padding: 12px;
  }

  .modal {
    width: 100%;
    max-height: calc(100dvh - 24px);
    padding: 20px;
    border-radius: 12px;
  }

  .modal-head h3 {
    font-size: 20px;
  }

  .modal-actions {
    gap: 8px;
  }

  .modal-actions button {
    flex: 1;
  }

  .detail-list div {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }

  .detail-list dd {
    text-align: left;
  }

  .filter-mode-selector {
    flex-direction: column;
    gap: 8px;
  }

  .mode-option {
    padding: 11px 12px;
  }

  .date-field {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
  }

  .date-field input {
    width: 100%;
  }
}

/* =========================
   MÓVILES PEQUEÑOS
========================= */

@media (max-width: 400px) {
  .products-page {
    padding-top: 16px;
  }

  .heading-actions {
    gap: 6px;
  }

  .heading-actions button {
    gap: 5px;
    padding: 10px 5px;
    font-size: 11px;
  }

  .heading-actions button svg {
    width: 14px;
    height: 14px;
  }

  .search-box {
    padding: 0 9px;
  }

  .history-modal-layer {
    padding: 8px;
  }

  .history-modal {
    max-height: calc(100dvh - 16px);
    padding: 12px;
  }

  .modal-layer {
    padding: 8px;
  }

  .modal {
    max-height: calc(100dvh - 16px);
    padding: 16px;
  }

  .modal-actions {
    flex-direction: column-reverse;
  }

  .modal-actions button {
    width: 100%;
  }
}

/* =========================
   ACCESIBILIDAD
========================= */

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
</style>