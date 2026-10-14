<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { LoaderCircle, Plus, Save, Trash2, X } from 'lucide-vue-next'
import { ApiError, api, type Cliente, type Combo, type Pedido, type Producto, type Variante } from '../api.ts'

const props = defineProps<{ visible: boolean; order?: Pedido }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'created'): void }>()
type OrderLine = {
  selection: string
  productoId: number | null
  comboId: number | null
  cantidad: number
  variantes: Record<number, number | null>
}

const products = ref<Producto[]>([])
const combos = ref<Combo[]>([])
const clients = ref<Cliente[]>([])
const clientsLoading = ref(false)
const clientsLoaded = ref(false)
const selectedClientId = ref<number | null>(null)
const variantOptions = ref<Record<number, Variante[]>>({})
const loadingVariants = ref<number[]>([])
const clienteNombre = ref('')
const clienteTelefono = ref('')
const clienteDireccion = ref('')
const clientLookupError = ref('')
const lines = ref<OrderLine[]>([newLine()])
const loading = ref(false)
const error = ref('')

const clientsForTelephone = computed(() => {
  const telephone = normalizeTelephone(clienteTelefono.value)
  if (!telephone) return []
  return clients.value.filter((client) => normalizeTelephone(client.telefono) === telephone)
})
const selectedClient = computed(() =>
  clientsForTelephone.value.find((client) => client.id === selectedClientId.value),
)

function newLine(): OrderLine {
  return { selection: '', productoId: null, comboId: null, cantidad: 1, variantes: {} }
}

function resetOrderForm() {
  selectedClientId.value = null
  clienteNombre.value = ''
  clienteTelefono.value = ''
  clienteDireccion.value = ''
  lines.value = [newLine()]
}

function hydrateOrder() {
  const order = props.order
  if (!order) return
  const client = clients.value.find((item) => item.id === order.clienteId)
  clienteNombre.value = order.clienteNombre || client?.nombre || ''
  clienteTelefono.value = order.clienteTelefono || client?.telefono || ''
  clienteDireccion.value = client?.direccion || ''
  selectedClientId.value = order.clienteId
  lines.value = (order.listaProductos || order.detalles || []).map((detail) => {
    const variantes: Record<number, number | null> = {}
    if (detail.productoId) variantes[detail.productoId] = detail.varianteId ?? null
    for (const component of detail.componentes || []) {
      variantes[component.productoId] = component.varianteId ?? null
    }
    return {
      selection: detail.comboId ? `combo:${detail.comboId}` : `producto:${detail.productoId}`,
      productoId: detail.productoId ?? null,
      comboId: detail.comboId ?? null,
      cantidad: detail.cantidad,
      variantes,
    }
  })
  const productIds = new Set<number>()
  for (const line of lines.value) {
    if (line.productoId) productIds.add(line.productoId)
    for (const productId of Object.keys(line.variantes)) productIds.add(Number(productId))
  }
  void Promise.all([...productIds].map(loadVariants))
}

async function loadOptions() {
  if (!props.visible) return
  error.value = ''
  clientsLoading.value = true
  clientsLoaded.value = false
  clientLookupError.value = ''
  try {
    ;[products.value, clients.value, combos.value] = await Promise.all([
      api.list<Producto>('productos'),
      api.list<Cliente>('clientes'),
      api.combos<Combo>(),
    ])
    clientsLoaded.value = true
    if (props.order) hydrateOrder()
    else resetOrderForm()
  } catch (reason) {
    clientLookupError.value = reason instanceof Error ? reason.message : 'No se pudieron cargar los clientes.'
    error.value = reason instanceof Error ? reason.message : 'No se pudieron cargar productos, combos y clientes.'
  } finally {
    clientsLoading.value = false
  }
}

async function loadVariants(productId: number) {
  if (variantOptions.value[productId] || loadingVariants.value.includes(productId)) return
  loadingVariants.value = [...loadingVariants.value, productId]
  error.value = ''
  try {
    const variants = await api.variantesProducto<Variante>(productId)
    variantOptions.value = { ...variantOptions.value, [productId]: variants.filter((item) => item.activa) }
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'No se pudieron cargar las variantes.'
  } finally {
    loadingVariants.value = loadingVariants.value.filter((id) => id !== productId)
  }
}

