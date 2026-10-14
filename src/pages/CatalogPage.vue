<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Search, Package, Store, Shield, Tag, ChevronLeft, ChevronRight, Sparkles, ArrowRight, X, Mail, MessageCircle } from 'lucide-vue-next'
import LoginModal from '../components/LoginModal.vue'
import FormAddUser from '../components/FormAddUser.vue'
import { api, setCredentials, type Catalogo, type Etiqueta, type Usuario } from '../api.ts'
import CatalogoContPage from './CatalogoContPage.vue'
import brandLogoUrl from '../assets/Logo.png?url'
import slideOne from '../assets/img1.png'
import slideTwo from '../assets/img2.png'
import slideThree from '../assets/img3.png'

const emit = defineEmits<{
  (e: 'authenticated'): void
}>()

const catalogs = ref<Catalogo[]>([])
const labels = ref<Etiqueta[]>([])
const labelsError = ref('')
const search = ref('')
const searchOpen = ref(false)
const selectedTags = ref<string[]>([])
const loading = ref(false)
const error = ref('')

const showLoginModal = ref(false)
const username = ref('')
const password = ref('')
const loginError = ref('')
const loginLoading = ref(false)

const showFormAddModal = ref(false)
const formaddError = ref('')

const currentSlide = ref(0)
const headerSolid = ref(false)
const catalogRouteId = ref<number | null>(null)

const slides = [
  {
    image: slideOne,
    eyebrow: 'CATÁLOGOS DIGITALES',
    title: 'Todo lo que buscas,',
    highlight: 'en un solo lugar',
    description: 'Explora diferentes catálogos y descubre productos de negocios que pueden interesarte.'
  },
  {
    image: slideTwo,
    eyebrow: 'DESCUBRE NUEVAS TIENDAS',
    title: 'Encuentra productos',
    highlight: 'que te interesan',
    description: 'Conoce nuevos negocios, explora sus productos y encuentra exactamente lo que buscas.'
  },
  {
    image: slideThree,
    eyebrow: 'TU PRÓXIMA COMPRA',
    title: 'Explora. Descubre.',
    highlight: 'Elige lo que buscas.',
    description: 'Una forma sencilla de descubrir catálogos y productos desde un mismo lugar.'
  }
]

let carouselTimer: ReturnType<typeof setInterval> | undefined

function openAddUser() {
  formaddError.value = ''
  showFormAddModal.value = true
}

function closeAddUser() {
  showFormAddModal.value = false
  formaddError.value = ''
}

const normalizedCatalogs = computed(() => {
  return catalogs.value.map((catalog) => {
    const etiquetas = Array.isArray(catalog.etiquetas)
      ? catalog.etiquetas.map((tag) => (typeof tag === 'string' ? tag : tag.nombre).trim()).filter(Boolean)
      : []

    return {
      ...catalog,
      nombre: catalog.nombre?.trim() || 'Sin nombre',
      etiquetas
    }
  })
})

const availableTags = computed(() => {
  const tags = new Set(labels.value.map((label) => label.nombre.trim()).filter(Boolean))

  normalizedCatalogs.value.forEach((catalog) => {
    catalog.etiquetas.forEach((tag) => tags.add(tag))
  })

  return Array.from(tags).sort((a, b) => a.localeCompare(b))
})

const filteredCatalogs = computed(() => {
  const query = search.value.trim().toLowerCase()

  return normalizedCatalogs.value.filter((catalog) => {
    const matchesName = !query || catalog.nombre.toLowerCase().includes(query)

    const matchesTags = selectedTags.value.length === 0 || selectedTags.value.every((tag) => catalog.etiquetas.includes(tag))

    return matchesName && matchesTags
  })
})

function toggleTag(tag: string) {
  if (selectedTags.value.includes(tag)) {
    selectedTags.value = selectedTags.value.filter((selectedTag) => selectedTag !== tag)
    return
  }

  if (selectedTags.value.length >= 2) return
  selectedTags.value.push(tag)
}

function clearFilters() {
  search.value = ''
  selectedTags.value = []
}

function toggleSearch() {
  searchOpen.value = !searchOpen.value
}

async function loadCatalogs() {
  loading.value = true
  error.value = ''

  try {
    catalogs.value = await api.catalogosPublicos<Catalogo>()
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'No se pudieron cargar los catálogos.'
  } finally {
    loading.value = false
  }
}

