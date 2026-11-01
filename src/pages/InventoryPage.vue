<script setup lang="ts">
import { ref } from 'vue'
import type { Variante } from '../api'
import ResponsiveRowInfoModal from '../components/ResponsiveRowInfoModal.vue'

const props = defineProps<{ variants: Variante[] }>()
const detailVariant = ref<Variante | null>(null)

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
          <th class="variant-info-cell">Info</th>
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
          <td class="variant-info-cell"><button class="variant-info" type="button" :aria-label="`Ver información de ${variant.nombre}`" @click="detailVariant = variant">Ver info</button></td>
        </tr>
      </tbody>
    </table>
    <ResponsiveRowInfoModal
      v-if="detailVariant"
      :title="detailVariant.nombre"
      :fields="[
        { label: 'Código', value: detailVariant.codigo },
        { label: 'Nombre', value: detailVariant.nombre },
        { label: 'Existencia', value: detailVariant.existencia },
        { label: 'Mínimo', value: detailVariant.existenciaMinima },
        { label: 'Estado', value: detailVariant.existencia <= detailVariant.existenciaMinima ? 'Bajo' : 'OK' },
      ]"
      @close="detailVariant = null"
    />
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
.variant-info-cell,.variant-info{display:none}
.variant-info{padding:7px 10px;border:0;border-radius:7px;background:#fff6f0;color:#c65b19;font:inherit;font-weight:700;cursor:pointer}
@media(max-width:600px){table,tbody{display:grid;width:100%;gap:8px}thead,tbody td:nth-child(1),tbody td:nth-child(4),tbody td:nth-child(5){display:none}tbody tr{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:8px;padding:10px;border:1px solid #e8e8e8;border-radius:9px}tbody td{padding:0;border:0}tbody td:nth-child(2){min-width:0;font-weight:700;overflow-wrap:anywhere}tbody td:nth-child(3){font-weight:700}.variant-info-cell{display:table-cell}.variant-info{display:block;font-size:12px;padding:7px}}
.empty {
  color: #6f7d76;
  padding: 18px 0;
}
</style>
