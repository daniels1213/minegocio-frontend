<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Eye, Pencil, Plus, RefreshCw, Search, Trash2, UserRound } from 'lucide-vue-next'
import { api, type Catalogo, type Usuario } from '../api.ts'
import UserInfoModal from '../components/UserInfoModal.vue'
import UserFormModal, { type UserAdminForm } from '../components/UserFormModal.vue'
import DeleteConfirmModal from '../components/DeleteConfirmModal.vue'
import { isValidPhoneNumber } from '../phone.ts'

const users = ref<Usuario[]>([])
const search = ref('')
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const showModal = ref(false)
const editingId = ref<number | null>(null)
const infoUser = ref<Usuario | null>(null)
const userCatalogs = ref<Record<number, Catalogo[]>>({})
const catalogLoadingId = ref<number | null>(null)
const removingCatalogId = ref<number | null>(null)
const catalogErrors = ref<Record<number, string>>({})
const deleteTargetUser = ref<Usuario | null>(null)
const showDeleteUserModal = ref(false)
const deleteTargetCatalog = ref<{ user: Usuario; catalog: Catalogo } | null>(null)
const showDeleteCatalogModal = ref(false)
const form = ref<UserAdminForm>({ username: '', nombre: '', gmail: '', wapp: '', password: '', rol: 'USER' })

const filteredUsers = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()
  if (!query) return users.value
  return users.value.filter(user => [user.username, user.nombre, user.gmail, user.email, user.correo, user.wapp].some(value => value?.toLocaleLowerCase().includes(query)))
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
  form.value = { username: '', nombre: '', gmail: '', wapp: '', password: '', rol: 'USER' }
  error.value = ''
  showModal.value = true
}

function openEdit(user: Usuario) {
  editingId.value = user.id ?? null
  form.value = { username: user.username, nombre: user.nombre, gmail: user.gmail || user.email || user.correo || '', wapp: user.wapp, password: '', rol: user.rol }
  error.value = ''
  showModal.value = true
}

async function save(userForm: UserAdminForm) {
  if (!userForm.username.trim() || !userForm.nombre.trim() || !userForm.gmail.trim() || !userForm.wapp.trim() || (!editingId.value && !userForm.password.trim())) {
    error.value = 'Username, nombre, Gmail y WhatsApp son obligatorios; también la contraseña al crear.'
    return
  }
  if (!isValidPhoneNumber(userForm.wapp)) {
    error.value = 'Introduce un WhatsApp válido para el prefijo seleccionado.'
    return
  }
  saving.value = true
  error.value = ''
  try {
    const payload = { username: userForm.username.trim(), nombre: userForm.nombre.trim(), gmail: userForm.gmail.trim(), wapp: userForm.wapp.trim(), password: userForm.password || undefined, rol: userForm.rol }
    if (editingId.value) await api.update('usuarios/admin', editingId.value, payload)
    else await api.create('usuarios/admin', payload)
    showModal.value = false
    await load()
  } catch (reason) { error.value = reason instanceof Error ? reason.message : 'No se pudo guardar el usuario.' }
  finally { saving.value = false }
}

async function remove(user: Usuario) {
  if (!user.id) return
  deleteTargetUser.value = user
  showDeleteUserModal.value = true
}

async function confirmDeleteUser() {
  if (!deleteTargetUser.value?.id) return
  try {
    await api.delete('usuarios/admin', deleteTargetUser.value.id)
    await load()
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'No se pudo eliminar el usuario.'
  } finally {
    deleteTargetUser.value = null
    showDeleteUserModal.value = false
  }
}

async function openInfo(user: Usuario) {
  infoUser.value = user
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
  if (!catalog.id) return
  deleteTargetCatalog.value = { user, catalog }
  showDeleteCatalogModal.value = true
}

