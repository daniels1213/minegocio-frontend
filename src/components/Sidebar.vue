<script setup lang="ts">
import { LogOut, Package } from 'lucide-vue-next'
import type { Component } from 'vue'

type View = 'dashboard' | 'catalogo' | 'nuevo-catalogo' | 'inventario' | 'pedidos' | 'clientes' | 'proveedores'

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
  flex: 0 0 260px;
  height: 100vh;
  background: #1a5f47;
  border-right: 1px solid #124937;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 22px;
  position: fixed;
  overflow-y: auto;
}
.sidebar nav {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  letter-spacing: -0.5px;
  font-size: 19px;
  color: #ffffff;
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
  min-height: 48px;
  border: 0;
  background: transparent;
  color: #f5fbf7;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 12px;
  border-radius: 12px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition: background .18s ease, color .18s ease;
}
.nav-item:hover {
  background: rgba(255, 255, 255, .14);
  color: #ffffff;
}
.nav-item.active {
  background: #d9f0df;
  color: #124937;
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
  border: 0;
  background: #ffffff;
  color: #124937;
  cursor: pointer;
  transition: background .18s ease, color .18s ease;
}
.btn.logout:hover {
  background: #f2c96b;
  color: #173d32;
}
.icon-btn {
  border: 1px solid rgba(255, 255, 255, .45);
  background: rgba(255, 255, 255, .12);
  color: #ffffff;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  cursor: pointer;
}
@media (max-width: 920px) {
  .sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    transform: translateX(-105%);
    z-index: 30;
    transition: transform 0.2s ease;
    width: min(calc(100vw - 56px), 320px);
    flex-basis: auto;
    height: 100dvh;
    min-height: 100dvh;
    max-height: 100dvh;
    padding: max(20px, env(safe-area-inset-top)) 16px max(20px, env(safe-area-inset-bottom));
    box-shadow: 14px 0 32px rgba(8, 42, 29, .2);
  }
  .sidebar.is-open {
    transform: translateX(0);
  }
}

@media (max-width: 420px) {
  .sidebar {
    width: calc(100vw - 32px);
    padding-left: 14px;
    padding-right: 14px;
  }
  .brand {
    font-size: 17px;
  }
  .nav-item {
    padding: 12px 11px;
  }
}
</style>
