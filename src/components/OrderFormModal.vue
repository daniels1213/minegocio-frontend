<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { LoaderCircle, Plus, Save, Trash2, X } from 'lucide-vue-next'
import { api, type Cliente, type Producto } from '../api.ts'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'created'): void }>()
const products = ref<Producto[]>([])
const clients = ref<Cliente[]>([])
const clienteNombre = ref('')
const clienteTelefono = ref('')
const clienteDireccion = ref('')
const lines = ref<{ productoId: number | null; cantidad: number }[]>([{ productoId: null, cantidad: 1 }])
const loading = ref(false)
const error = ref('')

async function loadOptions() {
  if (!props.visible) return
  try {
    ;[products.value, clients.value] = await Promise.all([api.list<Producto>('productos'), api.list<Cliente>('clientes')])
  } catch (reason) { error.value = reason instanceof Error ? reason.message : 'No se pudieron cargar productos y clientes.' }
}

function addLine() { lines.value.push({ productoId: null, cantidad: 1 }) }
function removeLine(index: number) { if (lines.value.length > 1) lines.value.splice(index, 1) }
function normalize(value: string) { return value.trim().toLocaleLowerCase() }

async function save() {
  if (!clienteNombre.value.trim() || !clienteTelefono.value.trim()) { error.value = 'Nombre y WhatsApp del cliente son obligatorios.'; return }
  const validLines = lines.value.filter(line => line.productoId && line.cantidad > 0)
  if (!validLines.length) { error.value = 'Añade al menos un producto con cantidad.'; return }
  loading.value = true
  error.value = ''
  try {
    const existing = clients.value.find(client => normalize(client.nombre) === normalize(clienteNombre.value) && normalize(client.telefono) === normalize(clienteTelefono.value))
    const client = existing || await api.create<Cliente>('clientes', { nombre: clienteNombre.value.trim(), telefono: clienteTelefono.value.trim(), direccion: clienteDireccion.value.trim() })
    if (!client.id) throw new Error('No se pudo identificar al cliente.')
    await api.create('pedidos', { clienteId: client.id, listaProductos: validLines.map(line => ({ productoId: line.productoId, cantidad: line.cantidad })) })
    emit('created')
    emit('close')
  } catch (reason) { error.value = reason instanceof Error ? reason.message : 'No se pudo crear el pedido.' }
  finally { loading.value = false }
}

watch(() => props.visible, loadOptions)
onMounted(loadOptions)
</script>

<template>
  <div v-if="visible" class="modal-layer"><div class="modal"><div class="modal-head"><div><p class="eyebrow">Ventas</p><h3>Añadir pedido</h3></div><button type="button" @click="emit('close')"><X :size="18" /></button></div><div class="section-title">Información del cliente</div><div class="fields"><label>Nombre<input v-model="clienteNombre" type="text" /></label><label>WhatsApp<input v-model="clienteTelefono" type="tel" /></label><label>Dirección<input v-model="clienteDireccion" type="text" /></label></div><div class="section-title line-title">Productos</div><div class="lines"><div v-for="(line, index) in lines" :key="index" class="line"><select v-model.number="line.productoId"><option :value="null">Selecciona un producto</option><option v-for="product in products" :key="product.id" :value="product.id">{{ product.nombre }} · {{ product.precioVenta }}</option></select><input v-model.number="line.cantidad" type="number" min="1" /><button type="button" title="Quitar producto" @click="removeLine(index)"><Trash2 :size="16" /></button></div></div><button class="add-line" type="button" @click="addLine"><Plus :size="15" /> Añadir producto</button><p v-if="error" class="error">{{ error }}</p><div class="actions"><button class="secondary" type="button" @click="emit('close')">Cancelar</button><button class="primary" type="button" :disabled="loading" @click="save"><LoaderCircle v-if="loading" class="spin" :size="16" /><Save v-else :size="16" /> Guardar pedido</button></div></div></div>
</template>

<style scoped>
.modal-layer{position:fixed;inset:0;z-index:30;display:grid;place-items:center;padding:20px;background:#17332a66}.modal{width:min(680px,100%);max-height:calc(100vh - 40px);overflow:auto;padding:24px;border-radius:16px;background:#fff;box-shadow:0 20px 60px #17332a33}.modal-head,.actions{display:flex;align-items:center;justify-content:space-between;gap:14px}.modal-head h3{margin:6px 0 0;color:#17332a;font-size:24px}.modal-head button{border:0;background:transparent;color:#52655b;cursor:pointer}.eyebrow{margin:0;color:#6c8175;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.section-title{margin-top:22px;color:#17332a;font-weight:800}.fields{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:14px 0}.fields label{display:grid;gap:7px;color:#52655b;font-size:13px;font-weight:700}.fields label:last-child{grid-column:1/-1}.fields input,.line select,.line input{padding:11px;border:1px solid #dfe5df;border-radius:8px;font:inherit}.line-title{border-top:1px solid #edf1ed;padding-top:18px}.line{display:grid;grid-template-columns:1fr 100px 38px;gap:8px;margin-top:10px}.line button{border:0;border-radius:8px;background:#f8e9e6;color:#a8584e;cursor:pointer}.add-line{display:inline-flex;align-items:center;gap:5px;margin-top:12px;border:0;background:transparent;color:#1a7655;font-weight:700;cursor:pointer}.primary,.secondary{display:inline-flex;align-items:center;gap:7px;border:0;border-radius:9px;padding:11px 14px;font-weight:700;cursor:pointer}.primary{background:#1a5f47;color:#fff}.secondary{background:#e7f0ea;color:#1a5f47}.error{color:#a8584e}.spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:560px){.fields{grid-template-columns:1fr}.fields label:last-child{grid-column:auto}.line{grid-template-columns:1fr 70px 34px}}
</style>