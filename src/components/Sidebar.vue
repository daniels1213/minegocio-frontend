<script setup lang="ts">
import { LogOut, Package, UserRound } from 'lucide-vue-next'
import type { Component } from 'vue'

type View = 'dashboard' | 'catalogo' | 'inventario' | 'pedidos' | 'compras' | 'clientes' | 'proveedores' | 'usuarios'

const props = defineProps<{
  items: Array<{ id: View; label: string; icon: Component }>
  activeView: View
  username: string
  isSuperadmin: boolean
  mobileOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'select', value: View): void
  (e: 'toggle-mobile'): void
  (e: 'logout'): void
  (e: 'open-profile'): void
}>()
</script>

<template>
  <aside class="sidebar" :class="{ 'is-open': props.mobileOpen }">
    <div class="brand">
      <span class="brand-mark"><Package :size="20" /></span>
      <span>MI NEGOCIO</span>
    </div>

    <nav>
      <button
        v-for="item in props.items"
        :key="item.id"
        class="nav-item"
        :class="{ active: props.activeView === item.id }"
        @click="emit('select', item.id)"
      >
        <component :is="item.icon" :size="18" />
        <span>{{ item.label }}</span>
      </button>
    </nav>

    <div class="sidebar-bottom">
      <div class="profile-mini">
        <span class="avatar">{{ props.username.slice(0, 1).toUpperCase() }}</span>
        <div>
          <strong>{{ props.username }}</strong>
          <small>{{ props.isSuperadmin ? 'Superadministrador' : 'Usuario operativo' }}</small>
        </div>
      </div>

      <button class="icon-btn" title="Abrir perfil" @click="emit('open-profile')">
        <UserRound :size="17" />
      </button>

      <button class="btn logout" @click="emit('logout')">
        <LogOut :size="17" />
        <span>Cerrar sesión</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 260px;
  background: #f5f6f0;
  border-right: 1px solid #e3e6dd;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 22px;
  position: relative;
}
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  letter-spacing: -0.5px;
  font-size: 19px;
}
.brand-mark {
  width: 36px;
  height: 36px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  background: #f2c96b;
  color: #173d32;
}
.nav-item {
  width: 100%;
  border: 0;
  background: transparent;
  color: #1a2825;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 12px;
  border-radius: 12px;
  font-weight: 600;
  text-align: left;
}
.nav-item.active {
  background: #dfece7;
  color: #173d32;
}
.sidebar-bottom {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.profile-mini {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border: 1px solid #e5e8e2;
  border-radius: 12px;
  padding: 10px 12px;
}
.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #d9f0df;
  display: grid;
  place-items: center;
  font-weight: 700;
}
.profile-mini small {
  color: #727d75;
  display: block;
}
.btn.logout {
  width: 100%;
  justify-content: center;
}
.icon-btn {
  border: 1px solid #dfe6de;
  background: #fff;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: grid;
  place-items: center;
}
@media (max-width: 920px) {
  .sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    transform: translateX(-105%);
    z-index: 30;
    transition: transform 0.2s ease;
    width: min(82vw, 300px);
  }
  .sidebar.is-open {
    transform: translateX(0);
  }
}
</style>
