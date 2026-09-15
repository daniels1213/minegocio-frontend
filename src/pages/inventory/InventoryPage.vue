<script setup lang="ts">
import type { Variante } from '../../api'

const props = defineProps<{
  variants: Variante[]
}>()
</script>

<template>
  <section class="panel">
    <h3>Inventario</h3>

    <div v-if="!props.variants.length" class="empty">
      No hay variantes registradas.
    </div>

    <table v-else>
      <thead>
        <tr>
          <th>Código</th>
          <th>Nombre</th>
          <th>Existencia</th>
          <th>Mínimo</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="variant in props.variants" :key="variant.id ?? variant.codigo">
          <td>{{ variant.codigo }}</td>
          <td>{{ variant.nombre }}</td>
          <td>{{ variant.existencia }}</td>
          <td>{{ variant.existenciaMinima }}</td>
          <td>
            <span :class="variant.existencia <= variant.existenciaMinima ? 'danger' : 'ok'">
              {{ variant.existencia <= variant.existenciaMinima ? 'Bajo' : 'OK' }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.panel {
  background: #fff;
  border: 1px solid #e7ece8;
  border-radius: 14px;
  padding: 18px;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th, td {
  padding: 12px 10px;
  border-bottom: 1px solid #eef1ee;
  text-align: left;
}
th {
  color: #586a5f;
  text-transform: uppercase;
  font-size: 12px;
}
.ok {
  color: #1f7a52;
  font-weight: 700;
}
.danger {
  color: #a0483f;
  font-weight: 700;
}
.empty {
  color: #6f7d76;
  padding: 18px 0;
}
</style>
