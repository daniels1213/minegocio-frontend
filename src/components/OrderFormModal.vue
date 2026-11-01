<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ChevronDown, LoaderCircle, Plus, Save, Search, Trash2, X } from 'lucide-vue-next'
import { ApiError, api, type Cliente, type Combo, type Pedido, type Producto, type Variante } from '../api.ts'
import PhoneInput from './PhoneInput.vue'
import { isValidPhoneNumber, normalizePhoneNumber } from '../phone.ts'

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
const clientStep = ref<'choice' | 'existing' | 'new' | 'order'>('choice')
const clientSearch = ref('')
const itemSearch = ref('')
const activePickerIndex = ref<number | null>(null)
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

const filteredClients = computed(() => {
  const search = clientSearch.value.trim().toLocaleLowerCase()
  const normalizedSearch = normalizeTelephone(search)
  if (!search) return clients.value
  return clients.value.filter((client) =>
    client.nombre.toLocaleLowerCase().includes(search)
    || (normalizedSearch && normalizeTelephone(client.telefono).includes(normalizedSearch)),
  )
})
const duplicateClient = computed(() => {
  const telephone = normalizeTelephone(clienteTelefono.value)
  if (!telephone) return undefined
  return clients.value.find((client) => normalizePhoneNumber(client.telefono) === normalizePhoneNumber(clienteTelefono.value))
})
const duplicateClientMessage = computed(() => duplicateClient.value
  ? `Ese WhatsApp ya está registrado en el nombre "${duplicateClient.value.nombre}".`
  : '')
const filteredOrderItems = computed(() => {
  const search = itemSearch.value.trim().toLocaleLowerCase()
  const options = [
    ...products.value.filter((product) => product.id).map((product) => ({
      selection: `producto:${product.id}`,
      name: product.nombre,
      detail: `${product.precioVenta} ${product.monedaVenta || 'CUP'}`,
      type: 'Producto',
    })),
    ...combos.value.filter((combo) => combo.id).map((combo) => ({
      selection: `combo:${combo.id}`,
      name: combo.nombre,
      detail: `${combo.precio} CUP`,
      type: 'Combo',
    })),
  ]
  return search ? options.filter((option) => option.name.toLocaleLowerCase().includes(search)) : options
})

function newLine(): OrderLine {
  return { selection: '', productoId: null, comboId: null, cantidad: 1, variantes: {} }
}

