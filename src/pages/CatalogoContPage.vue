<script setup lang="ts">

import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

import { ArrowLeft, ChevronDown, Copy, Facebook, Instagram, MessageCircle, Package, RefreshCw, Store, X, Maximize2 } from 'lucide-vue-next'

import { api, normalizarGaleria, type Catalogo, type CatalogoProducto } from '../api.ts'

interface CatalogChild {

  key: string

  nombre: string

  urlFoto?: string

  descripcion?: string

  precio?: number | string

  cantidad?: number

}

const props = defineProps<{ catalogId: number }>()

const emit = defineEmits<{ (e: 'back'): void }>()

const catalog = ref<Catalogo | null>(null)

const products = ref<CatalogoProducto[]>([])

const loading = ref(true)

const error = ref('')

const activeChildrenGroupKey = ref('')

const zoomedImage = ref<string | null>(null)
const copiedUrl = ref(false)
let copyFeedbackTimer: ReturnType<typeof setTimeout> | undefined

const productGroups = computed(() => {

  const visibleItems = products.value.filter((item) => item.visible !== false)

  const variants = visibleItems.filter((item) => item.varianteId)

  return visibleItems

    .filter((item) => !item.varianteId)

    .map((product) => {

      const key = product.comboId ? `combo-${product.comboId}` : `producto-${product.productoId}`

      let children: CatalogChild[]

      if (product.comboId) {

        children = (product.componentes || []).map((component, index) => ({

          key: `combo-${product.comboId}-${component.productoId}-${component.varianteId ?? index}`,

          nombre: component.productoNombre || `Producto ${component.productoId}`,

          urlFoto: component.urlFoto,

          cantidad: component.cantidad,

        }))

      } else {

        const childrenById = new Map<number, CatalogChild>()

        for (const variant of product.variantes || []) {

          if (variant.visible === false) continue

          childrenById.set(variant.id, {

            key: `variante-${variant.id}`,

            nombre: variant.nombre,

            urlFoto: variant.urlFoto,

            precio: variant.precio,

          })

        }

        for (const variant of variants.filter((item) => item.productoId === product.productoId)) {

          if (!variant.varianteId) continue

          childrenById.set(variant.varianteId, {

            key: `variante-${variant.varianteId}`,

            nombre: variant.nombre,

            urlFoto: variant.urlFoto,

            descripcion: variant.descripcion || '',

            precio: variant.precioVenta,

          })

        }

        children = [...childrenById.values()]

      }

      return { key, product, children }

    })

    .sort((left, right) => left.product.orden - right.product.orden)

})

async function loadCatalog() {

  loading.value = true

  error.value = ''

  try {

    const [catalogResult, productResult] = await Promise.all([

      api.catalogoPorId<Catalogo>(props.catalogId),

      api.catalogoProductos<CatalogoProducto>(props.catalogId),

    ])

    catalog.value = { ...catalogResult, galeria: normalizarGaleria(catalogResult.galeria) }

    products.value = productResult.filter((product) => product.visible !== false)

    activeChildrenGroupKey.value = ''

  } catch (reason) {

    error.value = reason instanceof Error ? reason.message : 'No se pudo cargar este catálogo.'

  } finally {

    loading.value = false

  }

}

watch(() => props.catalogId, loadCatalog, { immediate: true })

const activeChildrenGroup = computed(() =>

  productGroups.value.find((group) => group.key === activeChildrenGroupKey.value),

)

const socialLinks = computed(() => {

  const links = [

    { key: 'whatsapp', href: catalog.value?.whatsapp, label: 'WhatsApp', icon: MessageCircle },

    { key: 'instagram', href: catalog.value?.instagram, label: 'Instagram', icon: Instagram },

    { key: 'facebook', href: catalog.value?.facebook, label: 'Facebook', icon: Facebook },

  ]

  return links.filter((link) => Boolean(link.href))

})

