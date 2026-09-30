<script setup lang="ts">
import { ref, watch } from 'vue'
import { ArrowLeft, Package, RefreshCw, Store } from 'lucide-vue-next'
import { api, type Catalogo } from '../api.ts'

interface CatalogoProducto {
  productoId: number
  nombre: string
  descripcion?: string
  orden: number
  urlFoto?: string
  precioVenta?: number | string
}

const props = defineProps<{ catalogId: number }>()
const emit = defineEmits<{ (e: 'back'): void }>()
const catalog = ref<Catalogo | null>(null)
const products = ref<CatalogoProducto[]>([])
const loading = ref(true)
const error = ref('')

async function loadCatalog() {
  loading.value = true
  error.value = ''
  try {
    const [catalogResult, productResult] = await Promise.all([
      api.catalogoPorId<Catalogo>(props.catalogId),
      api.catalogoProductos<CatalogoProducto>(props.catalogId),
    ])
    catalog.value = catalogResult
    products.value = productResult
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'No se pudo cargar este catálogo.'
  } finally {
    loading.value = false
  }
}

watch(() => props.catalogId, loadCatalog, { immediate: true })
</script>

<template>
  <main class="catalog-detail-page">
    <header class="detail-topbar">
      <button class="back-button" type="button" @click="emit('back')"><ArrowLeft :size="18" /> Volver a catálogos</button>
      <span class="brand-label"><Store :size="17" /> CatalogosZone</span>
    </header>

    <section v-if="loading" class="detail-state"><RefreshCw :size="25" class="spin" /><span>Cargando catálogo...</span></section>
    <section v-else-if="error" class="detail-state detail-error"><p>{{ error }}</p><button class="retry-button" type="button" @click="loadCatalog">Reintentar</button></section>
    <template v-else-if="catalog">
      <section class="catalog-cover" :style="catalog.urlFotoPortada ? { backgroundImage: `linear-gradient(90deg, rgba(0,0,0,.78), rgba(0,0,0,.2)), url('${catalog.urlFotoPortada}')` } : undefined">
        <div v-if="!catalog.urlFotoPortada" class="cover-icon"><Store :size="34" /></div>
        <div class="cover-copy"><p class="eyebrow">Catálogo</p><h1>{{ catalog.nombre }}</h1><p v-if="catalog.descripcion">{{ catalog.descripcion }}</p></div>
      </section>

      <section class="products-section">
        <div class="section-heading"><div><p class="eyebrow">Selección del negocio</p><h2>Productos</h2></div><span>{{ products.length }} {{ products.length === 1 ? 'producto' : 'productos' }}</span></div>
        <div v-if="!products.length" class="detail-state empty-products"><Package :size="28" /><p>Este catálogo todavía no tiene productos.</p></div>
        <div v-else class="product-grid">
          <article v-for="product in products" :key="product.productoId" class="product-card">
            <div class="product-image"><img v-if="product.urlFoto" :src="product.urlFoto" :alt="product.nombre" loading="lazy" /><Package v-else :size="34" /></div>
            <div class="product-copy"><span class="product-order">{{ String(product.orden).padStart(2, '0') }}</span><h3>{{ product.nombre }}</h3><p>{{ product.descripcion || 'Sin descripción disponible.' }}</p><strong v-if="product.precioVenta !== undefined">{{ product.precioVenta }}</strong></div>
          </article>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.catalog-detail-page{min-height:100vh;background:#f5f5f5;color:#171717}
.detail-topbar{height:72px;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:0 clamp(18px,5vw,72px);border-bottom:1px solid #dedede;background:#fff}
.back-button,.brand-label{display:inline-flex;align-items:center;gap:8px}
.back-button{border:0;background:transparent;color:#171717;font-weight:700}
.brand-label{font-size:13px;font-weight:800}
.catalog-cover{min-height:300px;display:flex;align-items:end;gap:22px;padding:48px clamp(20px,8vw,112px);background-color:#191919;background-position:center;background-size:cover;color:#fff}
.cover-icon{display:grid;place-items:center;width:60px;height:60px;flex:0 0 60px;border-radius:12px;background:#fff;color:#171717}
.cover-copy{max-width:850px}
.eyebrow{margin:0;color:#c65b19;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
.cover-copy h1{margin:8px 0;font-size:clamp(32px,5vw,54px);line-height:1.05;overflow-wrap:anywhere}
.cover-copy>p:last-child{max-width:680px;margin:10px 0 0;color:#eee;line-height:1.6}
.products-section{width:min(1240px,90%);margin:0 auto;padding:52px 0 72px}
.section-heading{display:flex;align-items:end;justify-content:space-between;gap:18px;margin-bottom:24px}
.section-heading h2{margin:7px 0 0;font-size:30px}
.section-heading>span{color:#626262;font-size:13px}
.product-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,250px),1fr));gap:20px}
.product-card{min-width:0;overflow:hidden;border:1px solid #dedede;background:#fff;transition:border-color .2s,transform .2s,box-shadow .2s}
.product-card:hover{transform:translateY(-3px);border-color:#c65b19;box-shadow:0 14px 30px rgba(0,0,0,.09)}
.product-image{height:220px;display:grid;place-items:center;overflow:hidden;background:#ededed;color:#626262}
.product-image img{width:100%;height:100%;object-fit:cover}
.product-copy{position:relative;padding:18px}
.product-order{color:#c65b19;font-size:11px;font-weight:800}
.product-copy h3{margin:7px 0;font-size:18px;overflow-wrap:anywhere}
.product-copy p{min-height:42px;margin:0 0 14px;color:#626262;font-size:13px;line-height:1.55}
.product-copy strong{font-size:16px}
.detail-state{min-height:260px;display:grid;place-content:center;justify-items:center;gap:12px;padding:24px;color:#626262;text-align:center}
.detail-state p{margin:0}
.detail-error{color:#8f3e13}
.retry-button{padding:10px 14px;border:0;background:#171717;color:#fff;font-weight:700}
.spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:600px){.detail-topbar{height:64px}.brand-label{font-size:0}.brand-label svg{width:20px;height:20px}.catalog-cover{min-height:250px;padding:32px 20px}.products-section{width:calc(100% - 32px);padding:36px 0 52px}.section-heading{align-items:start;flex-direction:column}.product-grid{grid-template-columns:repeat(auto-fill,minmax(min(100%,220px),1fr));gap:14px}.product-image{height:190px}}
@media(prefers-reduced-motion:reduce){.product-card{transition:none}}
</style>
