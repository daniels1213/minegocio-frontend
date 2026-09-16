<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Search, Package, Store, Shield, Tag } from 'lucide-vue-next'
import { api, type Catalogo } from '../../api'

const emit = defineEmits<{
  (e: 'open-login'): void
}>()

const catalogs = ref<Catalogo[]>([])
const search = ref('')
const selectedTags = ref<string[]>([])
const loading = ref(false)
const error = ref('')

const normalizedCatalogs = computed(() => {
  return catalogs.value.map((catalog) => {
    const etiquetas = Array.isArray(catalog.etiquetas)
      ? catalog.etiquetas
          .map((tag) => tag.trim())
          .filter(Boolean)
      : []

    return {
      ...catalog,
      nombre: catalog.nombre?.trim() || 'Sin nombre',
      etiquetas,
    }
  })
})

const availableTags = computed(() => {
  const tags = new Set<string>()

  normalizedCatalogs.value.forEach((catalog) => {
    catalog.etiquetas.forEach((tag) => {
      tags.add(tag)
    })
  })

  return Array.from(tags).sort((a, b) => a.localeCompare(b))
})

const filteredCatalogs = computed(() => {
  const query = search.value.trim().toLowerCase()

  return normalizedCatalogs.value.filter((catalog) => {
    const matchesName =
      !query ||
      catalog.nombre.toLowerCase().includes(query)

    const matchesTags =
      selectedTags.value.length === 0 ||
      selectedTags.value.every((tag) =>
        catalog.etiquetas.includes(tag)
      )

    return matchesName && matchesTags
  })
})

function toggleTag(tag: string) {
  if (selectedTags.value.includes(tag)) {
    selectedTags.value = selectedTags.value.filter(
      (selectedTag) => selectedTag !== tag
    )

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
    catalogs.value =
      await api.catalogosTodos<Catalogo>()
  } catch (reason) {
    error.value =
      reason instanceof Error
        ? reason.message
        : 'No se pudieron cargar los catálogos.'
  } finally {
    loading.value = false
  }
}

function openLogin() {
  emit('open-login')
}

function addCatalog() {
  console.log('Añadir catálogo')
}

onMounted(() => {
  loadCatalogs()
})
</script>


<template>
  <div class="catalog-page">

    <header class="header">

      <div class="brand">

        <div class="brand-icon">
          <Store :size="22" />
        </div>

        <div class="brand-text">
          <h1>CatalogosZone</h1>

          <p>
            Todos tus catálogos en un solo lugar
          </p>
        </div>

      </div>


      <div class="header-actions">

        <button
          class="add-catalog-btn"
          type="button"
          @click="addCatalog"
        >
          Añade tu catálogo
        </button>


        <button
          class="admin-btn"
          type="button"
          @click="openLogin"
        >
          <Shield :size="17" />

          <span>
            Administración
          </span>
        </button>

      </div>

    </header>


    <section class="hero">

      <div class="hero-content">

        <span class="hero-label">
          CATÁLOGOS DIGITALES
        </span>


        <h2>
          Descubre productos de

          <span>
            todos tus negocios favoritos
          </span>
        </h2>


        <p>
          Explora catálogos, descubre productos y
          encuentra lo que buscas fácilmente.
        </p>


        <div class="search-box">

          <Search :size="20" />

          <input
            v-model="search"
            type="text"
            placeholder="Buscar catálogo..."
          />

        </div>


        <div
          v-if="availableTags.length"
          class="tag-filter"
        >

          <div class="tag-filter-header">

            <div class="tag-title">

              <Tag :size="16" />

              <span>
                Filtrar por etiquetas
              </span>

            </div>


            <button
              v-if="selectedTags.length"
              class="clear-tags-btn"
              type="button"
              @click="clearFilters"
            >
              Limpiar
            </button>

          </div>


          <div class="tag-list">

            <button
              v-for="tag in availableTags"
              :key="tag"
              type="button"
              class="tag-btn"
              :class="{
                selected: selectedTags.includes(tag)
              }"
              @click="toggleTag(tag)"
            >
              {{ tag }}
            </button>

          </div>

        </div>

      </div>

    </section>


    <main class="catalog-content">

      <div class="section-header">

        <div>

          <h2>
            Catálogos
          </h2>

          <p>
            {{ filteredCatalogs.length }}

            {{
              filteredCatalogs.length === 1
                ? 'catálogo disponible'
                : 'catálogos disponibles'
            }}
          </p>

        </div>


        <button
          v-if="search || selectedTags.length"
          class="clear-content-filter"
          type="button"
          @click="clearFilters"
        >
          Limpiar filtros
        </button>

      </div>


      <div
        v-if="loading"
        class="state"
      >

        <div class="loader"></div>

        <p>
          Cargando catálogos...
        </p>

      </div>


      <div
        v-else-if="error"
        class="state error"
      >

        <Package :size="32" />

        <p>
          {{ error }}
        </p>

        <button
          type="button"
          @click="loadCatalogs"
        >
          Reintentar
        </button>

      </div>


      <div
        v-else-if="!filteredCatalogs.length"
        class="state"
      >

        <Package :size="36" />

        <h3>
          No encontramos catálogos
        </h3>

        <p>
          Prueba con otro nombre o selecciona
          otras etiquetas.
        </p>

        <button
          type="button"
          @click="clearFilters"
        >
          Limpiar filtros
        </button>

      </div>


      <div
        v-else
        class="catalog-grid"
      >

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
              :class="{
                inactive: !catalog.activo
              }"
            >
              {{
                catalog.activo
                  ? 'Activo'
                  : 'Inactivo'
              }}
            </span>

          </div>


          <div class="catalog-info">

            <h3>
              {{ catalog.nombre }}
            </h3>


            <p>
              {{
                catalog.descripcion ||
                'Catálogo sin descripción.'
              }}
            </p>


            <div
              v-if="catalog.etiquetas.length"
              class="catalog-tags"
            >

              <span
                v-for="tag in catalog.etiquetas"
                :key="tag"
                class="catalog-tag"
              >
                {{ tag }}
              </span>

            </div>


            <button
              class="view-btn"
              type="button"
            >
              Ver catálogo
            </button>

          </div>

        </article>

      </div>

    </main>


    <footer class="footer">

      <p>
        © {{ new Date().getFullYear() }}
        CatalogosZone
      </p>

    </footer>

  </div>
