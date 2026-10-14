<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { LoaderCircle, Package, Plus, X } from 'lucide-vue-next'
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
const order = ref(1)
const loading = ref(false)
const saving = ref(false)
const error = ref('')
let catalogLoadSequence = 0

const selectedProduct = computed(() => props.fixedProduct
  || products.value.find((product) => product.id === selectedProductId.value)
  || null)
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

function selectProduct(event: Event) {
  const value = Number((event.target as HTMLSelectElement).value)
  selectedProductId.value = Number.isInteger(value) && value > 0 ? value : null
}

async function selectCatalog(event: Event) {
  const value = Number((event.target as HTMLSelectElement).value)
  selectedCatalogId.value = Number.isInteger(value) && value > 0 ? value : null
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
        <label v-if="!props.fixedCatalog">
          Catálogo
          <select :value="selectedCatalogId ?? ''" required @change="selectCatalog">
            <option value="" disabled>Selecciona un catálogo</option>
            <option v-for="catalog in props.catalogs" :key="catalog.id" :value="catalog.id">{{ catalog.nombre }}</option>
          </select>
        </label>
        <p v-else class="fixed-catalog"><Package :size="17" /> {{ props.fixedCatalog.nombre }}</p>

        <label v-if="!props.fixedProduct">
          Producto del inventario
          <select :value="selectedProductId ?? ''" required @change="selectProduct">
            <option :value="null" disabled>Selecciona un producto</option>
            <option v-for="product in products" :key="product.id" :value="product.id">
              {{ product.nombre }} · {{ product.precioVenta }}
            </option>
          </select>
        </label>
        <div v-else class="fixed-product">
          <img v-if="props.fixedProduct.urlFoto" :src="props.fixedProduct.urlFoto" :alt="props.fixedProduct.nombre" />
          <Package v-else :size="18" />
          <span>{{ props.fixedProduct.nombre }}</span>
        </div>

        <div v-if="!props.fixedProduct && selectedProduct" class="fixed-product">
          <img v-if="selectedProduct.urlFoto" :src="selectedProduct.urlFoto" :alt="selectedProduct.nombre" />
          <Package v-else :size="18" />
          <span>{{ selectedProduct.nombre }}</span>
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
.fields select{width:100%;min-height:44px;padding:10px 12px;border:1px solid #e8e8e8;border-radius:8px;background:#fff;color:#171717;font:inherit;font-weight:400}
.fields select:focus{border-color:#c65b19;outline:2px solid rgba(198,91,25,.2)}
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
@media(max-width:520px){.modal-card{padding:20px 16px}.actions{align-items:stretch;flex-direction:column-reverse}.actions button{width:100%}}
</style>
