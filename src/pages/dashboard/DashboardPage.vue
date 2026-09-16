<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  Boxes,
  ClipboardList,
  LayoutDashboard,
  Menu,
  Package,
  ShoppingBag,
  ShoppingCart,
  Store,
  Truck,
  Users,
  X,
} from 'lucide-vue-next'
import Sidebar from '../../components/Sidebar.vue'
import UserProfileModal from '../../components/UserProfileModal.vue'
import { api, clearCredentials, currentUsername, type Catalogo, type Producto, type Variante } from '../../api'

type View = 'dashboard' | 'catalogo' | 'inventario' | 'pedidos' | 'compras' | 'clientes' | 'proveedores' | 'usuarios'

const props = defineProps<{
  products: Producto[]
  variants: Variante[]
  catalogs: Catalogo[]
}>()

const emit = defineEmits<{
  (e: 'logout'): void
}>()

const activeView = ref<View>('dashboard')
const mobileOpen = ref(false)
const profileVisible = ref(false)
const username = ref(currentUsername() || 'Administrador')

const profile = ref({
  nombreUsuario: username.value,
  nombre: 'Administrador',
  apellido: '',
  correo: '',
  telefono: '',
  fotoPerfil: '',
})

const items = [
  { id: 'dashboard' as View, label: 'Resumen', icon: LayoutDashboard },
  { id: 'catalogo' as View, label: 'Catálogos', icon: Store },
  { id: 'inventario' as View, label: 'Inventario', icon: Boxes },
  { id: 'pedidos' as View, label: 'Pedidos', icon: ClipboardList },
  { id: 'compras' as View, label: 'Compras', icon: ShoppingCart },
  { id: 'clientes' as View, label: 'Clientes', icon: Users },
  { id: 'proveedores' as View, label: 'Proveedores', icon: Truck },
]

const totalProducts = computed(() => props.products.length)
const totalVariants = computed(() => props.variants.length)
const activeCatalogs = computed(() => props.catalogs.filter((catalog) => catalog.activo).length)
const lowStock = computed(() => props.variants.filter((variant) => variant.existencia <= variant.existenciaMinima).length)
const recentCatalogs = computed(() => props.catalogs.slice(0, 5))
const pageTitle = computed(() => items.find((item) => item.id === activeView.value)?.label || 'Resumen')

watch(mobileOpen, (isOpen) => {
  document.body.style.overflow = isOpen ? 'hidden' : ''
})

function selectView(view: View) {
  activeView.value = view
  mobileOpen.value = false
}

function openProfile() {
  profileVisible.value = true
}

function closeProfile() {
  profileVisible.value = false
}

function saveProfile() {
  username.value = profile.value.nombreUsuario || username.value
  profileVisible.value = false
}

function logout() {
  clearCredentials()
  emit('logout')
}

onMounted(async () => {
  try {
    const user = await api.me<{
      username?: string
      nombre?: string
      apellido?: string
      correo?: string
      wapp?: string
      urlFotoPerfil?: string
    }>()

    profile.value = {
      nombreUsuario: user.username || profile.value.nombreUsuario,
      nombre: user.nombre || profile.value.nombre,
      apellido: user.apellido || '',
      correo: user.correo || '',
      telefono: user.wapp || '',
      fotoPerfil: user.urlFotoPerfil || '',
    }
    username.value = profile.value.nombreUsuario
  } catch {
    // Keep the dashboard usable when the profile request is unavailable.
  }
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
})
</script>

