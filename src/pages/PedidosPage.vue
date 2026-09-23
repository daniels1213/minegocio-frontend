<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ClipboardList, RefreshCw } from 'lucide-vue-next'
import { api, type EstadoPedido, type Pedido } from '../api.ts'

const orders = ref<Pedido[]>([])
const loading = ref(false)
const error = ref('')
const states: EstadoPedido[] = ['PENDIENTE', 'ENTREGADO', 'CANCELADO']

async function load() {
	loading.value = true
	error.value = ''
	try { orders.value = await api.list<Pedido>('pedidos') }
	catch (reason) { error.value = reason instanceof Error ? reason.message : 'No se pudieron cargar los pedidos.' }
	finally { loading.value = false }
}

async function changeState(order: Pedido, state: EstadoPedido) {
	if (!order.id || order.estado === state) return
	try { await api.updatePedidoEstado(order.id, state); order.estado = state }
	catch (reason) { error.value = reason instanceof Error ? reason.message : 'No se pudo actualizar el pedido.' }
}

onMounted(load)
</script>

<template>
	<section class="orders-page"><div class="heading"><div><p class="eyebrow">Ventas</p><h2>Pedidos</h2><p class="muted">Consulta tus pedidos y actualiza su estado.</p></div><button class="secondary" type="button" @click="load"><RefreshCw :size="16" /> Actualizar</button></div>
		<p v-if="error" class="error">{{ error }}</p>
		<div v-if="loading" class="state"><RefreshCw :size="24" class="spin" /> Cargando pedidos...</div>
		<div v-else-if="!orders.length" class="state"><ClipboardList :size="28" /><p>Aún no hay pedidos registrados.</p></div>
		<div v-else class="order-list"><article v-for="order in orders" :key="order.id" class="order-row"><div class="order-icon"><ClipboardList :size="18" /></div><div class="order-copy"><strong>Pedido #{{ order.id }}</strong><small>Cliente {{ order.clienteId }} · {{ order.fecha ? new Date(order.fecha).toLocaleDateString() : 'Sin fecha' }}</small></div><strong class="total">{{ order.ingresoTotal ?? 0 }}</strong><select :value="order.estado" @change="changeState(order, ($event.target as HTMLSelectElement).value as EstadoPedido)"><option v-for="state in states" :key="state" :value="state">{{ state }}</option></select></article></div>
	</section>
</template>

<style scoped>
.orders-page{padding:34px 0;color:#17332a}.heading{display:flex;align-items:end;justify-content:space-between;gap:18px;margin-bottom:28px}.eyebrow{margin:0;color:#6c8175;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}h2{margin:8px 0 7px;font:700 clamp(28px,4vw,42px) 'Space Grotesk',Arial,sans-serif}.muted{margin:0;color:#75847b}.secondary{display:inline-flex;align-items:center;gap:7px;padding:11px 14px;border:0;border-radius:9px;background:#e7f0ea;color:#1a5f47;font-weight:700;cursor:pointer}.state,.order-list{border:1px solid #e3e9e2;border-radius:14px;background:#fff}.state{min-height:260px;display:grid;place-content:center;justify-items:center;gap:10px;color:#75847b}.order-list{padding:0 20px}.order-row{display:flex;align-items:center;gap:13px;padding:16px 0;border-bottom:1px solid #edf1ed}.order-row:last-child{border-bottom:0}.order-icon{display:grid;place-items:center;width:38px;height:38px;border-radius:10px;background:#fff1cf;color:#98701d}.order-copy{display:grid;gap:4px;flex:1;min-width:0}.order-copy small{color:#75847b}.total{white-space:nowrap}.order-row select{padding:8px;border:1px solid #dfe5df;border-radius:8px;background:#fff;color:#17332a}.error{color:#a8584e}.spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:620px){.heading{align-items:start;flex-direction:column}.order-row{flex-wrap:wrap}.order-copy{min-width:calc(100% - 55px)}.total{margin-left:51px}.order-row select{margin-left:auto}}
</style>