async function loadLabels() {
  labelsError.value = ''
  try {
    labels.value = await api.etiquetasTodas<Etiqueta>()
  } catch (reason) {
    labelsError.value = reason instanceof Error ? reason.message : 'No se pudieron cargar todas las etiquetas.'
  }
}

function openLogin() {
  loginError.value = ''
  showLoginModal.value = true
}

function closeLogin() {
  showLoginModal.value = false
  loginError.value = ''
}

async function submitLogin() {
  const trimmedUsername = username.value.trim()

  if (!trimmedUsername || !password.value.trim()) {
    loginError.value = 'Debes ingresar usuario y contraseña.'
    return
  }

  loginLoading.value = true
  loginError.value = ''

  try {
    setCredentials(trimmedUsername, password.value)
    await api.me<Usuario>()
    showLoginModal.value = false
    emit('authenticated')
  } catch (reason) {
    loginError.value = reason instanceof Error ? reason.message : 'No se pudo iniciar sesión.'
  } finally {
    loginLoading.value = false
  }
}

function nextSlide() {
  currentSlide.value = (currentSlide.value + 1) % slides.length
}

function previousSlide() {
  currentSlide.value = (currentSlide.value - 1 + slides.length) % slides.length
}

function goToSlide(index: number) {
  currentSlide.value = index
  restartCarousel()
}

function startCarousel() {
  carouselTimer = setInterval(() => {
    nextSlide()
  }, 6000)
}

function stopCarousel() {
  if (carouselTimer) {
    clearInterval(carouselTimer)
    carouselTimer = undefined
  }
}

function restartCarousel() {
  stopCarousel()
  startCarousel()
}

function scrollToCatalogos() {
  document.getElementById('catalogos-titulo')?.scrollIntoView({
    behavior: 'smooth'
  })
}

function handleScroll() {
  headerSolid.value = window.scrollY > 50
}

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

function syncCatalogRoute() {
  const match = window.location.pathname.match(/^\/catalogoCont\/(\d+)\/?$/)
  catalogRouteId.value = match ? Number(match[1]) : null
}

function openCatalog(catalog: Catalogo) {
  if (!catalog.id) return
  window.history.pushState({}, '', `/catalogoCont/${catalog.id}`)
  catalogRouteId.value = catalog.id
  window.scrollTo({ top: 0 })
}

function closeCatalog() {
  window.history.pushState({}, '', '/')
  catalogRouteId.value = null
  window.scrollTo({ top: 0 })
}

function handleRouteChange() {
  syncCatalogRoute()
  window.scrollTo({ top: 0 })
}

onMounted(() => {
  syncCatalogRoute()
  loadCatalogs()
  loadLabels()
  startCarousel()
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('popstate', handleRouteChange)
})

onUnmounted(() => {
  stopCarousel()
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('popstate', handleRouteChange)
})
</script>