</template>


<style scoped>

/* =========================
   PÁGINA GENERAL
========================= */

:global(*) {
  box-sizing: border-box;
}

:global(body) {
  margin: 0;
  font-family: Arial, sans-serif;
  background: #f5f7f5;
  color: #17231f;
}

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

  color: #18382e;
}

.brand p {
  margin: 2px 0 0;

  font-size: 12px;

  color: #728078;
}

.header-actions {
  display: flex;
  align-items: center;

  gap: 10px;
}

.add-catalog-btn,
.admin-btn {
  min-height: 40px;

  padding: 10px 16px;

  border-radius: 10px;

  font-size: 13px;
  font-weight: bold;

  cursor: pointer;
}

.add-catalog-btn {
  border: 0;

  background: #18382e;
  color: white;
}

.admin-btn {
  display: flex;
  align-items: center;

  gap: 7px;

  border: 1px solid #dce5df;

  background: #edf2ef;
  color: #18382e;
}


/* =========================
   HERO
========================= */

.hero {
  padding: 70px 6%;

  background: #18382e;

  color: white;
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
  font-weight: bold;

  color: #b9d8ca;
}

.hero h2 {
  margin: 0;

  font-size: clamp(32px, 5vw, 58px);

  line-height: 1.08;
}

.hero h2 span {
  display: block;

  color: #9ed0b8;
}

.hero p {
  max-width: 620px;

  margin: 22px auto 30px;

  color: #d4e3dc;

  line-height: 1.6;
}


/* =========================
   BUSCADOR
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
}

.search-box input {
  width: 100%;

  padding: 16px 0;

  border: 0;
  outline: none;

  background: transparent;

  font-size: 15px;
}


/* =========================
   FILTRO DE ETIQUETAS
========================= */

.tag-filter {
  width: min(850px, 100%);

  margin: 24px auto 0;

  padding: 18px;

  text-align: left;

  background: rgba(255, 255, 255, 0.08);

  border: 1px solid rgba(255, 255, 255, 0.12);

  border-radius: 14px;
}

.tag-filter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  margin-bottom: 13px;
}

.tag-title {
  display: flex;
  align-items: center;

  gap: 7px;

  font-size: 13px;
  font-weight: bold;
}

.clear-tags-btn {
  border: 0;

  background: transparent;

  color: #b9d8ca;

  cursor: pointer;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;

  gap: 8px;
}

.tag-btn {
  padding: 7px 12px;

  border: 1px solid rgba(255, 255, 255, 0.2);

  border-radius: 999px;

  background: rgba(255, 255, 255, 0.06);

  color: white;

  cursor: pointer;
}

.tag-btn.selected {
  background: #9ed0b8;

  border-color: #9ed0b8;

  color: #18382e;
}


/* =========================
   CONTENIDO
========================= */

.catalog-content {
  width: min(1200px, 88%);

  margin: 0 auto;

  padding: 48px 0 70px;

  flex: 1;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  margin-bottom: 24px;
}