const ownerWhatsappLink = computed(() => {

  const phone = catalog.value?.wappPropietario?.replace(/\D/g, '')

  return phone ? `https://wa.me/${phone}` : ''

})

const ownerWhatsappLabel = computed(() => {

  const phone = catalog.value?.wappPropietario

  return phone ? phone.replace(/\s+/g, ' ').trim() : ''

})

function showChildren(key: string) {

  activeChildrenGroupKey.value = key

}

function closeChildren() {

  activeChildrenGroupKey.value = ''

}

function handleEscape(event: KeyboardEvent) {

  if (event.key === 'Escape') {

    closeChildren()

    zoomedImage.value = null

  }

}

async function copyCatalogUrl() {
  try {
    await navigator.clipboard.writeText(window.location.href)
    copiedUrl.value = true

    if (copyFeedbackTimer) clearTimeout(copyFeedbackTimer)
    copyFeedbackTimer = setTimeout(() => {
      copiedUrl.value = false
    }, 2200)
  } catch (reason) {
    console.error('No se pudo copiar el enlace:', reason)
    // Inform the user if clipboard access is unavailable (for example, outside HTTPS).
    window.prompt('Copia el enlace del catálogo:', window.location.href)
  }
}

function openImageZoom(url: string) {

  zoomedImage.value = url

}

function closeImageZoom() {

  zoomedImage.value = null

}

function openImageInNewTab() {

  if (zoomedImage.value) window.open(zoomedImage.value, '_blank')

}

onMounted(() => window.addEventListener('keydown', handleEscape))

onUnmounted(() => window.removeEventListener('keydown', handleEscape))

</script>