<template>
  <CatalogoContPage v-if="catalogRouteId !== null" :catalog-id="catalogRouteId" @back="closeCatalog" />
  <div v-else class="public-catalog min-h-screen bg-[#f7f7fb] text-[#17182d]">

    <!-- HEADER -->
    <header class="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      :class="headerSolid ? 'bg-black/80 shadow-[0_8px_30px_rgba(25,28,60,0.10)] backdrop-blur-xl border-b border-[#ddd7ff]' : 'bg-transparent'">
      <div class="w-[92%] max-w-[1400px] mx-auto h-18 flex items-center justify-between gap-4">

        <!-- LOGO -->
        <button type="button" class="brand-button flex items-center gap-3 shrink-0" @click="scrollToTop">
          <div class="brand-logo-frame">
            <img :src="brandLogoUrl" alt="Logo de CatalogosZone" class="brand-logo" />
          </div>

          <div class="brand-copy hidden sm:block text-left">
            <p class="font-900 text-lg leading-none text-white">CatalogosZone</p>
            <p class="text-[10px] font-700 mt-1 text-white/75">Todos tus catálogos en un solo lugar</p>
          </div>
        </button>

        <!-- DESKTOP ACTIONS -->
        <div class="hidden md:flex items-center gap-2">
          <button type="button"
            class="registre-button px-4 py-2.5 rounded-12px bg-white hover:bg-gray-1 text-[#c65b19] font-800 text-sm shadow-md transition-all duration-200 hover:-translate-y-0.5"
            @click="openAddUser">
            Regístrate
          </button>

          <button type="button"
            class="flex explore-button items-center gap-2 px-4 py-2.5 rounded-10px bg-[#c65b19] hover:bg-[#e07836] text-white font-700 text-sm transition-all duration-200 hover:-translate-y-0.5"
            @click="openLogin">
            <Shield :size="17" />
            <span>Administración</span>
          </button>
        </div>

        <!-- MOBILE ACTIONS -->
        <div class="flex md:hidden items-center gap-2">
          <button type="button"
            class="w-10 h-10 flex items-center justify-center rounded-12px bg-[#fff6f0] text-[#c65b19] shadow-md"
            aria-label="Regístrate" @click="openAddUser">
            <Sparkles :size="18" />
          </button>

          <button type="button"
            class="w-10 h-10 flex items-center justify-center rounded-12px bg-[#c65b19] text-white shadow-md"
            aria-label="Administración" @click="openLogin">
            <Shield :size="18" />
          </button>
        </div>
      </div>
    </header>

    <!-- HERO / CARRUSEL -->
    <section class="hero-stage relative overflow-hidden">

      <!-- SLIDES -->
      <div v-for="(slide, index) in slides" :key="slide.image" class="hero-slide absolute inset-0"
        :class="currentSlide === index ? 'hero-slide-active z-10' : 'hero-slide-inactive z-0'">
        <img :src="slide.image" :alt="slide.title" :loading="index === currentSlide ? 'eager' : 'lazy'" decoding="async"
          class="hero-slide-image absolute inset-0 w-full h-full object-cover" />
        <div
          class="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.93)_0%,rgba(0,0,0,0.76)_42%,rgba(0,0,0,0.30)_100%)]">
        </div>
        <div class="absolute inset-0 bg-[linear-gradient(0deg,rgba(0,0,0,0.42),transparent_45%)]"></div>
      </div>

      <!-- HERO CONTENT -->
      <div class="hero-content relative z-20 w-[92%] max-w-[1400px] mx-auto flex items-center">

        <div class="w-full max-w-3xl text-white">

          <div
            class="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/10 border border-white/15 backdrop-blur-md mb-5">
            <Sparkles :size="15" class="text-[#f3a181]" />
            <span class="text-[10px] sm:text-xs font-900 tracking-[0.16em] !text-white">{{ slides[currentSlide].eyebrow
              }}</span>
          </div>

          <h1 class="hero-title font-900 leading-[1.02] !text-white">
            {{ slides[currentSlide].title }}
            <span class="block text-[#f3a181] mt-1">{{ slides[currentSlide].highlight }}</span>
          </h1>

          <p class="hero-description mt-6 max-w-2xl text-sm sm:text-base lg:text-lg leading-7 text-white/75">
            {{ slides[currentSlide].description }}
          </p>

          <button type="button" class="explore-button mt-8" @click="scrollToCatalogos">
            Explorar ya
            <ArrowRight :size="17" />
          </button>

        </div>
      </div>

      <!-- ARROWS -->
      <button type="button"
        class="hero-arrow absolute z-30 left-4 sm:left-7 top-7/8 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white backdrop-blur-md transition-all"
        aria-label="Anterior" @click="previousSlide">
        <ChevronLeft :size="22" />
      </button>

      <button type="button"
        class="hero-arrow absolute z-30 right-4 sm:right-7 top-7/8 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white backdrop-blur-md transition-all"
        aria-label="Siguiente" @click="nextSlide">
        <ChevronRight :size="22" />
      </button>

      <!-- INDICATORS -->
      <div class="hero-indicators absolute z-30 bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
        <button v-for="(_, index) in slides" :key="index" type="button"
          class="h-2 rounded-full transition-all duration-300"
          :class="currentSlide === index ? 'w-8 bg-[#00d5b4]' : 'w-2 bg-white/45 hover:bg-white/70'"
          :aria-label="`Ir a la diapositiva ${index + 1}`" @click="goToSlide(index)"></button>
      </div>
    </section>

    <!-- CATALOGOS -->
    <main id="catalogos" class="catalog-section w-[92%] max-w-[1500px] mx-auto pt-0 pb-6 sm:pb-8">

      <!-- SECTION HEADER -->
      <div class="catalog-toolbar flex flex-col items-start gap-2 mb-5">

        <div class="catalog-heading">
          <div class="flex space-x-2">
            <Store class="w-8 h-7 text-[#f3a181] my-auto mt-7" />
            <h2 id="catalogos-titulo"
              class="catalog-title text-3xl sm:text-4xl font-900 tracking-[-0.03em] text-[#17182d]">Catálogos</h2>
            <div class="catalog-search-control mt-5" :class="{ 'is-open': searchOpen }">
              <button type="button"
                class="w-10 h-10 rounded-full !hover:bg-red !shadow-md !bg-[#f3a181] text-white border-none"
                :aria-label="searchOpen ? 'Ocultar búsqueda' : 'Mostrar búsqueda'" :aria-expanded="searchOpen"
                :aria-controls="searchOpen ? 'catalog-search-input' : undefined" @click="toggleSearch">
                <Search :size="19" aria-hidden="true" />
              </button>
              <input v-if="searchOpen" id="catalog-search-input" v-model="search" class="catalog-search-input"
                type="search" placeholder="Buscar catálogos..." aria-label="Buscar catálogos"
                @keydown.esc="searchOpen = false" />
            </div>
          </div>
          <p class="text-sm sm:text-base text-[#77798d]">
            {{ filteredCatalogs.length }}
            {{ filteredCatalogs.length === 1 ? 'catálogo disponible' : 'catálogos disponibles' }}
          </p>
        </div>

        <section class="catalog-tag-filter" aria-label="Filtro por etiquetas">
          <div class="catalog-tag-heading">
            <div class="catalog-tag-label">
              <Tag :size="16" /><span>Filtrar por etiquetas</span>
            </div>
            <span class="catalog-tag-hint">Selecciona hasta 2</span>
          </div>
          <div v-if="availableTags.length" class="catalog-tag-scroll" aria-label="Etiquetas disponibles">
            <div class="catalog-tag-list">
              <button v-for="tag in availableTags" :key="tag" type="button" class="catalog-tag-option"
                :class="{ selected: selectedTags.includes(tag) }" :aria-pressed="selectedTags.includes(tag)"
                :disabled="selectedTags.length >= 2 && !selectedTags.includes(tag)" @click="toggleTag(tag)">
                {{ tag }}
              </button>
            </div>
          </div>
          <p v-else-if="labelsError" class="catalog-tag-message">{{ labelsError }}</p>
          <p v-else class="catalog-tag-message">No hay etiquetas disponibles.</p>
        </section>

      </div>

      <button v-if="search || selectedTags.length" type="button" class="clear-filters" @click="clearFilters">
        <X :size="15" /> Limpiar filtros
      </button>

      <!-- LOADING -->
      <div v-if="loading"
        class="min-h-80 flex flex-col items-center justify-center rounded-20px bg-white border border-[#e8e8e8] shadow-[0_8px_30px_rgba(0,0,0,0.05)]">
        <div class="w-10 h-10 rounded-full border-4 border-[#fff6f0] border-t-[#c65b19] animate-spin"></div>
        <p class="mt-4 text-sm font-700 text-[#777]">Cargando catálogos...</p>
      </div>

      <!-- ERROR -->
      <div v-else-if="error"
        class="min-h-80 flex flex-col items-center justify-center text-center px-5 rounded-20px bg-white border border-[#f9e4df] shadow-[0_8px_30px_rgba(0,0,0,0.05)]">
        <div class="w-14 h-14 flex items-center justify-center rounded-16px bg-[#f9e4df] text-[#a8584e]">
          <Package :size="27" />
        </div>

        <p class="mt-4 max-w-md text-sm text-[#777]">{{ error }}</p>

        <button type="button"
          class="mt-5 px-5 py-2.5 rounded-11px bg-[#c65b19] hover:bg-[#e07836] text-white text-sm font-800 shadow-md transition-all"
          @click="loadCatalogs">
          Reintentar
        </button>
      </div>

      <!-- EMPTY -->
      <div v-else-if="!filteredCatalogs.length"
        class="min-h-80 flex flex-col items-center justify-center text-center px-5 rounded-20px bg-white border border-[#e8e8e8] shadow-[0_8px_30px_rgba(0,0,0,0.05)]">
        <div class="w-16 h-16 flex items-center justify-center rounded-20px bg-[#fff6f0] text-[#c65b19]">
          <Package :size="30" />
        </div>

        <h3 class="mt-5 text-xl font-900 text-[#171717]">{{ normalizedCatalogs.length ? 'No encontramos catálogos' :
          'Aún no hay catálogos visibles' }}</h3>

        <p class="mt-2 max-w-md text-sm text-[#777]">{{ normalizedCatalogs.length ? 'Prueba con otro nombre o seleccion otras etiquetas.' : 'Cuando haya catálogos disponibles, aparecerán aquí.' }}</p>

        <button v-if="normalizedCatalogs.length && (search || selectedTags.length)" type="button"
          class="mt-5 px-5 py-2.5 rounded-11px bg-[#fff6f0] hover:bg-[#fff6f0] text-[#c65b19] text-sm font-800 shadow-md transition-all"
          @click="clearFilters">
          Limpiar filtros
        </button>
      </div>

      <!-- GRID -->
      <div v-else class="catalog-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">

        <article v-for="catalog in filteredCatalogs" :key="catalog.id ?? catalog.nombre"
          class="catalog-card overflow-hidden rounded-12px bg-white border border-[#e8e8e8] shadow-[0_6px_25px_rgba(0,0,0,0.05)] transition-all duration-300">

          <!-- COVER -->
          <div class="catalog-cover relative aspect-[3/2] overflow-hidden bg-[#fff6f0]">

            <img v-if="catalog.urlFotoPortada" class="w-full h-full object-cover transition-transform duration-500"
              :src="catalog.urlFotoPortada" :alt="`Portada de ${catalog.nombre}`" loading="lazy" />

            <div v-else
              class="w-full h-full flex items-center justify-center bg-[linear-gradient(135deg,#fff6f0,#f0f0f0)] text-[#c65b19]">
              <Store :size="38" />
            </div>

            <!-- STATUS -->
            <span
              class="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full text-[9px] sm:text-[10px] font-900 shadow-sm bg-[#fff6f0] text-[#c65b19]">Visible</span>

            <div v-if="catalog.etiquetas.length" class="catalog-card-tags absolute">
              <span v-for="tag in catalog.etiquetas.slice(0, 3)" :key="tag" class="catalog-tag">
                {{ tag }}
              </span>
              <span v-if="catalog.etiquetas.length > 3" class="catalog-more">+{{ catalog.etiquetas.length - 3 }}</span>
            </div>

          </div>

          <!-- INFO -->
          <div class="catalog-card-info">

            <h3 class="text-sm sm:text-base font-900 text-[#17182d] truncate">
              {{ catalog.nombre }}
            </h3>

            <p class="catalog-description mt-1 text-[11px] leading-4 text-[#858698] line-clamp-1 min-h-0">
              {{ catalog.descripcion || 'Catálogo sin descripción.' }}
            </p>

            <!-- VIEW BUTTON -->
            <button type="button"
              class="catalog-view-button w-full mt-3 flex items-center justify-center gap-2 py-2 rounded-8px text-xs font-800 transition-all duration-200"
              @click="openCatalog(catalog)">
              Ver catálogo
              <ArrowRight :size="14" class="transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>

          </div>
        </article>

      </div>
    </main>

    <!-- FOOTER -->
    <footer class="site-footer">
      <div class="footer-content">
        <section class="footer-brand" aria-label="Acerca de CatalogosZone">
          <a class="footer-brand-name" href="/" aria-label="CatalogosZone, inicio">CatalogosZone</a>
          <p>Descubre catálogos digitales, explora productos y conecta directamente con negocios en un solo lugar.</p>
        </section>

        <nav class="footer-links" aria-label="Enlaces del sitio">
          <h2>Explora</h2>
          <a href="/#catalogos">Ver catálogos</a>
          <button type="button" @click="openAddUser">Publica tu negocio</button>
        </nav>

        <nav class="footer-links" aria-label="Información legal">
          <h2>Información</h2>
          <a href="/terminos-de-uso">Términos de uso</a>
          <a href="/politica-de-privacidad">Política de privacidad</a>
          <p>Al solicitar un catálogo, el mensaje se prepara para enviarse por WhatsApp.</p>
        </nav>

        <section class="footer-contact" aria-label="Contacto del creador">
          <h2>Contacto del creador</h2>
          <a href="mailto:danielsocorro111@gmail.com">
            <Mail :size="16" /> danielsocorro111@gmail.com
          </a>
          <a href="https://wa.me/5359292460" target="_blank" rel="noopener noreferrer">
            <MessageCircle :size="16" /> +53 59292460
          </a>
        </section>
      </div>
      <div class="footer-bottom">
        <p>© {{ new Date().getFullYear() }} CatalogosZone. Todos los derechos reservados.</p>
        <p>Creado y gestionado independientemente.</p>
      </div>
    </footer>

    <!-- LOGIN -->
    <LoginModal :visible="showLoginModal" :loading="loginLoading" :error="loginError" :username="username"
      :password="password" @close="closeLogin" @submit="submitLogin" @update:username="username = $event"
      @update:password="password = $event" />

    <!-- REGISTRO -->
    <FormAddUser :visible="showFormAddModal" :error="formaddError" @close="closeAddUser" />

  </div>
