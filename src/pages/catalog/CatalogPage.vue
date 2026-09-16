<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Search, Package, Store } from 'lucide-vue-next'
import { api, type Catalogo } from '../../api'

const catalogs = ref<Catalogo[]>([])
const search = ref('')
const loading = ref(false)
const error = ref('')

const normalizedCatalogs = computed(() =>
  catalogs.value.map((catalog) => ({
    ...catalog,
    nombre:
      catalog.nombre?.trim() ||
      `Catálogo ${catalog.id ?? ''}`.trim() ||
      'Sin nombre',
  })),
)

const filteredCatalogs = computed(() => {
  const query = search.value.trim().toLowerCase()

  if (!query) {
    return normalizedCatalogs.value
  }

  return normalizedCatalogs.value.filter((catalog) =>
    catalog.nombre.toLowerCase().includes(query),
  )
})

async function loadCatalogs() {
  loading.value = true
  error.value = ''

  try {
    catalogs.value = await api.catalogosTodos<Catalogo>()
  } catch (reason) {
    error.value =
      reason instanceof Error
        ? reason.message
        : 'No se pudieron cargar los catálogos.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadCatalogs()
})
</script>

<template>
  <div class="catalog-page">

    <!-- HEADER -->
    <header class="header">
      <div class="brand">
        <div class="brand-icon">
          <Store :size="22" />
        </div>

        <div>
          <h1>CatalogosZone</h1>
          <p>Todos tus catálogos en un solo lugar</p>
        </div>
      </div>

      <button class="add-catalog-btn">
        Añade tu catálogo
      </button>
    </header>

    <!-- HERO -->
    <section class="hero">
      <div class="hero-content">
        <span class="hero-label">CATÁLOGOS DIGITALES</span>

        <h2>
          Descubre productos de
          <span>todos tus negocios favoritos</span>
        </h2>

        <p>
          Explora catálogos, descubre productos y encuentra lo que buscas
          fácilmente.
        </p>

        <div class="search-box">
          <Search :size="20" />

          <input
            v-model="search"
            type="text"
            placeholder="Buscar catálogo..."
          />
        </div>
      </div>
    </section>

    <!-- CATALOGS -->
    <main class="catalog-content">

      <div class="section-header">
        <div>
          <h2>Catálogos</h2>
          <p>
            {{ filteredCatalogs.length }}
            {{ filteredCatalogs.length === 1 ? 'catálogo disponible' : 'catálogos disponibles' }}
          </p>
        </div>
      </div>

      <!-- LOADING -->
      <div v-if="loading" class="state">
        <div class="loader"></div>
        <p>Cargando catálogos...</p>
      </div>

      <!-- ERROR -->
      <div v-else-if="error" class="state error">
        <Package :size="32" />
        <p>{{ error }}</p>
        <button @click="loadCatalogs">
          Reintentar
        </button>
      </div>

      <!-- EMPTY -->
      <div v-else-if="!filteredCatalogs.length" class="state">
        <Package :size="36" />
        <h3>No encontramos catálogos</h3>
        <p>
          Prueba con otro término de búsqueda.
        </p>
      </div>

      <!-- GRID -->
      <div v-else class="catalog-grid">

        <article
          v-for="catalog in filteredCatalogs"
          :key="catalog.id ?? catalog.nombre"
          class="catalog-card"
        >

          <div class="catalog-cover">
            <div class="cover-placeholder">
              <Store :size="42" />
            </div>

            <span
              class="status"
              :class="{ inactive: !catalog.activo }"
            >
              {{ catalog.activo ? 'Activo' : 'Inactivo' }}
            </span>
          </div>

          <div class="catalog-info">

            <h3>
              {{ catalog.nombre }}
            </h3>

            <p>
              {{ catalog.descripcion || 'Catálogo sin descripción.' }}
            </p>

            <button class="view-btn">
              Ver catálogo
            </button>

          </div>

        </article>

      </div>

    </main>

    <!-- FOOTER -->
    <footer class="footer">
      <p>
        © {{ new Date().getFullYear() }} CatalogosZone
      </p>
    </footer>

  </div>
</template>

<style scoped>

:global(*) {
  box-sizing: border-box;
}

:global(body) {
  margin: 0;
  font-family:
    Inter,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;

  background: #f5f7f5;
  color: #17231f;
}

/* =========================
   PAGE
========================= */

.catalog-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* =========================
   HEADER
========================= */

.header {
  min-height: 72px;
  padding: 0 6%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;

  background: #ffffff;
  border-bottom: 1px solid #e6ebe7;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-icon {
  width: 42px;
  height: 42px;

  display: grid;
  place-items: center;

  background: #18382e;
  color: white;
  border-radius: 12px;
}

.brand h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: #18382e;
}

.brand p {
  margin: 2px 0 0;
  color: #728078;
  font-size: 12px;
}

/* =========================
   BUTTON
========================= */

.add-catalog-btn {
  border: 0;
  border-radius: 10px;

  padding: 11px 18px;

  background: #18382e;
  color: white;

  font-size: 14px;
  font-weight: 700;

  cursor: pointer;

  transition:
    transform 0.15s ease,
    background 0.15s ease;
}

.add-catalog-btn:hover {
  background: #245443;
  transform: translateY(-1px);
}

/* =========================
   HERO
========================= */

.hero {
  background: #18382e;
  color: white;

  padding: 70px 6%;
}

.hero-content {
  width: min(900px, 100%);
  margin: 0 auto;
  text-align: center;
}

.hero-label {
  display: inline-block;

  margin-bottom: 16px;

  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.14em;

  color: #b9d8ca;
}