<template>

  <main class="catalog-detail-page">

    <header class="detail-topbar">

      <button class="back-button" type="button" @click="emit('back')">

        <ArrowLeft :size="18" /> Volver a catálogos

      </button>

      <span class="brand-label">

        <Store :size="17" /> CatalogosZone

      </span>

    </header>

    <section v-if="loading" class="detail-state">

      <RefreshCw :size="25" class="spin" /><span>Cargando catálogo...</span>

    </section>

    <section v-else-if="error" class="detail-state detail-error">

      <p>{{ error }}</p><button class="retry-button" type="button" @click="loadCatalog">Reintentar</button>

    </section>

    <template v-else-if="catalog">

      <section class="catalog-cover"

        :style="catalog.urlFotoPortada ? { backgroundImage: `linear-gradient(90deg, rgba(0,0,0,.78), rgba(0,0,0,.2)), url('${catalog.urlFotoPortada}')` } : undefined">

        <div v-if="!catalog.urlFotoPortada" class="cover-icon">

          <Store :size="34" />

        </div>

        <!-- Top right: Logo + Social links -->

        <div class="cover-top-right mt-3" v-if="catalog.urlLogo || socialLinks.length">

          <div v-if="catalog.urlLogo" class="catalog-logo" :style="{ backgroundImage: `url('${catalog.urlLogo}')` }"

            aria-label="Logo del catálogo"></div>

          <div v-if="socialLinks.length" class="social-links" aria-label="Redes sociales del catálogo">

            <a v-for="social in socialLinks" :key="social.key" :href="social.href" target="_blank"

              rel="noopener noreferrer" :aria-label="social.label">

              <component :is="social.icon" :size="18" />

            </a>

          </div>

          <button
            class="copy-url-button"
            type="button"
            @click="copyCatalogUrl"
            :aria-live="'polite'"
          >
            <Copy :size="15" />
            <span>{{ copiedUrl ? '¡Enlace copiado!' : 'Copiar enlace' }}</span>
          </button>

        </div>

        <!-- Center content: Catalog label, name, description, WhatsApp button -->

        <div class="cover-copy">

          <p class="eyebrow">Catálogo</p>

          <h1 class="text-white">{{ catalog.nombre }}</h1>

          <p v-if="catalog.descripcion">{{ catalog.descripcion }}</p>

          <div v-if="ownerWhatsappLink" class="owner-whatsapp">

            <a :href="ownerWhatsappLink" target="_blank" rel="noopener noreferrer">

              <MessageCircle :size="18" />

              <span>Realiza tu encargo por WhatsApp</span>

            </a>

            <small v-if="ownerWhatsappLabel">{{ ownerWhatsappLabel }}</small>

          </div>

        </div>

      </section>

      <section class="products-section">

        <div class="section-heading">

          <div>

            <p class="eyebrow">Selección del negocio</p>

            <h2>Productos</h2>

          </div>

          <div class="section-heading-actions">

            <a v-if="catalog.galeria?.length" class="gallery-jump-link" href="#catalog-gallery">Ver galería</a>

            <span>{{ productGroups.length }} {{ productGroups.length === 1 ? 'artículo' : 'artículos' }}</span>

          </div>

        </div>

        <div v-if="!productGroups.length" class="detail-state empty-products">

          <Package :size="28" />

          <p>Este catálogo todavía no tiene productos.</p>

        </div>

        <div v-else class="product-grid">

          <section v-for="group in productGroups" :key="group.key" class="product-group">

            <article class="product-card">

              <div class="product-image"><img v-if="group.product.urlFoto" :src="group.product.urlFoto"

                  :alt="group.product.nombre" loading="lazy" @click="openImageZoom(group.product.urlFoto)"

                  style="cursor: zoom-in;" />

                <Package v-else :size="34" />

              </div>

              <div class="product-copy">

                <span class="product-order">{{ String(group.product.orden).padStart(2, '0') }}</span>

                <span v-if="group.product.comboId" class="combo-label">Combo</span>

                <h3>{{ group.product.nombre }}</h3>

                <p>{{ group.product.descripcion || (group.product.comboId ?

                'Combo preparado con productos de nuestro inventario.' : 'Sin descripción disponible.') }}</p>

                <strong v-if="group.product.precioVenta !== undefined">{{ group.product.precioVenta }}</strong>

                <button v-if="group.children.length" class="children-toggle" type="button" :aria-haspopup="true"

                  @click="showChildren(group.key)">

                  Ver {{ group.product.comboId ? 'productos' : 'variantes' }} <span>({{ group.children.length }})</span>

                  <ChevronDown :size="16" />

                </button>

              </div>

            </article>

          </section>

        </div>

      </section>

      <div v-if="activeChildrenGroup" class="children-modal-overlay" role="presentation" @click.self="closeChildren">

        <section class="children-modal" role="dialog" aria-modal="true"

          :aria-labelledby="`children-title-${activeChildrenGroup.key}`">

          <header class="children-modal-header">

            <div>

              <p class="eyebrow">{{ activeChildrenGroup.product.comboId ? 'Contenido del combo' : 'Opciones disponibles'

                }}</p>

              <h2 :id="`children-title-${activeChildrenGroup.key}`">{{ activeChildrenGroup.product.comboId ?

                'Productos del combo' : `Variantes de ${activeChildrenGroup.product.nombre}` }}</h2>

            </div>

            <button class="children-modal-close" type="button" aria-label="Cerrar" @click="closeChildren">

              <X :size="20" />

            </button>

          </header>

          <div class="children-modal-grid">

            <article v-for="child in activeChildrenGroup.children" :key="child.key" class="child-card">

              <div class="child-image"><img v-if="child.urlFoto" :src="child.urlFoto" :alt="child.nombre" loading="lazy"

                  @click="openImageZoom(child.urlFoto)" style="cursor: zoom-in;" />

                <Package v-else :size="22" />

              </div>

              <div class="child-copy">

                <h3>{{ child.nombre }}</h3>

                <p v-if="child.cantidad !== undefined" class="child-quantity">Cantidad: {{ child.cantidad }}</p>

                <p v-else-if="child.descripcion">{{ child.descripcion }}</p>

                <strong v-if="child.precio !== undefined">{{ child.precio }}</strong>

              </div>

            </article>

          </div>

        </section>

      </div>

      <section v-if="catalog.galeria?.length" id="catalog-gallery" class="gallery-section"

        aria-labelledby="catalog-gallery-title">

        <div class="gallery-heading">

          <p class="eyebrow">Más de nuestro trabajo</p>

          <h2 id="catalog-gallery-title">Galería</h2>

        </div>

        <div class="gallery-grid">

          <figure v-for="(photo, index) in catalog.galeria" :key="`${photo.url}-${index}`" class="gallery-photo">

            <img :src="photo.url" :alt="`Foto ${index + 1} de ${catalog.nombre}`" loading="lazy"

              @click="openImageZoom(photo.url)" style="cursor: zoom-in;" />

            <figcaption>{{ photo.descripcion?.trim() || 'Sin descripción' }}</figcaption>

          </figure>

        </div>

      </section>

    </template>

    <div v-if="zoomedImage" class="zoom-overlay" @click="closeImageZoom" @keydown.esc="closeImageZoom" tabindex="0">

      <img :src="zoomedImage" alt="Imagen ampliada" @click.stop />

      <button class="zoom-close" type="button" @click="closeImageZoom" aria-label="Cerrar imagen">

        <X :size="24" />

      </button>

      <button class="zoom-expand" type="button" @click="openImageInNewTab" aria-label="Abrir en nueva pestaña">

        <Maximize2 :size="20" />

      </button>

    </div>

  </main>

