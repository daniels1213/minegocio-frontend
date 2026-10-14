<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  Boxes,
  ClipboardList,
  LayoutDashboard,
  Layers,
  Menu,
  Package,
  RefreshCw,
  ShoppingBag,
  Store,
  Tag,
  Truck,
  Users,
  UserCog,
  AlertTriangle,
} from 'lucide-vue-next'
import Sidebar from '../components/Sidebar.vue'
import UserProfileModal from '../components/UserProfileModal.vue'
import MisCatalogosPage from './MisCatalogosPage.vue'
import InventarioPage from './InventarioPage.vue'
import CombosPage from './CombosPage.vue'
import PedidosPage from './PedidosPage.vue'
import ClientesPage from './ClientesPage.vue'
import ProveedoresPage from './ProveedoresPage.vue'
import NuevoCatalogoPage from './NuevoCatalogoPage.vue'
import UsuariosPage from './UsuariosPage.vue'
import EtiquetasPage from './EtiquetasPage.vue'
import { api, clearCredentials, currentUsername, type Catalogo, type Pedido, type Producto, type Usuario, type Variante } from '../api.ts'

type View = 'dashboard' | 'catalogo' | 'nuevo-catalogo' | 'inventario' | 'combos' | 'pedidos' | 'clientes' | 'proveedores' | 'usuarios' | 'etiquetas'

const props = defineProps<{
  products: Producto[]
  variants: Variante[]
  catalogs: Catalogo[]
}>()

const emit = defineEmits<{
  (e: 'logout'): void
}>()

const activeView = ref<View>('dashboard')
const catalogToEdit = ref<Catalogo | null>(null)
const catalogFormVisible = ref(false)
const catalogRefreshKey = ref(0)
const mobileOpen = ref(false)
const profileVisible = ref(false)
const dashboardMode = ref<'personal' | 'general'>('personal')
const tabPersonal = ref<HTMLButtonElement | null>(null)
const tabGeneral = ref<HTMLButtonElement | null>(null)

const indicatorStyle = computed(() => {
  const activeTab = dashboardMode.value === 'personal' ? tabPersonal.value : tabGeneral.value
  if (!activeTab) return { width: '0px', transform: 'translateX(0px)' }
  return {
    width: `${activeTab.offsetWidth}px`,
    transform: `translateX(${activeTab.offsetLeft}px)`
  }
})
const adminUsers = ref<Usuario[]>([])
const adminCatalogs = ref<Catalogo[]>([])
const adminSummaryLoading = ref(false)
const adminSummaryError = ref('')
const username = ref(currentUsername() || 'Administrador')

const profile = ref({
  id: 0,
  nombreUsuario: username.value,
  nombre: 'Administrador',
  apellido: '',
  correo: '',
  telefono: '',
  fotoPerfil: '',
  rol: 'USER' as 'USER' | 'ADMIN',
})

const dashboardProducts = ref<Producto[]>(props.products)
const dashboardVariants = ref<Variante[]>(props.variants)
const dashboardCatalogs = ref<Catalogo[]>(props.catalogs)
const pendingOrders = ref<number>(0)

const baseItems = [
  { id: 'dashboard' as View, label: 'Resumen', icon: LayoutDashboard },
  { id: 'catalogo' as View, label: 'Catálogos', icon: Store },
  { id: 'inventario' as View, label: 'Inventario', icon: Boxes },
  { id: 'combos' as View, label: 'Combos', icon: Layers },
  { id: 'pedidos' as View, label: 'Pedidos', icon: ClipboardList },
  { id: 'clientes' as View, label: 'Clientes', icon: Users },
  { id: 'proveedores' as View, label: 'Proveedores', icon: Truck },
]
const items = computed(() => profile.value.rol === 'ADMIN'
  ? [...baseItems, { id: 'usuarios' as View, label: 'Usuarios', icon: UserCog }, { id: 'etiquetas' as View, label: 'Etiquetas', icon: Tag }]
  : baseItems)