async function selectOrderItem(line: OrderLine, value: string) {
  line.selection = value
  line.productoId = null
  line.comboId = null
  line.variantes = {}
  const [type, idText] = value.split(':')
  const id = Number(idText)
  if (!Number.isInteger(id) || id < 1) return

  if (type === 'producto') {
    line.productoId = id
    await loadVariants(id)
    return
  }
  if (type === 'combo') {
    const combo = combos.value.find((item) => item.id === id)
    if (!combo) return
    line.comboId = id
    for (const component of combo.componentes) line.variantes[component.productoId] = null
    await Promise.all(combo.componentes.map((component) => loadVariants(component.productoId)))
  }
}

function addLine() {
  lines.value.push(newLine())
}

function removeLine(index: number) {
  if (lines.value.length > 1) lines.value.splice(index, 1)
}

function normalizeTelephone(value: string) {
  return value.replace(/\D/g, '')
}

function updateTelephone(value: string) {
  if (normalizeTelephone(value) !== normalizeTelephone(clienteTelefono.value)) {
    if (selectedClientId.value !== null) {
      clienteNombre.value = ''
      clienteDireccion.value = ''
    }
    selectedClientId.value = null
  }
  clienteTelefono.value = value
}

function selectClient(client: Cliente) {
  selectedClientId.value = client.id ?? null
  clienteNombre.value = client.nombre
  clienteDireccion.value = client.direccion || ''
}

function clearSelectedClient() {
  selectedClientId.value = null
}

async function getOrCreateClient() {
  clients.value = await api.list<Cliente>('clientes')
  const client = selectedClientId.value
    ? clients.value.find((item) => item.id === selectedClientId.value)
    : undefined
  if (client && normalizeTelephone(client.telefono) === normalizeTelephone(clienteTelefono.value)) return client
  selectedClientId.value = null

  const matches = clientsForTelephone.value
  if (matches.length) {
    throw new Error('Ya existe un cliente con ese WhatsApp. Selecciónalo antes de guardar el pedido.')
  }

  try {
    return await api.create<Cliente>('clientes', {
      nombre: clienteNombre.value.trim(),
      telefono: clienteTelefono.value.trim(),
      direccion: clienteDireccion.value.trim(),
    })
  } catch (reason) {
    if (!(reason instanceof ApiError) || reason.status !== 409) throw reason
    clients.value = await api.list<Cliente>('clientes')
    const racedClient = clientsForTelephone.value[0]
    if (racedClient) return racedClient
    throw reason
  }
}

async function retryClientLookup() {
  clientsLoading.value = true
  clientLookupError.value = ''
  try {
    clients.value = await api.list<Cliente>('clientes')
    clientsLoaded.value = true
  } catch (reason) {
    clientLookupError.value = reason instanceof Error ? reason.message : 'No se pudieron cargar los clientes.'
  } finally {
    clientsLoading.value = false
  }
}

function comboForLine(line: OrderLine): Combo | undefined {
  return combos.value.find((combo) => combo.id === line.comboId)
}

function hasVariants(productId: number) {
  return (variantOptions.value[productId] || []).length > 0
}

function variantName(productId: number, variantId: number | null) {
  return variantOptions.value[productId]?.find((variant) => variant.id === variantId)?.nombre || ''
}

function orderLinePayload(line: OrderLine) {
  if (line.productoId) {
    return {
      productoId: line.productoId,
      varianteId: line.variantes[line.productoId] || undefined,
      cantidad: line.cantidad,
    }
  }

  const combo = comboForLine(line)
  if (!combo) throw new Error('Selecciona un producto o combo para cada línea.')
  return {
    comboId: combo.id,
    cantidad: line.cantidad,
    componentes: combo.componentes.map((component) => ({
      productoId: component.productoId,
      varianteId: line.variantes[component.productoId] || undefined,
    })),
  }
}

function getAvailableStock(productId: number, variantId: number | null): number {
  const product = products.value.find(p => p.id === productId)
  if (!product) return 0
  if (variantId) {
    const variant = variantOptions.value[productId]?.find(v => v.id === variantId)
    return variant?.existencia ?? 0
  }
  return product.stockActual
}

