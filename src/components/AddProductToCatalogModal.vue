<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check, LoaderCircle, Package, Plus, Search, X } from 'lucide-vue-next'
import { api, type Catalogo, type CatalogoProducto, type Producto } from '../api.ts'

const props = defineProps<{
  visible: boolean
  catalogs: Catalogo[]
  fixedCatalog?: Catalogo
  fixedProduct?: Producto
  adminMode?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'added'): void
}>()

const products = ref<Producto[]>([])
const catalogProducts = ref<CatalogoProducto[]>([])
const selectedCatalogId = ref<number | null>(null)
const selectedProductId = ref<number | null>(null)
const catalogSearch = ref('')
const productSearch = ref('')
const order = ref(1)
const loading = ref(false)
const saving = ref(false)
const error = ref('')
let catalogLoadSequence = 0

const selectedProduct = computed(() => props.fixedProduct
  || products.value.find((product) => product.id === selectedProductId.value)
  || null)
const filteredCatalogs = computed(() => {
  const query = catalogSearch.value.trim().toLocaleLowerCase()
  return props.catalogs.filter((catalog) => catalog.nombre.toLocaleLowerCase().includes(query))
})
const filteredProducts = computed(() => {
  const query = productSearch.value.trim().toLocaleLowerCase()
  return products.value.filter((product) => product.nombre.toLocaleLowerCase().includes(query))
})
const alreadyInCatalog = computed(() => Boolean(selectedProduct.value && catalogProducts.value.some((item) =>
  item.productoId === selectedProduct.value?.id && !item.varianteId,
)))
async function loadCatalogProducts(catalogId: number) {
  const sequence = ++catalogLoadSequence
  loading.value = true
  error.value = ''
  try {
    const result = await api.catalogoProductos<CatalogoProducto>(catalogId)
    if (sequence !== catalogLoadSequence) return
    catalogProducts.value = result.sort((a, b) => a.orden - b.orden)
    order.value = result.length + 1
  } catch (reason) {
    if (sequence !== catalogLoadSequence) return
    error.value = reason instanceof Error ? reason.message : 'No se pudieron cargar los productos del catálogo.'
    catalogProducts.value = []
  } finally {
    if (sequence === catalogLoadSequence) loading.value = false
  }
}

async function initialize() {
  error.value = ''
  products.value = []
  catalogProducts.value = []
  catalogSearch.value = ''
  productSearch.value = ''
  selectedProductId.value = props.fixedProduct?.id ?? null
  selectedCatalogId.value = props.fixedCatalog?.id
    ?? props.catalogs.find((catalog) => catalog.id)?.id
    ?? null

  if (!props.fixedProduct) {
    loading.value = true
    try {
      products.value = props.adminMode && props.fixedCatalog?.usuarioId
        ? await api.productosDeUsuarioAdmin<Producto>(props.fixedCatalog.usuarioId)
        : await api.list<Producto>('productos')
    } catch (reason) {
      error.value = reason instanceof Error ? reason.message : 'No se pudo cargar el inventario.'
      loading.value = false
      return
    } finally {
      if (!selectedCatalogId.value) loading.value = false
    }
  }

  if (selectedCatalogId.value) await loadCatalogProducts(selectedCatalogId.value)
}

function selectProduct(productId?: number) {
  selectedProductId.value = productId && Number.isInteger(productId) && productId > 0 ? productId : null
}

async function selectCatalog(catalogId?: number) {
  selectedCatalogId.value = catalogId && Number.isInteger(catalogId) && catalogId > 0 ? catalogId : null
  catalogProducts.value = []
  if (selectedCatalogId.value) await loadCatalogProducts(selectedCatalogId.value)
}

async function addProduct() {
  if (!selectedCatalogId.value || !selectedProduct.value?.id || alreadyInCatalog.value) {
    error.value = alreadyInCatalog.value
      ? 'Este producto ya está en el catálogo.'
      : 'Selecciona un catálogo y un producto.'
    return
  }

  saving.value = true
  error.value = ''
  try {
    await api.agregarProductoCatalogo(selectedCatalogId.value, {
      productoId: selectedProduct.value.id,
      orden: order.value,
    })
    emit('added')
    emit('close')
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'No se pudo agregar el producto al catálogo.'
  } finally {
    saving.value = false
  }
}

watch(() => props.visible, (visible) => {
  if (visible) void initialize()
  else catalogLoadSequence++
})
</script>