const totalProducts = computed(() => dashboardProducts.value.length)
const productsWithVariantsPersonal = computed(() => new Set(dashboardVariants.value.map((v) => v.productoId)).size)
const activeCatalogs = computed(() => dashboardCatalogs.value.filter((catalog) => catalog.activo !== false).length)
const lowStock = computed(() => dashboardProducts.value.filter((p) => (p.stockActual ?? 0) < 5).length)
const recentCatalogs = computed(() => dashboardCatalogs.value.slice(0, 5))
const usersWithMultipleCatalogs = computed(() => {
  const counts = new Map<number, number>()
  for (const catalog of adminCatalogs.value) {
    if (catalog.usuarioId !== undefined) counts.set(catalog.usuarioId, (counts.get(catalog.usuarioId) || 0) + 1)
  }
  return Array.from(counts.values()).filter((count) => count > 1).length
})
const pageTitle = computed(() => items.value.find((item) => item.id === activeView.value)?.label || 'Resumen')
const pageComponents = {
  catalogo: MisCatalogosPage,
  'nuevo-catalogo': NuevoCatalogoPage,
  inventario: InventarioPage,
  combos: CombosPage,
  pedidos: PedidosPage,
  clientes: ClientesPage,
  proveedores: ProveedoresPage,
  usuarios: UsuariosPage,
  etiquetas: EtiquetasPage,
} as const
const currentPage = computed(() => pageComponents[activeView.value as keyof typeof pageComponents])

const viewPaths: Record<View, string> = {
  dashboard: '/dashboard',
  catalogo: '/mis-catalogos',
  'nuevo-catalogo': '/mis-catalogos/nuevo',
  inventario: '/inventario',
  combos: '/combos',
  pedidos: '/pedidos',
  clientes: '/clientes',
  proveedores: '/proveedores',
  usuarios: '/usuarios',
  etiquetas: '/etiquetas',
}

function viewFromPath(path: string): View {
  const entry = Object.entries(viewPaths).find(([, viewPath]) => viewPath === path)
  return (entry?.[0] as View | undefined) || 'dashboard'
}

function syncLocation() {
  const requestedView = viewFromPath(window.location.pathname)
  if (requestedView === 'nuevo-catalogo') {
    activeView.value = 'catalogo'
    catalogToEdit.value = null
    catalogFormVisible.value = true
    return
  }

  activeView.value = requestedView
  catalogFormVisible.value = false
}

watch(
  [mobileOpen, profileVisible],
  ([mobileIsOpen, profileIsOpen]) => {
    document.body.style.overflow =
      mobileIsOpen || profileIsOpen ? 'hidden' : ''
  }
)

function selectView(view: View) {
  activeView.value = view
  mobileOpen.value = false
  window.history.pushState({}, '', viewPaths[view])
}

function createCatalog() {
  catalogToEdit.value = null
  catalogFormVisible.value = true
  if (activeView.value !== 'catalogo') selectView('catalogo')
}

function editCatalog(catalog: Catalogo) {
  catalogToEdit.value = catalog
  catalogFormVisible.value = true
  if (activeView.value !== 'catalogo') selectView('catalogo')
}

function catalogSaved() {
  catalogFormVisible.value = false
  catalogToEdit.value = null
  catalogRefreshKey.value += 1
  selectView('catalogo')
}

function closeCatalogForm() {
  catalogFormVisible.value = false
  catalogToEdit.value = null
}

function openProfile() {
  profileVisible.value = true
}

function closeProfile() {
  profileVisible.value = false
}

async function saveProfile(password?: { current: string; next: string }) {
  if (!profile.value.id) return

  await api.update('usuarios', profile.value.id, {
    nombre: profile.value.nombre,
    wapp: profile.value.telefono,
    urlFotoPerfil: profile.value.fotoPerfil,
  })

  if (password) {
    await api.changePassword(profile.value.id, {
      passwordActual: password.current,
      nuevaPassword: password.next,
    })
  }

  username.value = profile.value.nombreUsuario || username.value
  profileVisible.value = false
}

function logout() {
  clearCredentials()
  emit('logout')
}

async function loadAdminSummary() {
  adminSummaryLoading.value = true
  adminSummaryError.value = ''
  try {
    const [users, catalogs, products] = await Promise.all([
      api.list<Usuario>('usuarios/all'),
      api.catalogosTodos<Catalogo>(),
      api.list<Producto>('productos').catch(() => []),
    ])
    adminUsers.value = users
    adminCatalogs.value = catalogs
    adminProducts.value = products

    // Fetch variants for each product
    if (products.length > 0) {
      const variantsResults = await Promise.allSettled(
        products.map((p) => api.variantesProducto<Variante>(p.id!).catch(() => []))
      )
      const allVariants: Variante[] = []
      for (const result of variantsResults) {
        if (result.status === 'fulfilled') allVariants.push(...result.value)
      }
      adminVariants.value = allVariants
    } else {
      adminVariants.value = []
    }
  } catch (reason) {
    adminSummaryError.value = reason instanceof Error ? reason.message : 'No se pudo cargar el resumen general.'
  } finally {
    adminSummaryLoading.value = false
  }
}