</template>

<style scoped>

.catalog-detail-page {

  min-height: 100vh;

  background: linear-gradient(180deg, #f9f8f6 0, #f1f0ed 100%);

  color: #171717

}

.detail-topbar {

  position: sticky;

  top: 0;

  z-index: 10;

  height: 72px;

  display: flex;

  align-items: center;

  justify-content: space-between;

  gap: 16px;

  padding: 0 clamp(18px, 5vw, 72px);

  border-bottom: 1px solid #dedede;

  background: rgba(255, 255, 255, .92);

  backdrop-filter: blur(12px)

}

.back-button,

.brand-label {

  display: inline-flex;

  align-items: center;

  gap: 8px

}

.back-button {

  border: 0;

  background: transparent;

  color: #171717;

  font-weight: 700

}

.brand-label {

  font-size: 13px;

  font-weight: 800

}

.catalog-cover {

  position: relative;

  min-height: 340px;

  display: flex;

  flex-direction: column;

  justify-content: center;

  padding: 48px clamp(20px, 8vw, 112px);

  background-color: #191919;

  background-position: center;

  background-size: cover;

  color: #fff;

  isolation: isolate

}

.catalog-cover::after {

  position: absolute;

  inset: 0;

  z-index: -1;

  background: linear-gradient(90deg, rgba(0, 0, 0, .76), rgba(0, 0, 0, .16));

  content: ""

}

.cover-icon {

  display: grid;

  place-items: center;

  width: 60px;

  height: 60px;

  flex: 0 0 60px;

  border-radius: 12px;

  background: #fff;

  color: #171717

}

.cover-copy {

  display: flex;

  flex-direction: column;

  align-items: flex-start;

  gap: 10px;

  max-width: 850px;

  z-index: 1;

  text-align: left

}

.cover-top-right {

  position: absolute;

  top: 50%;

  right: 32px;

  transform: translateY(-50%);

  display: flex;

  flex-direction: column;

  align-items: center;

  gap: 12px;

  z-index: 2

}

.catalog-logo {

  width: 160px;

  height: 160px;

  border-radius: 24px;

  background-size: contain;

  background-repeat: no-repeat;

  background-position: center;

  background-color: #fff;

  box-shadow: 0 16px 48px rgba(0, 0, 0, .25);

  border: 1px solid rgba(255, 255, 255, .4)

}

.social-links {

  display: flex;

  align-items: center;

  gap: 10px

}

.social-links a {

  display: grid;

  place-items: center;

  width: 42px;

  height: 42px;

  border: 1px solid rgba(255, 255, 255, .25);

  border-radius: 12px;

  background: rgba(14, 14, 14, .34);

  color: #fff;

  text-decoration: none;

  backdrop-filter: blur(6px)

}

.owner-whatsapp {

  display: grid;

  gap: 4px;

  margin-top: 8px

}

.owner-whatsapp a {

  display: inline-flex;

  align-items: center;

  gap: 8px;

  padding: 10px 14px;

  border-radius: 999px;

  background: rgba(12, 13, 15, .52);

  color: #fff;

  font-size: 12px;

  font-weight: 800;

  text-decoration: none;

  border: 1px solid rgba(255, 255, 255, .2)

}

.owner-whatsapp small {

  color: #f5f5f5;

  font-size: 11px;

  opacity: .9;

  text-align: center

}

.eyebrow {

  margin: 0;

  color: #c65b19;

  font-size: 11px;

  font-weight: 800;

  letter-spacing: .12em;

  text-transform: uppercase

}

.cover-copy h1 {

  margin: 0;

  font-size: clamp(32px, 5vw, 54px);

  line-height: 1.05;

  overflow-wrap: anywhere

}

.cover-copy>p:last-child {

  max-width: 680px;

  margin: 0;

  color: #eee;

  line-height: 1.6

}

.products-section {

  width: min(1240px, 90%);

  margin: 0 auto;

  padding: 56px 0 72px

}

.section-heading {

  display: flex;

  align-items: end;

  justify-content: space-between;

  gap: 18px;

  margin-bottom: 24px

}

.section-heading h2 {

  margin: 7px 0 0;

  font-size: clamp(26px, 3vw, 34px);

  letter-spacing: -.04em

}

.section-heading>span {

  color: #626262;

  font-size: 13px

}

.section-heading-actions {

  display: flex;

  align-items: center;

  gap: 16px

}

.section-heading-actions>span {

  color: #626262;

  font-size: 13px

}

.gallery-jump-link {

  display: inline-flex;

  align-items: center;

  min-height: 38px;

  padding: 0 13px;

  border-radius: 999px;

  background: #171717;

  color: #fff;

  font-size: 12px;

  font-weight: 800;

  text-decoration: none;

  transition: background .18s

}

.gallery-jump-link:hover {

  background: #c65b19

}

.gallery-section {

  width: min(1240px, 90%);

  margin: 0 auto;

  padding: 0 0 76px;

  scroll-margin-top: 90px

}

.gallery-heading {

  margin-bottom: 22px

}

.gallery-heading h2 {

  margin: 7px 0 0;

  font-size: clamp(26px, 3vw, 34px);

  letter-spacing: -.04em

}

.gallery-grid {

  display: grid;

  grid-template-columns: repeat(auto-fill, minmax(min(100%, 230px), 1fr));

  gap: 16px

}

.gallery-photo {

  overflow: hidden;

  margin: 0;

  border: 1px solid #dedede;

  border-radius: 14px;

  background: #fff;

  box-shadow: 0 8px 22px rgba(0, 0, 0, .06)

}

.gallery-photo img {

  display: block;

  width: 100%;

  aspect-ratio: 4/3;

  object-fit: cover;

  transition: transform .25s

}

.gallery-photo:hover img {

  transform: scale(1.035)

}

.gallery-photo figcaption {

  min-height: 42px;

  padding: 12px 14px;

  color: #626262;

  font-size: 13px;

  line-height: 1.4

}

.product-grid {

  display: grid;

  grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));

  align-items: start;

  gap: 22px

}