<template>
  <div v-if="props.visible" class="modal-layer" @click.self="emit('close')">
    <form class="modal-card" role="dialog" aria-modal="true" aria-labelledby="add-product-title" @submit.prevent="addProduct">
      <header class="modal-heading">
        <div>
          <p class="eyebrow">Catálogo</p>
          <h2 id="add-product-title">Agregar producto</h2>
        </div>
        <button class="close-button" type="button" aria-label="Cerrar" @click="emit('close')"><X :size="18" /></button>
      </header>

      <p v-if="!props.fixedCatalog && !props.catalogs.length" class="notice">Todavía no tienes catálogos propios. Crea un catálogo antes de agregar productos.</p>

      <div class="fields">
        <section v-if="!props.fixedCatalog" class="selection-section" aria-labelledby="catalog-select-title">
          <div class="selection-heading">
            <label id="catalog-select-title" class="selection-title">Selecciona un catálogo</label>
            <span v-if="selectedCatalogId" class="selection-count">Seleccionado</span>
          </div>
          <label class="selection-search">
            <Search :size="16" aria-hidden="true" />
            <input v-model="catalogSearch" type="search" placeholder="Filtrar catálogos por nombre" aria-label="Filtrar catálogos por nombre" />
            <button v-if="catalogSearch" type="button" aria-label="Limpiar búsqueda de catálogos" @click="catalogSearch = ''"><X :size="14" /></button>
          </label>
          <div class="selection-table-wrap">
            <table class="selection-table">
              <thead><tr><th>Catálogo</th><th aria-label="Selección"></th></tr></thead>
              <tbody>
                <tr v-for="catalog in filteredCatalogs" :key="catalog.id" :class="{ selected: selectedCatalogId === catalog.id }">
                  <td>{{ catalog.nombre }}</td>
                  <td><button class="select-row" type="button" :aria-label="`Seleccionar catálogo ${catalog.nombre}`" :aria-pressed="selectedCatalogId === catalog.id" @click="selectCatalog(catalog.id)"><Check v-if="selectedCatalogId === catalog.id" :size="15" /><span v-else>Elegir</span></button></td>
                </tr>
                <tr v-if="!filteredCatalogs.length"><td colspan="2" class="selection-empty">{{ catalogSearch ? 'No hay catálogos que coincidan con la búsqueda.' : 'No hay catálogos disponibles.' }}</td></tr>
              </tbody>
            </table>
          </div>
        </section>
        <p v-else class="fixed-catalog"><Package :size="17" /> {{ props.fixedCatalog.nombre }}</p>

        <section v-if="!props.fixedProduct" class="selection-section" aria-labelledby="product-select-title">
          <div class="selection-heading">
            <label id="product-select-title" class="selection-title">Selecciona un producto</label>
            <span v-if="selectedProductId" class="selection-count">Seleccionado</span>
          </div>
          <label class="selection-search">
            <Search :size="16" aria-hidden="true" />
            <input v-model="productSearch" type="search" placeholder="Filtrar productos por nombre" aria-label="Filtrar productos por nombre" />
            <button v-if="productSearch" type="button" aria-label="Limpiar búsqueda de productos" @click="productSearch = ''"><X :size="14" /></button>
          </label>
          <div class="selection-table-wrap">
            <table class="selection-table">
              <thead><tr><th>Producto</th><th>Precio</th><th aria-label="Selección"></th></tr></thead>
              <tbody>
                <tr v-for="product in filteredProducts" :key="product.id" :class="{ selected: selectedProductId === product.id }">
                  <td><div class="product-option"><img v-if="product.urlFoto" :src="product.urlFoto" :alt="`Foto de ${product.nombre}`" /><Package v-else :size="17" /><span>{{ product.nombre }}<small class="mobile-price">{{ product.precioVenta }} {{ product.monedaVenta || 'CUP' }}</small></span></div></td>
                  <td class="product-price">{{ product.precioVenta }} {{ product.monedaVenta || 'CUP' }}</td>
                  <td><button class="select-row" type="button" :aria-label="`Seleccionar producto ${product.nombre}`" :aria-pressed="selectedProductId === product.id" @click="selectProduct(product.id)"><Check v-if="selectedProductId === product.id" :size="15" /><span v-else>Elegir</span></button></td>
                </tr>
                <tr v-if="!filteredProducts.length"><td colspan="3" class="selection-empty">{{ productSearch ? 'No hay productos que coincidan con la búsqueda.' : 'No hay productos disponibles.' }}</td></tr>
              </tbody>
            </table>
          </div>
        </section>
        <div v-else class="fixed-product">
          <img v-if="props.fixedProduct.urlFoto" :src="props.fixedProduct.urlFoto" :alt="props.fixedProduct.nombre" />
          <Package v-else :size="18" />
          <span>{{ props.fixedProduct.nombre }}</span>
        </div>
      </div>

      <p v-if="loading" class="status"><LoaderCircle :size="16" class="spin" /> Cargando información del catálogo...</p>
      <p v-if="alreadyInCatalog" class="notice">Este producto ya pertenece a este catálogo. Elige otro producto.</p>
      <p v-else-if="!props.fixedProduct && !loading && !products.length" class="notice">No tienes productos en el inventario todavía.</p>
      <p v-if="error" class="error" role="alert">{{ error }}</p>

      <footer class="actions">
        <button class="secondary" type="button" @click="emit('close')">Cancelar</button>
        <button class="primary" type="submit" :disabled="saving || loading || alreadyInCatalog || !selectedProduct || !selectedCatalogId || (!props.fixedCatalog && !props.catalogs.length)">
          <LoaderCircle v-if="saving" :size="16" class="spin" />
          <Plus v-else :size="16" />
          {{ saving ? 'Agregando...' : 'Agregar al catálogo' }}
        </button>
      </footer>
    </form>
  </div>
