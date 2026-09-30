<script setup lang="ts">
import { ref, watch } from 'vue'
import { Save, X } from 'lucide-vue-next'
import type { Producto } from '../api.ts'

const props = defineProps<{ product: Producto | null; saving: boolean; error: string }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', value: { nombre: string; descripcion: string; precioVenta: number; urlFoto: string }): void
}>()
const form = ref({ nombre: '', descripcion: '', precioVenta: 0, urlFoto: '' })

watch(() => props.product, (product) => {
  form.value = {
    nombre: product?.nombre || '',
    descripcion: product?.descripcion || '',
    precioVenta: product?.precioVenta || 0,
    urlFoto: product?.urlFoto || '',
  }
}, { immediate: true })
</script>

<template>
  <div v-if="props.product" class="modal-layer" @click.self="emit('close')">
    <form class="modal" role="dialog" aria-modal="true" aria-label="Editar producto" @submit.prevent="emit('save', form)">
      <header class="modal-head"><div><p class="eyebrow">Productos</p><h2>Editar información</h2></div><button class="icon-close" type="button" aria-label="Cerrar" @click="emit('close')"><X :size="18" /></button></header>
      <div class="fields">
        <label>Nombre<input v-model="form.nombre" required type="text" /></label>
        <label>Descripción<textarea v-model="form.descripcion" rows="3" /></label>
        <label>Precio de venta<input v-model.number="form.precioVenta" required type="number" min="0" step="0.01" /></label>
        <label>URL de foto<input v-model="form.urlFoto" type="url" placeholder="https://..." /></label>
      </div>
      <p v-if="props.error" class="error">{{ props.error }}</p>
      <footer class="actions"><button class="secondary" type="button" @click="emit('close')">Cancelar</button><button class="primary" type="submit" :disabled="props.saving"><Save :size="16" /> {{ props.saving ? 'Guardando...' : 'Guardar cambios' }}</button></footer>
    </form>
  </div>
</template>

<style scoped>
.modal-layer{position:fixed;inset:0;z-index:100;display:grid;place-items:center;overflow-y:auto;padding:16px;background:rgba(16,35,49,.64)}
.modal{width:min(520px,100%);max-height:calc(100dvh - 32px);overflow-y:auto;padding:24px;border:1px solid #d1dfe3;border-radius:12px;background:#fff;box-shadow:0 22px 70px rgba(10,31,44,.24)}
.modal-head,.actions{display:flex;align-items:center;justify-content:space-between;gap:14px}
.modal-head{margin-bottom:20px}
.modal-head h2{margin:6px 0;color:#18323d;font-size:23px}
.eyebrow{margin:0;color:#075a6c;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
.icon-close{display:grid;place-items:center;width:36px;height:36px;flex:0 0 auto;border:0;border-radius:8px;background:#e8f2f3;color:#075a6c}
.fields{display:grid;gap:14px;margin:20px 0}
.fields label{display:grid;gap:7px;color:#354f5b;font-size:13px;font-weight:700}
.fields input,.fields textarea{width:100%;min-width:0;padding:11px;border:1px solid #d1dfe3;border-radius:8px;color:#18323d;font:inherit;font-weight:400}
.fields textarea{resize:vertical}
.primary,.secondary{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:0;border-radius:8px;padding:11px 14px;font-weight:700}
.primary{background:#075a6c;color:#fff}.secondary{background:#dceff0;color:#064653}
.error{color:#a3312d}
@media(max-width:560px){.modal{padding:18px}.actions{flex-direction:column-reverse}.actions button{width:100%}}
</style>
