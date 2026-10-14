<script setup lang="ts">
import { ref, watch } from 'vue'
import { LoaderCircle, Save, X } from 'lucide-vue-next'
import type { Producto, TipoMovimiento, Variante } from '../api.ts'

const props = defineProps<{ product: Producto | null; variants: Variante[]; variantsLoading: boolean; variantsError: string; saving: boolean; error: string }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', value: { tipo: TipoMovimiento; cantidad: number; nuevoStock: number; entrada: boolean; varianteId?: number }): void
}>()
const form = ref<{ tipo: TipoMovimiento; cantidad: number; nuevoStock: number; entrada: boolean; varianteId: number | null }>({ tipo: 'COMPRA', cantidad: 1, nuevoStock: 0, entrada: true, varianteId: null })

watch([() => props.product, () => props.variants], ([product, variants]) => {
  form.value = {
    tipo: 'COMPRA',
    cantidad: 1,
    nuevoStock: variants.length ? variants[0].existencia : product?.stockActual || 0,
    entrada: true,
    varianteId: variants[0]?.id ?? null,
  }
}, { immediate: true })
</script>

<template>
  <div v-if="props.product" class="modal-layer" @click.self="emit('close')">
    <form class="modal" role="dialog" aria-modal="true" aria-label="Movimiento de inventario" @submit.prevent="emit('save', { ...form, varianteId: form.varianteId ?? undefined })">
      <header class="modal-head"><div><p class="eyebrow">Stock general: {{ props.product.stockActual }}</p><h2>Movimiento de inventario</h2><p class="product-name">{{ props.product.nombre }}</p></div><button class="icon-close" type="button" aria-label="Cerrar" @click="emit('close')"><X :size="18" /></button></header>
      <div class="fields">
        <label v-if="props.variants.length">Variante<select v-model.number="form.varianteId" required><option v-for="variant in props.variants" :key="variant.id" :value="variant.id">{{ variant.nombre }} · Stock: {{ variant.existencia }}</option></select></label>
        <p v-if="props.variantsLoading" class="info">Cargando variantes...</p>
        <p v-if="props.variantsError" class="error">{{ props.variantsError }}</p>
        <p v-if="props.variants.length && form.varianteId" class="info">El movimiento actualizará el stock de la variante y el stock general del producto.</p>
        <label>Tipo de movimiento<select v-model="form.tipo"><option value="COMPRA">Compra</option><option value="VENTA">Venta</option><option value="AJUSTE_INVENTARIO">Ajuste</option><option value="MERMA">Merma</option><option value="REGALO">Regalo</option><option value="OTRO">Otro</option></select></label>
        <label v-if="form.tipo === 'AJUSTE_INVENTARIO'">Nueva existencia<input v-model.number="form.nuevoStock" type="number" min="0" step="1" required /></label>
        <label v-else>Cantidad<input v-model.number="form.cantidad" type="number" min="1" step="1" required /></label>
        <label v-if="form.tipo === 'OTRO'">Afectación del stock<select v-model="form.entrada"><option :value="true">Aumentar existencia</option><option :value="false">Disminuir existencia</option></select></label>
      </div>
      <p v-if="props.error" class="error">{{ props.error }}</p>
      <footer class="actions"><button class="secondary" type="button" @click="emit('close')">Cancelar</button><button class="primary" type="submit" :disabled="props.saving || props.variantsLoading || Boolean(props.variantsError)"><LoaderCircle v-if="props.saving" class="spin" :size="16" /><Save v-else :size="16" /> {{ props.saving ? 'Guardando...' : 'Guardar movimiento' }}</button></footer>
    </form>
  </div>
</template>

<style scoped>
.modal-layer{position:fixed;inset:0;z-index:100;display:grid;place-items:center;overflow-y:auto;padding:16px;background:rgba(0,0,0,.64)}
.modal{width:min(520px,100%);max-height:calc(100dvh - 32px);overflow-y:auto;padding:24px;border:1px solid #e8e8e8;border-radius:12px;background:#fff;box-shadow:0 22px 70px rgba(0,0,0,.2)}
.modal-head,.actions{display:flex;align-items:center;justify-content:space-between;gap:14px}
.modal-head{align-items:flex-start;margin-bottom:20px}
.modal-head h2{margin:6px 0;color:#171717;font-size:23px}
.eyebrow{margin:0;color:#c65b19;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
.product-name{margin:5px 0 0;color:#777}
.icon-close{display:grid;place-items:center;width:36px;height:36px;flex:0 0 auto;border:0;border-radius:8px;background:#fff6f0;color:#c65b19}
.fields{display:grid;gap:14px;margin:20px 0}
.fields label{display:grid;gap:7px;color:#333;font-size:13px;font-weight:700}
.fields input,.fields select{width:100%;min-width:0;padding:11px;border:1px solid #e8e8e8;border-radius:8px;background:#fff;color:#171717;font:inherit;font-weight:400}.info{margin:0;color:#777;font-size:13px}
.primary,.secondary{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:0;border-radius:8px;padding:11px 14px;font-weight:700}
.primary{background:#171717;color:#fff}.secondary{background:#fff6f0;color:#c65b19}
.error{color:#a8584e}.spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:560px){.modal{padding:18px}.actions{flex-direction:column-reverse}.actions button{width:100%}}
</style>