</template>

<style scoped>
.modal-layer{position:fixed;inset:0;z-index:120;display:grid;place-items:center;overflow-y:auto;padding:18px;background:rgba(0,0,0,.62)}
.modal-card{width:min(520px,100%);max-height:calc(100dvh - 36px);overflow-y:auto;padding:24px;border:1px solid #e8e8e8;border-radius:14px;background:#fff;box-shadow:0 22px 70px rgba(0,0,0,.2);color:#171717}
.modal-heading,.actions{display:flex;align-items:center;justify-content:space-between;gap:12px}
.eyebrow{margin:0;color:#777;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
h2{margin:6px 0 0;font-size:24px;color:#171717}
.close-button{display:grid;place-items:center;width:36px;height:36px;border:0;border-radius:8px;background:#fff6f0;color:#c65b19;cursor:pointer}
.fields{display:grid;gap:16px;margin:24px 0}
.fields label{display:grid;gap:7px;color:#333;font-size:13px;font-weight:700}
.selection-section{display:grid;gap:9px;min-width:0}
.selection-heading{display:flex;align-items:center;justify-content:space-between;gap:8px}
.selection-title{color:#333;font-size:13px;font-weight:700}
.selection-count{color:#c65b19;font-size:11px;font-weight:700}
.selection-search{display:flex!important;align-items:center!important;gap:8px!important;min-height:40px;padding:0 10px;border:0;border-radius:0;background:transparent;color:#777!important}
.selection-search:focus-within{border:0;border-radius:0;outline:0;box-shadow:none}
.selection-search input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:#171717;font:inherit;font-size:13px;font-weight:400}
.selection-search button{display:grid;place-items:center;flex:0 0 auto;padding:3px;border:0;background:transparent;color:#777;cursor:pointer}
.selection-table-wrap{max-height:220px;overflow:auto;border:1px solid #e8e8e8;border-radius:8px}
.selection-table{width:100%;border-collapse:collapse;font-size:12px}
.selection-table th,.selection-table td{padding:9px 10px;border-bottom:1px solid #eee;text-align:left}
.selection-table th{position:sticky;top:0;background:#fafafa;color:#777;font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase}
.selection-table tbody tr:last-child td{border-bottom:0}
.selection-table tbody tr.selected{background:#fff6f0}
.selection-table td:nth-last-child(-n+2),.selection-table th:last-child{text-align:right;white-space:nowrap}
.select-row{display:inline-flex;align-items:center;justify-content:center;min-width:62px;min-height:30px;gap:4px;padding:5px 8px;border:1px solid #e8e8e8;border-radius:6px;background:#fff;color:#555;font:inherit;font-weight:700;cursor:pointer}
.select-row[aria-pressed="true"]{border-color:#c65b19;background:#c65b19;color:#fff}
.product-option{display:flex;align-items:center;gap:8px;min-width:0}
.product-option img{width:30px;height:30px;flex:0 0 auto;border-radius:5px;object-fit:cover;background:#f0f0f0}
.product-option span{overflow:hidden;text-overflow:ellipsis}
.selection-empty{padding:18px!important;color:#777;text-align:center!important}
.fixed-catalog,.fixed-product{display:flex;align-items:center;gap:10px;margin:0;padding:11px 12px;border-radius:8px;background:#f0f0f0;color:#171717;font-size:14px;font-weight:700}
.fixed-product img{width:38px;height:38px;border-radius:6px;object-fit:cover}
.status{display:flex;align-items:center;gap:8px;color:#777;font-size:12px}
.notice,.error{margin:10px 0;color:#b8860b;font-size:13px;line-height:1.5}
.error{color:#a8584e}
.actions{justify-content:flex-end;margin-top:24px}
.primary,.secondary{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:42px;padding:10px 14px;border:0;border-radius:8px;font-weight:700;cursor:pointer}
.primary{background:#171717;color:#fff}
.secondary{background:#fff6f0;color:#c65b19}
.primary:disabled{opacity:.55;cursor:not-allowed}
.spin{animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:520px){.modal-card{padding:20px 16px}.actions{align-items:stretch;flex-direction:column-reverse}.actions button{width:100%}.selection-table-wrap{overflow-x:hidden}.selection-table{table-layout:fixed}.selection-table th,.selection-table td{padding:8px 7px}.selection-table th{font-size:9px}.selection-table .product-price,.selection-table thead{display:none}.selection-table tbody tr:not(:has(.selection-empty)){display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:6px;border-bottom:1px solid #eee}.selection-table tbody td{min-width:0;border-bottom:0}.selection-table tbody td:first-child{overflow-wrap:anywhere}.product-option{min-width:0}.product-option>span{display:grid;gap:3px;overflow-wrap:anywhere}.mobile-price{display:block;color:#777;font-size:11px}.select-row{min-width:54px;padding:4px 6px}}
.mobile-price{display:none}
</style>