.product-group {

  display: grid;

  align-content: start;

  gap: 9px;

  min-width: 0

}

.product-card {

  min-width: 0;

  overflow: hidden;

  border: 1px solid #e4e2de;

  border-radius: 15px;

  background: #fff;

  box-shadow: 0 8px 24px rgba(0, 0, 0, .045);

  transition: border-color .2s, transform .2s, box-shadow .2s

}

.product-card:hover {

  transform: translateY(-3px);

  border-color: #d6b69f;

  box-shadow: 0 14px 30px rgba(0, 0, 0, .09)

}

.product-image {

  height: 220px;

  display: grid;

  place-items: center;

  overflow: hidden;

  background: linear-gradient(135deg, #f1f0ed, #e5e3de);

  color: #626262

}

.product-image img {

  width: 100%;

  height: 100%;

  object-fit: cover

}

.product-copy {

  position: relative;

  padding: 18px

}

.product-order {

  color: #c65b19;

  font-size: 11px;

  font-weight: 800

}

.product-copy h3 {

  margin: 7px 0;

  font-size: 18px;

  overflow-wrap: anywhere

}

.product-copy p {

  min-height: 42px;

  margin: 0 0 14px;

  color: #626262;

  font-size: 13px;

  line-height: 1.55

}

.product-copy strong {

  font-size: 16px

}

.combo-label {

  display: inline-block;

  margin-left: 8px;

  padding: 3px 7px;

  border-radius: 999px;

  background: #ededed;

  color: #333;

  font-size: 9px;

  font-weight: 800;

  vertical-align: middle

}

.children-toggle {

  display: flex;

  align-items: center;

  gap: 6px;

  margin-top: 15px;

  padding: 9px 11px;

  border: 0;

  border-radius: 9px;

  background: #f2eee9;

  color: #5f351f;

  font-size: 12px;

  font-weight: 800;

  text-align: left;

  cursor: pointer;

  transition: background .18s

}

.children-toggle:hover {

  background: #eadfd5

}

.children-toggle svg {

  margin-left: auto

}

.children-modal-overlay {

  position: fixed;

  inset: 0;

  z-index: 100;

  display: grid;

  place-items: center;

  overflow-y: auto;

  padding: 24px;

  background: rgba(20, 20, 18, .68);

  backdrop-filter: blur(7px)

}

.children-modal {

  width: min(900px, 100%);

  min-height: min(460px, calc(100dvh - 48px));

  max-height: calc(100dvh - 48px);

  overflow-y: auto;

  padding: 32px;

  border: 1px solid rgba(255, 255, 255, .8);

  border-radius: 24px;

  background: linear-gradient(145deg, #fff 0%, #faf8f5 100%);

  box-shadow: 0 32px 100px rgba(0, 0, 0, .3)

}

.children-modal-header {

  display: flex;

  align-items: flex-start;

  justify-content: space-between;

  gap: 20px;

  margin-bottom: 26px;

  padding-bottom: 20px;

  border-bottom: 1px solid #eae5de

}

.children-modal-header .eyebrow {

  margin: 0;

  color: #956543;

  font-size: 11px;

  font-weight: 800;

  letter-spacing: .12em;

  text-transform: uppercase

}

.children-modal-header h2 {

  margin: 7px 0 0;

  font-size: clamp(22px, 4vw, 30px);

  letter-spacing: -.04em;

  line-height: 1.15;

  overflow-wrap: anywhere

}

.children-modal-close {

  display: grid;

  place-items: center;

  width: 42px;

  height: 42px;

  flex: 0 0 auto;

  border: 1px solid #ebe6df;

  border-radius: 13px;

  background: #fff;

  color: #333;

  cursor: pointer;

  transition: background .18s, transform .18s

}

.children-modal-close:hover {

  transform: translateY(-1px);

  background: #f4eee7

}

.children-modal-grid {

  display: grid;

  grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr));

  align-content: start;

  gap: 18px

}