</template>

<style scoped>
.hero-enter-active,
.hero-leave-active {
  transition: opacity 0.7s ease;
}

.hero-enter-from,
.hero-leave-to {
  opacity: 0;
}

.brand-logo-frame {
  display: grid;
  place-items: center;
  width: 58px;
  height: 58px;
  flex: 0 0 58px;
  overflow: hidden;
}

.brand-logo {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.brand-copy p {
  margin: 0;
}

.brand-copy p+p {
  margin-top: 6px;
  line-height: 1.1;
}

.brand-button {
  padding: 0;
  border: 0;
  appearance: none;
  background: transparent;
  color: inherit;
  text-align: left;
}

.catalog-card {
  border-color: #dedede;
  background: #fff;
  box-shadow: 0 5px 20px rgba(0, 0, 0, .05);
}

.catalog-card:hover {
  transform: translateY(-3px);
  border-color: #c65b19;
  box-shadow: 0 14px 30px rgba(0, 0, 0, .1);
}

.explore-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 44px;
  padding: 0 18px;
  border: 1px solid #c65b19;
  border-radius: 8px;
  background: #c65b19;
  color: #171717;
  font-size: 14px;
  font-weight: 800;
  transition: background .18s ease, transform .18s ease;
}

.registre-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 44px;
  padding: 0 18px;
  border: 1px solid #e4c4b0;
  border-radius: 8px;
  background: #e4c4b0;
  color: #171717;
  font-size: 14px;
  font-weight: 800;
  transition: background .18s ease, transform .18s ease;
}

