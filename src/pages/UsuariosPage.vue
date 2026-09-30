<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ChevronDown, Pencil, Plus, RefreshCw, Search, Shield, Store, Trash2, UserRound } from 'lucide-vue-next'
import { api, type Catalogo, type Usuario } from '../api.ts'
import UserFormModal, { type UserAdminForm } from '../components/UserFormModal.vue'

const users = ref<Usuario[]>([])
const search = ref('')
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const showModal = ref(false)
const editingId = ref<number | null>(null)
const expandedUserId = ref<number | null>(null)
const userCatalogs = ref<Record<number, Catalogo[]>>({})
const catalogLoadingId = ref<number | null>(null)
const removingCatalogId = ref<number | null>(null)
const catalogErrors = ref<Record<number, string>>({})
const form = ref<UserAdminForm>({ username: '', nombre: '', wapp: '', password: '', rol: 'USER' })

const filteredUsers = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()
  if (!query) return users.value
  return users.value.filter(user => [user.username, user.wapp, user.nombre].some(value => value?.toLocaleLowerCase().includes(query)))
})

async function load() {
  loading.value = true
  error.value = ''
  try { users.value = await api.list<Usuario>('usuarios/all') }
  catch (reason) { error.value = reason instanceof Error ? reason.message : 'No se pudieron cargar los usuarios.' }
  finally { loading.value = false }
}

function openCreate() {
  editingId.value = null
  form.value = { username: '', nombre: '', wapp: '', password: '', rol: 'USER' }
  error.value = ''
  showModal.value = true
}

function openEdit(user: Usuario) {
  editingId.value = user.id ?? null
  form.value = { username: user.username, nombre: user.nombre, wapp: user.wapp, password: '', rol: user.rol }
  error.value = ''
  showModal.value = true
}

async function save(userForm: UserAdminForm) {
  if (!userForm.username.trim() || !userForm.nombre.trim() || !userForm.wapp.trim() || (!editingId.value && !userForm.password.trim())) {
    error.value = 'Username, nombre, WhatsApp y contraseña son obligatorios al crear.'
    return
  }
  saving.value = true
  error.value = ''
  try {
    const payload = { username: userForm.username.trim(), nombre: userForm.nombre.trim(), wapp: userForm.wapp.trim(), password: userForm.password || undefined, rol: userForm.rol }
    if (editingId.value) await api.update('usuarios/admin', editingId.value, payload)
    else await api.create('usuarios/admin', payload)
    showModal.value = false
    await load()
  } catch (reason) { error.value = reason instanceof Error ? reason.message : 'No se pudo guardar el usuario.' }
  finally { saving.value = false }
}

async function remove(user: Usuario) {
  if (!user.id || !window.confirm(`¿Eliminar el usuario ${user.username}?`)) return
  try { await api.delete('usuarios/admin', user.id); await load() }
  catch (reason) { error.value = reason instanceof Error ? reason.message : 'No se pudo eliminar el usuario.' }
}

async function toggleUserCatalogs(user: Usuario) {
  if (expandedUserId.value === user.id) {
    expandedUserId.value = null
    return
  }

  expandedUserId.value = user.id
  catalogLoadingId.value = user.id
  catalogErrors.value = { ...catalogErrors.value, [user.id]: '' }
  try {
    userCatalogs.value = {
      ...userCatalogs.value,
      [user.id]: await api.catalogosUsuario<Catalogo>(user.id),
    }
  } catch (reason) {
    catalogErrors.value = {
      ...catalogErrors.value,
      [user.id]: reason instanceof Error ? reason.message : 'No se pudieron cargar los catálogos.',
    }
  } finally {
    catalogLoadingId.value = null
  }
}

async function removeCatalog(user: Usuario, catalog: Catalogo) {
  if (!catalog.id || !window.confirm(`¿Eliminar el catálogo "${catalog.nombre}" de ${user.username}?`)) return

  removingCatalogId.value = catalog.id
  catalogErrors.value = { ...catalogErrors.value, [user.id]: '' }
  try {
    await api.deleteCatalogoAdmin(catalog.id)
    userCatalogs.value = {
      ...userCatalogs.value,
      [user.id]: (userCatalogs.value[user.id] || []).filter((item) => item.id !== catalog.id),
    }
  } catch (reason) {
    catalogErrors.value = {
      ...catalogErrors.value,
      [user.id]: reason instanceof Error ? reason.message : 'No se pudo eliminar el catálogo.',
    }
  } finally {
    removingCatalogId.value = null
  }
}