.section-header h2 {
  margin: 0;

  font-size: 28px;
}

.section-header p {
  margin: 6px 0 0;

  color: #748078;
}

.clear-content-filter {
  padding: 8px 12px;

  border: 1px solid #d8e1db;

  border-radius: 9px;

  background: white;

  color: #18382e;

  cursor: pointer;
}


/* =========================
   GRID
========================= */

.catalog-grid {
  display: grid;

  grid-template-columns: repeat(3, 1fr);

  gap: 22px;
}


/* =========================
   TARJETA
========================= */

.catalog-card {
  overflow: hidden;

  background: white;

  border: 1px solid #e2e9e4;

  border-radius: 18px;

  transition: transform 0.2s;
}

.catalog-card:hover {
  transform: translateY(-4px);
}

.catalog-cover {
  position: relative;

  height: 190px;

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
  font-weight: bold;
}

.status.inactive {
  background: #f5dfdc;

  color: #7b3933;
}

.catalog-info {
  padding: 20px;
}

.catalog-info h3 {
  margin: 0 0 8px;

  font-size: 19px;
}

.catalog-info p {
  margin: 0 0 14px;

  color: #6d7972;

  font-size: 14px;

  line-height: 1.5;
}


/* =========================
   ETIQUETAS
========================= */

.catalog-tags {
  display: flex;
  flex-wrap: wrap;

  gap: 5px;

  margin-bottom: 16px;
}

.catalog-tag {
  padding: 4px 8px;

  border-radius: 999px;

  background: #edf3ef;

  color: #46675a;

  font-size: 10px;
  font-weight: bold;
}


/* =========================
   BOTÓN
========================= */

.view-btn {
  width: 100%;

  padding: 11px;

  border: 1px solid #d8e1db;

  border-radius: 10px;

  background: white;

  color: #18382e;

  font-weight: bold;

  cursor: pointer;
}

.view-btn:hover {
  background: #18382e;

  color: white;
}


/* =========================
   ESTADOS
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

.state button {
  margin-top: 8px;

  padding: 10px 16px;

  border: 0;

  border-radius: 9px;

  background: #18382e;

  color: white;

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

  text-align: center;

  background: white;

  border-top: 1px solid #e2e8e4;

  color: #7b8780;

  font-size: 13px;
}


/* =========================
   TABLET
========================= */

@media (max-width: 900px) {

  .catalog-grid {
    grid-template-columns: repeat(2, 1fr);
  }

}


/* =========================
   MÓVIL
   2 TARJETAS POR FILA
========================= */

@media (max-width: 600px) {

  .header {
    padding: 12px 4%;

    gap: 8px;
  }

  .brand {
    gap: 7px;
  }

  .brand-icon {
    width: 34px;
    height: 34px;
  }

  .brand h1 {
    font-size: 15px;
  }

  .brand p {
    display: none;
  }

  .header-actions {
    gap: 4px;
  }

  .add-catalog-btn,
  .admin-btn {
    min-height: 34px;

    padding: 6px 8px;

    font-size: 9px;
  }

  .admin-btn span {
    display: none;
  }

  .hero {
    padding: 42px 4%;
  }

  .hero h2 {
    font-size: 30px;
  }

  .hero p {
    font-size: 13px;
  }

  .tag-filter {
    padding: 13px;
  }

  .catalog-content {
    width: 94%;

    padding: 32px 0 50px;
  }


  /* 2 TARJETAS */

  .catalog-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));

    gap: 10px;
  }


  /* TARJETA PEQUEÑA */

  .catalog-card {
    border-radius: 12px;
  }

  .catalog-cover {
    height: 105px;
  }

  .cover-placeholder svg {
    width: 28px;
    height: 28px;
  }

  .status {
    top: 6px;
    right: 6px;

    padding: 3px 6px;

    font-size: 8px;
  }

  .catalog-info {
    padding: 10px;
  }

  .catalog-info h3 {
    margin-bottom: 5px;

    font-size: 13px;

    white-space: nowrap;

    overflow: hidden;

    text-overflow: ellipsis;
  }

  .catalog-info p {
    display: -webkit-box;

    -webkit-line-clamp: 2;

    -webkit-box-orient: vertical;

    overflow: hidden;

    margin-bottom: 8px;

    font-size: 10px;
  }

  .catalog-tags {
    margin-bottom: 8px;

    gap: 3px;
  }

  .catalog-tag {
    padding: 3px 5px;

    font-size: 8px;
  }

  .view-btn {
    padding: 8px 4px;

    font-size: 10px;
  }

}

</style>