.explore-button:hover {
  background: #e07836;
  transform: translateY(-1px);
}

.catalog-section {
  scroll-margin-top: 0;
  padding-top: 24px !important;
}

.catalog-title {
  scroll-margin-top: 76px;
}

.catalog-toolbar {
  display: flex !important;
  flex-direction: column !important;
  align-items: flex-start !important;
  justify-content: flex-start !important;
  gap: 6px !important;
  margin-bottom: 10px !important;
}

.catalog-heading {
  display: block;
  flex: 0 0 auto;
  margin-bottom: 0;
}

.catalog-heading>p {
  margin: 0;
}

.catalog-search-control {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: 8px;
}

.catalog-search-input {
  width: min(220px, 32vw);
  min-width: 0;
  height: 40px;
  padding: 0 11px;
  border: 1px solid #dedede;
  border-radius: 8px;
  outline: 0 !important;
  box-shadow: none !important;
  background: #fff;
  color: #171717;
  font-size: 14px;
  animation: search-reveal .18s ease-out;
}

.catalog-search-input::placeholder {
  color: #777;
}

.catalog-search-input:focus,
.catalog-search-input:focus-visible {
  border-color: #c65b19;
  outline: 0;
  box-shadow: 0 0 0 3px rgba(198, 91, 25, .12);
}