const adminProducts = ref<Producto[]>([])
const adminVariants = ref<Variante[]>([])
const productsWithVariants = computed(() => new Set(adminVariants.value.map((v) => v.productoId)).size)

async function loadDashboardData(userId: number) {
  try {
    const [catalogs, products, orders] = await Promise.all([
      api.catalogosUsuario<Catalogo>(userId),
      api.list<Producto>('productos').catch(() => []),
      api.list<Pedido>('pedidos').catch(() => []),
    ])
    dashboardCatalogs.value = catalogs
    dashboardProducts.value = products
    pendingOrders.value = orders.filter((o) => o.estado === 'PENDIENTE').length

    // Fetch variants for each product
    if (products.length > 0) {
      const variantsResults = await Promise.allSettled(
        products.map((p) => api.variantesProducto<Variante>(p.id!).catch(() => []))
      )
      const allVariants: Variante[] = []
      for (const result of variantsResults) {
        if (result.status === 'fulfilled') allVariants.push(...result.value)
      }
      dashboardVariants.value = allVariants
    } else {
      dashboardVariants.value = []
    }
  } catch {
    // Keep dashboard usable
  }
}

onMounted(async () => {
  syncLocation()
  window.addEventListener('popstate', handlePopState)

  try {
    const user = await api.me<{
      id: number
      username?: string
      nombre?: string
      apellido?: string
      correo?: string
      wapp?: string
      urlFotoPerfil?: string
      rol?: 'USER' | 'ADMIN'
    }>()

    profile.value = {
      id: user.id,
      nombreUsuario: user.username || profile.value.nombreUsuario,
      nombre: user.nombre || profile.value.nombre,
      apellido: user.apellido || '',
      correo: user.correo || '',
      telefono: user.wapp || '',
      fotoPerfil: user.urlFotoPerfil || '',
      rol: user.rol || 'USER',
    }
    username.value = profile.value.nombreUsuario
    await loadDashboardData(profile.value.id)
    if (profile.value.rol === 'ADMIN') await loadAdminSummary()
  } catch {
    // Keep the dashboard usable when the profile request is unavailable.
  }
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  window.removeEventListener('popstate', handlePopState)
})

function handlePopState() {
  syncLocation()
}
</script>