.child-card {

  display: grid;

  grid-template-rows: 180px 1fr;

  min-width: 0;

  overflow: hidden;

  border: 1px solid #e9e3db;

  border-radius: 18px;

  background: #fff;

  box-shadow: 0 8px 24px rgba(55, 39, 25, .06);

  transition: transform .18s, box-shadow .18s

}

.child-card:hover {

  transform: translateY(-3px);

  box-shadow: 0 14px 30px rgba(55, 39, 25, .12)

}

.child-image {

  display: grid;

  place-items: center;

  width: 100%;

  height: 180px;

  overflow: hidden;

  background: linear-gradient(135deg, #f4f0eb, #e9e2d9);

  color: #9b8068

}

.child-image img {

  width: 100%;

  height: 100%;

  object-fit: cover

}

.child-copy {

  display: grid;

  align-content: start;

  gap: 8px;

  min-width: 0;

  padding: 17px

}

.child-copy h3 {

  margin: 0;

  font-size: 17px;

  letter-spacing: -.02em;

  overflow-wrap: anywhere

}

.child-copy p {

  margin: 0;

  color: #777;

  font-size: 13px;

  line-height: 1.5

}

.child-copy strong {

  justify-self: start;

  padding: 6px 10px;

  border-radius: 999px;

  background: #f5eee7;

  color: #714525;

  font-size: 13px

}

.child-quantity {

  font-weight: 700

}

.detail-state {

  min-height: 260px;

  display: grid;

  place-content: center;

  justify-items: center;

  gap: 12px;

  padding: 24px;

  color: #626262;

  text-align: center

}

.detail-state p {

  margin: 0

}

.detail-error {

  color: #8f3e13

}

.retry-button {

  padding: 10px 14px;

  border: 0;

  background: #171717;

  color: #fff;

  font-weight: 700

}

.spin {

  animation: spin .8s linear infinite

}

@keyframes spin {

  to {

    transform: rotate(360deg)

  }

}

@media(max-width:600px) {

  .detail-topbar {

    height: 64px

  }

  .brand-label {

    font-size: 0

  }

  .brand-label svg {

    width: 20px;

    height: 20px

  }

  .catalog-cover {

    min-height: 250px;

    padding: 32px 20px

  }

  .products-section,

  .gallery-section {

    width: calc(100% - 32px)

  }

  .products-section {

    padding: 36px 0 42px

  }

  .gallery-section {

    padding-bottom: 52px

  }

  .section-heading {

    align-items: start;

    flex-direction: column

  }

  .section-heading-actions {

    width: 100%;

    justify-content: space-between

  }

  .gallery-grid {

    grid-template-columns: repeat(2, minmax(0, 1fr));

    gap: 10px

  }

  .product-grid {

    grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr));

    gap: 14px

  }

  .product-image {

    height: 190px

  }

  .children-modal-overlay {

    place-items: start center;

    padding: max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom))

  }

  .children-modal {

    width: 100%;

    min-height: 0;

    max-height: calc(100dvh - 24px);

    padding: 20px;

    border-radius: 20px

  }

  .children-modal-header {

    margin-bottom: 18px;

    padding-bottom: 16px

  }

  .children-modal-grid {

    grid-template-columns: 1fr;

    gap: 12px

  }

  .child-card {

    grid-template-columns: 96px minmax(0, 1fr);

    grid-template-rows: minmax(112px, auto);

    align-items: stretch

  }

  .child-image {

    height: 100%;

    min-height: 112px

  }

  .child-copy {

    align-content: center;

    padding: 14px

  }

  .child-copy h3 {

    font-size: 15px

  }

}