onMounted(load)
</script>

<template>
  <section class="users-page"><div class="heading"><div><p class="eyebrow">Administración</p><h2>Usuarios</h2><p class="muted">Gestiona las cuentas y sus permisos de acceso.</p></div><button class="primary" type="button" @click="openCreate"><Plus :size="17" /> Crear usuario</button></div>
    <div class="toolbar"><div class="search"><Search :size="17" /><input v-model="search" type="search" placeholder="Filtrar por username o WhatsApp" /></div><button class="secondary" type="button" @click="load"><RefreshCw :size="16" /> Actualizar</button></div>
    <p v-if="error && !showModal" class="error">{{ error }}</p>
    <div v-if="loading" class="state"><RefreshCw :size="24" class="spin" /> Cargando usuarios...</div>
    <div v-else-if="!filteredUsers.length" class="state"><UserRound :size="30" /><p>{{ search ? 'No hay usuarios que coincidan con el filtro.' : 'Aún no hay usuarios.' }}</p></div>
    <div v-else class="table-wrap"><table><thead><tr><th>Usuario</th><th>Nombre</th><th>WhatsApp</th><th>Rol</th><th>Catálogos</th><th>Acciones</th></tr></thead><tbody><template v-for="user in filteredUsers" :key="user.id"><tr><td><strong>{{ user.username }}</strong></td><td>{{ user.nombre }}</td><td>{{ user.wapp }}</td><td><span class="role" :class="user.rol === 'ADMIN' ? 'admin' : ''"><Shield v-if="user.rol === 'ADMIN'" :size="13" />{{ user.rol }}</span></td><td><button class="catalog-toggle" type="button" :aria-expanded="expandedUserId === user.id" :title="expandedUserId === user.id ? 'Ocultar catálogos' : 'Ver catálogos'" @click="toggleUserCatalogs(user)"><Store :size="15" /><span>Ver lista</span><ChevronDown :size="14" :class="{ expanded: expandedUserId === user.id }" /></button></td><td class="actions"><button type="button" title="Editar usuario" @click="openEdit(user)"><Pencil :size="16" /></button><button type="button" title="Eliminar usuario" @click="remove(user)"><Trash2 :size="16" /></button></td></tr><tr v-if="expandedUserId === user.id" class="catalogs-row"><td colspan="6"><div class="catalog-list"><h3>Catálogos de {{ user.username }}</h3><p v-if="catalogLoadingId === user.id" class="catalog-state">Cargando catálogos...</p><p v-else-if="catalogErrors[user.id]" class="error">{{ catalogErrors[user.id] }}</p><p v-else-if="!userCatalogs[user.id]?.length" class="catalog-state">Este usuario aún no tiene catálogos.</p><div v-else class="catalog-items"><div v-for="catalog in userCatalogs[user.id]" :key="catalog.id" class="catalog-item"><img v-if="catalog.urlFotoPortada" :src="catalog.urlFotoPortada" :alt="`Portada de ${catalog.nombre}`" /><Store v-else :size="20" class="catalog-icon" /><div class="catalog-copy"><strong>{{ catalog.nombre }}</strong><small>{{ catalog.descripcion || 'Sin descripción' }}</small></div><button class="catalog-delete" type="button" :disabled="removingCatalogId === catalog.id" :aria-label="`Eliminar catálogo ${catalog.nombre}`" @click="removeCatalog(user, catalog)"><Trash2 :size="15" /> Eliminar</button></div></div></div></td></tr></template></tbody></table></div>
    <UserFormModal :visible="showModal" :editing="editingId !== null" :form="form" :saving="saving" :error="error" @close="showModal = false" @submit="save" />
  </section>
</template>

