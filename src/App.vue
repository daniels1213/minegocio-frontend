<script setup lang="ts">
import { ref } from 'vue'
import CatalogPage from './pages/CatalogPage.vue'
import DashboardPage from './pages/DashboardPage.vue'
import { hasCredentials } from './api'

const isAuthenticated = ref(hasCredentials())

function showDashboard() {
  isAuthenticated.value = true
}

function showCatalog() {
  isAuthenticated.value = false
}
</script>

<template>
  <CatalogPage
    v-if="!isAuthenticated"
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