@media(prefers-reduced-motion:reduce) {

  .product-card {

    transition: none

  }

}

.zoom-overlay {

  position: fixed;

  inset: 0;

  z-index: 200;

  display: grid;

  place-items: center;

  background: rgba(0, 0, 0, .92);

  backdrop-filter: blur(4px);

  animation: fadeIn .15s ease

}

.zoom-overlay img {

  max-width: 90vw;

  max-height: 90vh;

  width: auto;

  height: auto;

  object-fit: contain;

  border-radius: 4px;

  box-shadow: 0 20px 60px rgba(0, 0, 0, .5);

  animation: zoomIn .2s cubic-bezier(.22, 1, .36, 1)

}

.zoom-close,

.zoom-expand {

  position: fixed;

  z-index: 201;

  display: grid;

  place-items: center;

  width: 48px;

  height: 48px;

  border: 0;

  border-radius: 50%;

  background: rgba(255, 255, 255, .12);

  color: #fff;

  cursor: pointer;

  transition: background .18s, transform .18s;

  backdrop-filter: blur(6px)

}

.zoom-close {

  top: 24px;

  right: 24px

}

.zoom-expand {

  bottom: 24px;

  right: 24px

}

.zoom-close:hover,

.zoom-expand:hover {

  background: rgba(255, 255, 255, .25);

  transform: scale(1.05)

}

