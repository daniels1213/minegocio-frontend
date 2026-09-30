<script setup lang="ts">
import { X } from 'lucide-vue-next'
import type { Producto } from '../api.ts'

const props = defineProps<{ product: Producto | null }>()
const emit = defineEmits<{ (e: 'close'): void }>()
</script>

<template>
  <div v-if="props.product" class="detail-layer" @click.self="emit('close')">
    <section class="detail-modal" role="dialog" aria-modal="true" :aria-label="`Información de ${props.product.nombre}`">
      <header class="detail-heading">
        <div><p class="detail-eyebrow">Detalle del producto</p><h2>{{ props.product.nombre }}</h2></div>
        <button class="detail-close" type="button" aria-label="Cerrar" @click="emit('close')"><X :size="19" /></button>
      </header>
      <img v-if="props.product.urlFoto" class="detail-photo" :src="props.product.urlFoto" :alt="props.product.nombre" />
      <dl class="detail-list">
        <div><dt>Descripción</dt><dd>{{ props.product.descripcion || 'Sin descripción' }}</dd></div>
        <div><dt>Precio de venta</dt><dd>{{ props.product.precioVenta }}</dd></div>
        <div><dt>Existencia actual</dt><dd>{{ props.product.stockActual }}</dd></div>
        <div><dt>Último precio de compra</dt><dd>{{ props.product.ultimoPrecioCompra ?? '—' }}</dd></div>
        <div><dt>Creado</dt><dd>{{ props.product.fechaCreacion ? new Date(props.product.fechaCreacion).toLocaleString() : '—' }}</dd></div>
      </dl>
    </section>
  </div>
</template>

<style scoped>
.detail-layer{position:fixed;inset:0;z-index:100;display:grid;place-items:center;overflow-y:auto;padding:16px;background:rgba(16,35,49,.64)}
.detail-modal{width:min(520px,100%);max-height:calc(100dvh - 32px);overflow-y:auto;padding:24px;border:1px solid #d1dfe3;border-radius:12px;background:#fff;box-shadow:0 22px 70px rgba(10,31,44,.24)}
.detail-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:18px}
.detail-heading h2{margin:5px 0 0;color:#18323d;font-size:23px;overflow-wrap:anywhere}
.detail-eyebrow{margin:0;color:#075a6c;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
.detail-close{display:grid;place-items:center;width:36px;height:36px;flex:0 0 auto;border:0;border-radius:8px;background:#e8f2f3;color:#075a6c;cursor:pointer}
.detail-photo{width:100%;max-height:220px;margin-bottom:16px;border-radius:8px;object-fit:contain;background:#f3f7f8}
.detail-list{display:grid;gap:0;margin:0}
.detail-list div{display:flex;justify-content:space-between;gap:18px;padding:11px 0;border-top:1px solid #e4ecee}
.detail-list dt{color:#536b76;font-size:13px}
.detail-list dd{margin:0;color:#18323d;font-weight:700;text-align:right;overflow-wrap:anywhere}
@media(max-width:560px){.detail-modal{padding:18px}.detail-list div{align-items:flex-start;flex-direction:column;gap:4px}.detail-list dd{text-align:left}}
</style>
