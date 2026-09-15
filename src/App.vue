<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import DashboardPage from './pages/dashboard/DashboardPage.vue'
import CatalogPage from './pages/catalog/CatalogPage.vue'
import InventoryPage from './pages/inventory/InventoryPage.vue'
import { api, type Catalogo, type Producto, type Variante } from './api'

type View = 'dashboard' | 'catalogo' | 'inventario'

const currentView = ref<View>('dashboard')
const search = ref('')
const activeCatalogId = ref<number | null>(null)
const loading = ref(false)
const error = ref('')

const products = ref<Producto[]>([])
const variants = ref<Variante[]>([])
const catalogs = ref<Catalogo[]>([])

const visibleCatalogs = computed(() => catalogs.value)

async function loadData() {
  loading.value = true
  error.value = ''

  try {
    const [catalogResult, productResult, variantResult] = await Promise.all([
      api.catalogosTodos<Catalogo>(),
      api.list<Producto>('productos'),
      api.list<Variante>('variantes-producto'),
    ])

    catalogs.value = catalogResult
    products.value = productResult
    variants.value = variantResult

    if (!activeCatalogId.value && catalogResult.length) {
      activeCatalogId.value = catalogResult[0].id ?? null
    }
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'No se pudo cargar la información.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <h1>Mi Negocio</h1>
      <nav>
        <button :class="{ active: currentView === 'dashboard' }" @click="currentView = 'dashboard'">Dashboard</button>
        <button :class="{ active: currentView === 'catalogo' }" @click="currentView = 'catalogo'">Catálogo</button>
        <button :class="{ active: currentView === 'inventario' }" @click="currentView = 'inventario'">Inventario</button>
      </nav>
    </aside>

    <main class="content">
      <header class="topbar">
        <h2>
          {{ currentView === 'dashboard' ? 'Dashboard' : currentView === 'catalogo' ? 'Catálogo' : 'Inventario' }}
        </h2>
      </header>

      <div v-if="loading" class="state">Cargando...</div>
      <div v-else-if="error" class="state error">{{ error }}</div>

      <DashboardPage
        v-else-if="currentView === 'dashboard'"
        :products="products"
        :variants="variants"
        :catalogs="visibleCatalogs"
      />

      <CatalogPage
        v-else-if="currentView === 'catalogo'"
        :products="products"
        :variants="variants"
        :catalogs="visibleCatalogs"
        :search="search"
        :activeCatalogId="activeCatalogId"
        @update:search="search = $event"
        @update:activeCatalogId="activeCatalogId = $event"
      />

      <InventoryPage
        v-else
        :variants="variants"
      />
    </main>
  </div>
</template>

<style scoped>
:global(body) {
  margin: 0;
  background: #f4f7f4;
  font-family: Arial, sans-serif;
}

.app-shell {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 220px;
  background: #152d26;
  color: #fff;
  padding: 20px 16px;
}

.sidebar h1 {
  margin: 0 0 24px;
  font-size: 24px;
}

.sidebar nav {
  display: grid;
  gap: 10px;
}

.sidebar button {
  border: 0;
  background: transparent;
  color: #d7e4df;
  text-align: left;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 15px;
}

.sidebar button.active {
  background: #204a3d;
  color: #fff;
}

.content {
  flex: 1;
  padding: 24px;
}

.topbar {
  margin-bottom: 20px;
}

.topbar h2 {
  margin: 0;
  font-size: 28px;
}

.state {
  padding: 22px;
  background: #fff;
  border: 1px solid #e7ece8;
  border-radius: 12px;
}

.error {
  color: #a44539;
}
</style>
