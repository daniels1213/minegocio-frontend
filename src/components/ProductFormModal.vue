<script setup lang="ts">
import { ref } from 'vue'
import { LoaderCircle, Save, X } from 'lucide-vue-next'
import { api } from '../api.ts'

defineProps<{ visible: boolean }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'created', productId: number, withSupplier: boolean): void }>()
const nombre = ref('')
const descripcion = ref('')
const precioVenta = ref<number | null>(null)
const stockInicial = ref<number>(0)
const withSupplier = ref(false)
const loading = ref(false)
const error = ref('')

async function save() {
  if (!nombre.value.trim() || precioVenta.value === null || precioVenta.value < 0 || stockInicial.value < 0) {
    error.value = 'Nombre, precio de venta y stock inicial válido son obligatorios.'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const product = await api.create<{ id: number }>('productos', { nombre: nombre.value.trim(), descripcion: descripcion.value.trim(), precioVenta: precioVenta.value, stockInicial: stockInicial.value })
    if (!product.id) throw new Error('El backend no devolvió el producto creado.')
    emit('created', product.id, withSupplier.value)
    emit('close')
  } catch (reason) { error.value = reason instanceof Error ? reason.message : 'No se pudo crear el producto.' }
  finally { loading.value = false }
}
</script>

<template>
  <div v-if="visible" class="modal-layer"><div class="modal"><div class="modal-head"><div><p class="eyebrow">Productos</p><h3>Nuevo producto</h3></div><button type="button" @click="emit('close')"><X :size="18" /></button></div><div class="fields"><label>Nombre<input v-model="nombre" type="text" /></label><label>Descripción<textarea v-model="descripcion" rows="3" /></label><div class="two-col"><label>Precio de venta<input v-model.number="precioVenta" type="number" min="0" step="0.01" /></label><label>Stock inicial<input v-model.number="stockInicial" type="number" min="0" step="1" /></label></div><label class="check"><input v-model="withSupplier" type="checkbox" /> Añadir información de proveedor después de guardar</label></div><p v-if="error" class="error">{{ error }}</p><div class="actions"><button class="secondary" type="button" @click="emit('close')">Cancelar</button><button class="primary" type="button" :disabled="loading" @click="save"><LoaderCircle v-if="loading" class="spin" :size="16" /><Save v-else :size="16" /> Crear producto</button></div></div></div>
</template>

<style scoped>
.modal-layer{position:fixed;inset:0;z-index:30;display:grid;place-items:center;padding:20px;background:#17332a66}.modal{width:min(600px,100%);padding:24px;border-radius:16px;background:#fff;box-shadow:0 20px 60px #17332a33}.modal-head,.actions{display:flex;align-items:center;justify-content:space-between;gap:14px}.modal-head h3{margin:6px 0 0;color:#17332a;font-size:24px}.modal-head button{border:0;background:transparent;color:#52655b;cursor:pointer}.eyebrow{margin:0;color:#6c8175;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.fields{display:grid;gap:14px;margin:24px 0}.fields label{display:grid;gap:7px;color:#52655b;font-size:13px;font-weight:700}.fields input,.fields textarea{padding:11px;border:1px solid #dfe5df;border-radius:8px;font:inherit;font-weight:400}.two-col{display:grid;grid-template-columns:1fr 1fr;gap:14px}.check{display:flex!important;align-items:center;gap:8px}.check input{accent-color:#1a5f47}.primary,.secondary{display:inline-flex;align-items:center;gap:7px;border:0;border-radius:9px;padding:11px 14px;font-weight:700;cursor:pointer}.primary{background:#1a5f47;color:#fff}.secondary{background:#e7f0ea;color:#1a5f47}.error{color:#a8584e}.spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:560px){.two-col{grid-template-columns:1fr}}
</style>