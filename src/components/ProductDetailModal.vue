<script setup lang="ts">
import { ref, watch } from 'vue'
import { CalendarDays, Package, Pencil, X } from 'lucide-vue-next'
import { api, type Variante } from '../api.ts'
import type { Producto } from '../api.ts'
import { formatDate } from '../date.ts'

const props = defineProps<{ product: Producto | null }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'edit', product: Producto): void }>()
const variantCount = ref<number | null>(null)
const variantCountError = ref('')

watch(() => props.product, async (product) => {
  variantCount.value = null
  variantCountError.value = ''
  if (!product?.id) return
  try {
    variantCount.value = (await api.variantesProducto<Variante>(product.id)).length
  } catch (reason) {
    variantCountError.value = reason instanceof Error ? reason.message : 'No se pudo cargar el número de variantes.'
  }
}, { immediate: true })
</script>

<template>
  <div v-if="props.product" class="detail-layer" @click.self="emit('close')">
    <section class="detail-modal" role="dialog" aria-modal="true" :aria-label="`Información de ${props.product.nombre}`">
      <header class="detail-heading">
        <div><p class="eyebrow">Productos</p><h2>Información del producto</h2></div>
        <button class="detail-close" type="button" aria-label="Cerrar" @click="emit('close')"><X :size="19" /></button>
      </header>
      <div class="product-summary">
        <img v-if="props.product.urlFoto" class="detail-photo" :src="props.product.urlFoto" :alt="props.product.nombre" />
        <div v-else class="detail-photo photo-placeholder" aria-hidden="true"><Package :size="28" /></div>
        <div class="product-identity">
          <p class="section-label">Producto</p>
          <h3>{{ props.product.nombre }}</h3>
        </div>
      </div>

      <section class="info-section" aria-labelledby="general-info-title">
        <h3 id="general-info-title" class="section-title">Información general</h3>
        <div class="description-card">
          <span class="field-label">Descripción</span>
          <p>{{ props.product.descripcion || 'Sin descripción' }}</p>
        </div>
      </section>

      <section class="info-section" aria-labelledby="inventory-info-title">
        <h3 id="inventory-info-title" class="section-title">Inventario</h3>
        <div class="inventory-stats">
          <div class="stat-card">
            <span class="field-label">Existencia actual</span>
            <strong>{{ props.product.stockActual }}</strong>
            <span class="stat-caption">unidades</span>
          </div>
          <div class="stat-card">
            <span class="field-label">Variantes</span>
            <strong>{{ variantCount ?? (variantCountError ? '—' : '…') }}</strong>
            <span class="stat-caption">{{ variantCountError ? 'No disponible' : 'registradas' }}</span>
          </div>
        </div>
      </section>

      <section class="info-section record-section" aria-labelledby="record-info-title">
        <h3 id="record-info-title" class="section-title">Registro</h3>
        <div class="record-card">
          <CalendarDays :size="18" aria-hidden="true" />
          <div><span class="field-label">Fecha de creación</span><strong>{{ formatDate(props.product.fechaCreacion) }}</strong></div>
        </div>
      </section>

      <p v-if="variantCountError" class="detail-error">{{ variantCountError }}</p>
      <footer class="detail-actions">
        <button class="edit-action" type="button" @click="emit('edit', props.product)"><Pencil :size="16" /> Editar información</button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.detail-layer{position:fixed;inset:0;z-index:100;display:grid;place-items:center;overflow-y:auto;padding:16px;background:rgba(0,0,0,.64)}
.detail-modal{width:min(520px,100%);max-height:calc(100dvh - 32px);overflow-y:auto;padding:24px;border:1px solid #e8e8e8;border-radius:12px;background:#fff;box-shadow:0 22px 70px rgba(0,0,0,.2)}
.detail-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:20px}
.detail-heading h2{margin:6px 0 0;color:#171717;font-size:23px;overflow-wrap:anywhere}
.eyebrow{margin:0;color:#c65b19;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
.detail-close{display:grid;place-items:center;width:36px;height:36px;flex:0 0 auto;border:0;border-radius:8px;background:#fff6f0;color:#c65b19;cursor:pointer}
.product-summary{display:flex;align-items:center;gap:16px;margin-bottom:24px;padding:14px;border:1px solid #eee;border-radius:10px;background:#fafafa}
.detail-photo{width:88px;height:88px;flex:0 0 auto;border-radius:8px;object-fit:cover;background:#f0f0f0}
.photo-placeholder{display:grid;place-items:center;color:#c65b19}
.product-identity{min-width:0}
.section-label,.field-label{display:block;color:#777;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
.product-identity h3{margin:5px 0 0;color:#171717;font-size:18px;overflow-wrap:anywhere}
.info-section{margin-top:22px}
.section-title{margin:0 0 10px;color:#333;font-size:14px;font-weight:800}
.description-card,.stat-card,.record-card{border:1px solid #e8e8e8;border-radius:9px;background:#fff}
.description-card{padding:12px 14px}
.description-card p{margin:6px 0 0;color:#171717;font-size:14px;line-height:1.55;overflow-wrap:anywhere}
.inventory-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.stat-card{display:flex;min-height:92px;flex-direction:column;justify-content:center;padding:12px 14px}
.stat-card strong{margin-top:4px;color:#171717;font-size:22px;line-height:1.2}
.stat-caption{margin-top:3px;color:#777;font-size:12px}
.record-card{display:flex;align-items:center;gap:12px;padding:13px 14px;color:#c65b19}
.record-card div{display:grid;gap:4px}
.record-card strong{color:#171717;font-size:14px;font-weight:600}
.detail-error{margin:12px 0 0;color:#a8584e;font-size:13px}
.detail-actions{display:flex;justify-content:flex-end;margin-top:24px;padding-top:16px;border-top:1px solid #eee}
.edit-action{display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:10px 14px;border:0;border-radius:8px;background:#171717;color:#fff;font-weight:700;cursor:pointer}
@media(max-width:560px){.detail-modal{padding:18px}.detail-photo{width:72px;height:72px}.inventory-stats{gap:8px}.stat-card{padding:11px}.detail-actions button{width:100%}}
</style>
