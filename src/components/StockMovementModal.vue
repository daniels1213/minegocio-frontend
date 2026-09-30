<script setup lang="ts">
import { ref, watch } from 'vue'
import { LoaderCircle, Save, X } from 'lucide-vue-next'
import type { Producto, TipoMovimiento } from '../api.ts'

const props = defineProps<{ product: Producto | null; saving: boolean; error: string }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', value: { tipo: TipoMovimiento; cantidad: number; nuevoStock: number; entrada: boolean; motivo: string }): void
}>()
const form = ref({ tipo: 'COMPRA' as TipoMovimiento, cantidad: 1, nuevoStock: 0, entrada: true, motivo: '' })

watch(() => props.product, (product) => {
  form.value = { tipo: 'COMPRA', cantidad: 1, nuevoStock: product?.stockActual || 0, entrada: true, motivo: '' }
}, { immediate: true })
</script>

<template>
  <div v-if="props.product" class="modal-layer" @click.self="emit('close')">
    <form class="modal" role="dialog" aria-modal="true" aria-label="Movimiento de inventario" @submit.prevent="emit('save', form)">
      <header class="modal-head"><div><p class="eyebrow">Stock actual: {{ props.product.stockActual }}</p><h2>Movimiento de inventario</h2><p class="product-name">{{ props.product.nombre }}</p></div><button class="icon-close" type="button" aria-label="Cerrar" @click="emit('close')"><X :size="18" /></button></header>
      <div class="fields">
        <label>Tipo de movimiento<select v-model="form.tipo"><option value="COMPRA">Compra</option><option value="VENTA">Venta</option><option value="AJUSTE_INVENTARIO">Ajuste</option><option value="MERMA">Merma</option><option value="REGALO">Regalo</option><option value="OTRO">Otro</option></select></label>
        <label v-if="form.tipo === 'AJUSTE_INVENTARIO'">Nueva existencia<input v-model.number="form.nuevoStock" type="number" min="0" step="1" required /></label>
        <label v-else>Cantidad<input v-model.number="form.cantidad" type="number" min="1" step="1" required /></label>
        <label v-if="form.tipo === 'OTRO'">Afectación del stock<select v-model="form.entrada"><option :value="true">Aumentar existencia</option><option :value="false">Disminuir existencia</option></select></label>
        <label v-if="form.tipo === 'OTRO'">Motivo<input v-model="form.motivo" type="text" maxlength="300" required /></label>
      </div>
      <p v-if="props.error" class="error">{{ props.error }}</p>
      <footer class="actions"><button class="secondary" type="button" @click="emit('close')">Cancelar</button><button class="primary" type="submit" :disabled="props.saving"><LoaderCircle v-if="props.saving" class="spin" :size="16" /><Save v-else :size="16" /> {{ props.saving ? 'Guardando...' : 'Guardar movimiento' }}</button></footer>
    </form>
  </div>
</template>

<style scoped>
.modal-layer{position:fixed;inset:0;z-index:100;display:grid;place-items:center;overflow-y:auto;padding:16px;background:rgba(16,35,49,.64)}
.modal{width:min(520px,100%);max-height:calc(100dvh - 32px);overflow-y:auto;padding:24px;border:1px solid #d1dfe3;border-radius:12px;background:#fff;box-shadow:0 22px 70px rgba(10,31,44,.24)}
.modal-head,.actions{display:flex;align-items:center;justify-content:space-between;gap:14px}
.modal-head{align-items:flex-start;margin-bottom:20px}
.modal-head h2{margin:6px 0;color:#18323d;font-size:23px}
.eyebrow{margin:0;color:#075a6c;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
.product-name{margin:5px 0 0;color:#536b76}
.icon-close{display:grid;place-items:center;width:36px;height:36px;flex:0 0 auto;border:0;border-radius:8px;background:#e8f2f3;color:#075a6c}
.fields{display:grid;gap:14px;margin:20px 0}
.fields label{display:grid;gap:7px;color:#354f5b;font-size:13px;font-weight:700}
.fields input,.fields select{width:100%;min-width:0;padding:11px;border:1px solid #d1dfe3;border-radius:8px;background:#fff;color:#18323d;font:inherit;font-weight:400}
.primary,.secondary{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:0;border-radius:8px;padding:11px 14px;font-weight:700}
.primary{background:#075a6c;color:#fff}.secondary{background:#dceff0;color:#064653}
.error{color:#a3312d}.spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:560px){.modal{padding:18px}.actions{flex-direction:column-reverse}.actions button{width:100%}}
</style>