@keyframes fadeIn {

  from {

    opacity: 0

  }

  to {

    opacity: 1

  }

}

@keyframes zoomIn {

  from {

    opacity: 0;

    transform: scale(.95)

  }

  to {

    opacity: 1;

    transform: scale(1)

  }

}

.copy-url-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 38px;
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 999px;
  background: rgba(14, 14, 14, 0.42);
  color: #fff;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  backdrop-filter: blur(6px);
  transition: background 0.18s, border-color 0.18s;
}

.copy-url-button:hover {
  background: rgba(198, 91, 25, 0.9);
  border-color: rgba(255, 255, 255, 0.5);
}

.copy-url-button:focus-visible,
.back-button:focus-visible,
.social-links a:focus-visible {
  outline: 2px solid #c65b19;
  outline-offset: 3px;
}

/* La zona superior ya no se superpone con el nombre ni la descripción. */
.catalog-cover {
  justify-content: flex-start;
}

.cover-top-right {
  position: relative;
  top: auto;
  right: auto;
  transform: none;
  align-self: flex-end;
  width: 100%;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 12px;
  margin: 0 0 22px;
}

.catalog-logo {
  width: 82px;
  height: 82px;
  border-radius: 16px;
}

.cover-copy {
  width: 100%;
  max-width: 850px;
}

@media (max-width: 600px) {
  .detail-topbar {
    height: auto;
    min-height: 60px;
    padding: 10px 14px;
    gap: 10px;
  }

  .back-button {
    gap: 5px;
    padding: 8px 0;
    font-size: 12px;
    white-space: nowrap;
  }

  .brand-label {
    gap: 5px;
    font-size: 12px;
    white-space: nowrap;
  }

  .brand-label svg {
    width: 18px;
    height: 18px;
  }

  .catalog-cover {
    min-height: 0;
    padding: 22px 18px 30px;
  }

  .cover-top-right {
    align-self: stretch;
    justify-content: flex-start;
    gap: 9px;
    margin-bottom: 22px;
  }

  .catalog-logo {
    width: 58px;
    height: 58px;
    flex: 0 0 58px;
    border-radius: 12px;
  }

  .social-links {
    gap: 7px;
  }

  .social-links a {
    width: 36px;
    height: 36px;
    border-radius: 10px;
  }

  .social-links a svg {
    width: 16px;
    height: 16px;
  }

  .copy-url-button {
    min-height: 36px;
    padding: 7px 10px;
    font-size: 11px;
  }

  .cover-copy {
    gap: 9px;
  }

  .cover-copy h1 {
    font-size: clamp(28px, 8vw, 38px);
    line-height: 1.12;
  }

  .cover-copy > p:last-child {
    font-size: 14px;
  }

  .owner-whatsapp a {
    max-width: 100%;
    white-space: normal;
    line-height: 1.4;
  }

  .owner-whatsapp small {
    text-align: left;
    overflow-wrap: anywhere;
  }
}

@media (max-width: 360px) {
  .detail-topbar {
    padding-inline: 10px;
  }

  .back-button {
    font-size: 11px;
  }

  .brand-label {
    font-size: 11px;
  }

  .cover-top-right {
    gap: 7px;
  }

  .copy-url-button {
    flex: 1 1 100%;
    justify-content: center;
  }
}

</style>
