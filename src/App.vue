<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import CatalogPage from './pages/CatalogPage.vue'
import DashboardPage from './pages/DashboardPage.vue'
import LegalPage from './pages/LegalPage.vue'
import { hasCredentials } from './api'

const isAuthenticated = ref(hasCredentials())
const currentPath = ref(window.location.pathname)
const isPublicFallback = ref(false)
const isCatalogRoute = computed(() => /^\/catalogoCont\/\d+\/?$/.test(currentPath.value))
const legalPage = computed(() => {
  if (currentPath.value === '/terminos-de-uso') return 'terms'
  if (currentPath.value === '/politica-de-privacidad') return 'privacy'
  return null
})

const appPaths = new Set([
  '/',
  '/dashboard',
  '/mis-catalogos',
  '/mis-catalogos/nuevo',
  '/inventario',
  '/combos',
  '/pedidos',
  '/clientes',
  '/proveedores',
  '/usuarios',
  '/etiquetas',
  '/terminos-de-uso',
  '/politica-de-privacidad',
])

function syncPath() {
  const path = window.location.pathname
  const isKnownPath = appPaths.has(path) || /^\/catalogoCont\/\d+\/?$/.test(path)

  if (!isKnownPath) {
    window.history.replaceState({}, '', '/')
    currentPath.value = '/'
    isPublicFallback.value = true
    return
  }

  currentPath.value = path
  isPublicFallback.value = false
}

function showDashboard() {
  isAuthenticated.value = true
  isPublicFallback.value = false
}

function showCatalog() {
  isAuthenticated.value = false
}

syncPath()

onMounted(() => window.addEventListener('popstate', syncPath))
onUnmounted(() => window.removeEventListener('popstate', syncPath))
</script>

<template>
  <LegalPage
    v-if="legalPage"
    :page="legalPage"
  />

  <CatalogPage
    v-else-if="!isAuthenticated || isCatalogRoute || isPublicFallback"
    @authenticated="showDashboard"
  />

  <DashboardPage
    v-else
    :products="[]"
    :variants="[]"
    :catalogs="[]"
    @logout="showCatalog"
  />
</template>