function resetOrderForm() {
  clientStep.value = 'choice'
  clientSearch.value = ''
  selectedClientId.value = null
  clienteNombre.value = ''
  clienteTelefono.value = ''
  clienteDireccion.value = ''
  activePickerIndex.value = null
  itemSearch.value = ''
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
  clientStep.value = 'order'
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
  activePickerIndex.value = null
  itemSearch.value = ''
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

function selectionLabel(line: OrderLine) {
  return filteredOrderItems.value.find((option) => option.selection === line.selection)?.name
    || products.value.find((product) => line.productoId === product.id)?.nombre
    || combos.value.find((combo) => line.comboId === combo.id)?.nombre
    || ''
}

function selectClient(client: Cliente) {
  selectedClientId.value = client.id ?? null
  clienteNombre.value = client.nombre
  clienteTelefono.value = client.telefono
  clienteDireccion.value = client.direccion || ''
  clientStep.value = 'order'
}

function openNewClientForm() {
  selectedClientId.value = null
  clienteNombre.value = ''
  clienteTelefono.value = ''
  clienteDireccion.value = ''
  clientStep.value = 'new'
}

async function getOrCreateClient() {
  clients.value = await api.list<Cliente>('clientes')
  const client = selectedClientId.value
    ? clients.value.find((item) => item.id === selectedClientId.value)
    : undefined
  if (client) return client
  const duplicate = clients.value.find((item) =>
    normalizePhoneNumber(item.telefono) === normalizePhoneNumber(clienteTelefono.value),
  )
  if (duplicate) throw new Error(`Ese WhatsApp ya está registrado en el nombre "${duplicate.nombre}".`)

  try {
    return await api.create<Cliente>('clientes', {
      nombre: clienteNombre.value.trim(),
      telefono: clienteTelefono.value.trim(),
      direccion: clienteDireccion.value.trim(),
    })
  } catch (reason) {
    if (!(reason instanceof ApiError) || reason.status !== 409) throw reason
    clients.value = await api.list<Cliente>('clientes')
    const racedClient = clients.value.find((item) =>
      normalizePhoneNumber(item.telefono) === normalizePhoneNumber(clienteTelefono.value),
    )
    if (racedClient) {
      throw new Error(`Ese WhatsApp ya está registrado en el nombre "${racedClient.nombre}".`)
    }
    throw reason
  }
}

function continueWithNewClient() {
  error.value = ''
  if (!clienteNombre.value.trim() || !clienteTelefono.value.trim()) {
    error.value = 'Nombre y WhatsApp del cliente son obligatorios.'
    return
  }
  if (!isValidPhoneNumber(clienteTelefono.value)) {
    error.value = 'Introduce un WhatsApp válido para el prefijo seleccionado.'
    return
  }
  if (duplicateClient.value) {
    error.value = duplicateClientMessage.value
    return
  }
  clientStep.value = 'order'
}

async function retryClientLookup() {
  await loadOptions()
}

function changeClient() {
  selectedClientId.value = null
  clienteNombre.value = ''
  clienteTelefono.value = ''
  clienteDireccion.value = ''
  clientStep.value = 'choice'
  error.value = ''
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
  if (!props.order && !isValidPhoneNumber(clienteTelefono.value)) {
    error.value = 'Introduce un WhatsApp válido para el prefijo seleccionado.'
    return
  }
  const validLines = lines.value.filter((line) => line.selection && line.cantidad > 0)
  if (lines.value.some((line) => !line.selection || !Number.isInteger(line.cantidad) || line.cantidad < 1)) {
    error.value = 'Selecciona un producto o combo y una cantidad válida en cada línea.'
    return
  }
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
      <section v-if="!props.order && clientStep === 'choice'" class="client-step">
        <h4>¿El pedido es para un cliente existente o uno nuevo?</h4>
        <p>Selecciona cómo quieres asociar el cliente al pedido.</p>
        <div v-if="clientsLoading" class="client-match-state"><LoaderCircle class="spin" :size="15" /> Cargando clientes...</div>
        <div v-else-if="clientLookupError" class="client-match-state lookup-error" role="alert">
          <span>No se pudo cargar la lista de clientes. {{ clientLookupError }}</span>
          <button type="button" @click="retryClientLookup">Reintentar</button>
        </div>
        <div v-else class="client-choice-grid">
          <button class="client-choice" type="button" @click="clientStep = 'existing'">
            <strong>Cliente existente</strong><span>Buscar por nombre o WhatsApp</span>
          </button>
          <button class="client-choice" type="button" @click="openNewClientForm">
            <strong>Cliente nuevo</strong><span>Registrar sus datos</span>
          </button>
        </div>
      </section>

      <section v-else-if="!props.order && clientStep === 'existing'" class="client-step">
        <h4>Seleccionar cliente</h4>
        <label class="client-search">Filtrar por nombre o WhatsApp
          <input v-model="clientSearch" type="search" placeholder="Nombre o WhatsApp" autocomplete="off" />
        </label>
        <div v-if="clientsLoading" class="client-match-state"><LoaderCircle class="spin" :size="15" /> Cargando clientes...</div>
        <div v-else class="client-list">
          <button v-for="client in filteredClients" :key="client.id" class="client-match-option" type="button" @click="selectClient(client)">
            <span><strong>{{ client.nombre }}</strong><small>{{ client.telefono }} · {{ client.direccion || 'Sin dirección registrada' }}</small></span>
            <span class="choose-client">Seleccionar</span>
          </button>
          <p v-if="!filteredClients.length" class="client-list-empty">
            {{ clients.length ? 'No hay clientes que coincidan con el filtro.' : 'Aún no tienes clientes registrados.' }}
          </p>
        </div>
        <footer class="actions">
          <button class="secondary" type="button" @click="clientStep = 'choice'">Volver</button>
          <button class="secondary" type="button" @click="emit('close')">Cancelar</button>
        </footer>
      </section>

      <section v-else-if="!props.order && clientStep === 'new'" class="client-step">
        <h4>Información del nuevo cliente</h4>
        <div class="fields client-fields">
          <label>Nombre<input v-model="clienteNombre" type="text" required autocomplete="name" /></label>
          <label>WhatsApp<PhoneInput v-model="clienteTelefono" required /></label>
          <label>Dirección<input v-model="clienteDireccion" type="text" autocomplete="street-address" /></label>
        </div>
        <p v-if="duplicateClientMessage" class="error" role="alert">{{ duplicateClientMessage }}</p>
        <p v-else-if="clientLookupError" class="error" role="alert">{{ clientLookupError }}</p>
        <p v-if="error && !duplicateClientMessage" class="error" role="alert">{{ error }}</p>
        <footer class="actions">
          <button class="secondary" type="button" @click="clientStep = 'choice'; error = ''">Volver</button>
          <button class="secondary" type="button" @click="emit('close')">Cancelar</button>
          <button class="primary" type="button" :disabled="!clientsLoaded || Boolean(duplicateClientMessage)" @click="continueWithNewClient">Continuar</button>
        </footer>
      </section>

      <div v-else>
      <div class="selected-client">
        <span><strong>{{ clienteNombre }}</strong><small>{{ clienteTelefono }} · {{ clienteDireccion || 'Sin dirección registrada' }}</small></span>
        <button v-if="!props.order" type="button" @click="changeClient">Cambiar cliente</button>
      </div>
      <div class="section-title line-title">Productos y combos</div>
      <div class="lines">
        <section v-for="(line, index) in lines" :key="index" class="order-line">
          <div class="line">
            <div class="item-picker-wrap">
              <button class="item-picker-trigger" type="button" :aria-expanded="activePickerIndex === index" @click="activePickerIndex = activePickerIndex === index ? null : index; itemSearch = ''">
                <span>{{ selectionLabel(line) || 'Selecciona un producto o combo' }}</span><ChevronDown :size="17" />
              </button>
              <div v-if="activePickerIndex === index" class="item-picker">
                <label class="item-search"><Search :size="16" /><input v-model="itemSearch" type="search" placeholder="Filtrar por nombre" autocomplete="off" /></label>
                <div class="item-picker-list">
                  <button v-for="option in filteredOrderItems" :key="option.selection" class="item-option" type="button" @click="selectOrderItem(line, option.selection)">
                    <span><strong>{{ option.name }}</strong><small>{{ option.type }}</small></span><span class="item-price">{{ option.detail }}</span>
                  </button>
                  <p v-if="!filteredOrderItems.length" class="client-list-empty">No hay productos o combos que coincidan con el filtro.</p>
                </div>
              </div>
            </div>
            <input v-model.number="line.cantidad" type="number" min="1" step="1" aria-label="Cantidad" />
            <button type="button" title="Quitar línea" :disabled="lines.length === 1" @click="removeLine(index)"><Trash2 :size="16" /></button>
          </div>
          <div v-if="line.productoId && hasVariants(line.productoId)" class="variant-choice">
            <span>Variante de {{ products.find((item) => item.id === line.productoId)?.nombre }}</span>
            <select v-model.number="line.variantes[line.productoId]" required>
              <option :value="null">Selecciona la variante</option>
              <option v-for="variant in variantOptions[line.productoId]" :key="variant.id" :value="variant.id">{{ variant.nombre }} · {{ variant.precio }} {{ variant.monedaVenta || 'CUP' }}</option>
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
      </div>
    </form>
  </div>
</template>

<style scoped>
.modal-layer{position:fixed;inset:0;z-index:30;display:grid;place-items:center;overflow-y:auto;padding:20px;background:rgba(0,0,0,.66)}.modal{width:min(720px,100%);max-height:calc(100dvh - 40px);overflow:auto;padding:24px;border-radius:16px;background:#fff;box-shadow:0 20px 60px rgba(0,0,0,.28)}.modal-head,.actions{display:flex;align-items:center;justify-content:space-between;gap:14px}.modal-head h3{margin:6px 0 0;color:#171717;font-size:24px}.modal-head button{border:0;background:transparent;color:#777;cursor:pointer}.eyebrow{margin:0;color:#777;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.section-title{margin-top:22px;color:#171717;font-weight:800}.client-lookup{display:grid;gap:9px;margin:14px 0}.lookup-instruction{margin:0;color:#777;font-size:13px}.client-lookup>label,.fields label{display:grid;gap:7px;color:#333;font-size:13px;font-weight:700}.fields{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:14px 0}.fields label:last-child{grid-column:1/-1}.fields input,.client-lookup input,.line select,.line input,.variant-choice select,.component-choice select{min-width:0;padding:11px;border:1px solid #e8e8e8;border-radius:8px;font:inherit}.fields input:read-only{background:#fafafa;color:#777}.client-match{display:grid;gap:8px;padding:12px;border:1px solid #e8e8e8;border-radius:10px;background:#fafafa;color:#333;font-size:13px}.client-match>p{margin:0;color:#777}.client-match-option,.selected-client{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px;border:1px solid #e8e8e8;border-radius:8px;background:#fff;text-align:left}.client-match-option{cursor:pointer}.client-match-option>span:first-child,.selected-client>span{display:grid;gap:4px}.client-match-option small,.selected-client small{color:#777}.choose-client,.selected-client button{flex:0 0 auto;border:0;background:transparent;color:#c65b19;font-weight:700}.client-match-state{display:flex;align-items:center;gap:7px;color:#777;font-size:12px}.lookup-error{color:#a8584e}.lookup-error button{border:0;background:transparent;color:#c65b19;font-weight:700;cursor:pointer}.new-client-hint{padding:10px;border-radius:8px;background:#fff6f0;color:#c65b19}.line-title{border-top:1px solid #edf1ed;padding-top:18px}.lines{display:grid;gap:12px}.order-line{padding:11px;border:1px solid #e8e8e8;border-radius:11px}.line{display:grid;grid-template-columns:minmax(0,1fr) 90px 38px;gap:8px}.line button{border:0;border-radius:8px;background:#fff2ef;color:#a8584e;cursor:pointer}.line button:disabled{opacity:.4;cursor:not-allowed}.variant-choice,.component-choice{display:grid;grid-template-columns:minmax(0,1fr) minmax(150px,220px);align-items:center;gap:10px;margin-top:9px;color:#777;font-size:12px}.combo-components{display:grid;gap:8px;margin-top:12px;padding:11px;border-radius:9px;background:#fafafa}.combo-components>strong{font-size:12px}.component-choice{margin:0}.component-choice small{grid-column:2;color:#777}.no-variants{color:#777;text-align:right}.loading-variants{display:flex;align-items:center;gap:6px;margin-top:8px;color:#777;font-size:12px}.add-line{display:inline-flex;align-items:center;gap:5px;margin-top:12px;border:0;background:transparent;color:#c65b19;font-weight:700;cursor:pointer}.actions{justify-content:flex-end;margin-top:20px}.primary,.secondary{display:inline-flex;align-items:center;gap:7px;border:0;border-radius:9px;padding:11px 14px;font-weight:700;cursor:pointer}.primary{background:#171717;color:#fff}.secondary{background:#fff6f0;color:#c65b19}.error{color:#a8584e}.spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:560px){.fields{grid-template-columns:1fr}.fields label:last-child{grid-column:auto}.client-match-option,.selected-client{align-items:flex-start;flex-direction:column}.line{grid-template-columns:minmax(0,1fr) 70px 34px}.variant-choice,.component-choice{grid-template-columns:1fr}.component-choice small{grid-column:auto}.no-variants{text-align:left}}
 .client-step{display:grid;gap:14px;margin-top:18px}.client-step h4{margin:0;color:#171717;font-size:18px}.client-step>p{margin:0;color:#777;font-size:13px}.client-choice-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.client-choice{display:grid;gap:8px;min-height:110px;padding:18px;border:1px solid #e8e8e8;border-radius:11px;background:#fff;text-align:left;cursor:pointer}.client-choice:hover,.client-match-option:hover{border-color:#e4a77d;background:#fffaf6}.client-choice strong{color:#171717;font-size:15px}.client-choice span{color:#777;font-size:13px}.client-search{display:grid;gap:7px;color:#333;font-size:13px;font-weight:700}.client-search input{padding:11px;border:1px solid #e8e8e8;border-radius:8px;font:inherit}.client-list{display:grid;gap:8px;max-height:300px;overflow:auto}.client-list-empty{margin:8px 0;color:#777;font-size:13px}.selected-client button{cursor:pointer}.client-step .actions{margin-top:4px}
 .line-title{margin-bottom:16px}.lines{margin-top:12px}.item-picker-wrap{position:relative;min-width:0}.line .item-picker-trigger{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;min-height:42px;padding:10px 11px;border:1px solid #e8e8e8;border-radius:8px;background:#fff;color:#333;text-align:left;font:inherit;cursor:pointer}.item-picker-trigger>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.line .item-picker-trigger:hover{border-color:#d6a17f}.item-picker{display:grid;gap:8px;margin-top:8px;padding:9px;border:1px solid #e8e8e8;border-radius:10px;background:#fff;box-shadow:0 10px 25px rgba(0,0,0,.1)}.item-search{display:flex;align-items:center;gap:8px;padding:9px 10px;border:1px solid #e8e8e8;border-radius:8px;color:#777}.item-search input{width:100%;min-width:0;border:0;outline:0;background:transparent;font:inherit}.item-picker-list{display:grid;gap:5px;max-height:210px;overflow:auto}.line .item-option{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px;border:0;border-radius:7px;background:#fff;color:#333;text-align:left;cursor:pointer}.item-option:hover{background:#fff6f0}.item-option>span:first-child{display:grid;gap:3px}.item-option small{color:#777;font-size:11px}.item-price{flex:0 0 auto;color:#555;font-size:12px}
 @media(max-width:560px){.client-choice-grid{grid-template-columns:1fr}.client-choice{min-height:85px}}
</style>