.hero h2 {
  margin: 0;

  font-size: clamp(32px, 5vw, 58px);
  line-height: 1.08;
  letter-spacing: -0.04em;
}

.hero h2 span {
  display: block;
  color: #9ed0b8;
}

.hero p {
  max-width: 620px;

  margin: 22px auto 30px;

  color: #d4e3dc;

  font-size: 16px;
  line-height: 1.6;
}

/* =========================
   SEARCH
========================= */

.search-box {
  width: min(560px, 100%);
  margin: 0 auto;

  display: flex;
  align-items: center;
  gap: 12px;

  padding: 0 18px;

  background: white;
  color: #637169;

  border-radius: 14px;

  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
}

.search-box input {
  width: 100%;

  border: 0;
  outline: 0;

  padding: 16px 0;

  font-size: 15px;
  color: #17231f;

  background: transparent;
}

.search-box input::placeholder {
  color: #8b9690;
}

/* =========================
   CONTENT
========================= */

.catalog-content {
  width: min(1200px, 88%);
  margin: 0 auto;

  padding: 48px 0 70px;

  flex: 1;
}

.section-header {
  margin-bottom: 24px;
}

.section-header h2 {
  margin: 0;

  font-size: 28px;
}

.section-header p {
  margin: 6px 0 0;

  color: #748078;

  font-size: 14px;
}

/* =========================
   GRID
========================= */

.catalog-grid {
  display: grid;

  grid-template-columns:
    repeat(3, minmax(0, 1fr));

  gap: 22px;
}

/* =========================
   CARD
========================= */

.catalog-card {
  overflow: hidden;

  background: white;

  border: 1px solid #e2e9e4;
  border-radius: 18px;

  box-shadow:
    0 4px 16px rgba(24, 56, 46, 0.05);

  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.catalog-card:hover {
  transform: translateY(-4px);

  box-shadow:
    0 12px 30px rgba(24, 56, 46, 0.12);
}

/* =========================
   COVER
========================= */

.catalog-cover {
  height: 190px;

  position: relative;

  background: #e8eee9;
}

.cover-placeholder {
  width: 100%;
  height: 100%;

  display: grid;
  place-items: center;

  color: #739184;
}

.status {
  position: absolute;

  top: 12px;
  right: 12px;

  padding: 6px 10px;

  border-radius: 999px;

  background: #d8f0df;
  color: #1b5438;

  font-size: 11px;
  font-weight: 800;
}

.status.inactive {
  background: #f5dfdc;
  color: #7b3933;
}

/* =========================
   CARD INFO
========================= */

.catalog-info {
  padding: 20px;
}

.catalog-info h3 {
  margin: 0 0 8px;

  font-size: 19px;
  line-height: 1.3;
}

.catalog-info p {
  min-height: 44px;

  margin: 0 0 18px;

  color: #6d7972;

  font-size: 14px;
  line-height: 1.55;
}

.view-btn {
  width: 100%;

  border: 1px solid #d8e1db;
  border-radius: 10px;

  padding: 11px;

  background: white;
  color: #18382e;

  font-weight: 700;

  cursor: pointer;

  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.view-btn:hover {
  background: #18382e;
  color: white;
}

/* =========================
   STATES
========================= */

.state {
  min-height: 260px;

  display: grid;
  place-items: center;
  align-content: center;
  gap: 8px;

  text-align: center;

  background: white;

  border: 1px solid #e3e9e4;
  border-radius: 16px;

  color: #718078;
}

.state h3 {
  margin: 8px 0 0;
  color: #26352f;
}

.state p {
  margin: 0;
}

.state button {
  margin-top: 8px;

  border: 0;
  border-radius: 9px;

  padding: 10px 16px;

  background: #18382e;
  color: white;

  font-weight: 700;

  cursor: pointer;
}

.error {
  color: #a34a42;
}

/* =========================
   LOADER
========================= */

.loader {
  width: 30px;
  height: 30px;

  border: 3px solid #dce6e0;
  border-top-color: #18382e;

  border-radius: 50%;

  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* =========================
   FOOTER
========================= */

.footer {
  padding: 24px 6%;

  border-top: 1px solid #e2e8e4;

  background: white;

  text-align: center;

  color: #7b8780;

  font-size: 13px;
}

/* =========================
   TABLET
========================= */

@media (max-width: 900px) {
  .catalog-grid {
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
  }

  .hero {
    padding: 60px 6%;
  }
}

/* =========================
   MOBILE
========================= */

@media (max-width: 600px) {
  .header {
    min-height: auto;

    padding: 14px 5%;

    align-items: center;
  }

  .brand-icon {
    width: 38px;
    height: 38px;
  }

  .brand h1 {
    font-size: 17px;
  }

  .brand p {
    display: none;
  }

  .add-catalog-btn {
    padding: 9px 12px;

    font-size: 12px;
  }

  .hero {
    padding: 48px 5%;
  }

  .hero h2 {
    font-size: 34px;
  }

  .hero p {
    font-size: 14px;
  }

  .search-box {
    border-radius: 12px;
  }

  .catalog-content {
    width: 90%;

    padding: 34px 0 50px;
  }

  .section-header h2 {
    font-size: 24px;
  }

  .catalog-grid {
    grid-template-columns: 1fr;

    gap: 16px;
  }

  .catalog-cover {
    height: 180px;
  }

  .catalog-info {
    padding: 17px;
  }

  .catalog-info p {
    min-height: auto;
  }
}

/* =========================
   SMALL MOBILE
========================= */

@media (max-width: 380px) {
  .header {
    gap: 10px;
  }

  .brand h1 {
    font-size: 16px;
  }

  .add-catalog-btn {
    padding: 8px 10px;
  }

  .hero h2 {
    font-size: 29px;
  }
}
</style>