async function confirmDeleteCatalog() {
  if (!deleteTargetCatalog.value?.catalog.id) return
  const catalogId = deleteTargetCatalog.value.catalog.id
  const userId = deleteTargetCatalog.value.user.id
  removingCatalogId.value = catalogId
  catalogErrors.value = { ...catalogErrors.value, [userId]: '' }
  try {
    await api.deleteCatalogoAdmin(catalogId)
    userCatalogs.value = {
      ...userCatalogs.value,
      [userId]: (userCatalogs.value[userId] || []).filter((item) => item.id !== catalogId),
    }
  } catch (reason) {
    catalogErrors.value = {
      ...catalogErrors.value,
      [userId]: reason instanceof Error ? reason.message : 'No se pudo eliminar el catálogo.',
    }
  } finally {
    removingCatalogId.value = null
    deleteTargetCatalog.value = null
    showDeleteCatalogModal.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="users-page"><div class="heading"><div><p class="eyebrow">Administración</p><h2>Usuarios</h2><p class="muted">Gestiona las cuentas y sus permisos de acceso.</p></div><button class="primary" type="button" @click="openCreate"><Plus :size="17" /> Crear usuario</button></div>
    <div class="toolbar"><div class="search"><Search :size="17" /><input v-model="search" type="search" placeholder="Filtrar por username, Gmail o WhatsApp" /></div><button class="secondary" type="button" @click="load"><RefreshCw :size="16" /> Actualizar</button></div>
    <p v-if="error && !showModal" class="error">{{ error }}</p>
    <div v-if="loading" class="state"><RefreshCw :size="24" class="spin" /> Cargando usuarios...</div>
    <div v-else-if="!filteredUsers.length" class="state"><UserRound :size="30" /><p>{{ search ? 'No hay usuarios que coincidan con el filtro.' : 'Aún no hay usuarios.' }}</p></div>
    <div v-else class="table-wrap">
      <table>
        <thead><tr><th>Nombre</th><th>Gmail</th><th>WhatsApp</th><th>Acciones</th></tr></thead>
        <tbody>
          <tr v-for="user in filteredUsers" :key="user.id">
            <td>{{ user.nombre }}</td>
            <td>{{ user.gmail || user.email || user.correo || '—' }}</td>
            <td>{{ user.wapp }}</td>
            <td class="actions">
              <button type="button" title="Ver información del usuario" :aria-label="`Ver información de ${user.nombre}`" @click="openInfo(user)"><Eye :size="16" /><span>Ver info</span></button>
              <button type="button" title="Editar usuario" :aria-label="`Editar usuario ${user.nombre}`" @click="openEdit(user)"><Pencil :size="16" /></button>
              <button type="button" title="Eliminar usuario" :aria-label="`Eliminar usuario ${user.nombre}`" @click="remove(user)"><Trash2 :size="16" /></button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <UserInfoModal
      v-if="infoUser"
      :user="infoUser"
      :catalogs="userCatalogs[infoUser.id] || []"
      :catalogs-loading="catalogLoadingId === infoUser.id"
      :catalog-error="catalogErrors[infoUser.id] || ''"
      :removing-catalog-id="removingCatalogId"
      @close="infoUser = null"
      @refresh-catalogs="openInfo(infoUser)"
      @delete-catalog="removeCatalog(infoUser, $event)"
    />
    <UserFormModal :visible="showModal" :editing="editingId !== null" :form="form" :saving="saving" :error="error" @close="showModal = false" @submit="save" />
    <DeleteConfirmModal
      :visible="showDeleteUserModal"
      :title="`Eliminar usuario`"
      :message="deleteTargetUser ? `¿Eliminar el usuario ${deleteTargetUser.username}?` : '¿Eliminar el usuario seleccionado?'"
      :loading="false"
      @confirm="confirmDeleteUser"
      @cancel="showDeleteUserModal = false; deleteTargetUser = null"
    />
    <DeleteConfirmModal
      :visible="showDeleteCatalogModal"
      :title="`Eliminar catálogo`"
      :message="deleteTargetCatalog ? `¿Eliminar el catálogo «${deleteTargetCatalog.catalog.nombre}» de ${deleteTargetCatalog.user.username}?` : '¿Eliminar el catálogo seleccionado?'"
      :loading="removingCatalogId !== null"
      @confirm="confirmDeleteCatalog"
      @cancel="showDeleteCatalogModal = false; deleteTargetCatalog = null"
    />
  </section>
</template>

<style scoped>
.users-page{padding:34px 0;color:#171717}.heading,.toolbar,.modal-head,.modal-actions{display:flex;align-items:center;justify-content:space-between;gap:16px}.heading{align-items:end;margin-bottom:26px}.eyebrow{margin:0;color:#777;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}h2{margin:8px 0 7px;font:700 clamp(28px,4vw,42px) 'Space Grotesk',Arial,sans-serif;color:#171717}.muted{margin:0;color:#777}.primary,.secondary,.actions button{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:0;border-radius:9px;padding:11px 14px;font-weight:700;cursor:pointer}.primary{background:#171717;color:#fff}.secondary{background:#fff6f0;color:#c65b19}.toolbar{margin-bottom:18px}.search{display:flex;align-items:center;gap:9px;width:min(460px,100%);padding:0 13px;border:1px solid #e8e8e8;border-radius:9px;background:#fff;color:#777}.search input{width:100%;padding:12px 0;border:0;outline:0;font:inherit}.state,.table-wrap{border:1px solid #e8e8e8;border-radius:14px;background:#fff}.state{min-height:260px;display:grid;place-content:center;justify-items:center;gap:12px;color:#777}.table-wrap{overflow:auto}.table-wrap table{width:100%;border-collapse:collapse;text-align:left}.table-wrap th,.table-wrap td{padding:15px;border-bottom:1px solid #edf1ed;white-space:nowrap}.table-wrap th{color:#777;font-size:11px;text-transform:uppercase}.role{display:inline-flex;align-items:center;gap:5px;padding:5px 8px;border-radius:999px;background:#f0f0f0;color:#777;font-size:11px;font-weight:800}.role.admin{background:#fff6f0;color:#c65b19}.actions{display:flex;gap:6px}.actions button{padding:8px;background:#fff6f0;color:#c65b19}.actions button:last-child{color:#a8584e;background:#fff2ef}.error{color:#a8584e}.modal-layer{position:fixed;inset:0;z-index:30;display:grid;place-items:center;padding:20px;background:rgba(0,0,0,.66)}.modal{width:min(520px,100%);padding:24px;border-radius:16px;background:#fff;box-shadow:0 20px 60px rgba(0,0,0,.28)}.modal-head h3{margin:6px 0 0;font-size:24px}.modal-head button{border:0;background:transparent;color:#777;cursor:pointer}.fields{display:grid;gap:14px;margin:24px 0}.fields label{display:grid;gap:7px;color:#333;font-size:13px;font-weight:700}.fields input,.fields select{padding:11px;border:1px solid #e8e8e8;border-radius:8px;background:#fff;font:inherit;font-weight:400}.modal-actions{justify-content:end}.spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:650px){.heading,.toolbar{align-items:stretch;flex-direction:column}.heading .primary,.toolbar .search,.toolbar .secondary{width:100%}}
</style>

<style scoped>
/* ================================
   RESPONSIVE: PÁGINA DE USUARIOS
   ================================ */

.users-page {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.users-page *,
.users-page *::before,
.users-page *::after {
  box-sizing: border-box;
}

/* Encabezado */
.heading {
  flex-wrap: wrap;
}

.heading > div {
  min-width: 0;
}

.heading .primary {
  flex-shrink: 0;
  white-space: nowrap;
}

/* Buscador y actualización */
.toolbar {
  flex-wrap: wrap;
}

.search {
  min-width: 0;
  flex: 1 1 250px;
}

.search input {
  min-width: 0;
}

.secondary {
  flex-shrink: 0;
  white-space: nowrap;
}

/* La tabla mantiene su ancho en pantallas grandes. */
.table-wrap {
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
}

.table-wrap table {
  width: 100%;
  border-collapse: collapse;
}

.table-wrap th,
.table-wrap td {
  vertical-align: middle;
}

.table-wrap .actions {
  white-space: nowrap;
}

.primary:focus-visible,
.secondary:focus-visible,
.actions button:focus-visible {
  outline: 2px solid #c65b19;
  outline-offset: 3px;
}

/* ================================
   TABLETS Y MÓVILES
   ================================ */

@media (max-width: 650px) {
  .users-page {
    padding-top: 24px;
  }

  /* Mantiene "Crear usuario" a la derecha */
  .heading {
    align-items: flex-start;
    flex-direction: row;
    gap: 14px;
  }

  .heading > div {
    flex: 1 1 180px;
  }

  .heading .primary {
    width: auto;
    align-self: flex-end;
    margin-left: auto;
    padding: 10px 12px;
  }

  .heading h2 {
    font-size: clamp(26px, 7vw, 34px);
  }

  .muted {
    line-height: 1.5;
  }

  /* Buscador arriba y actualizar debajo */
  .toolbar {
    align-items: stretch;
    flex-direction: column;
    gap: 10px;
  }

  .toolbar .search {
    width: 100%;
    flex: auto;
  }

  .toolbar .secondary {
    width: auto;
    align-self: flex-end;
  }

  .table-wrap {
    border-radius: 10px;
  }

  .table-wrap th,
  .table-wrap td {
    padding: 12px;
  }

  .table-wrap {
    overflow: visible;
    border: 0;
    background: transparent;
  }

  .table-wrap table,
  .table-wrap tbody {
    display: grid;
    gap: 9px;
  }

  .table-wrap thead,
  .table-wrap tbody td:nth-child(2) {
    display: none;
  }

  .table-wrap tbody tr {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    padding: 9px 10px;
    border: 1px solid #e8e8e8;
    border-radius: 10px;
    background: #fff;
  }

  .table-wrap tbody td {
    padding: 4px 0;
    border: 0;
    white-space: normal;
  }

  .table-wrap tbody td:first-child {
    min-width: 0;
    overflow-wrap: anywhere;
    font-weight: 700;
  }

  .actions {
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .actions button {
    padding: 8px;
  }

  .actions button:first-child span {
    display: none;
  }

}

/* ================================
   TELÉFONOS ESTRECHOS
   ================================ */

@media (max-width: 380px) {
  .users-page {
    padding-top: 18px;
  }

  .heading {
    gap: 8px;
  }

  .heading > div {
    flex-basis: 150px;
  }

  .heading .primary {
    gap: 5px;
    padding: 9px;
    font-size: 12px;
  }

}

/* Respeta la preferencia de movimiento reducido */
@media (prefers-reduced-motion: reduce) {
  .spin {
    animation: none;
  }
}

</style>