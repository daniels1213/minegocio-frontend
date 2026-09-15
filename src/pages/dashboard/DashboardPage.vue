<script setup lang="ts">
import type { Catalogo, Producto, Variante } from '../../api'

const props = defineProps<{
  products: Producto[]
  variants: Variante[]
  catalogs: Catalogo[]
}>()

const totalProducts = props.products.length
const totalVariants = props.variants.length
const activeCatalogs = props.catalogs.filter((catalog) => catalog.activo).length
const lowStock = props.variants.filter((variant) => variant.existencia <= variant.existenciaMinima).length
</script>

<template>
  <section class="dashboard-grid">
    <article class="stat-card">
      <span class="label">Productos</span>
      <strong>{{ totalProducts }}</strong>
      <small>En el sistema</small>
    </article>

    <article class="stat-card">
      <span class="label">Variantes</span>
      <strong>{{ totalVariants }}</strong>
      <small>Disponibles</small>
    </article>

    <article class="stat-card">
      <span class="label">Catálogos activos</span>
      <strong>{{ activeCatalogs }}</strong>
      <small>Publicados</small>
    </article>

    <article class="stat-card warning">
      <span class="label">Stock bajo</span>
      <strong>{{ lowStock }}</strong>
      <small>Requieren atención</small>
    </article>
  </section>

  <section class="panel">
    <h3>Resumen</h3>
    <ul class="summary-list">
      <li v-for="catalog in props.catalogs.slice(0, 5)" :key="catalog.id ?? catalog.nombre">
        {{ catalog.nombre }}
        <span :class="catalog.activo ? 'ok' : 'off'">{{ catalog.activo ? 'Activo' : 'Inactivo' }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}
.stat-card {
  background: #fff;
  border: 1px solid #e7ece8;
  border-radius: 14px;
  padding: 18px;
  display: grid;
  gap: 6px;
}
.label {
  color: #66766d;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.stat-card strong {
  font-size: 28px;
  line-height: 1;
}
.stat-card small {
  color: #718078;
}
.warning {
  border-color: #f4d1c5;
}
.panel {
  background: #fff;
  border: 1px solid #e7ece8;
  border-radius: 14px;
  padding: 18px;
}
.summary-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 10px;
}
.summary-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #f6f9f6;
  border-radius: 10px;
}
.ok {
  color: #1f7a52;
  font-weight: 700;
}
.off {
  color: #8b4e45;
  font-weight: 700;
}
</style>
