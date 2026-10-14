<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { CalendarDays, CheckCircle2, ClipboardList, Clock3, Pencil, Plus, RefreshCw, ShoppingBag, Trash2, WalletCards } from 'lucide-vue-next'
import { api, type EstadoPedido, type Pedido } from '../api.ts'
import OrderFormModal from '../components/OrderFormModal.vue'
import DeleteConfirmModal from '../components/DeleteConfirmModal.vue'
import { formatDate } from '../date.ts'

type OrderStateFilter = 'TODOS' | 'PENDIENTE' | 'ENTREGADO'

const orders = ref<Pedido[]>([])
const loading = ref(false)
const error = ref('')
const states: EstadoPedido[] = ['PENDIENTE', 'ENTREGADO', 'CANCELADO']
const stateFilter = ref<OrderStateFilter>('TODOS')
const selectedMonth = ref(currentMonthKey())
const showOrderModal = ref(false)
const editingOrder = ref<Pedido | null>(null)
const deleteTargetOrder = ref<Pedido | null>(null)
const showDeleteOrderModal = ref(false)

function currentMonthKey() {
	const now = new Date()
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function orderMonth(value?: string) {
	const match = /^(\d{4})-(\d{2})/.exec(value || '')
	return match ? `${match[1]}-${match[2]}` : ''
}

function monthLabel(value: string) {
	return new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' })
		.format(new Date(`${value}-01T12:00:00`))
}

function orderDate(value?: string) {
	return value ? formatDate(value) : 'Sin fecha'
}

const monthOptions = computed(() => {
	const options = new Set([currentMonthKey(), ...orders.value.map((order) => orderMonth(order.fecha)).filter(Boolean)])
	return [...options].sort((left, right) => right.localeCompare(left))
})

const monthOrders = computed(() => orders.value.filter((order) => orderMonth(order.fecha) === selectedMonth.value))
const visibleOrders = computed(() => {
	const filtered = stateFilter.value === 'TODOS'
		? monthOrders.value
		: monthOrders.value.filter((order) => order.estado === stateFilter.value)
	return [...filtered].sort((left, right) => (right.fecha || '').localeCompare(left.fecha || ''))
})
const monthRevenue = computed(() => monthOrders.value.reduce((sum, order) => sum + Number(order.ingresoTotal ?? order.total ?? 0), 0))

function formatAmount(value: number) {
	return new Intl.NumberFormat('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
}

function stateLabel(state?: EstadoPedido) {
	if (state === 'ENTREGADO') return 'Entregado'
	if (state === 'CANCELADO') return 'Cancelado'
	return 'Pendiente'
}

async function load() {
	loading.value = true
	error.value = ''
	try { orders.value = await api.list<Pedido>('pedidos') }
	catch (reason) { error.value = reason instanceof Error ? reason.message : 'No se pudieron cargar los pedidos.' }
	finally { loading.value = false }
}

function openCreateModal() {
	editingOrder.value = null
	showOrderModal.value = true
}

function openEditModal(order: Pedido) {
	editingOrder.value = order
	showOrderModal.value = true
}

async function changeState(order: Pedido, state: EstadoPedido) {
	if (!order.id || order.estado === state) return
	try {
		const updated = await api.updatePedidoEstado<Pedido>(order.id, state)
		Object.assign(order, updated)
	} catch (reason) {
		error.value = reason instanceof Error ? reason.message : 'No se pudo actualizar el pedido.'
	}
}

async function deleteOrder(order: Pedido) {
  if (!order.id) return
  deleteTargetOrder.value = order
  showDeleteOrderModal.value = true
}

async function confirmDeleteOrder() {
  if (!deleteTargetOrder.value?.id) return
  error.value = ''
  try {
    await api.eliminarPedido(deleteTargetOrder.value.id)
    orders.value = orders.value.filter((item) => item.id !== deleteTargetOrder.value!.id)
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'No se pudo eliminar el pedido.'
  } finally {
    deleteTargetOrder.value = null
    showDeleteOrderModal.value = false
  }
}

onMounted(load)
</script>

<template>
	<section class="orders-page">
		<div class="heading">
			<div class="title-block">
				<p class="eyebrow"><span class="eyebrow-mark"></span> CENTRO DE VENTAS</p>
				<h2>Pedidos</h2>
				<p class="muted">Todo lo que necesitas para dar seguimiento a tus ventas.</p>
			</div>
			<div class="heading-actions">
				<button class="secondary refresh-button" type="button" :disabled="loading" @click="load"><RefreshCw :size="16" /> Actualizar</button>
				<button class="primary" type="button" @click="openCreateModal"><Plus :size="17" /> Nuevo pedido</button>
			</div>
		</div>

		<div class="summary-grid">
			<article class="summary-card">
				<div class="summary-icon orders-icon"><ShoppingBag :size="19" /></div>
				<div><span>Pedidos del mes</span><strong>{{ monthOrders.length }}</strong><small>{{ monthLabel(selectedMonth) }}</small></div>
			</article>
			<article class="summary-card">
				<div class="summary-icon pending-icon"><Clock3 :size="19" /></div>
				<div><span>Por entregar</span><strong>{{ monthOrders.filter((order) => order.estado === 'PENDIENTE').length }}</strong><small>Pedidos pendientes</small></div>
			</article>
			<article class="summary-card">
				<div class="summary-icon delivered-icon"><CheckCircle2 :size="19" /></div>
				<div><span>Entregados</span><strong>{{ monthOrders.filter((order) => order.estado === 'ENTREGADO').length }}</strong><small>Pedidos completados</small></div>
			</article>
			<article class="summary-card revenue-card">
				<div class="summary-icon revenue-icon"><WalletCards :size="19" /></div>
				<div><span>Venta del mes</span><strong>{{ formatAmount(monthRevenue) }}</strong><small>Total registrado</small></div>
			</article>
		</div>

		<section class="orders-panel">
			<div class="panel-toolbar">
				<div class="panel-title">
					<h3>Listado de pedidos</h3>
					<p>Revisa tus pedidos y actualiza su estado.</p>
				</div>
				<label class="month-picker">
					<CalendarDays :size="17" />
					<select v-model="selectedMonth" aria-label="Mes de pedidos">
						<option v-for="month in monthOptions" :key="month" :value="month">{{ monthLabel(month) }}</option>
					</select>
				</label>
			</div>

			<div class="filter-bar">
				<div class="filter-tabs" role="group" aria-label="Filtrar pedidos por estado">
					<button v-for="filter in (['TODOS', 'PENDIENTE', 'ENTREGADO'] as const)" :key="filter" type="button" :class="{ active: stateFilter === filter }" @click="stateFilter = filter">
						{{ filter === 'TODOS' ? 'Todos' : filter === 'PENDIENTE' ? 'Pendientes' : 'Entregados' }}
						<span>{{ filter === 'TODOS' ? monthOrders.length : monthOrders.filter((order) => order.estado === filter).length }}</span>
					</button>
				</div>
				<span class="sort-note">Más recientes primero</span>
			</div>

		<p v-if="error" class="error" role="alert">{{ error }}</p>
			<div v-if="loading" class="state"><RefreshCw :size="24" class="spin" /> Cargando pedidos...</div>
			<div v-else-if="!orders.length" class="state"><div class="empty-icon"><ClipboardList :size="25" /></div><strong>Aún no hay pedidos</strong><p>Cuando registres uno, aparecerá aquí.</p></div>
			<div v-else-if="!visibleOrders.length" class="state"><div class="empty-icon"><ClipboardList :size="25" /></div><strong>No hay pedidos en esta vista</strong><p>Prueba otro mes o filtro para encontrar pedidos.</p></div>
			<div v-else class="order-list">
				<article v-for="order in visibleOrders" :key="order.id" class="order-row">
					<div class="order-ident">
						<div class="order-icon"><ClipboardList :size="19" /></div>
						<div><strong>Pedido #{{ order.numeroPedido ?? '—' }}</strong><small>{{ orderDate(order.fecha) }}</small></div>
					</div>
					<div class="order-copy">
						<strong>{{ order.clienteNombre || 'Cliente' }}</strong>
						<a :href="order.clienteTelefono ? `https://wa.me/${order.clienteTelefono.replace(/\D/g, '')}` : undefined" target="_blank" rel="noopener noreferrer" class="customer-phone">{{ order.clienteTelefono || 'Sin WhatsApp' }}</a>
					</div>
					<div class="order-items">
						<span v-for="line in (order.listaProductos || order.detalles || []).slice(0, 2)" :key="line.id" class="item-pill">
							{{ line.cantidad }} × {{ line.nombre || (line.comboId ? `Combo ${line.comboId}` : `Producto ${line.productoId}`) }}
						</span>
						<span v-if="(order.listaProductos || order.detalles || []).length > 2" class="more-items">+{{ (order.listaProductos || order.detalles || []).length - 2 }} más</span>
					</div>
					<div class="order-total"><small>Total de venta</small><strong>{{ formatAmount(Number(order.ingresoTotal ?? order.total ?? 0)) }}</strong></div>
					<div class="order-status" :class="`status-${(order.estado || 'PENDIENTE').toLowerCase()}`">
						<span class="status-dot"></span>
						<select :value="order.estado" :disabled="order.estado !== 'PENDIENTE'" :aria-label="`Estado del pedido ${order.numeroPedido}`" @change="changeState(order, ($event.target as HTMLSelectElement).value as EstadoPedido)">
							<option v-for="state in states" :key="state" :value="state">{{ stateLabel(state) }}</option>
						</select>
					</div>
					<div class="row-actions">
						<button v-if="order.estado === 'PENDIENTE'" type="button" title="Editar pedido" :aria-label="`Editar pedido ${order.numeroPedido}`" @click="openEditModal(order)"><Pencil :size="16" /></button>
						<button type="button" class="delete" title="Eliminar pedido" :aria-label="`Eliminar pedido ${order.numeroPedido}`" @click="deleteOrder(order)"><Trash2 :size="16" /></button>
					</div>
				</article>
			</div>
			<div v-if="!loading && visibleOrders.length" class="list-footer">
				Mostrando <strong>{{ visibleOrders.length }}</strong> de <strong>{{ monthOrders.length }}</strong> pedidos de {{ monthLabel(selectedMonth) }}
			</div>
		</section>

<OrderFormModal :visible="showOrderModal" :order="editingOrder || undefined" @close="showOrderModal = false" @created="load" />
    <DeleteConfirmModal
      :visible="showDeleteOrderModal"
      :title="`Eliminar pedido`"
      :message="deleteTargetOrder ? `¿Eliminar el pedido #${deleteTargetOrder.numeroPedido ?? ''}? Esta acción también elimina sus detalles y no se puede deshacer.` : '¿Eliminar el pedido seleccionado?'"
      :loading="false"
      @confirm="confirmDeleteOrder"
      @cancel="showDeleteOrderModal = false; deleteTargetOrder = null"
    />
  </section>
</template>

<style scoped>
/* =========================
   ESTILOS GENERALES
========================= */

.orders-page {
	max-width: 1240px;
	width: 100%;
	min-width: 0;
	margin: 0 auto;
	padding: 38px 0 56px;
	color: #171717;
	box-sizing: border-box;
}

.orders-page *,
.orders-page *::before,
.orders-page *::after {
	box-sizing: border-box;
}

.heading,
.heading-actions {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 14px;
}

.heading {
	margin-bottom: 27px;
}

.title-block {
	min-width: 0;
}

.eyebrow {
	display: flex;
	align-items: center;
	gap: 8px;
	margin: 0;
	color: #717171;
	font-size: 10px;
	font-weight: 800;
	letter-spacing: 0.15em;
}

.eyebrow-mark {
	width: 8px;
	height: 8px;
	flex-shrink: 0;
	border-radius: 50%;
	background: #c65b19;
	box-shadow: 0 0 0 4px #c65b191f;
}

.orders-page h2 {
	margin: 10px 0 5px;
	color: #151515;
	font: 700 clamp(30px, 4vw, 40px) 'Space Grotesk', Arial, sans-serif;
	letter-spacing: -0.045em;
}

.muted {
	margin: 0;
	color: #777;
	font-size: 14px;
	line-height: 1.5;
}

.heading-actions {
	flex-shrink: 0;
}

.primary,
.secondary {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	min-height: 44px;
	padding: 0 16px;
	border: 1px solid transparent;
	border-radius: 10px;
	font-size: 13px;
	font-weight: 700;
	white-space: nowrap;
	cursor: pointer;
	transition:
		transform 0.18s,
		box-shadow 0.18s,
		background 0.18s;
}

.primary {
	background: #171717;
	color: #fff;
	box-shadow: 0 4px 10px #1717171a;
}

.secondary {
	border-color: #e7e7e7;
	background: #fff;
	color: #454545;
}

.primary:hover,
.secondary:hover {
	transform: translateY(-1px);
	box-shadow: 0 7px 18px #17171712;
}

.primary:disabled,
.secondary:disabled {
	opacity: 0.6;
	cursor: wait;
}

/* =========================
   TARJETAS DE RESUMEN
========================= */

.summary-grid {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: 14px;
	margin-bottom: 22px;
}

.summary-card {
	display: flex;
	align-items: center;
	gap: 14px;
	min-width: 0;
	padding: 18px;
	border: 1px solid #eaeaea;
	border-radius: 14px;
	background: #fff;
	box-shadow: 0 3px 12px #17171705;
}

.summary-icon {
	display: grid;
	place-items: center;
	flex: 0 0 42px;
	width: 42px;
	height: 42px;
	border-radius: 12px;
}

.orders-icon {
	background: #f1f1f1;
	color: #252525;
}

.pending-icon {
	background: #fff3e9;
	color: #b75716;
}

.delivered-icon {
	background: #fff6f0;
	color: #c65b19;
}

.revenue-icon {
	background: #f7f0e4;
	color: #9a6c1e;
}

.summary-card > div:last-child {
	display: grid;
	gap: 3px;
	min-width: 0;
}

.summary-card span,
.summary-card small {
	color: #777;
	font-size: 11px;
}

.summary-card strong {
	overflow: hidden;
	color: #191919;
	font-size: 23px;
	letter-spacing: -0.035em;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.revenue-card strong {
	font-size: 19px;
}

/* =========================
   PANEL DE PEDIDOS
========================= */

.orders-panel {
	min-width: 0;
	overflow: hidden;
	border: 1px solid #e8e8e8;
	border-radius: 16px;
	background: #fff;
	box-shadow: 0 5px 20px #17171706;
}

.panel-toolbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	padding: 22px 24px 18px;
}

.panel-title {
	min-width: 0;
}

.panel-title h3 {
	margin: 0;
	color: #1b1b1b;
	font-size: 17px;
	letter-spacing: -0.02em;
}

.panel-title p {
	margin: 5px 0 0;
	color: #858585;
	font-size: 12px;
	line-height: 1.5;
}

.month-picker {
	display: flex;
	align-items: center;
	gap: 8px;
	flex-shrink: 0;
	min-height: 40px;
	max-width: 100%;
	padding: 0 11px;
	border: 1px solid #e7e7e7;
	border-radius: 9px;
	background: #fff;
	color: #777;
}

.month-picker svg {
	flex-shrink: 0;
}

.month-picker select {
	width: auto;
	max-width: 180px;
	min-width: 0;
	border: 0;
	outline: 0;
	background: transparent;
	color: #272727;
	font-size: 12px;
	font-weight: 700;
	text-transform: capitalize;
	cursor: pointer;
}

/* =========================
   FILTROS
========================= */

.filter-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding: 0 24px 15px;
	border-bottom: 1px solid #ededed;
}

.filter-tabs {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 4px;
	min-width: 0;
}

.filter-tabs button {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 7px;
	min-height: 34px;
	padding: 0 11px;
	border: 0;
	border-radius: 8px;
	background: transparent;
	color: #777;
	font-size: 12px;
	font-weight: 600;
	white-space: nowrap;
	cursor: pointer;
	transition:
		background 0.15s,
		color 0.15s;
}

.filter-tabs button:hover {
	background: #f6f6f6;
	color: #222;
}

.filter-tabs button.active {
	background: #171717;
	color: #fff;
}

.filter-tabs button span {
	display: grid;
	place-items: center;
	min-width: 19px;
	height: 19px;
	padding: 0 5px;
	border-radius: 10px;
	background: #eee;
	color: #555;
	font-size: 10px;
}

.filter-tabs button.active span {
	background: #ffffff29;
	color: #fff;
}

.sort-note {
	flex-shrink: 0;
	color: #999;
	font-size: 11px;
}

/* =========================
   LISTADO DE PEDIDOS
========================= */

.order-list {
	padding: 0 24px;
}

.order-row {
	display: grid;
	grid-template-columns:
		minmax(0, 1.15fr)
		minmax(0, 1fr)
		minmax(0, 1.15fr)
		minmax(100px, 0.85fr)
		minmax(105px, 0.75fr)
		68px;
	align-items: center;
	gap: 14px;
	min-height: 84px;
	padding: 13px 0;
	border-bottom: 1px solid #f0f0f0;
	transition: background 0.15s;
}

.order-row:last-child {
	border-bottom: 0;
}

.order-row:hover {
	background: linear-gradient(90deg, #fafafa 0%, #fff 100%);
}

/* Identificación del pedido */

.order-ident {
	display: flex;
	align-items: center;
	gap: 10px;
	min-width: 0;
}

.order-icon {
	display: grid;
	place-items: center;
	flex: 0 0 38px;
	width: 38px;
	height: 38px;
	border: 1px solid #ededed;
	border-radius: 11px;
	background: #f7f7f7;
	color: #4b4b4b;
}

.order-ident > div:last-child,
.order-copy,
.order-total {
	display: grid;
	gap: 4px;
	min-width: 0;
}

.order-ident strong,
.order-copy > strong {
	overflow: hidden;
	color: #242424;
	font-size: 12px;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.order-ident small,
.order-total small {
	color: #909090;
	font-size: 10px;
}

/* Información del cliente */

.customer-phone {
	display: block;
	width: fit-content;
	max-width: 100%;
	overflow: hidden;
	color: #7a7a7a;
	font-size: 11px;
	text-decoration: none;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.customer-phone[href]:hover {
	color: #b45117;
	text-decoration: underline;
}

/* Productos */

.order-items {
	display: flex;
	flex-wrap: wrap;
	gap: 5px;
	min-width: 0;
}

.item-pill {
	max-width: 100%;
	overflow: hidden;
	padding: 5px 7px;
	border: 1px solid #eee;
	border-radius: 6px;
	background: #fafafa;
	color: #686868;
	font-size: 10px;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.more-items {
	align-self: center;
	color: #898989;
	font-size: 10px;
	white-space: nowrap;
}

/* Importe */

.order-total strong {
	color: #222;
	font-size: 14px;
	letter-spacing: -0.02em;
	white-space: nowrap;
}

/* Estado */

.order-status {
	display: flex;
	align-items: center;
	gap: 7px;
	width: fit-content;
	max-width: 100%;
	padding: 6px 9px;
	border: 1px solid transparent;
	border-radius: 20px;
}

.status-dot {
	flex: 0 0 7px;
	width: 7px;
	height: 7px;
	border-radius: 50%;
	background: currentColor;
}

.order-status select {
	width: auto;
	max-width: 100%;
	min-width: 0;
	border: 0;
	outline: 0;
	background: transparent;
	color: inherit;
	font-size: 10px;
	font-weight: 700;
	cursor: pointer;
}

.order-status select:disabled {
	opacity: 1;
	cursor: default;
}

.status-pendiente {
	border-color: #f5dfcb;
	background: #fff7ef;
	color: #a85011;
}

.status-entregado {
	border-color: #d8e9d8;
	background: #f2f8f1;
	color: #407348;
}

.status-cancelado {
	border-color: #f2dddd;
	background: #fff4f3;
	color: #a24b43;
}

/* Botones de acciones */

.row-actions {
	display: flex;
	justify-content: flex-end;
	gap: 5px;
}

.row-actions button {
	display: grid;
	place-items: center;
	flex: 0 0 31px;
	width: 31px;
	height: 31px;
	padding: 0;
	border: 1px solid #e9e9e9;
	border-radius: 8px;
	background: #fff;
	color: #555;
	cursor: pointer;
	transition:
		background 0.15s,
		color 0.15s,
		border-color 0.15s;
}

.row-actions button:hover {
	border-color: #d7d7d7;
	background: #f4f4f4;
	color: #111;
}

.row-actions button.delete {
	color: #ae5047;
}

.row-actions button.delete:hover {
	border-color: #f1d9d6;
	background: #fff2f0;
	color: #a43f35;
}

/* =========================
   ESTADOS Y MENSAJES
========================= */

.list-footer {
	padding: 13px 24px;
	border-top: 1px solid #eee;
	background: #fcfcfc;
	color: #888;
	font-size: 11px;
	line-height: 1.6;
}

.list-footer strong {
	color: #444;
}

.state {
	display: grid;
	min-height: 220px;
	place-content: center;
	justify-items: center;
	gap: 9px;
	padding: 24px;
	color: #777;
	text-align: center;
}

.state > strong {
	color: #383838;
	font-size: 13px;
}

.state p {
	margin: 0;
	color: #888;
	font-size: 12px;
	line-height: 1.5;
}

.empty-icon {
	display: grid;
	place-items: center;
	width: 50px;
	height: 50px;
	margin-bottom: 3px;
	border: 1px solid #eee;
	border-radius: 16px;
	background: #f8f8f8;
	color: #777;
}

.error {
	margin: 14px 24px 0;
	padding: 11px 13px;
	border: 1px solid #f1d8d5;
	border-radius: 9px;
	background: #fff5f4;
	color: #a3312d;
	font-size: 12px;
	line-height: 1.5;
	overflow-wrap: anywhere;
}

.spin {
	animation: spin 0.8s linear infinite;
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}

/* =========================
   TABLET Y PORTÁTILES
========================= */

@media (max-width: 1100px) {
	.orders-page {
		padding-top: 28px;
	}

	.summary-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	/*
	 * En tablet ocultamos los productos de la primera fila.
	 * El resto de los datos mantiene su propia columna.
	 */

	.order-row {
		grid-template-columns:
			minmax(0, 1.15fr)
			minmax(0, 1fr)
			minmax(100px, 0.85fr)
			minmax(100px, 0.85fr)
			64px;
		gap: 12px;
	}

	.order-items {
		display: none;
	}
}

/* =========================
   TABLET VERTICAL
========================= */

@media (max-width: 760px) {
	.heading {
		align-items: flex-start;
	}

	.heading-actions {
		gap: 8px;
	}

	.panel-toolbar {
		padding: 20px 18px 16px;
	}

	.filter-bar {
		padding: 0 18px 14px;
	}

	.order-list {
		padding: 0 18px;
	}

	/*
	 * Cada pedido se transforma en una tarjeta.
	 * Así evitamos comprimir seis columnas en una pantalla pequeña.
	 */

	.order-row {
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 12px;
		padding: 17px 0;
	}

	.order-ident {
		grid-column: 1;
		grid-row: 1;
	}

	.order-copy {
		grid-column: 1 / -1;
		grid-row: 2;
		padding-left: 48px;
	}

	.order-items {
		display: flex;
		grid-column: 1 / -1;
		grid-row: 3;
		padding-left: 48px;
	}

	.order-total {
		grid-column: 2;
		grid-row: 1;
		justify-items: end;
		align-self: center;
	}

	.order-status {
		grid-column: 1;
		grid-row: 4;
		justify-self: start;
		margin-left: 48px;
	}

	.row-actions {
		grid-column: 2;
		grid-row: 4;
		align-self: center;
	}

	.item-pill {
		max-width: 220px;
	}

	.list-footer {
		padding: 13px 18px;
	}

	.error {
		margin-right: 18px;
		margin-left: 18px;
	}
}

/* =========================
   TELÉFONOS
========================= */

@media (max-width: 540px) {
	.orders-page {
		padding: 24px 0 36px;
	}

	.heading {
		flex-direction: column;
		align-items: stretch;
		gap: 17px;
		margin-bottom: 22px;
	}

	.orders-page h2 {
		font-size: clamp(29px, 8vw, 36px);
	}

	.muted {
		font-size: 13px;
	}

	.heading-actions {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		width: 100%;
		gap: 9px;
	}

	.heading-actions button {
		width: 100%;
		min-width: 0;
		padding: 0 9px;
		font-size: 12px;
	}

	/* Resumen: dos tarjetas por fila */

	.summary-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 9px;
		margin-bottom: 16px;
	}

	.summary-card {
		gap: 9px;
		padding: 13px 10px;
		border-radius: 12px;
	}

	.summary-icon {
		flex-basis: 34px;
		width: 34px;
		height: 34px;
		border-radius: 10px;
	}

	.summary-icon svg {
		width: 17px;
		height: 17px;
	}

	.summary-card span {
		font-size: 10px;
		line-height: 1.4;
	}

	.summary-card strong {
		font-size: 20px;
	}

	.summary-card small {
		font-size: 9px;
		line-height: 1.4;
	}

	.revenue-card strong {
		font-size: 15px;
	}

	/* Panel */

	.orders-panel {
		border-radius: 13px;
	}

	.panel-toolbar {
		align-items: stretch;
		flex-direction: column;
		gap: 14px;
		padding: 17px 14px 14px;
	}

	.panel-title h3 {
		font-size: 16px;
	}

	.panel-title p {
		max-width: none;
		font-size: 11px;
	}

	.month-picker {
		width: 100%;
		min-height: 39px;
		padding: 0 10px;
	}

	.month-picker select {
		flex: 1;
		width: 100%;
		max-width: none;
		font-size: 12px;
	}

	/* Filtros en una sola fila */

	.filter-bar {
		align-items: flex-start;
		flex-direction: column;
		gap: 8px;
		padding: 0 10px 12px;
	}

	.filter-tabs {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		width: 100%;
		gap: 3px;
	}

	.filter-tabs button {
		justify-content: center;
		gap: 5px;
		min-width: 0;
		min-height: 34px;
		padding: 0 4px;
		font-size: 10px;
	}

	.filter-tabs button span {
		min-width: 17px;
		height: 17px;
		padding: 0 4px;
		font-size: 9px;
	}

	.sort-note {
		display: none;
	}

	/* Tarjetas de pedidos */

	.order-list {
		padding: 0 13px;
	}

	.order-row {
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 12px 8px;
		padding: 15px 0;
	}

	.order-ident {
		grid-column: 1;
		grid-row: 1;
		gap: 9px;
	}

	.order-icon {
		flex-basis: 35px;
		width: 35px;
		height: 35px;
		border-radius: 10px;
	}

	.order-ident strong {
		font-size: 11px;
	}

	.order-ident small {
		font-size: 10px;
	}

	.order-copy {
		grid-column: 1 / -1;
		grid-row: 2;
		gap: 5px;
		padding-left: 44px;
	}

	.order-copy > strong {
		font-size: 12px;
	}

	.customer-phone {
		font-size: 11px;
	}

	.order-items {
		grid-column: 1 / -1;
		grid-row: 3;
		gap: 5px;
		padding-left: 44px;
	}

	.item-pill {
		max-width: 100%;
		padding: 5px 7px;
		font-size: 10px;
	}

	.order-total {
		grid-column: 2;
		grid-row: 1;
		gap: 4px;
		padding-left: 0;
		justify-items: end;
	}

	.order-total small {
		font-size: 9px;
	}

	.order-total strong {
		font-size: 12px;
	}

	.order-status {
		grid-column: 1;
		grid-row: 4;
		margin-left: 44px;
		padding: 6px 8px;
	}

	.order-status select {
		font-size: 10px;
	}

	.row-actions {
		grid-column: 2;
		grid-row: 4;
		gap: 5px;
	}

	.row-actions button {
		flex-basis: 32px;
		width: 32px;
		height: 32px;
	}

	.list-footer {
		padding: 12px 13px;
		font-size: 10px;
	}

	.error {
		margin: 12px 13px 0;
		padding: 10px;
		font-size: 11px;
	}

	.state {
		min-height: 190px;
		padding: 20px 14px;
	}
}

/* =========================
   TELÉFONOS MUY PEQUEÑOS
========================= */

@media (max-width: 380px) {
	.orders-page {
		padding-top: 20px;
	}

	.heading-actions {
		gap: 7px;
	}

	.heading-actions button {
		gap: 5px;
		padding: 0 6px;
		font-size: 11px;
	}

	.summary-card {
		gap: 7px;
		padding: 11px 8px;
	}

	.summary-icon {
		flex-basis: 30px;
		width: 30px;
		height: 30px;
	}

	.summary-card strong {
		font-size: 18px;
	}

	.revenue-card strong {
		font-size: 13px;
	}

	.filter-tabs button {
		gap: 3px;
		padding: 0 2px;
		font-size: 9px;
	}

	.order-list {
		padding: 0 10px;
	}

	.order-row {
		gap: 11px 6px;
	}

	.order-ident {
		gap: 7px;
	}

	.order-icon {
		flex-basis: 31px;
		width: 31px;
		height: 31px;
	}

	.order-copy,
	.order-items {
		padding-left: 38px;
	}

	.order-status {
		margin-left: 38px;
	}

	.order-total strong {
		font-size: 11px;
	}

	.row-actions {
		gap: 4px;
	}

	.row-actions button {
		flex-basis: 29px;
		width: 29px;
		height: 29px;
	}

	.list-footer {
		font-size: 9px;
	}
}

/* =========================
   ACCESIBILIDAD
========================= */

@media (prefers-reduced-motion: reduce) {
	.spin {
		animation: none;
	}

	.primary,
	.secondary,
	.order-row,
	.filter-tabs button,
	.row-actions button {
		transition: none;
	}
}
</style>
