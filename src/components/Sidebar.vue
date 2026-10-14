<script setup lang="ts">
import { LogOut, Package } from 'lucide-vue-next'
import type { Component } from 'vue'

type View = 'dashboard' | 'catalogo' | 'nuevo-catalogo' | 'inventario' | 'combos' | 'pedidos' | 'clientes' | 'proveedores' | 'usuarios' | 'etiquetas'

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
  <aside class="sidebar" :class="{ 'is-open': props.mobileOpen, 'is-admin': props.isSuperadmin }">
    <div class="brand space-x-3">
      <span class="brand-mark"><Package :size="20" /></span>
      <span>CatalogoZone</span>
    </div>

    <nav>
      <button
        v-for="item in props.items"
        :key="item.id"
        class="nav-item"
        :class="{ active: props.activeView === item.id }"
        @click="emit('select', item.id)"
      >
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
  width: 224px;
  flex: 0 0 224px;
  height: 100vh;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--sidebar-border);
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
  gap: 0;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  letter-spacing: -0.5px;
  font-size: 19px;
  color: var(--sidebar-text);
}
.brand-mark {
  width: 36px;
  height: 36px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  background: var(--accent);
  color: var(--sidebar-active-text);
}
.nav-item {
  width: 100%;
  min-height: 48px;
  border: 0;
  background: transparent;
  color: var(--sidebar-text);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 12px;
  border-radius: 12px;
  font-weight: 600;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
  transition: background .18s ease, color .18s ease;
}
.nav-item > span {
  display: block;
  min-width: 0;
}
.nav-item:hover {
  background: var(--sidebar-hover);
  color: var(--sidebar-text);
}
.nav-item.active {
  background: var(--sidebar-active-bg);
  color: var(--sidebar-active-text);
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
  background: var(--accent-soft);
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
  color: var(--ink);
  cursor: pointer;
  transition: background .18s ease, color .18s ease;
}
.btn.logout:hover {
  background: var(--accent);
  color: #fff;
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
.sidebar.is-admin {
  gap: 12px;
  padding: 14px 14px;
}
.sidebar.is-admin .brand {
  gap: 10px;
  font-size: 17px;
}
.sidebar.is-admin .brand-mark {
  width: 32px;
  height: 32px;
}
.sidebar.is-admin nav {
  gap: 2px;
}
.sidebar.is-admin .nav-item {
  min-height: 40px;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  font-size: 13px;
}
.sidebar.is-admin .sidebar-bottom {
  gap: 8px;
}
.sidebar.is-admin .btn.logout {
  min-height: 40px;
  padding-top: 8px;
  padding-bottom: 8px;
}
@media (max-width: 920px) {
  .sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    transform: translateX(-105%);
    z-index: 30;
    transition: transform 0.2s ease;
    width: min(calc(100vw - 40px), 264px);
    flex-basis: auto;
    height: 100dvh;
    min-height: 100dvh;
    max-height: 100dvh;
    padding: max(20px, env(safe-area-inset-top)) 16px max(20px, env(safe-area-inset-bottom));
    box-shadow: 14px 0 32px rgba(0, 0, 0, .2);
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
  .sidebar.is-admin {
    gap: 12px;
    padding-top: max(14px, env(safe-area-inset-top));
    padding-bottom: max(14px, env(safe-area-inset-bottom));
  }
  .sidebar.is-admin .nav-item {
    min-height: 40px;
    padding: 8px 10px;
  }
}
</style>
