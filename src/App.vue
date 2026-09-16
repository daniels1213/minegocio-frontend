<script setup lang="ts">
import { ref } from 'vue'
import CatalogPage from './pages/catalog/CatalogPage.vue'
import DashboardPage from './pages/dashboard/DashboardPage.vue'

const isAuthenticated = ref(false)
function showDashboard() {
  isAuthenticated.value = true
}
</script>

<template>
  <CatalogPage v-if="!isAuthenticated" @authenticated="showDashboard" />

  <DashboardPage
    v-else
    :products="[]"
    :variants="[]"
    :catalogs="[]"
  />
</template>