function validateStockBeforeSubmit(validLines: OrderLine[]): string | null {
  for (const line of validLines) {
    if (line.productoId) {
      const variantId = line.variantes[line.productoId]
      const available = getAvailableStock(line.productoId, variantId)
      if (line.cantidad > available) {
        const product = products.value.find(p => p.id === line.productoId)
        const variantNameStr = variantId ? ` (${variantOptions.value[line.productoId]?.find(v => v.id === variantId)?.nombre || ''})` : ''
        return `Stock insuficiente para "${product?.nombre}${variantNameStr}". Disponible: ${available}, solicitado: ${line.cantidad}.`
      }
    } else {
      const combo = comboForLine(line)
      if (!combo) continue
      for (const component of combo.componentes) {
        const variantId = line.variantes[component.productoId]
        const available = getAvailableStock(component.productoId, variantId)
        const required = component.cantidad * line.cantidad
        if (required > available) {
          const product = products.value.find(p => p.id === component.productoId)
          const variantNameStr = variantId ? ` (${variantOptions.value[component.productoId]?.find(v => v.id === variantId)?.nombre || ''})` : ''
          return `Stock insuficiente para "${product?.nombre}${variantNameStr}" (combo "${combo.nombre}"). Disponible: ${available}, requerido: ${required}.`
        }
      }
    }
  }
  return null
}

async function save() {
  if (!clienteNombre.value.trim() || !clienteTelefono.value.trim()) {
    error.value = 'Nombre y WhatsApp del cliente son obligatorios.'
    return
  }
  const validLines = lines.value.filter((line) => line.selection && line.cantidad > 0)
  if (!validLines.length) {
    error.value = 'Añade al menos un producto o combo con cantidad.'
    return
  }
  for (const line of validLines) {
    if (line.productoId && hasVariants(line.productoId) && !line.variantes[line.productoId]) {
      error.value = `Selecciona una variante para ${products.value.find((product) => product.id === line.productoId)?.nombre}.`
      return
    }
    const combo = comboForLine(line)
    const missingVariant = combo?.componentes.find((component) =>
      hasVariants(component.productoId) && !line.variantes[component.productoId],
    )
    if (missingVariant) {
      error.value = `Selecciona la variante de ${missingVariant.productoNombre || 'cada producto'} en el combo ${combo?.nombre}.`
      return
    }
  }

  // Validar stock disponible antes de enviar
  const stockError = validateStockBeforeSubmit(validLines)
  if (stockError) {
    error.value = stockError
    return
  }

  loading.value = true
  error.value = ''
  try {
    const clienteId = props.order ? props.order.clienteId : (await getOrCreateClient()).id
    if (!clienteId) throw new Error('No se pudo identificar al cliente.')
    const payload = {
      clienteId,
      listaProductos: validLines.map(orderLinePayload),
    }
    try {
      if (props.order?.id) await api.actualizarPedido(props.order.id, payload)
      else await api.create('pedidos', payload)
    } catch (reason) {
      if (reason instanceof ApiError) {
        if (reason.status === 409) {
          throw new Error(`El cliente se encontró, pero el servidor rechazó el pedido por un conflicto de datos: ${reason.message}`)
        }
        if (reason.status === 400) {
          throw new Error(reason.message)
        }
        if (reason.status === 404) {
          throw new Error('Producto o variante no encontrado. Refresca la página e intenta de nuevo.')
        }
      }
      throw reason
    }
    emit('created')
    emit('close')
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'No se pudo crear el pedido.'
  } finally {
    loading.value = false
  }
}

watch(() => props.visible, (visible) => {
  if (visible) void loadOptions()
})
watch(() => props.order, () => {
  if (props.visible && props.order) hydrateOrder()
})
onMounted(() => void loadOptions())
</script>

