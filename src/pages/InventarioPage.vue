<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Package, Plus, RefreshCw } from 'lucide-vue-next'
import { api, type Producto } from '../api.ts'
import ProductFormModal from '../components/ProductFormModal.vue'
import SupplierModal from '../components/SupplierModal.vue'

const products = ref<Producto[]>([])
const loading = ref(false)
const error = ref('')
const showProductModal = ref(false)
const showSupplierModal = ref(false)
const supplierProductId = ref<number | null>(null)

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

onMounted(load)
</script>

<template>
  <section class="products-page"><div class="heading"><div><p class="eyebrow">Gestión</p><h2>Productos</h2><p class="muted">Administra precios, stock y proveedores asociados.</p></div><div class="heading-actions"><button class="secondary" type="button" @click="load"><RefreshCw :size="16" /> Actualizar</button><button class="primary" type="button" @click="showProductModal = true"><Plus :size="17" /> Añadir producto</button></div></div>
    <p v-if="error" class="error">{{ error }}</p>
    <div v-if="loading" class="state"><RefreshCw :size="24" class="spin" /> Cargando productos...</div>
    <div v-else-if="!products.length" class="state"><Package :size="30" /><p>Aún no hay productos.</p><button class="primary" type="button" @click="showProductModal = true"><Plus :size="16" /> Crear producto</button></div>
    <div v-else class="table-wrap"><table><thead><tr><th>Producto</th><th>Descripción</th><th>Precio venta</th><th>Stock</th><th>Estado</th></tr></thead><tbody><tr v-for="product in products" :key="product.id"><td><strong>{{ product.nombre }}</strong></td><td>{{ product.descripcion || '—' }}</td><td>{{ product.precioVenta }}</td><td>{{ product.stockActual }}</td><td><span :class="product.stockActual <= 0 ? 'low' : 'ok'">{{ product.stockActual <= 0 ? 'Sin stock' : 'Disponible' }}</span></td></tr></tbody></table></div>
    <ProductFormModal :visible="showProductModal" @close="showProductModal = false" @created="productCreated" />
    <SupplierModal :visible="showSupplierModal" :product-id="supplierProductId" @close="showSupplierModal = false" @saved="load" />
  </section>
</template>

<style scoped>
.products-page{padding:34px 0;color:#17332a}.heading,.heading-actions{display:flex;align-items:end;justify-content:space-between;gap:14px}.heading{margin-bottom:28px}.heading-actions{align-items:center}.eyebrow{margin:0;color:#6c8175;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}h2{margin:8px 0 7px;font:700 clamp(28px,4vw,42px) 'Space Grotesk',Arial,sans-serif}.muted{margin:0;color:#75847b}.primary,.secondary{display:inline-flex;align-items:center;gap:7px;border:0;border-radius:9px;padding:11px 14px;font-weight:700;cursor:pointer}.primary{background:#1a5f47;color:#fff}.secondary{background:#e7f0ea;color:#1a5f47}.state,.table-wrap{border:1px solid #e3e9e2;border-radius:14px;background:#fff}.state{min-height:260px;display:grid;place-content:center;justify-items:center;gap:12px;color:#75847b}.table-wrap{overflow:auto}.table-wrap table{width:100%;border-collapse:collapse;text-align:left}.table-wrap th,.table-wrap td{padding:15px;border-bottom:1px solid #edf1ed;white-space:nowrap}.table-wrap th{color:#6c8175;font-size:11px;text-transform:uppercase}.ok,.low{font-weight:700}.ok{color:#28704e}.low,.error{color:#a8584e}.spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:700px){.heading{align-items:start;flex-direction:column}.heading-actions{width:100%;align-items:stretch}.heading-actions button{flex:1}}
</style>