<template>
  <div class="dashboard-shell">
    <div v-if="mobileOpen" class="sidebar-backdrop" @click="mobileOpen = false"></div>

    <Sidebar
      :items="items"
      :active-view="activeView"
      :username="username"
      :is-superadmin="true"
      :mobile-open="mobileOpen"
      @select="selectView"
      @toggle-mobile="mobileOpen = !mobileOpen"
      @open-profile="openProfile"
      @logout="logout"
    />

    <main class="dashboard-main">
      <header class="topbar">
        <button class="mobile-menu" type="button" aria-label="Abrir menú" @click="mobileOpen = true">
          <Menu :size="20" />
        </button>
        <div>
          <span class="breadcrumb">MI NEGOCIO / {{ pageTitle.toUpperCase() }}</span>
          <h1>{{ pageTitle }}</h1>
        </div>
        <button class="top-profile" type="button" @click="openProfile">
          <span class="top-avatar">{{ username.slice(0, 1).toUpperCase() }}</span>
          <span class="top-profile-copy">
            <strong>{{ username }}</strong>
            <small>Cuenta activa</small>
          </span>
        </button>
      </header>

      <section v-if="activeView === 'dashboard'" class="dashboard-content">
        <div class="welcome-row">
          <div>
            <p class="eyebrow">Panel de control</p>
            <h2>Buenos días, {{ profile.nombre || username }}.</h2>
            <p class="muted">Aquí tienes una vista rápida de la operación de tu negocio.</p>
          </div>
          <button class="primary-action" type="button" @click="selectView('catalogo')">
            <Store :size="17" />
            Gestionar catálogos
          </button>
        </div>

        <div class="metric-grid">
          <article class="metric-card metric-green"><div class="metric-icon"><Package :size="20" /></div><span>Productos</span><strong>{{ totalProducts }}</strong><small>Registrados en el sistema</small></article>
          <article class="metric-card metric-gold"><div class="metric-icon"><ShoppingBag :size="20" /></div><span>Variantes</span><strong>{{ totalVariants }}</strong><small>Disponibles para vender</small></article>
          <article class="metric-card metric-blue"><div class="metric-icon"><Store :size="20" /></div><span>Catálogos activos</span><strong>{{ activeCatalogs }}</strong><small>Publicados actualmente</small></article>
          <article class="metric-card metric-coral"><div class="metric-icon"><ShoppingCart :size="20" /></div><span>Stock bajo</span><strong>{{ lowStock }}</strong><small>Requieren atención</small></article>
        </div>

        <div class="content-grid">
          <section class="dashboard-panel catalog-panel">
            <div class="panel-heading"><div><p class="eyebrow">Inventario público</p><h3>Catálogos recientes</h3></div><button class="text-action" type="button" @click="selectView('catalogo')">Ver todos</button></div>
            <div v-if="recentCatalogs.length" class="catalog-list">
              <div v-for="catalog in recentCatalogs" :key="catalog.id ?? catalog.nombre" class="catalog-row">
                <span class="catalog-icon"><Store :size="17" /></span>
                <div><strong>{{ catalog.nombre }}</strong><small>{{ catalog.descripcion || 'Sin descripción disponible' }}</small></div>
                <span class="status" :class="catalog.activo ? 'status-on' : 'status-off'">{{ catalog.activo ? 'Activo' : 'Inactivo' }}</span>
              </div>
            </div>
            <div v-else class="empty-state"><Store :size="24" /><p>Aún no hay catálogos para mostrar.</p></div>
          </section>

          <section class="dashboard-panel quick-panel">
            <div class="panel-heading"><div><p class="eyebrow">Accesos rápidos</p><h3>Acciones frecuentes</h3></div></div>
            <button class="quick-action" type="button" @click="selectView('inventario')"><span class="quick-icon green"><Boxes :size="18" /></span><span><strong>Revisar inventario</strong><small>Consulta existencias y alertas</small></span><span class="arrow">→</span></button>
            <button class="quick-action" type="button" @click="selectView('pedidos')"><span class="quick-icon gold"><ClipboardList :size="18" /></span><span><strong>Gestionar pedidos</strong><small>Revisa el estado de tus ventas</small></span><span class="arrow">→</span></button>
            <button class="quick-action" type="button" @click="openProfile"><span class="quick-icon blue"><Users :size="18" /></span><span><strong>Actualizar perfil</strong><small>Mantén tus datos al día</small></span><span class="arrow">→</span></button>
          </section>
        </div>
      </section>

      <section v-else class="placeholder-view">
        <div class="placeholder-icon"><X :size="22" /></div>
        <p class="eyebrow">Módulo seleccionado</p>
        <h2>{{ pageTitle }}</h2>
        <p class="muted">La navegación ya está preparada para conectar este módulo con sus operaciones.</p>
        <button class="primary-action" type="button" @click="selectView('dashboard')"><LayoutDashboard :size="17" />Volver al resumen</button>
      </section>
    </main>

    <UserProfileModal
      :visible="profileVisible"
      :form="profile"
      @close="closeProfile"
      @save="saveProfile"
      @update:nombre-usuario="profile.nombreUsuario = $event"
      @update:nombre="profile.nombre = $event"
      @update:apellido="profile.apellido = $event"
      @update:correo="profile.correo = $event"
      @update:telefono="profile.telefono = $event"
      @update:foto-perfil="profile.fotoPerfil = $event"
    />
  </div>
</template>