.clear-filters {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  margin: 0 0 12px;
  padding: 0 10px;
  border: 0;
  background: transparent;
  color: #8f3e13;
  font-size: 12px;
  font-weight: 700;
}

@keyframes search-reveal {
  from {
    opacity: 0;
    transform: translateX(-6px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.catalog-card-info {
  padding: 8px !important;
}

.catalog-card-info h3 {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 17px;
  line-height: 1.25;
}

.catalog-description {
  min-height: 2.7em !important;
  margin-top: 7px !important;
  font-size: 13px !important;
  line-height: 1.4 !important;
}

.catalog-card .catalog-cover {
  height: clamp(196px, calc((100dvh - 430px) * .7), 322px);
  max-height: none;
  aspect-ratio: auto;
}

.catalog-card .catalog-cover img,
.catalog-card .catalog-cover>div:not(.absolute) {
  display: block;
  width: 100%;
  height: 100%;
}

.catalog-cover img {
  display: block;
}

.catalog-card:hover .catalog-cover img {
  transform: scale(1.05);
}

.catalog-tag {
  background: #fff6f0;
  color: #c65b19;
}

.catalog-more {
  background: #f0f0f0;
  color: #777;
}

.catalog-card-tags {
  position: absolute;
  right: 10px;
  bottom: 10px;
  left: 10px;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  pointer-events: none;
}

.catalog-card-tags .catalog-tag,
.catalog-card-tags .catalog-more {
  max-width: min(100%, 180px);
  overflow: hidden;
  padding: 5px 9px;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, .92);
  color: #171717;
  font-size: 10px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, .16);
  backdrop-filter: blur(5px);
}

.catalog-view-button {
  min-height: 42px;
  margin-top: 14px !important;
  padding-top: 9px !important;
  padding-bottom: 9px !important;
  border: 0;
  background: #171717;
  color: #fff;
}

.catalog-view-button:hover {
  border: 0;
  background: #c65b19;
  color: #171717;
}

.site-footer {
  border-top: 1px solid #e7e7ef;
  background: #fff;
}

.footer-content {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1.25fr 1.25fr;
  gap: 36px;
  width: 92%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 38px 0 32px;
}

.footer-content h2 {
  margin: 0 0 13px;
  color: #171717;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: .06em;
  text-transform: uppercase;
}

.footer-brand-name {
  color: #171717;
  font-size: 20px;
  font-weight: 900;
  letter-spacing: -.04em;
  text-decoration: none;
}

.footer-brand p,
.footer-links p {
  max-width: 300px;
  margin: 9px 0 0;
  color: #737373;
  font-size: 12px;
  line-height: 1.7;
}

.footer-links,
.footer-contact {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}

.footer-links a,
.footer-links button,
.footer-contact a {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #555;
  font-size: 12px;
  line-height: 1.5;
  text-align: left;
  text-decoration: none;
}

.footer-links a:hover,
.footer-links button:hover,
.footer-contact a:hover {
  color: #a34716;
}

.footer-links p {
  margin: 0;
}

.footer-contact svg {
  flex: 0 0 auto;
  color: #c65b19;
}

.footer-bottom {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  width: 92%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 14px 0 18px;
  border-top: 1px solid #ededed;
  color: #888;
  font-size: 10px;
}

.footer-bottom p {
  margin: 0;
}

@media (max-width: 639px) {
  .footer-content {
    grid-template-columns: 1fr 1fr;
    gap: 26px 18px;
    padding: 30px 0 24px;
  }

  .footer-brand {
    grid-column: 1 / -1;
  }

  .footer-bottom {
    flex-direction: column;
    text-align: center;
  }

  .catalog-view-button {
    min-height: 42px;
  }
}

.hero-stage {
  height: 100vh;
  height: 100dvh;
  min-height: 0;
}

.hero-slide {
  opacity: 0;
  transform: scale(1.045);
  transition: opacity 1s cubic-bezier(.22, 1, .36, 1), transform 1.4s cubic-bezier(.22, 1, .36, 1);
}

.hero-slide-active {
  opacity: 1;
  transform: scale(1);
}

.hero-slide-inactive {
  opacity: 0;
  transform: scale(1.045);
}

.hero-slide-image {
  transition: transform 7s ease-out;
}

.hero-slide-active .hero-slide-image {
  transform: scale(1.035);
}

.catalog-tag-filter {
  display: flex;
  width: 100%;
  min-width: 0;
  flex: 1 1 auto;
  align-items: center;
  gap: 12px;
  margin: 0;
}

.catalog-tag-heading {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
}

.catalog-tag-label {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #626262;
  font-size: 13px;
  font-weight: 800;
}

.catalog-tag-label svg {
  color: #c65b19;
}

.catalog-tag-hint {
  color: #777;
  font-size: 11px;
  white-space: nowrap;
}

.catalog-tag-scroll {
  min-width: 0;
  flex: 1 1 auto;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  scrollbar-width: thin;
  scrollbar-color: #c9c9c9 transparent;
}

.catalog-tag-list {
  display: flex;
  width: max-content;
  min-width: 100%;
  gap: 8px;
  padding: 1px 1px 7px;
}

.catalog-tag-option {
  flex: 0 0 auto;
  padding: 8px 14px;
  border: 1px solid #dedede;
  border-radius: 999px;
  background: #fff;
  color: #454545;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
  transition: background .18s ease, border-color .18s ease, color .18s ease, opacity .18s ease;
}

.catalog-tag-option:hover:not(:disabled) {
  border-color: #c65b19;
  background: #fff6f0;
}

.catalog-tag-option.selected {
  border-color: #c65b19;
  background: #c65b19;
  color: #171717;
  box-shadow: 0 4px 14px rgba(0, 0, 0, .12);
}

.catalog-tag-option:disabled {
  cursor: not-allowed;
  opacity: .48;
}

.catalog-tag-message {
  margin: 0;
  color: #777;
  font-size: 12px;
}

.hero-content {
  height: 100%;
  padding-top: 72px;
  padding-bottom: 76px;
}

.hero-title {
  min-height: 3.15em;
  margin: 0;
  font-size: 38px;
  line-height: 1.05;
}

.hero-title span {
  margin-top: 4px;
}

.hero-description {
  min-height: 5.25rem;
}

@media (min-width: 640px) {
  .hero-title {
    font-size: 52px;
  }
}

@media (min-width: 1024px) {
  .hero-title {
    font-size: 64px;
  }
}

@media (max-width: 639px) {
  .hero-content {
    padding: 76px 4px 76px;
  }

  .hero-title {
    min-height: 4.2em;
    font-size: 34px;
  }

  .hero-description {
    min-height: 4.5rem;
    margin-top: 16px;
    font-size: 14px;
    line-height: 1.5;
  }

  .hero-search {
    height: 54px;
    margin-top: 20px;
    padding-inline: 14px;
  }

  .hero-arrow {
    top: auto;
    bottom: 22px;
    width: 36px;
    height: 36px;
    transform: none;
  }

  .hero-indicators {
    bottom: 36px;
  }

  .explore-button {
    margin-top: 20px;
  }

  .catalog-section {
    padding-top: 20px !important;
    padding-bottom: 24px;
  }

  .catalog-toolbar {
    gap: 8px !important;
    margin-bottom: 14px;
  }

  .catalog-tag-filter {
    width: 100%;
    gap: 10px;
  }

  .catalog-tag-heading {
    gap: 6px;
  }

  .catalog-tag-label {
    font-size: 12px;
  }

  .catalog-tag-hint {
    font-size: 10px;
  }

  .catalog-search-input {
    width: min(180px, calc(92vw - 230px));
  }

  .catalog-title {
    font-size: 26px !important;
  }

  .catalog-grid {
    grid-template-columns: minmax(0, 1fr) !important;
    gap: 14px !important;
  }

  .catalog-card .catalog-cover {
    height: clamp(154px, 24.5svh, 210px);
  }

  .catalog-card-info {
    padding: 14px !important;
  }

  .catalog-card-info h3 {
    font-size: 16px;
  }

  .catalog-description {
    min-height: 2.7em !important;
    font-size: 12px !important;
  }

  .catalog-card-info .catalog-view-button {
    min-height: 40px;
    font-size: 12px;
  }
}

@media (min-width: 640px) and (max-width: 1023px) {
  .catalog-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 14px !important;
  }
}

@media (max-width: 380px) {
  .hero-title {
    font-size: 31px;
  }

  .catalog-card-info .catalog-tag,
  .catalog-card-info .catalog-more {
    font-size: 8px;
  }
}

@media (max-height: 700px) {
  .hero-content {
    padding-top: 64px;
    padding-bottom: 64px;
  }

  .hero-title {
    min-height: 2.4em;
  }

  .hero-description {
    min-height: 3.5rem;
    margin-top: 12px;
  }

  .hero-search {
    margin-top: 16px;
  }
}

@media (prefers-reduced-motion: reduce) {

  .hero-slide,
  .hero-slide-image {
    transition: none;
  }

  .hero-slide,
  .hero-slide-active,
  .hero-slide-inactive,
  .hero-slide-active .hero-slide-image {
    transform: none;
  }

  .hero-enter-active,
  .hero-leave-active {
    transition: none;
  }
}
</style>