<template>
  <div class="dashboard-shell">
    <div v-if="mobileOpen" class="sidebar-backdrop" @click="mobileOpen = false"></div>

    <Sidebar
      :items="items"
      :active-view="activeView"
      :username="username"
      :is-superadmin="profile.rol === 'ADMIN'"
      :mobile-open="mobileOpen"
      @select="selectView"
      @toggle-mobile="mobileOpen = !mobileOpen"
      @open-profile="openProfile"
      @logout="logout"
    />

    <main class="dashboard-main overflow-y-auto ">
      <header class="topbar">
        <button class="mobile-menu" type="button" aria-label="Abrir menú" @click="mobileOpen = true">
          <Menu :size="20" />
        </button>
        <div>
          <span class="breadcrumb">CatalogoZone / {{ pageTitle.toUpperCase() }}</span>
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
        <div v-if="profile.rol === 'ADMIN'" class="dashboard-tabs" role="tablist" aria-label="Tipo de resumen" ref="tabsContainer">
          <button type="button" role="tab" :aria-selected="dashboardMode === 'personal'" :class="{ active: dashboardMode === 'personal' }" @click="dashboardMode = 'personal'" ref="tabPersonal">Resumen personal</button>
          <button type="button" role="tab" :aria-selected="dashboardMode === 'general'" :class="{ active: dashboardMode === 'general' }" @click="dashboardMode = 'general'" ref="tabGeneral">Resumen general</button>
          <span class="tab-indicator" :style="indicatorStyle"></span>
        </div>
        <template v-if="profile.rol !== 'ADMIN' || dashboardMode === 'personal'">
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
          <article class="metric-card metric-gold"><div class="metric-icon"><ShoppingBag :size="20" /></div><span>Productos con variantes</span><strong>{{ productsWithVariantsPersonal }}</strong><small>Productos que tienen al menos una variante</small></article>
          <article class="metric-card metric-blue"><div class="metric-icon"><Store :size="20" /></div><span>Catálogos activos</span><strong>{{ activeCatalogs }}</strong><small>Publicados actualmente</small></article>
          <article class="metric-card metric-coral"><div class="metric-icon"><AlertTriangle :size="20" /></div><span>Stock bajo (< 5)</span><strong>{{ lowStock }}</strong><small>Requieren atención</small></article>
          <article class="metric-card metric-blue"><div class="metric-icon"><ClipboardList :size="20" /></div><span>Pedidos pendientes</span><strong>{{ pendingOrders }}</strong><small>Esperan confirmación</small></article>
        </div>

        <div class="content-grid">
          <section class="dashboard-panel catalog-panel">
            <div class="panel-heading"><div><p class="eyebrow">Inventario público</p><h3>Catálogos recientes</h3></div><button class="text-action" type="button" @click="selectView('catalogo')">Ver todos</button></div>
            <div v-if="recentCatalogs.length" class="catalog-list">
              <div v-for="catalog in recentCatalogs" :key="catalog.id ?? catalog.nombre" class="catalog-row">
                <span class="catalog-icon"><Store :size="17" /></span>
                <div><strong>{{ catalog.nombre }}</strong><small>{{ catalog.descripcion || 'Sin descripción disponible' }}</small></div>
                <span class="status" :class="catalog.activo === false ? 'status-off' : 'status-on'">{{ catalog.activo === false ? 'Inactivo' : 'Activo' }}</span>
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
        </template>
        <section v-else class="admin-summary">
          <div class="welcome-row">
            <div>
              <p class="eyebrow">Administración del sistema</p>
              <h2>Resumen general</h2>
              <p class="muted">Una vista de usuarios y catálogos de todo el sistema.</p>
            </div>
            <button class="primary-action" type="button" :disabled="adminSummaryLoading" @click="loadAdminSummary">
              <RefreshCw :size="17" :class="{ spin: adminSummaryLoading }" />
              Actualizar
            </button>
          </div>
          <p v-if="adminSummaryError" class="admin-summary-error">{{ adminSummaryError }}</p>
          <div v-if="adminSummaryLoading && !adminUsers.length" class="dashboard-panel admin-summary-state">Cargando resumen general...</div>
          <div v-else class="metric-grid admin-metric-grid">
            <article class="metric-card metric-blue"><div class="metric-icon"><Users :size="20" /></div><span>Usuarios del sistema</span><strong>{{ adminUsers.length }}</strong><small>Cuentas registradas</small></article>
            <article class="metric-card metric-gold"><div class="metric-icon"><Store :size="20" /></div><span>Usuarios con varios catálogos</span><strong>{{ usersWithMultipleCatalogs }}</strong><small>Usuarios con más de un catálogo</small></article>
            <article class="metric-card metric-green"><div class="metric-icon"><Store :size="20" /></div><span>Catálogos del sistema</span><strong>{{ adminCatalogs.length }}</strong><small>Catálogos registrados</small></article>
            <article class="metric-card metric-green"><div class="metric-icon"><Package :size="20" /></div><span>Productos totales</span><strong>{{ adminProducts.length }}</strong><small>En todo el sistema</small></article>
            <article class="metric-card metric-gold"><div class="metric-icon"><ShoppingBag :size="20" /></div><span>Productos con variantes</span><strong>{{ productsWithVariants }}</strong><small>Productos que tienen al menos una variante</small></article>
          </div>
        </section>
      </section>

      <component
        :is="currentPage"
        v-else
        :usuario-id="profile.id"
        :is-admin="profile.rol === 'ADMIN'"
        :refresh-key="catalogRefreshKey"
        :catalog="activeView === 'nuevo-catalogo' ? catalogToEdit || undefined : undefined"
        @create="createCatalog"
        @edit="editCatalog"
        @cancel="selectView('catalogo')"
        @created="catalogSaved"
      />

      <NuevoCatalogoPage
        v-if="catalogFormVisible && activeView === 'catalogo'"
        :usuario-id="profile.id"
        :is-admin="profile.rol === 'ADMIN'"
        :catalog="catalogToEdit || undefined"
        @cancel="closeCatalogForm"
        @created="catalogSaved"
      />
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
/* ========================================
   CONFIGURACIÓN GENERAL
======================================== */

