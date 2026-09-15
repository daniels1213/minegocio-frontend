<script setup lang="ts">
import { computed } from 'vue'
import { Search, Package, Settings } from 'lucide-vue-next'
import type { Catalogo, Producto, Variante } from '../../api'

const props = defineProps<{
  products: Producto[]
  variants: Variante[]
  catalogs: Catalogo[]
  search: string
  activeCatalogId: number | null
}>()

const emit = defineEmits<{
  (e: 'update:search', value: string): void
  (e: 'update:activeCatalogId', value: number | null): void
}>()

const normalizedCatalogs = computed(() =>
  (props.catalogs ?? []).map((catalog) => ({
    ...catalog,
    nombre: catalog.nombre?.trim() || `Catálogo ${catalog.id ?? ''}`.trim() || 'Sin nombre',
  })),
)

const filteredCatalogs = computed(() => {
  const query = (props.search ?? '').trim().toLowerCase()

  return normalizedCatalogs.value.filter((catalog) => {
    const matchesText = !query || (catalog.nombre || '').toLowerCase().includes(query)
    const matchesCatalog =
      props.activeCatalogId === null ||
      (catalog.id ?? null) === props.activeCatalogId

    return matchesText && matchesCatalog
  })
})

const onSearchInput = (event: Event) => {
  emit('update:search', (event.target as HTMLInputElement).value)
}

const onCatalogChange = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value
  emit('update:activeCatalogId', value === '' ? null : Number(value))
}
</script>

<template>
  <div class="section-toolbar">
    <h2>Catálogos</h2>
    <div class="search">
      <Search :size="16" />
      <input :value="props.search" @input="onSearchInput" placeholder="Buscar catálogo" />
    </div>
  </div>

  <div class="catalog-selector" v-if="normalizedCatalogs.length">
    <label>Catálogo activo</label>
    <select :value="props.activeCatalogId ?? null" @change="onCatalogChange">
      <option :value="null">Todos</option>
      <option v-for="catalog in normalizedCatalogs" :key="catalog.id" :value="catalog.id">
        {{ catalog.nombre }}
      </option>
    </select>
  </div>

  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Catálogo</th>
          <th>Descripción</th>
          <th>Estado</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="catalog in filteredCatalogs" :key="catalog.id ?? catalog.nombre">
          <td>
            <strong>{{ catalog.nombre || 'Sin nombre' }}</strong>
          </td>
          <td>
            <small class="muted">{{ catalog.descripcion || 'Sin descripción' }}</small>
          </td>
          <td>
            <span class="badge" :class="{ danger: !catalog.activo }">{{ catalog.activo ? 'Activo' : 'Inactivo' }}</span>
          </td>
          <td class="actions">
            <button class="action-btn"><Settings :size="16" /></button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="!filteredCatalogs.length" class="empty">
      <Package :size="28" />
      <p>No hay catálogos para mostrar.</p>
    </div>
  </div>
</template>

<style scoped>
.section-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 18px;
}

.section-toolbar h2 {
  margin: 0;
}

.search {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border: 1px solid #dfe5df;
  border-radius: 10px;
  padding: 0 12px;
}

.search input {
  border: 0;
  outline: none;
  background: transparent;
  padding: 10px 0;
  width: 220px;
}

.catalog-selector {
  display: grid;
  gap: 6px;
  margin-bottom: 18px;
}

.catalog-selector select {
  border: 1px solid #dfe5df;
  border-radius: 10px;
  background: #fff;
  padding: 10px 12px;
}

.table-wrap {
  background: #fffefa;
  border: 1px solid #e4ebe0;
  border-radius: 16px;
  overflow: hidden;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 14px 16px;
  text-align: left;
  border-bottom: 1px solid #eef0ea;
}

th {
  background: #f3f5f1;
  color: #5a675f;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  background: #d9f0df;
  color: #1a4333;
}

.badge.danger {
  background: #fce8e6;
  color: #7f3b38;
}

.actions {
  text-align: right;
}

.action-btn {
  width: 36px;
  height: 36px;
  border: 1px solid #dfe5df;
  border-radius: 10px;
  background: #fff;
}

.empty {
  padding: 32px 16px;
  text-align: center;
  color: #687a73;
  display: grid;
  place-items: center;
  gap: 8px;
}

.muted {
  color: #6a786f;
}
</style>