<template>
  <div v-if="visible" class="modal-layer">
    <form class="modal" role="dialog" aria-modal="true" aria-label="Añadir pedido" @submit.prevent="save">
      <header class="modal-head">
        <div><p class="eyebrow">Ventas</p><h3>{{ props.order ? 'Editar pedido' : 'Añadir pedido' }}</h3></div>
        <button type="button" aria-label="Cerrar" @click="emit('close')"><X :size="18" /></button>
      </header>
      <div class="section-title">Información del cliente</div>
      <div class="client-lookup">
        <p class="lookup-instruction">{{ props.order ? 'Cliente asociado a este pedido.' : 'Primero escribe el WhatsApp para buscar al cliente.' }}</p>
        <label>WhatsApp<input :value="clienteTelefono" type="tel" required autocomplete="tel" :readonly="Boolean(props.order)" @input="updateTelephone(($event.target as HTMLInputElement).value)" /></label>
        <div v-if="clientsLoading" class="client-match-state"><LoaderCircle class="spin" :size="15" /> Buscando clientes...</div>
        <div v-else-if="clientLookupError" class="client-match-state lookup-error" role="alert">
          <span>No se pudo consultar la lista de clientes. {{ clientLookupError }}</span>
          <button type="button" @click="retryClientLookup">Reintentar</button>
        </div>
        <section v-else-if="!props.order && clientsForTelephone.length" class="client-match" aria-live="polite">
          <template v-if="!selectedClient">
            <strong>Ya existe un cliente con este WhatsApp</strong>
            <p>Selecciona el cliente para completar sus datos:</p>
            <button v-for="client in clientsForTelephone" :key="client.id" class="client-match-option" type="button" @click="selectClient(client)">
              <span><strong>{{ client.nombre }}</strong><small>{{ client.direccion || 'Sin dirección registrada' }}</small></span>
              <span class="choose-client">Seleccionar</span>
            </button>
          </template>
          <div v-else class="selected-client">
            <span><strong>Cliente seleccionado: {{ selectedClient.nombre }}</strong><small>{{ selectedClient.direccion || 'Sin dirección registrada' }}</small></span>
            <button type="button" @click="clearSelectedClient">Cambiar</button>
          </div>
        </section>
        <p v-else-if="!props.order && clientsLoaded && normalizeTelephone(clienteTelefono)" class="client-match-state new-client-hint" aria-live="polite">
          No existe un cliente con este WhatsApp. Completa sus datos y se creará al guardar el pedido.
        </p>
      </div>
      <div v-if="props.order || selectedClient || (clientsLoaded && !clientsForTelephone.length && normalizeTelephone(clienteTelefono))" class="fields client-fields">
        <label>Nombre<input v-model="clienteNombre" type="text" required :readonly="Boolean(props.order || selectedClient)" /></label>
        <label>Dirección<input v-model="clienteDireccion" type="text" :readonly="Boolean(props.order || selectedClient)" /></label>
      </div>
      <div class="section-title line-title">Productos y combos</div>
      <div class="lines">
        <section v-for="(line, index) in lines" :key="index" class="order-line">
          <div class="line">
            <select :value="line.selection" required @change="selectOrderItem(line, ($event.target as HTMLSelectElement).value)">
              <option value="">Selecciona un producto o combo</option>
              <optgroup label="Productos">
                <option v-for="product in products" :key="product.id" :value="`producto:${product.id}`">{{ product.nombre }} · {{ product.precioVenta }}</option>
              </optgroup>
              <optgroup v-if="combos.length" label="Combos">
                <option v-for="combo in combos" :key="combo.id" :value="`combo:${combo.id}`">{{ combo.nombre }} · {{ combo.precio }}</option>
              </optgroup>
            </select>
            <input v-model.number="line.cantidad" type="number" min="1" step="1" aria-label="Cantidad" />
            <button type="button" title="Quitar línea" :disabled="lines.length === 1" @click="removeLine(index)"><Trash2 :size="16" /></button>
          </div>
          <div v-if="line.productoId && hasVariants(line.productoId)" class="variant-choice">
            <span>Variante de {{ products.find((item) => item.id === line.productoId)?.nombre }}</span>
            <select v-model.number="line.variantes[line.productoId]" required>
              <option :value="null">Selecciona la variante</option>
              <option v-for="variant in variantOptions[line.productoId]" :key="variant.id" :value="variant.id">{{ variant.nombre }} · {{ variant.precio }}</option>
            </select>
          </div>
          <div v-if="loadingVariants.length" class="loading-variants"><LoaderCircle class="spin" :size="14" /> Cargando variantes...</div>
          <div v-if="comboForLine(line)" class="combo-components">
            <strong>Productos del combo</strong>
            <div v-for="component in comboForLine(line)?.componentes" :key="component.productoId" class="component-choice">
              <span>{{ component.cantidad }} × {{ component.productoNombre }}</span>
              <select v-if="hasVariants(component.productoId)" v-model.number="line.variantes[component.productoId]" required :aria-label="`Variante para ${component.productoNombre}`">
                <option :value="null">Selecciona variante</option>
                <option v-for="variant in variantOptions[component.productoId]" :key="variant.id" :value="variant.id">{{ variant.nombre }}</option>
              </select>
              <span v-else class="no-variants">Sin variantes</span>
              <small v-if="line.variantes[component.productoId]">{{ variantName(component.productoId, line.variantes[component.productoId]) }}</small>
            </div>
          </div>
        </section>
      </div>
      <button class="add-line" type="button" @click="addLine"><Plus :size="15" /> Añadir producto o combo</button>
      <p v-if="error" class="error">{{ error }}</p>
      <footer class="actions">
        <button class="secondary" type="button" @click="emit('close')">Cancelar</button>
        <button class="primary" type="submit" :disabled="loading || loadingVariants.length > 0"><LoaderCircle v-if="loading || loadingVariants.length > 0" class="spin" :size="16" /><Save v-else :size="16" /> {{ props.order ? 'Guardar cambios' : 'Guardar pedido' }}</button>
      </footer>
    </form>
  </div>