<style scoped>
:global(*) { box-sizing: border-box; }
:global(body) { margin: 0; font-family: Arial, sans-serif; background: #f7f8f4; color: #17332a; }
.dashboard-shell { min-height: 100vh; display: flex; background: #f7f8f4; }
.dashboard-main { min-width: 0; flex: 1; margin-left: 260px; padding: 0 4.5% 42px; }
.topbar { min-height: 92px; display: flex; align-items: center; justify-content: space-between; gap: 24px; border-bottom: 1px solid #e7ebe4; }
.breadcrumb, .eyebrow { color: #6c8175; font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
.topbar h1 { margin: 7px 0 0; font: 700 28px 'Space Grotesk', Arial, sans-serif; letter-spacing: -.7px; }
.top-profile { display: flex; align-items: center; gap: 10px; border: 0; background: transparent; color: inherit; cursor: pointer; text-align: left; }
.top-avatar, .avatar { display: grid; place-items: center; border-radius: 50%; background: #d9f0df; color: #1b654a; font-weight: 800; }
.top-avatar { width: 40px; height: 40px; }
.top-profile-copy { display: grid; gap: 3px; }
.top-profile-copy small, .muted { color: #75847b; }
.mobile-menu { display: none; border: 1px solid #e1e8e1; background: #fff; color: #17332a; border-radius: 10px; padding: 9px; }
.dashboard-content { padding-top: 34px; }
.welcome-row { display: flex; justify-content: space-between; align-items: end; gap: 24px; margin-bottom: 28px; }
.welcome-row h2, .placeholder-view h2 { margin: 8px 0 7px; font: 700 clamp(26px, 3vw, 38px) 'Space Grotesk', Arial, sans-serif; letter-spacing: -.9px; }
.welcome-row p { margin: 0; }
.primary-action { display: inline-flex; align-items: center; gap: 8px; border: 0; border-radius: 10px; background: #1a5f47; color: #fff; padding: 12px 15px; font-weight: 700; cursor: pointer; white-space: nowrap; }
.primary-action:hover { background: #124937; }
.metric-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
.metric-card { min-height: 170px; padding: 20px; border: 1px solid #e3e9e2; border-radius: 16px; background: #fff; display: flex; flex-direction: column; gap: 7px; box-shadow: 0 5px 18px rgba(35, 63, 49, .035); }
.metric-card > span { color: #65776d; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; }
.metric-card strong { margin-top: 3px; color: #17332a; font-size: 34px; line-height: 1; }
.metric-card small { color: #839087; font-size: 12px; }
.metric-icon { width: 38px; height: 38px; display: grid; place-items: center; border-radius: 11px; margin-bottom: 5px; }
.metric-green .metric-icon, .quick-icon.green { background: #e2f2e6; color: #28704e; }
.metric-gold .metric-icon, .quick-icon.gold { background: #fff1cf; color: #98701d; }
.metric-blue .metric-icon, .quick-icon.blue { background: #e3edf6; color: #3e6c91; }
.metric-coral .metric-icon { background: #f9e4df; color: #a8584e; }
.content-grid { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(290px, .65fr); gap: 18px; margin-top: 18px; }
.dashboard-panel { min-width: 0; padding: 22px; border: 1px solid #e3e9e2; border-radius: 16px; background: #fff; }
.panel-heading { display: flex; align-items: start; justify-content: space-between; gap: 15px; margin-bottom: 18px; }
.panel-heading h3 { margin: 7px 0 0; font: 700 20px 'Space Grotesk', Arial, sans-serif; }
.text-action { border: 0; background: transparent; color: #1a7655; font-weight: 700; cursor: pointer; padding: 3px 0; }
.catalog-list { display: grid; gap: 3px; }
.catalog-row { display: flex; align-items: center; gap: 12px; padding: 12px 4px; border-bottom: 1px solid #edf1ed; }
.catalog-row:last-child { border-bottom: 0; }
.catalog-icon { width: 36px; height: 36px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 10px; background: #edf4ef; color: #267253; }
.catalog-row > div { min-width: 0; flex: 1; display: grid; gap: 4px; }
.catalog-row strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.catalog-row small { overflow: hidden; color: #849087; text-overflow: ellipsis; white-space: nowrap; }
.status { padding: 5px 8px; border-radius: 999px; font-size: 11px; font-weight: 800; }
.status-on { background: #e1f3e6; color: #27714d; }
.status-off { background: #f6e5e1; color: #985149; }
.quick-panel { display: flex; flex-direction: column; }
.quick-action { display: flex; align-items: center; gap: 11px; width: 100%; padding: 12px 0; border: 0; border-top: 1px solid #edf1ed; background: transparent; color: inherit; text-align: left; cursor: pointer; }
.quick-action > span:nth-child(2) { min-width: 0; flex: 1; display: grid; gap: 4px; }
.quick-action small { color: #849087; font-size: 12px; }
.quick-icon { width: 35px; height: 35px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 10px; }
.arrow { color: #8a9990; font-size: 20px; }
.empty-state { display: grid; place-items: center; gap: 8px; min-height: 150px; color: #809087; text-align: center; }
.empty-state p { margin: 0; }
.placeholder-view { min-height: calc(100vh - 140px); display: grid; place-content: center; justify-items: center; text-align: center; }
.placeholder-view .muted { max-width: 400px; margin: 0 0 20px; line-height: 1.55; }
.placeholder-icon { width: 48px; height: 48px; display: grid; place-items: center; border-radius: 14px; background: #e6f0eb; color: #247050; }
.sidebar-backdrop { display: none; }
@media (max-width: 1100px) { .metric-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 920px) { .mobile-menu { display: grid; } .sidebar-backdrop { display: block; position: fixed; inset: 0; z-index: 20; background: rgba(19, 35, 29, .32); } .dashboard-main { margin-left: 0; padding: 0 5% 32px; } .top-profile-copy { display: none; } }
@media (max-width: 680px) { .topbar { min-height: 78px; gap: 12px; } .topbar h1 { font-size: 23px; } .welcome-row { display: grid; align-items: start; } .primary-action { justify-content: center; } .metric-grid, .content-grid { grid-template-columns: 1fr; } .dashboard-panel { padding: 18px; } .catalog-row small { max-width: 145px; } }
</style>
