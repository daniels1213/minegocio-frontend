<script setup lang="ts">
import { ref, watch } from 'vue'
import { AlertCircle, Pencil, Plus, RefreshCw, Store, Trash2 } from 'lucide-vue-next'
import type { Catalogo } from '../api.ts'
import { api } from '../api.ts'

const props = defineProps<{
  usuarioId: number
}>()

const emit = defineEmits<{
  (e: 'create'): void
  (e: 'edit', catalog: Catalogo): void
}>()

const catalogs = ref<Catalogo[]>([])
const loading = ref(false)
const error = ref('')
const removingId = ref<number | null>(null)

async function loadCatalogs() {
  if (!props.usuarioId) return

  loading.value = true
  error.value = ''

  try {
    catalogs.value = await api.catalogosUsuario<Catalogo>(props.usuarioId)
  } catch (reason) {
    error.value = reason instanceof Error
      ? reason.message
      : 'No se pudieron cargar tus catálogos.'
  } finally {
    loading.value = false
  }
}

async function removeCatalog(catalog: Catalogo) {
  if (!catalog.id || !window.confirm(`¿Eliminar el catálogo "${catalog.nombre}"?`)) return

  removingId.value = catalog.id
  error.value = ''
  try {
    await api.deleteCatalogo(props.usuarioId, catalog.id)
    catalogs.value = catalogs.value.filter((item) => item.id !== catalog.id)
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'No se pudo eliminar el catálogo.'
  } finally {
    removingId.value = null
  }
}

watch(
  () => props.usuarioId,
  () => loadCatalogs(),
  { immediate: true },
)
</script>

<template>
  <section class="catalog-page">
    <div class="page-heading">
      <div>
        <p class="eyebrow">Gestión de catálogos</p>
        <h2>Mis catálogos</h2>
        <p class="muted">Administra los catálogos vinculados a tu negocio.</p>
      </div>
      <button class="primary-action" type="button" @click="emit('create')">
        <Plus :size="17" />
        Crear nuevo catálogo
      </button>
    </div>

    <div v-if="loading" class="catalog-state">
      <RefreshCw :size="24" class="spin" />
      <p>Cargando tus catálogos...</p>
    </div>

    <div v-else-if="error" class="catalog-state error-state">
      <AlertCircle :size="28" />
      <p>{{ error }}</p>
      <button class="secondary-action" type="button" @click="loadCatalogs">Reintentar</button>
    </div>

    <div v-else-if="!catalogs.length" class="catalog-state empty-catalogs">
      <div class="empty-illustration"><Store :size="42" /></div>
      <h3>Aún no tienes catálogos</h3>
      <p>Crea tu primer catálogo para empezar a mostrar tus productos.</p>
      <button class="primary-action" type="button" @click="emit('create')">
        <Plus :size="17" />
        Crear nuevo catálogo
      </button>
    </div>

    <div v-else class="catalog-grid">
      <article v-for="catalog in catalogs" :key="catalog.id ?? catalog.nombre" class="catalog-card">
        <div class="catalog-cover">
          <img v-if="catalog.urlFotoPortada" :src="catalog.urlFotoPortada" :alt="catalog.nombre" />
          <Store v-else :size="38" />
        </div>
        <div class="catalog-info">
          <h3>{{ catalog.nombre }}</h3>
          <p>{{ catalog.descripcion || 'Sin descripción disponible.' }}</p>
          <div class="catalog-actions">
            <button class="secondary-action" type="button" @click="emit('edit', catalog)"><Pencil :size="15" /> Editar</button>
            <button class="delete-action" type="button" :disabled="removingId === catalog.id" @click="removeCatalog(catalog)"><Trash2 :size="15" /> {{ removingId === catalog.id ? 'Eliminando...' : 'Eliminar' }}</button>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.catalog-page { padding: 34px 0; }
.page-heading { display: flex; align-items: end; justify-content: space-between; gap: 24px; margin-bottom: 28px; }
.eyebrow { margin: 0; color: #6c8175; font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
h2 { margin: 8px 0 7px; color: #17332a; font: 700 clamp(28px, 4vw, 42px) 'Space Grotesk', Arial, sans-serif; }
.muted, .catalog-info p { color: #75847b; }
.page-heading p:last-child { margin: 0; }
.primary-action, .secondary-action { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 0; border-radius: 10px; padding: 12px 15px; font-weight: 700; cursor: pointer; }
.primary-action { background: #1a5f47; color: #fff; }
.secondary-action { background: #e7f0ea; color: #1a5f47; }
.catalog-state { min-height: 350px; display: grid; place-content: center; justify-items: center; gap: 10px; padding: 30px; border: 1px solid #e3e9e2; border-radius: 16px; background: #fff; color: #75847b; text-align: center; }
.catalog-state p { margin: 0; }
.empty-illustration { width: 86px; height: 86px; display: grid; place-items: center; margin-bottom: 6px; border-radius: 28px; background: #e2f2e6; color: #28704e; }
.empty-catalogs h3 { margin: 0; color: #17332a; font-size: 22px; }
.empty-catalogs p { max-width: 340px; line-height: 1.5; }
.error-state { color: #a8584e; }
.catalog-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
.catalog-card { overflow: hidden; border: 1px solid #e3e9e2; border-radius: 16px; background: #fff; }
.catalog-cover { position: relative; height: 170px; display: grid; place-items: center; overflow: hidden; background: #e6f0eb; color: #579071; }
.catalog-cover img { width: 100%; height: 100%; object-fit: cover; }
.status { position: absolute; top: 12px; right: 12px; padding: 5px 8px; border-radius: 999px; font-size: 11px; font-weight: 800; }
.status-on { background: #e1f3e6; color: #27714d; }
.status-off { background: #f6e5e1; color: #985149; }
.catalog-info { padding: 18px; }
.catalog-info h3 { margin: 0 0 7px; color: #17332a; }
.catalog-info p { margin: 0; line-height: 1.5; }
.catalog-actions { display: flex; gap: 8px; margin-top: 18px; }
.delete-action { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 0; border-radius: 10px; padding: 12px 15px; background: #f8e9e6; color: #a8584e; font-weight: 700; cursor: pointer; }
.delete-action:disabled { opacity: .6; cursor: wait; }
.spin { animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 680px) { .page-heading { align-items: start; flex-direction: column; } .catalog-grid { grid-template-columns: 1fr; } }
</style>