:global(*) {
	box-sizing: border-box;
}

:global(html) {
	min-width: 320px;
}

:global(body) {
	margin: 0;
	font-family: Arial, sans-serif;
	background: #f7f8f4;
	color: #171717;
}

:global(button),
:global(input),
:global(select),
:global(textarea) {
	font: inherit;
}

.dashboard-shell {
	display: flex;
	min-height: 100vh;
	background: #f7f8f4;
}

.dashboard-main {
	flex: 1;
	min-width: 0;
	width: calc(100% - 224px);
	margin-left: 224px;
	padding: 0 clamp(20px, 3vw, 44px) 42px;
	overflow-x: clip;
}

.dashboard-content,
.admin-summary,
.content-grid,
.dashboard-panel {
	min-width: 0;
	max-width: 100%;
}

/* ========================================
   BARRA SUPERIOR
======================================== */

.topbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 20px;
	min-height: 92px;
	border-bottom: 1px solid #e8e8e8;
}

.topbar > div {
	min-width: 0;
	flex: 1;
}

.breadcrumb,
.eyebrow {
	color: #777;
	font-size: 11px;
	font-weight: 800;
	letter-spacing: 0.12em;
	text-transform: uppercase;
}

.breadcrumb {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.topbar h1 {
	margin: 7px 0 0;
	color: #171717;
	font: 700 28px 'Space Grotesk', Arial, sans-serif;
	letter-spacing: -0.7px;
	overflow-wrap: anywhere;
}

.top-profile {
	display: flex;
	align-items: center;
	gap: 10px;
	flex-shrink: 0;
	padding: 5px;
	border: 0;
	border-radius: 10px;
	background: transparent;
	color: inherit;
	cursor: pointer;
	text-align: left;
}

.top-profile:hover {
	background: #efefeb;
}

.top-avatar,
.avatar {
	display: grid;
	place-items: center;
	flex-shrink: 0;
	border-radius: 50%;
	background: #fff6f0;
	color: #c65b19;
	font-weight: 800;
}

.top-avatar {
	width: 40px;
	height: 40px;
}

.top-profile-copy {
	display: grid;
	gap: 3px;
	min-width: 0;
}

.top-profile-copy strong {
	max-width: 150px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.top-profile-copy small,
.muted {
	color: #777;
}

.mobile-menu {
	display: none;
	flex-shrink: 0;
	place-items: center;
	width: 40px;
	height: 40px;
	padding: 0;
	border: 1px solid #e8e8e8;
	border-radius: 10px;
	background: #fff;
	color: #171717;
	cursor: pointer;
}

.mobile-menu:hover {
	background: #f2f2ef;
}

/* ========================================
   CONTENIDO DEL DASHBOARD
======================================== */

.dashboard-content {
	padding-top: 34px;
}

.dashboard-tabs {
	position: relative;
	display: flex;
	width: fit-content;
	max-width: 100%;
	margin-bottom: 26px;
	padding: 3px;
	border: 1px solid #e8e8e8;
	border-radius: 10px;
	background: #fff;
}

.dashboard-tabs button {
	position: relative;
	z-index: 1;
	padding: 10px 16px;
	border: 0;
	border-radius: 8px;
	background: transparent;
	color: #777;
	font-size: 13px;
	font-weight: 700;
	white-space: nowrap;
	cursor: pointer;
}

.dashboard-tabs button.active {
	color: #fff;
}

.dashboard-tabs .tab-indicator {
	position: absolute;
	z-index: 0;
	top: 3px;
	left: 3px;
	height: calc(100% - 6px);
	border-radius: 7px;
	background: #171717;
	box-shadow: 0 2px 8px rgb(0 0 0 / 10%);
	transition:
		width 0.3s ease,
		transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.admin-summary-error {
	margin: 0 0 16px;
	color: #a8584e;
	overflow-wrap: anywhere;
}

.admin-summary-state {
	display: grid;
	min-height: 140px;
	place-items: center;
	color: #777;
}

/* ========================================
   BIENVENIDA
======================================== */

.welcome-row {
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	gap: 24px;
	margin-bottom: 28px;
}

.welcome-row > div {
	min-width: 0;
}

.welcome-row .eyebrow {
	margin: 0;
}

.welcome-row h2,
.placeholder-view h2 {
	margin: 8px 0 7px;
	color: #171717;
	font: 700 clamp(26px, 3vw, 38px) 'Space Grotesk', Arial, sans-serif;
	letter-spacing: -0.9px;
	overflow-wrap: anywhere;
}

.welcome-row p {
	margin-top: 0;
	margin-bottom: 0;
}

.welcome-row .muted {
	font-size: 14px;
	line-height: 1.6;
}

.primary-action {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	min-height: 44px;
	padding: 12px 15px;
	border: 0;
	border-radius: 12px;
	background: #171717;
	color: #fff;
	font-size: 13px;
	font-weight: 700;
	white-space: nowrap;
	cursor: pointer;
	transition:
		background 0.2s,
		transform 0.2s;
}

.primary-action:hover {
	background: #000;
	transform: translateY(-1px);
}

.primary-action:disabled {
	opacity: 0.6;
	cursor: wait;
	transform: none;
}

/* ========================================
   TARJETAS DE ESTADÍSTICAS
======================================== */

.metric-grid {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: 14px;
}

.metric-card {
	display: flex;
	flex-direction: column;
	gap: 7px;
	min-width: 0;
	min-height: 170px;
	padding: 20px;
	border: 1px solid #e8e8e8;
	border-radius: 16px;
	background: #fff;
	box-shadow: 0 5px 18px rgb(0 0 0 / 3.5%);
}

.metric-card > span {
	color: #777;
	font-size: 12px;
	font-weight: 700;
	letter-spacing: 0.06em;
	line-height: 1.5;
	text-transform: uppercase;
	overflow-wrap: anywhere;
}

.metric-card strong {
	margin-top: 3px;
	color: #171717;
	font-size: 34px;
	line-height: 1.1;
	overflow-wrap: anywhere;
}

.metric-card small {
	color: #777;
	font-size: 12px;
	line-height: 1.5;
	overflow-wrap: anywhere;
}

.metric-icon {
	display: grid;
	place-items: center;
	flex-shrink: 0;
	width: 38px;
	height: 38px;
	margin-bottom: 5px;
	border-radius: 11px;
}

.metric-green .metric-icon,
.metric-gold .metric-icon,
.metric-blue .metric-icon,
.metric-coral .metric-icon,
.quick-icon.green,
.quick-icon.gold,
.quick-icon.blue {
	background: #fff6f0;
	color: #c65b19;
}

.admin-metric-grid {
	grid-template-columns: repeat(3, minmax(0, 1fr));
}

/* ========================================
   PANELES
======================================== */

.content-grid {
	display: grid;
	grid-template-columns: minmax(0, 1.35fr) minmax(0, 0.65fr);
	gap: 18px;
	margin-top: 18px;
}

.dashboard-panel {
	padding: 22px;
	border: 1px solid #e8e8e8;
	border-radius: 16px;
	background: #fff;
}

.panel-heading {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 15px;
	margin-bottom: 18px;
}

.panel-heading > div {
	min-width: 0;
}

.panel-heading .eyebrow {
	margin: 0;
}

.panel-heading h3 {
	margin: 7px 0 0;
	color: #171717;
	font: 700 20px 'Space Grotesk', Arial, sans-serif;
	overflow-wrap: anywhere;
}

.text-action {
	flex-shrink: 0;
	padding: 5px 0;
	border: 0;
	background: transparent;
	color: #c65b19;
	font-size: 12px;
	font-weight: 700;
	cursor: pointer;
}

.text-action:hover {
	color: #963e0d;
	text-decoration: underline;
}

/* ========================================
   LISTADO DE CATÁLOGOS
======================================== */

.catalog-list {
	display: grid;
	gap: 3px;
}

.catalog-row {
	display: flex;
	align-items: center;
	gap: 12px;
	min-width: 0;
	padding: 12px 4px;
	border-bottom: 1px solid #edf1ed;
}

.catalog-row:last-child {
	border-bottom: 0;
}

.catalog-icon {
	display: grid;
	place-items: center;
	flex: 0 0 36px;
	width: 36px;
	height: 36px;
	border-radius: 10px;
	background: #fff6f0;
	color: #c65b19;
}

.catalog-row > div {
	display: grid;
	flex: 1;
	gap: 4px;
	min-width: 0;
}

.catalog-row strong {
	overflow: hidden;
	color: #171717;
	font-size: 13px;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.catalog-row small {
	overflow: hidden;
	color: #777;
	font-size: 11px;
	line-height: 1.5;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.status {
	flex-shrink: 0;
	padding: 5px 8px;
	border-radius: 999px;
	font-size: 11px;
	font-weight: 800;
	white-space: nowrap;
}

.status-on {
	background: #fff6f0;
	color: #c65b19;
}

.status-off {
	background: #f6e5e1;
	color: #985149;
}

/* ========================================
   ACCIONES RÁPIDAS
======================================== */

.quick-panel {
	display: flex;
	flex-direction: column;
}

.quick-action {
	display: flex;
	align-items: center;
	gap: 11px;
	width: 100%;
	min-width: 0;
	padding: 12px 0;
	border: 0;
	border-top: 1px solid #edf1ed;
	background: transparent;
	color: inherit;
	text-align: left;
	cursor: pointer;
}

.quick-action:hover {
	background: #fcfcfa;
}

.quick-action > span:nth-child(2) {
	display: grid;
	flex: 1;
	gap: 4px;
	min-width: 0;
}

.quick-action strong {
	font-size: 12px;
	line-height: 1.5;
	overflow-wrap: anywhere;
}

.quick-action small {
	color: #777;
	font-size: 12px;
	line-height: 1.5;
}

.quick-icon {
	display: grid;
	place-items: center;
	flex: 0 0 35px;
	width: 35px;
	height: 35px;
	border-radius: 10px;
}

.arrow {
	flex-shrink: 0;
	color: #777;
	font-size: 20px;
}

/* ========================================
   ESTADOS VACÍOS Y VISTAS AUXILIARES
======================================== */

.empty-state {
	display: grid;
	place-items: center;
	gap: 8px;
	min-height: 150px;
	color: #777;
	text-align: center;
}

.empty-state p {
	margin: 0;
	font-size: 13px;
	line-height: 1.5;
}

.placeholder-view {
	display: grid;
	place-content: center;
	justify-items: center;
	min-height: calc(100vh - 140px);
	padding: 24px 0;
	text-align: center;
}

.placeholder-view h2 {
	font-size: clamp(26px, 3vw, 38px);
}

.placeholder-view .muted {
	max-width: 400px;
	margin: 0 0 20px;
	line-height: 1.55;
}

.placeholder-icon {
	display: grid;
	place-items: center;
	width: 48px;
	height: 48px;
	border-radius: 14px;
	background: #fff6f0;
	color: #c65b19;
}

.sidebar-backdrop {
	display: none;
}

.spin {
	animation: dashboard-spin 0.8s linear infinite;
}

@keyframes dashboard-spin {
	to {
		transform: rotate(360deg);
	}
}

/* ========================================
   PANTALLAS MEDIANAS Y PORTÁTILES
======================================== */

@media (max-width: 1250px) {
	.dashboard-main {
		padding-right: 24px;
		padding-left: 24px;
	}

	.metric-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.admin-metric-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.content-grid {
		grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
		gap: 14px;
	}

	.metric-card {
		min-height: 155px;
	}
}

/* ========================================
   TABLETS
======================================== */

@media (max-width: 1023px) {
	.mobile-menu {
		display: grid;
	}

	.sidebar-backdrop {
		position: fixed;
		z-index: 20;
		inset: 0;
		display: block;
		background: rgb(0 0 0 / 35%);
		backdrop-filter: blur(2px);
	}

	.dashboard-main {
		width: 100%;
		margin-left: 0;
		padding-right: clamp(18px, 4vw, 36px);
		padding-bottom: 32px;
		padding-left: clamp(18px, 4vw, 36px);
	}

	.topbar {
		gap: 14px;
	}

	.top-profile-copy {
		display: none;
	}

	.content-grid {
		grid-template-columns: minmax(0, 1fr);
	}

	.catalog-panel,
	.quick-panel {
		width: 100%;
	}
}

/* ========================================
   TABLETS PEQUEÑAS Y MÓVILES GRANDES
======================================== */

@media (max-width: 680px) {
	.dashboard-main {
		padding-right: 16px;
		padding-left: 16px;
	}

	.topbar {
		min-height: 76px;
		gap: 10px;
	}

	.mobile-menu {
		width: 38px;
		height: 38px;
	}

	.topbar h1 {
		margin-top: 5px;
		font-size: 23px;
	}

	.breadcrumb {
		font-size: 9px;
		letter-spacing: 0.08em;
	}

	.top-avatar {
		width: 36px;
		height: 36px;
	}

	.dashboard-content {
		padding-top: 24px;
	}

	.dashboard-tabs {
		width: 100%;
		margin-bottom: 23px;
	}

	.dashboard-tabs button {
		flex: 1;
		min-width: 0;
		padding: 10px 8px;
		font-size: 11px;
	}

	.welcome-row {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 17px;
		margin-bottom: 22px;
	}

	.welcome-row h2 {
		font-size: clamp(25px, 6vw, 32px);
		line-height: 1.2;
	}

	.welcome-row .muted {
		font-size: 13px;
	}

	.primary-action {
		width: 100%;
		white-space: normal;
	}

	.metric-grid,
	.admin-metric-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
	}

	.metric-card {
		min-height: 155px;
		gap: 7px;
		padding: 15px;
		border-radius: 13px;
	}

	.metric-icon {
		width: 34px;
		height: 34px;
		margin-bottom: 3px;
		border-radius: 10px;
	}

	.metric-icon svg {
		width: 18px;
		height: 18px;
	}

	.metric-card > span {
		font-size: 10px;
		letter-spacing: 0.035em;
	}

	.metric-card strong {
		font-size: 29px;
	}

	.metric-card small {
		font-size: 11px;
	}

	.content-grid {
		gap: 13px;
		margin-top: 14px;
	}

	.dashboard-panel {
		padding: 17px 15px;
		border-radius: 13px;
	}

	.panel-heading {
		gap: 10px;
		margin-bottom: 13px;
	}

	.panel-heading h3 {
		font-size: 18px;
	}

	.panel-heading .eyebrow {
		font-size: 9px;
	}

	.catalog-row {
		gap: 9px;
		padding: 12px 0;
	}

	.catalog-icon {
		flex-basis: 32px;
		width: 32px;
		height: 32px;
	}

	.catalog-row strong {
		font-size: 12px;
	}

	.catalog-row small {
		font-size: 10px;
	}

	.status {
		padding: 5px 7px;
		font-size: 10px;
	}

	.quick-action {
		gap: 9px;
	}

	.quick-action strong {
		font-size: 12px;
	}

	.quick-action small {
		font-size: 11px;
	}
}

/* ========================================
   MÓVILES PEQUEÑOS
======================================== */

@media (max-width: 400px) {
	.dashboard-main {
		padding-right: 12px;
		padding-left: 12px;
	}

	.topbar {
		gap: 8px;
	}

	.mobile-menu {
		width: 35px;
		height: 35px;
	}

	.topbar h1 {
		font-size: 21px;
	}

	.breadcrumb {
		font-size: 8px;
		letter-spacing: 0.05em;
	}

	.top-avatar {
		width: 33px;
		height: 33px;
	}

	.dashboard-content {
		padding-top: 20px;
	}

	.dashboard-tabs button {
		padding: 10px 5px;
		font-size: 10px;
	}

	.welcome-row h2 {
		font-size: 25px;
	}

	.metric-grid,
	.admin-metric-grid {
		gap: 8px;
	}

	.metric-card {
		min-height: 145px;
		padding: 12px 10px;
		border-radius: 12px;
	}

	.metric-card > span {
		font-size: 9px;
	}

	.metric-card strong {
		font-size: 26px;
	}

	.metric-card small {
		font-size: 10px;
	}

	.dashboard-panel {
		padding: 15px 11px;
	}

	.panel-heading h3 {
		font-size: 16px;
	}

	.catalog-row {
		gap: 7px;
	}

	.catalog-icon {
		flex-basis: 29px;
		width: 29px;
		height: 29px;
	}

	.catalog-row strong {
		font-size: 11px;
	}

	.catalog-row small {
		font-size: 9px;
	}

	.status {
		padding: 4px 5px;
		font-size: 9px;
	}

	.text-action {
		font-size: 11px;
	}

	.quick-action small {
		font-size: 10px;
	}

	.quick-icon {
		flex-basis: 31px;
		width: 31px;
		height: 31px;
	}
}

/* ========================================
   ACCESIBILIDAD
======================================== */

@media (prefers-reduced-motion: reduce) {
	*,
	*::before,
	*::after {
		scroll-behavior: auto !important;
		animation-duration: 0.01ms !important;
		animation-iteration-count: 1 !important;
		transition-duration: 0.01ms !important;
	}
}
</style>
