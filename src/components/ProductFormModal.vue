<script setup lang="ts">
import { ref } from 'vue'
import { LoaderCircle, Save, X } from 'lucide-vue-next'
import { api } from '../api.ts'

defineProps<{ visible: boolean }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'created', productId: number, withSupplier: boolean): void }>()
const nombre = ref('')
const descripcion = ref('')
const withSupplier = ref(false)
const loading = ref(false)
const error = ref('')

async function save() {
  if (!nombre.value.trim()) {
    error.value = 'El nombre del producto es obligatorio.'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const product = await api.create<{ id: number }>('productos', {
      nombre: nombre.value.trim(),
      descripcion: descripcion.value.trim(),
      precioVenta: 0,
      monedaVenta: 'CUP',
    })
    if (!product.id) throw new Error('El backend no devolvió el producto creado.')
    emit('created', product.id, withSupplier.value)
    emit('close')
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'No se pudo crear el producto.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div v-if="visible" class="modal-layer" @click.self="emit('close')">
    <form class="modal" role="dialog" aria-modal="true" aria-label="Nuevo producto" @submit.prevent="save">
      <header class="modal-head">
        <div><p class="eyebrow">Productos</p><h3>Nuevo producto</h3></div>
        <button type="button" aria-label="Cerrar" @click="emit('close')"><X :size="18" /></button>
      </header>
      <div class="fields">
        <label>Nombre<input v-model="nombre" type="text" required /></label>
        <label>Descripción<textarea v-model="descripcion" rows="3" /></label>
        <label class="check"><input v-model="withSupplier" type="checkbox" /> Añadir información del proveedor después de guardar</label>
      </div>
      <p v-if="error" class="error">{{ error }}</p>
      <div class="actions">
        <button class="secondary" type="button" @click="emit('close')">Cancelar</button>
        <button class="primary" type="submit" :disabled="loading">
          <LoaderCircle v-if="loading" class="spin" :size="16" /><Save v-else :size="16" />
          {{ loading ? 'Creando...' : 'Crear producto' }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.modal-layer{position:fixed;inset:0;z-index:30;display:grid;place-items:center;padding:20px;background:rgba(0,0,0,.66)}.modal{width:min(600px,100%);max-height:calc(100dvh - 40px);overflow-y:auto;padding:24px;border-radius:16px;background:#fff;box-shadow:0 20px 60px rgba(0,0,0,.2)}.modal-head,.actions{display:flex;align-items:center;justify-content:space-between;gap:14px}.modal-head h3{margin:6px 0 0;color:#171717;font-size:24px}.modal-head button{border:0;background:transparent;color:#777;cursor:pointer}.eyebrow{margin:0;color:#777;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.fields{display:grid;gap:14px;margin:24px 0}.fields label{display:grid;gap:7px;color:#333;font-size:13px;font-weight:700}.fields input,.fields textarea{padding:11px;border:1px solid #e8e8e8;border-radius:8px;font:inherit;font-weight:400;background:#fff}.check{display:flex!important;align-items:center;gap:8px}.check input{accent-color:#c65b19}.primary,.secondary{display:inline-flex;align-items:center;gap:7px;border:0;border-radius:9px;padding:11px 14px;font-weight:700;cursor:pointer}.primary{background:#171717;color:#fff}.secondary{background:#fff6f0;color:#c65b19}.error{color:#a8584e}.spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
</style>