<style scoped>
.users-page{padding:34px 0;color:#17332a}.heading,.toolbar,.modal-head,.modal-actions{display:flex;align-items:center;justify-content:space-between;gap:16px}.heading{align-items:end;margin-bottom:26px}.eyebrow{margin:0;color:#6c8175;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}h2{margin:8px 0 7px;font:700 clamp(28px,4vw,42px) 'Space Grotesk',Arial,sans-serif}.muted{margin:0;color:#75847b}.primary,.secondary,.actions button{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:0;border-radius:9px;padding:11px 14px;font-weight:700;cursor:pointer}.primary{background:#1a5f47;color:#fff}.secondary{background:#e7f0ea;color:#1a5f47}.toolbar{margin-bottom:18px}.search{display:flex;align-items:center;gap:9px;width:min(460px,100%);padding:0 13px;border:1px solid #dfe5df;border-radius:9px;background:#fff;color:#718078}.search input{width:100%;padding:12px 0;border:0;outline:0;font:inherit}.state,.table-wrap{border:1px solid #e3e9e2;border-radius:14px;background:#fff}.state{min-height:260px;display:grid;place-content:center;justify-items:center;gap:12px;color:#75847b}.table-wrap{overflow:auto}.table-wrap table{width:100%;border-collapse:collapse;text-align:left}.table-wrap th,.table-wrap td{padding:15px;border-bottom:1px solid #edf1ed;white-space:nowrap}.table-wrap th{color:#6c8175;font-size:11px;text-transform:uppercase}.role{display:inline-flex;align-items:center;gap:5px;padding:5px 8px;border-radius:999px;background:#edf1ed;color:#60736a;font-size:11px;font-weight:800}.role.admin{background:#fff1cf;color:#8b6614}.actions{display:flex;gap:6px}.actions button{padding:8px;background:#edf4ef;color:#1a5f47}.actions button:last-child{color:#a8584e;background:#f8e9e6}.error{color:#a8584e}.modal-layer{position:fixed;inset:0;z-index:30;display:grid;place-items:center;padding:20px;background:#17332a66}.modal{width:min(520px,100%);padding:24px;border-radius:16px;background:#fff;box-shadow:0 20px 60px #17332a33}.modal-head h3{margin:6px 0 0;font-size:24px}.modal-head button{border:0;background:transparent;color:#52655b;cursor:pointer}.fields{display:grid;gap:14px;margin:24px 0}.fields label{display:grid;gap:7px;color:#52655b;font-size:13px;font-weight:700}.fields input,.fields select{padding:11px;border:1px solid #dfe5df;border-radius:8px;background:#fff;font:inherit;font-weight:400}.modal-actions{justify-content:end}.spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:650px){.heading,.toolbar{align-items:stretch;flex-direction:column}.heading .primary,.toolbar .search,.toolbar .secondary{width:100%}}
</style>

<style scoped>
.catalog-toggle,.catalog-delete{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:0;border-radius:8px;padding:8px 10px;background:#edf4ef;color:#1a5f47;font-weight:700;cursor:pointer}
.catalog-toggle svg:last-child{transition:transform .18s}
.catalog-toggle svg:last-child.expanded{transform:rotate(180deg)}
.catalogs-row td{padding:0 15px 15px!important;background:#f7faf7}
.catalog-list{padding:15px 0}
.catalog-list h3{margin:0 0 12px;color:#17332a;font-size:15px}
.catalog-state{margin:8px 0;color:#75847b}
.catalog-items{display:grid;gap:8px}
.catalog-item{display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid #e3e9e2}
.catalog-item img,.catalog-icon{width:38px;height:38px;flex:0 0 38px;object-fit:cover;border-radius:6px;background:#e7f0ea;color:#1a5f47}
.catalog-copy{display:grid;gap:3px;min-width:0;flex:1}
.catalog-copy small{overflow:hidden;color:#75847b;text-overflow:ellipsis;white-space:nowrap}
.catalog-delete{background:#f8e9e6;color:#a8584e}
.catalog-delete:disabled{opacity:.6;cursor:wait}
@media(max-width:650px){.catalog-toggle span{display:none}.catalog-item{align-items:flex-start}.catalog-delete{padding:8px}}
</style>