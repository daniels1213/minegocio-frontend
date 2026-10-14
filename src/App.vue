<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import CatalogPage from './pages/CatalogPage.vue'
import DashboardPage from './pages/DashboardPage.vue'
import LegalPage from './pages/LegalPage.vue'
import { hasCredentials } from './api'

const isAuthenticated = ref(hasCredentials())
const currentPath = ref(window.location.pathname)
const legalPage = computed(() => {
  if (currentPath.value === '/terminos-de-uso') return 'terms'
  if (currentPath.value === '/politica-de-privacidad') return 'privacy'
  return null
})

function syncPath() {
  currentPath.value = window.location.pathname
}

function showDashboard() {
  isAuthenticated.value = true
}

function showCatalog() {
  isAuthenticated.value = false
}

onMounted(() => window.addEventListener('popstate', syncPath))
onUnmounted(() => window.removeEventListener('popstate', syncPath))
</script>

<template>
  <LegalPage
    v-if="legalPage"
    :page="legalPage"
  />

  <CatalogPage
    v-else-if="!isAuthenticated"
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