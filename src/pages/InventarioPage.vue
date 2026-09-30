<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ArrowDownUp, Eye, Package, Pencil, Plus, RefreshCw, Search, X } from 'lucide-vue-next'
import { api, type Producto, type TipoMovimiento } from '../api.ts'
import ProductFormModal from '../components/ProductFormModal.vue'
import ProductDetailModal from '../components/ProductDetailModal.vue'
import ProductEditModal from '../components/ProductEditModal.vue'
import SupplierModal from '../components/SupplierModal.vue'
import StockMovementModal from '../components/StockMovementModal.vue'

const products = ref<Producto[]>([])
const search = ref('')
const loading = ref(false)
const error = ref('')
const showProductModal = ref(false)
const showSupplierModal = ref(false)
const supplierProductId = ref<number | null>(null)
const detailProduct = ref<Producto | null>(null)
const editingProduct = ref<Producto | null>(null)
const movementProduct = ref<Producto | null>(null)
const savingInfo = ref(false)
const savingMovement = ref(false)
const modalError = ref('')

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

function openMovement(product: Producto) {
  movementProduct.value = product
  modalError.value = ''
}

async function saveMovement(form: { tipo: TipoMovimiento; cantidad: number; nuevoStock: number; entrada: boolean; motivo: string }) {
  if (!movementProduct.value?.id) return
  savingMovement.value = true
  modalError.value = ''
  try {
    await api.movement({
      productoId: movementProduct.value.id,
      tipo: form.tipo,
      cantidad: form.cantidad,
      nuevoStock: form.nuevoStock,
      entrada: form.entrada,
      motivo: form.motivo.trim() || undefined,
    })
    movementProduct.value = null
    await load()
  } catch (reason) {
    modalError.value = reason instanceof Error ? reason.message : 'No se pudo registrar el movimiento.'
  } finally {
    savingMovement.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="products-page">
    <div class="heading">
      <div><p class="eyebrow">Gestión</p><h2>Inventario</h2><p class="muted">Administra productos y movimientos de existencia.</p></div>
      <div class="heading-actions"><button class="secondary" type="button" @click="load"><RefreshCw :size="16" /> Actualizar</button><button class="primary" type="button" @click="showProductModal = true"><Plus :size="17" /> Añadir producto</button></div>
    </div>
    <div class="toolbar">
      <label class="search-box"><Search :size="17" /><input v-model="search" type="search" placeholder="Filtrar por nombre" aria-label="Filtrar inventario por nombre" /><button v-if="search" type="button" title="Limpiar búsqueda" @click="search = ''"><X :size="15" /></button></label>
      <span class="result-count">{{ filteredProducts.length }} productos</span>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
    <div v-if="loading" class="state"><RefreshCw :size="24" class="spin" /> Cargando productos...</div>
    <div v-else-if="!products.length" class="state"><Package :size="30" /><p>Aún no hay productos.</p><button class="primary" type="button" @click="showProductModal = true"><Plus :size="16" /> Crear producto</button></div>
    <div v-else-if="!filteredProducts.length" class="state"><Search :size="26" /><p>No hay productos que coincidan con “{{ search }}”.</p></div>
    <div v-else class="table-wrap"><table><thead><tr><th>Producto</th><th>Precio venta</th><th>Stock</th><th>Estado</th><th>Acciones</th></tr></thead><tbody><tr v-for="product in filteredProducts" :key="product.id"><td><div class="product-cell"><img v-if="product.urlFoto" :src="product.urlFoto" :alt="`Foto de ${product.nombre}`" loading="lazy" /><Package v-else :size="20" /><strong>{{ product.nombre }}</strong></div></td><td>{{ product.precioVenta }}</td><td>{{ product.stockActual }}</td><td><span :class="product.stockActual <= 0 ? 'low' : 'ok'">{{ product.stockActual <= 0 ? 'Sin stock' : 'Disponible' }}</span></td><td><div class="row-actions"><button type="button" title="Registrar movimiento de inventario" :aria-label="`Movimiento de inventario: ${product.nombre}`" @click="openMovement(product)"><ArrowDownUp :size="16" /></button><button type="button" title="Ver información" :aria-label="`Ver información de ${product.nombre}`" @click="detailProduct = product"><Eye :size="16" /></button><button type="button" title="Editar información" :aria-label="`Editar información de ${product.nombre}`" @click="openEdit(product)"><Pencil :size="16" /></button></div></td></tr></tbody></table></div>
    <ProductFormModal :visible="showProductModal" @close="showProductModal = false" @created="productCreated" />
    <SupplierModal :visible="showSupplierModal" :product-id="supplierProductId" @close="showSupplierModal = false" @saved="load" />

    <ProductDetailModal :product="detailProduct" @close="detailProduct = null" />

    <ProductEditModal :product="editingProduct" :saving="savingInfo" :error="modalError" @close="editingProduct = null" @save="saveInfo" />
    <StockMovementModal :product="movementProduct" :saving="savingMovement" :error="modalError" @close="movementProduct = null" @save="saveMovement" />
  </section>
</template>

<style scoped>
.products-page{padding:34px 0;color:#17332a}.heading,.heading-actions{display:flex;align-items:end;justify-content:space-between;gap:14px}.heading{margin-bottom:28px}.heading-actions{align-items:center}.eyebrow{margin:0;color:#6c8175;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}h2{margin:8px 0 7px;font:700 clamp(28px,4vw,42px) 'Space Grotesk',Arial,sans-serif}.muted{margin:0;color:#75847b}.primary,.secondary{display:inline-flex;align-items:center;gap:7px;border:0;border-radius:9px;padding:11px 14px;font-weight:700;cursor:pointer}.primary{background:#1a5f47;color:#fff}.secondary{background:#e7f0ea;color:#1a5f47}.state,.table-wrap{border:1px solid #e3e9e2;border-radius:14px;background:#fff}.state{min-height:260px;display:grid;place-content:center;justify-items:center;gap:12px;color:#75847b}.table-wrap{overflow:auto}.table-wrap table{width:100%;border-collapse:collapse;text-align:left}.table-wrap th,.table-wrap td{padding:15px;border-bottom:1px solid #edf1ed;white-space:nowrap}.table-wrap th{color:#6c8175;font-size:11px;text-transform:uppercase}.ok,.low{font-weight:700}.ok{color:#28704e}.low,.error{color:#a8584e}.spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:700px){.heading{align-items:start;flex-direction:column}.heading-actions{width:100%;align-items:stretch}.heading-actions button{flex:1}}
.product-cell{display:flex;align-items:center;gap:10px}.product-cell img{width:42px;height:42px;object-fit:cover;border-radius:6px;background:#f2f5f2}
</style>

<style scoped>
.toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:18px}
.search-box{display:flex;align-items:center;gap:9px;width:min(460px,100%);padding:0 12px;border:1px solid #dfe5df;border-radius:9px;background:#fff;color:#718078}
.search-box input{width:100%;min-width:0;padding:12px 0;border:0;outline:0;font:inherit}
.search-box button{display:grid;place-items:center;border:0;background:transparent;color:#718078;cursor:pointer}
.result-count{color:#75847b;font-size:13px}
.row-actions{display:flex;align-items:center;gap:6px}
.row-actions button{display:grid;place-items:center;width:36px;height:36px;border:0;border-radius:8px;background:#edf4ef;color:#1a5f47;cursor:pointer}
.row-actions button:hover{background:#dcebe0}
.modal-layer{position:fixed;inset:0;z-index:40;display:grid;place-items:center;overflow-y:auto;padding:20px;background:#17332a77}
.modal{width:min(520px,100%);max-height:calc(100dvh - 40px);overflow-y:auto;padding:24px;border-radius:12px;background:#fff;box-shadow:0 20px 60px #17332a33}
.modal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:20px}
.modal-head h3{margin:6px 0;color:#17332a;font-size:23px}
.icon-close{display:grid;place-items:center;width:34px;height:34px;border:0;border-radius:8px;background:#edf4ef;color:#1a5f47;cursor:pointer}
.fields{display:grid;gap:14px;margin:20px 0}
.fields label{display:grid;gap:7px;color:#52655b;font-size:13px;font-weight:700}
.fields input,.fields select,.fields textarea{width:100%;padding:11px;border:1px solid #dfe5df;border-radius:8px;background:#fff;color:#20262d;font:inherit;font-weight:400}
.fields textarea{resize:vertical}
.modal-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:18px}
.detail-photo{width:100%;max-height:220px;margin-bottom:16px;border-radius:8px;object-fit:contain;background:#f2f5f2}
.detail-list{display:grid;gap:0;margin:0}
.detail-list div{display:flex;justify-content:space-between;gap:18px;padding:11px 0;border-top:1px solid #edf1ed}
.detail-list dt{color:#75847b;font-size:13px}
.detail-list dd{margin:0;color:#17332a;font-weight:700;text-align:right}
@media(max-width:700px){.toolbar{align-items:stretch;flex-direction:column}.result-count{align-self:flex-end}.table-wrap th,.table-wrap td{padding:11px}.row-actions{gap:4px}.row-actions button{width:32px;height:32px}.modal{padding:20px}.detail-list div{align-items:flex-start;flex-direction:column;gap:4px}.detail-list dd{text-align:left}}
</style>
