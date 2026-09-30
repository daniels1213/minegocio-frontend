<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Search, Package, Store, Shield, Tag, ChevronLeft, ChevronRight, Sparkles, ArrowRight, X } from 'lucide-vue-next'
import LoginModal from '../components/LoginModal.vue'
import FormAddUser from '../components/FormAddUser.vue'
import { api, setCredentials, type Catalogo, type Usuario } from '../api.ts'
import CatalogoContPage from './CatalogoContPage.vue'
import brandLogoUrl from '../assets/Logo.png?url'
import slideOne from '../assets/img1.png'
import slideTwo from '../assets/img2.png'
import slideThree from '../assets/img3.png'

const emit = defineEmits<{
  (e: 'authenticated'): void
}>()

const catalogs = ref<Catalogo[]>([])
const search = ref('')
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
      ? catalog.etiquetas.map((tag) => String(tag).trim()).filter(Boolean)
      : []

    return {
      ...catalog,
      nombre: catalog.nombre?.trim() || 'Sin nombre',
      etiquetas
    }
  })
})

const availableTags = computed(() => {
  const tags = new Set<string>()

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

  selectedTags.value.push(tag)
}

function clearFilters() {
  search.value = ''
  selectedTags.value = []
}

async function loadCatalogs() {
  loading.value = true
  error.value = ''

  try {
    catalogs.value = await api.catalogosTodos<Catalogo>()
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'No se pudieron cargar los catálogos.'
  } finally {
    loading.value = false
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
    <header class="fixed top-0 left-0 right-0 z-50 transition-all duration-300" :class="headerSolid ? 'bg-black/80 shadow-[0_8px_30px_rgba(25,28,60,0.10)] backdrop-blur-xl border-b border-[#ddd7ff]' : 'bg-transparent'">
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
          <button type="button" class="px-4 py-2.5 rounded-12px bg-white hover:bg-gray-1 text-[#7c5cff] font-800 text-sm shadow-md transition-all duration-200 hover:-translate-y-0.5" @click="openAddUser">
            Regístrate
          </button>

          <button type="button" class="flex items-center gap-2 px-4 py-2.5 rounded-12px bg-[#7c5cff] hover:bg-[#6e4ff0] text-white font-700 text-sm shadow-[0_8px_20px_rgba(124,92,255,0.25)] transition-all duration-200 hover:-translate-y-0.5" @click="openLogin">
            <Shield :size="17" />
            <span>Administración</span>
          </button>
        </div>

        <!-- MOBILE ACTIONS -->
        <div class="flex md:hidden items-center gap-2">
          <button type="button" class="w-10 h-10 flex items-center justify-center rounded-12px bg-[#f5d8ea] text-[#9b3976] shadow-md" aria-label="Regístrate" @click="openAddUser">
            <Sparkles :size="18" />
          </button>

          <button type="button" class="w-10 h-10 flex items-center justify-center rounded-12px bg-[#7c5cff] text-white shadow-md" aria-label="Administración" @click="openLogin">
            <Shield :size="18" />
          </button>
        </div>
      </div>
    </header>

    <!-- HERO / CARRUSEL -->
    <section class="hero-stage relative overflow-hidden">

      <!-- SLIDES -->
      <div v-for="(slide, index) in slides" :key="slide.image" class="absolute inset-0 transition-opacity duration-700" :class="currentSlide === index ? 'opacity-100 z-10' : 'opacity-0 z-0'">
        <img :src="slide.image" :alt="slide.title" :loading="index === currentSlide ? 'eager' : 'lazy'" decoding="async" class="absolute inset-0 w-full h-full object-cover" />
        <div class="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.93)_0%,rgba(0,0,0,0.76)_42%,rgba(0,0,0,0.30)_100%)]"></div>
        <div class="absolute inset-0 bg-[linear-gradient(0deg,rgba(0,0,0,0.42),transparent_45%)]"></div>
      </div>

      <!-- HERO CONTENT -->
      <div class="hero-content relative z-20 w-[92%] max-w-[1400px] mx-auto flex items-center">

        <div class="w-full max-w-3xl text-white">

          <div class="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/10 border border-white/15 backdrop-blur-md mb-5">
            <Sparkles :size="15" class="text-[#f3a181]" />
            <span class="text-[10px] sm:text-xs font-900 tracking-[0.16em]">{{ slides[currentSlide].eyebrow }}</span>
          </div>

          <h1 class="hero-title font-900 leading-[1.02]">
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

          <!-- TAGS -->
          <div v-if="availableTags.length" class="hero-tags mt-5">
            <div class="flex items-center gap-2 mb-3 text-white/80">
              <Tag :size="15" />
              <span class="text-xs font-800">Explorar por etiquetas</span>
            </div>

            <div class="flex flex-wrap gap-2">
              <button v-for="tag in availableTags" :key="tag" type="button" class="px-3.5 py-2 rounded-full text-xs font-800 transition-all duration-200 border" :class="selectedTags.includes(tag) ? 'bg-[#00d5b4] border-[#00d5b4] text-[#102b28] shadow-md' : 'bg-white/10 border-white/15 text-white/85 hover:bg-white/20'" @click="toggleTag(tag)">
                {{ tag }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ARROWS -->
      <button type="button" class="hero-arrow absolute z-30 left-4 sm:left-7 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white backdrop-blur-md transition-all" aria-label="Anterior" @click="previousSlide">
        <ChevronLeft :size="22" />
      </button>

      <button type="button" class="hero-arrow absolute z-30 right-4 sm:right-7 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white backdrop-blur-md transition-all" aria-label="Siguiente" @click="nextSlide">
        <ChevronRight :size="22" />
      </button>

      <!-- INDICATORS -->
      <div class="hero-indicators absolute z-30 bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
        <button v-for="(_, index) in slides" :key="index" type="button" class="h-2 rounded-full transition-all duration-300" :class="currentSlide === index ? 'w-8 bg-[#00d5b4]' : 'w-2 bg-white/45 hover:bg-white/70'" :aria-label="`Ir a la diapositiva ${index + 1}`" @click="goToSlide(index)"></button>
      </div>
    </section>

    <!-- CATALOGOS -->
    <main id="catalogos" class="catalog-section w-[92%] max-w-[1500px] mx-auto pt-0 pb-6 sm:pb-8">

      <!-- SECTION HEADER -->
      <div class="catalog-toolbar flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-5">

        <div>
          <div class="flex items-center gap-2 mb-2">
            <div class="w-8 h-8 flex items-center justify-center rounded-9px bg-[#e9e4ff] text-[#7c5cff]">
              <Store :size="17" />
            </div>

            <span class="text-xs font-900 tracking-[0.12em] text-[#7c5cff] uppercase">Descubre</span>
          </div>

          <h2 id="catalogos-titulo" class="catalog-title text-3xl sm:text-4xl font-900 tracking-[-0.03em] text-[#17182d]">Catálogos</h2>

          <p class="mt-2 text-sm sm:text-base text-[#77798d]">
            {{ filteredCatalogs.length }}
            {{ filteredCatalogs.length === 1 ? 'catálogo disponible' : 'catálogos disponibles' }}
          </p>
        </div>

      </div>

      <div class="catalog-filter-row">
        <label class="catalog-search">
          <Search :size="19" aria-hidden="true" />
          <input v-model="search" class="catalog-search-input" type="search" placeholder="Buscar catálogos..." aria-label="Buscar catálogos" />
          <button v-if="search" type="button" aria-label="Limpiar búsqueda" @click="search = ''"><X :size="16" /></button>
        </label>
        <button v-if="search || selectedTags.length" type="button" class="clear-filters" @click="clearFilters"><X :size="15" /> Limpiar filtros</button>
      </div>

      <!-- LOADING -->
      <div v-if="loading" class="min-h-80 flex flex-col items-center justify-center rounded-20px bg-white border border-[#e9e9f1] shadow-[0_8px_30px_rgba(25,28,60,0.05)]">
        <div class="w-10 h-10 rounded-full border-4 border-[#e7e2ff] border-t-[#7c5cff] animate-spin"></div>
        <p class="mt-4 text-sm font-700 text-[#77798d]">Cargando catálogos...</p>
      </div>

      <!-- ERROR -->
      <div v-else-if="error" class="min-h-80 flex flex-col items-center justify-center text-center px-5 rounded-20px bg-white border border-[#f0d9df] shadow-[0_8px_30px_rgba(25,28,60,0.05)]">
        <div class="w-14 h-14 flex items-center justify-center rounded-16px bg-[#fbe9ef] text-[#b64978]">
          <Package :size="27" />
        </div>

        <p class="mt-4 max-w-md text-sm text-[#77798d]">{{ error }}</p>

        <button type="button" class="mt-5 px-5 py-2.5 rounded-11px bg-[#7c5cff] hover:bg-[#6e4ff0] text-white text-sm font-800 shadow-md transition-all" @click="loadCatalogs">
          Reintentar
        </button>
      </div>

      <!-- EMPTY -->
      <div v-else-if="!filteredCatalogs.length" class="min-h-80 flex flex-col items-center justify-center text-center px-5 rounded-20px bg-white border border-[#e9e9f1] shadow-[0_8px_30px_rgba(25,28,60,0.05)]">
        <div class="w-16 h-16 flex items-center justify-center rounded-20px bg-[#f0edff] text-[#7c5cff]">
          <Package :size="30" />
        </div>

        <h3 class="mt-5 text-xl font-900 text-[#17182d]">No encontramos catálogos</h3>

        <p class="mt-2 max-w-md text-sm text-[#77798d]">Prueba con otro nombre o selecciona otras etiquetas.</p>

        <button type="button" class="mt-5 px-5 py-2.5 rounded-11px bg-[#f5d8ea] hover:bg-[#efc3df] text-[#96356f] text-sm font-800 shadow-md transition-all" @click="clearFilters">
          Limpiar filtros
        </button>
      </div>

      <!-- GRID -->
      <div v-else class="catalog-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">

        <article v-for="catalog in filteredCatalogs" :key="catalog.id ?? catalog.nombre" class="catalog-card group overflow-hidden rounded-12px bg-white border border-[#e9e9f1] shadow-[0_6px_25px_rgba(25,28,60,0.05)] transition-all duration-300">

          <!-- COVER -->
          <div class="catalog-cover relative aspect-[3/2] overflow-hidden bg-[#eeedf5]">

            <img v-if="catalog.urlFotoPortada" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" :src="catalog.urlFotoPortada" :alt="`Portada de ${catalog.nombre}`" loading="lazy" />

            <div v-else class="w-full h-full flex items-center justify-center bg-[linear-gradient(135deg,#f0edff,#f8eaf3)] text-[#8b80bd]">
              <Store :size="38" />
            </div>

            <!-- STATUS -->
            <span class="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full text-[9px] sm:text-[10px] font-900 shadow-sm" :class="catalog.activo !== false ? 'bg-[#d9f8f1] text-[#167a68]' : 'bg-[#fbe1e7] text-[#a83f62]'">
              {{ catalog.activo !== false ? 'Activo' : 'Inactivo' }}
            </span>

          </div>

          <!-- INFO -->
          <div class="catalog-card-info p-3">

            <h3 class="text-sm sm:text-base font-900 text-[#17182d] truncate">
              {{ catalog.nombre }}
            </h3>

            <p class="catalog-description mt-1 text-[11px] leading-4 text-[#858698] line-clamp-1 min-h-0">
              {{ catalog.descripcion || 'Catálogo sin descripción.' }}
            </p>

            <!-- TAGS -->
            <div v-if="catalog.etiquetas.length" class="flex flex-wrap gap-1 mt-2">
              <span v-for="tag in catalog.etiquetas.slice(0, 3)" :key="tag" class="catalog-tag px-2 py-1 rounded-full text-[9px] sm:text-[10px] font-800 truncate max-w-full">
                {{ tag }}
              </span>

              <span v-if="catalog.etiquetas.length > 3" class="catalog-more px-2 py-1 rounded-full text-[9px] sm:text-[10px] font-800">
                +{{ catalog.etiquetas.length - 3 }}
              </span>
            </div>

            <!-- VIEW BUTTON -->
            <button type="button" class="catalog-view-button w-full mt-3 flex items-center justify-center gap-2 py-2 rounded-8px text-xs font-800 transition-all duration-200" @click="openCatalog(catalog)">
              Ver catálogo
              <ArrowRight :size="14" class="transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>

          </div>
        </article>

      </div>
    </main>

    <!-- FOOTER -->
    <footer class="border-t border-[#e7e7ef] bg-white">
      <div class="footer-content w-[92%] max-w-[1400px] mx-auto py-8 flex flex-col sm:flex-row items-center justify-between gap-5 text-center sm:text-left">
        <div>
          <p class="font-900 text-[#17182d]">CatalogosZone</p>
          <p class="mt-1 text-xs text-[#858698]">Todos tus catálogos en un solo lugar.</p>
        </div>

        <div class="footer-join">
          <span>¿Tienes un negocio?</span>
          <button type="button" @click="openAddUser">Únete a nosotros <ArrowRight :size="15" /></button>
        </div>

        <p class="text-xs text-[#999aaa]">
          © {{ new Date().getFullYear() }} CatalogosZone
        </p>
      </div>
    </footer>

    <!-- LOGIN -->
    <LoginModal
      :visible="showLoginModal"
      :loading="loginLoading"
      :error="loginError"
      :username="username"
      :password="password"
      @close="closeLogin"
      @submit="submitLogin"
      @update:username="username = $event"
      @update:password="password = $event"
    />

    <!-- REGISTRO -->
    <FormAddUser
      :visible="showFormAddModal"
      :error="formaddError"
      @close="closeAddUser"
    />

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

.brand-copy p + p {
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

.explore-button:hover { background: #e07836; transform: translateY(-1px); }
.catalog-section { scroll-margin-top: 0; }
.catalog-title { scroll-margin-top: 76px; }
.catalog-toolbar { margin-bottom: 10px !important; }
.catalog-filter-row { display: flex; align-items: center; gap: 12px; margin: 0 0 12px; }
.catalog-search { display: flex; align-items: center; gap: 10px; width: min(100%, 520px); height: 44px; padding: 0 12px; border: 1px solid #d7d7d7; border-radius: 8px; background: #fff; color: #555; }
.catalog-search-input { width: 100%; min-width: 0; height: 100%; padding: 0; border: 0; outline: 0 !important; box-shadow: none !important; background: transparent; color: #171717; font-size: 14px; }
.catalog-search-input:focus, .catalog-search-input:focus-visible { border: 0 !important; outline: 0 !important; box-shadow: none !important; }
.catalog-search-input::placeholder { color: #777; }
.catalog-search button { display: grid; place-items: center; width: 28px; height: 28px; flex: 0 0 28px; border: 0; border-radius: 50%; background: #ededed; color: #222; }
.clear-filters { display: inline-flex; align-items: center; gap: 6px; min-height: 40px; padding: 0 10px; border: 0; background: transparent; color: #8f3e13; font-size: 12px; font-weight: 700; }
.catalog-card-info { min-width: 0; padding: 8px !important; }
.catalog-card-info h3 { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 17px; line-height: 1.25; }
.catalog-description { min-height: 2.7em !important; margin-top: 7px !important; font-size: 13px !important; line-height: 1.4 !important; }
.catalog-card .catalog-cover { height: clamp(280px, calc(100dvh - 430px), 460px); max-height: 460px; aspect-ratio: auto; }
.catalog-card .catalog-cover > div:not(.absolute) { min-height: 100%; }
.catalog-cover img { display: block; }

.catalog-tag { background: #ededed; color: #282828; }
.catalog-more { background: #f4f4f4; color: #626262; }

.catalog-view-button {
  min-height: 42px;
  margin-top: 14px !important;
  padding-top: 9px !important;
  padding-bottom: 9px !important;
  border: 1px solid #171717;
  background: #171717;
  color: #fff;
}

.catalog-view-button:hover {
  border-color: #c65b19;
  background: #c65b19;
  color: #171717;
}

.footer-join { display: grid; justify-items: center; gap: 7px; }
.footer-join span { color: #626262; font-size: 12px; }
.footer-join button { display: inline-flex; align-items: center; gap: 6px; padding: 8px 0; border: 0; background: transparent; color: #9b4515; font-size: 13px; font-weight: 800; }

@media (min-width: 640px) {
  .footer-join { justify-items: start; }
}

@media (max-width: 639px) {
  .footer-content { align-items: center; }
  .catalog-view-button { min-height: 42px; }
}

.hero-stage {
  height: 100vh;
  height: 100dvh;
  min-height: 0;
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
  .hero-title { font-size: 52px; }
}

@media (min-width: 1024px) {
  .hero-title { font-size: 64px; }
}

@media (max-width: 639px) {
  .hero-content { padding: 76px 4px 76px; }
  .hero-title { min-height: 4.2em; font-size: 34px; }
  .hero-description { min-height: 4.5rem; margin-top: 16px; font-size: 14px; line-height: 1.5; }
  .hero-search { height: 54px; margin-top: 20px; padding-inline: 14px; }
  .hero-tags { margin-top: 16px; }
  .hero-arrow { top: auto; bottom: 22px; width: 36px; height: 36px; transform: none; }
  .hero-indicators { bottom: 36px; }
  .explore-button { margin-top: 20px; }
  .catalog-section { padding-top: 0; padding-bottom: 24px; }
  .catalog-toolbar { margin-bottom: 14px; }
  .catalog-filter-row { align-items: stretch; flex-direction: column; margin-bottom: 10px; }
  .catalog-search { width: 100%; }
  .clear-filters { align-self: flex-start; }
  .catalog-grid { grid-template-columns: minmax(0, 1fr) !important; gap: 14px !important; }
  .catalog-card .catalog-cover { height: clamp(220px, 35svh, 300px); }
  .catalog-card-info { padding: 14px !important; }
  .catalog-card-info h3 { font-size: 16px; }
  .catalog-description { min-height: 2.7em !important; font-size: 12px !important; }
  .catalog-card-info .catalog-view-button { min-height: 40px; font-size: 12px; }
}

@media (min-width: 640px) and (max-width: 1023px) {
  .catalog-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 14px !important; }
}

@media (max-width: 380px) {
  .hero-title { font-size: 31px; }
  .catalog-card-info .catalog-tag, .catalog-card-info .catalog-more { font-size: 8px; }
}

@media (max-height: 700px) {
  .hero-content { padding-top: 64px; padding-bottom: 64px; }
  .hero-title { min-height: 2.4em; }
  .hero-description { min-height: 3.5rem; margin-top: 12px; }
  .hero-search { margin-top: 16px; }
  .hero-tags { max-height: 88px; overflow-y: auto; margin-top: 12px; }
}

@media (prefers-reduced-motion: reduce) {
  .hero-enter-active,
  .hero-leave-active {
    transition: none;
  }
}
</style>