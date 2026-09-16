<script setup lang="ts">
import { ref } from 'vue'
import LoginModal from './components/LoginModal.vue'
import CatalogPage from './pages/catalog/CatalogPage.vue'
import DashboardPage from './pages/dashboard/DashboardPage.vue'
import { api, setCredentials, type Usuario } from './api'

const isAuthenticated = ref(false)
const showLoginModal = ref(false)
const username = ref('')
const password = ref('')
const loginError = ref('')
const loginLoading = ref(false)

function openLoginModal() {
  loginError.value = ''
  showLoginModal.value = true
}

function closeLoginModal() {
  showLoginModal.value = false
  loginError.value = ''
  loginLoading.value = false
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
    isAuthenticated.value = true
    showLoginModal.value = false
  } catch (error) {
    loginError.value = error instanceof Error ? error.message : 'No se pudo iniciar sesión.'
  } finally {
    loginLoading.value = false
  }
}
</script>

<template>
  <CatalogPage v-if="!isAuthenticated" @open-login="openLoginModal" />

  <DashboardPage
    v-else
    :products="[]"
    :variants="[]"
    :catalogs="[]"
  />

  <LoginModal
    :visible="showLoginModal"
    :loading="loginLoading"
    :error="loginError"
    :username="username"
    :password="password"
    @close="closeLoginModal"
    @submit="submitLogin"
    @update:username="username = $event"
    @update:password="password = $event"
  />
</template>