</template>

<style scoped>
.modal-layer{position:fixed;inset:0;z-index:30;display:grid;place-items:center;overflow-y:auto;padding:20px;background:rgba(0,0,0,.66)}.modal{width:min(720px,100%);max-height:calc(100dvh - 40px);overflow:auto;padding:24px;border-radius:16px;background:#fff;box-shadow:0 20px 60px rgba(0,0,0,.28)}.modal-head,.actions{display:flex;align-items:center;justify-content:space-between;gap:14px}.modal-head h3{margin:6px 0 0;color:#171717;font-size:24px}.modal-head button{border:0;background:transparent;color:#777;cursor:pointer}.eyebrow{margin:0;color:#777;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.section-title{margin-top:22px;color:#171717;font-weight:800}.client-lookup{display:grid;gap:9px;margin:14px 0}.lookup-instruction{margin:0;color:#777;font-size:13px}.client-lookup>label,.fields label{display:grid;gap:7px;color:#333;font-size:13px;font-weight:700}.fields{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:14px 0}.fields label:last-child{grid-column:1/-1}.fields input,.client-lookup input,.line select,.line input,.variant-choice select,.component-choice select{min-width:0;padding:11px;border:1px solid #e8e8e8;border-radius:8px;font:inherit}.fields input:read-only{background:#fafafa;color:#777}.client-match{display:grid;gap:8px;padding:12px;border:1px solid #e8e8e8;border-radius:10px;background:#fafafa;color:#333;font-size:13px}.client-match>p{margin:0;color:#777}.client-match-option,.selected-client{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px;border:1px solid #e8e8e8;border-radius:8px;background:#fff;text-align:left}.client-match-option{cursor:pointer}.client-match-option>span:first-child,.selected-client>span{display:grid;gap:4px}.client-match-option small,.selected-client small{color:#777}.choose-client,.selected-client button{flex:0 0 auto;border:0;background:transparent;color:#c65b19;font-weight:700}.client-match-state{display:flex;align-items:center;gap:7px;color:#777;font-size:12px}.lookup-error{color:#a8584e}.lookup-error button{border:0;background:transparent;color:#c65b19;font-weight:700;cursor:pointer}.new-client-hint{padding:10px;border-radius:8px;background:#fff6f0;color:#c65b19}.line-title{border-top:1px solid #edf1ed;padding-top:18px}.lines{display:grid;gap:12px}.order-line{padding:11px;border:1px solid #e8e8e8;border-radius:11px}.line{display:grid;grid-template-columns:minmax(0,1fr) 90px 38px;gap:8px}.line button{border:0;border-radius:8px;background:#fff2ef;color:#a8584e;cursor:pointer}.line button:disabled{opacity:.4;cursor:not-allowed}.variant-choice,.component-choice{display:grid;grid-template-columns:minmax(0,1fr) minmax(150px,220px);align-items:center;gap:10px;margin-top:9px;color:#777;font-size:12px}.combo-components{display:grid;gap:8px;margin-top:12px;padding:11px;border-radius:9px;background:#fafafa}.combo-components>strong{font-size:12px}.component-choice{margin:0}.component-choice small{grid-column:2;color:#777}.no-variants{color:#777;text-align:right}.loading-variants{display:flex;align-items:center;gap:6px;margin-top:8px;color:#777;font-size:12px}.add-line{display:inline-flex;align-items:center;gap:5px;margin-top:12px;border:0;background:transparent;color:#c65b19;font-weight:700;cursor:pointer}.actions{justify-content:flex-end;margin-top:20px}.primary,.secondary{display:inline-flex;align-items:center;gap:7px;border:0;border-radius:9px;padding:11px 14px;font-weight:700;cursor:pointer}.primary{background:#171717;color:#fff}.secondary{background:#fff6f0;color:#c65b19}.error{color:#a8584e}.spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:560px){.fields{grid-template-columns:1fr}.fields label:last-child{grid-column:auto}.client-match-option,.selected-client{align-items:flex-start;flex-direction:column}.line{grid-template-columns:minmax(0,1fr) 70px 34px}.variant-choice,.component-choice{grid-template-columns:1fr}.component-choice small{grid-column:auto}.no-variants{text-align:left}}
</style>
