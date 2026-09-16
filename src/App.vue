<script setup lang="ts">
import { ref } from 'vue'
import CatalogPage from './pages/catalog/CatalogPage.vue'
import DashboardPage from './pages/dashboard/DashboardPage.vue'
import { hasCredentials } from './api'

const isAuthenticated = ref(hasCredentials())

function showDashboard() {
  isAuthenticated.value = true
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
  />
</template>