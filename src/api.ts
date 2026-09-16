export type EstadoPedido = 'PENDIENTE' | 'CONFIRMADO' | 'PREPARANDO' | 'LISTO' | 'EN_ENTREGA' | 'ENTREGADO' | 'CANCELADO'
export type TipoMovimiento = 'ENTRADA' | 'VENTA' | 'AJUSTE' | 'DEVOLUCION' | 'DANIO' | 'PERDIDA'
export interface EntityReference { id: number; label: string }
export interface Cliente { id?: number; nombre: string; telefono?: string; correo?: string; ciudad?: string; direccion?: string }
export interface Proveedor { id?: number; nombre?: string; personaContacto?: string; telefono?: string; correo?: string; activo: boolean }
export interface Producto { id?: number; seccionId: number; catalogoId?: number; nombre?: string; descripcionCorta?: string; moneda?: string; activo: boolean; visibleCatalogo: boolean; destacado: boolean }
export interface Catalogo { id?: number; usuarioId?: number; nombre: string; descripcion?: string; etiquetas?: string[]; fotoPortada?: string; visibleEnPaginaPrincipal: boolean; activo: boolean }
export interface Variante { id?: number; productoId: number; codigo: string; nombre: string; precio: number; existencia: number; existenciaMinima: number; activa: boolean }
export interface DetallePedido { varianteProductoId: number; cantidad: number; precioUnitario: number; subtotal?: number }
export interface Pedido { id?: number; numeroPedido?: string; clienteId: number; estado?: EstadoPedido; subtotal: number; costoEntrega?: number; total: number; moneda?: string; detalles?: DetallePedido[]; fechaCreacion?: string }
export interface Compra { id?: number; numeroCompra?: string; proveedorId: number; estado?: string; subtotal: number; costoAdicional?: number; total: number; moneda?: string; fechaCreacion?: string }
export interface Movimiento { id: number; varianteProductoId: number; tipo: TipoMovimiento; cantidad: number; existenciaAnterior: number; existenciaNueva: number; motivo?: string; fechaCreacion?: string }
export interface Usuario { id: number; nombreUsuario: string; nombre: string; apellido?: string; correo?: string; telefono?: string; fotoPerfil?: string; esSuperadministrador: boolean; activo: boolean }
const baseUrl = import.meta.env.VITE_API_URL || 'https://minegocio-backend.onrender.com'
let credentials = sessionStorage.getItem('minegocio_credentials') || ''
export function setCredentials(username: string, password: string) { credentials = btoa(`${username}:${password}`); sessionStorage.setItem('minegocio_credentials', credentials); sessionStorage.setItem('minegocio_username', username) }
export function clearCredentials() { credentials = ''; sessionStorage.removeItem('minegocio_credentials'); sessionStorage.removeItem('minegocio_username') }
export function hasCredentials() { return Boolean(credentials) }
export function currentUsername() { return sessionStorage.getItem('minegocio_username') || '' }
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
	let response: Response

	try {
		response = await fetch(`${baseUrl}${path}`, {
			...options,
			headers: {
				'Content-Type': 'application/json',
				...(credentials ? { Authorization: `Basic ${credentials}` } : {}),
				...(options.headers || {}),
			},
		})
	} catch {
		throw new Error('No se puede conectar con el backend')
	}

	if (!response.ok) {
		if (response.status === 401) {
			clearCredentials()
			throw new Error('Usuario o contraseña incorrectos')
		}
		if (response.status === 403) {
			throw new Error('Tu usuario no tiene permisos para administrar este panel')
		}
		const body = await response.json().catch(() => null)
		throw new Error(body?.detail || body?.message || `Error ${response.status}`)
	}

	if (response.status === 204) return undefined as T
	return response.json()
}

export const api = {
	health: () => request<{ status: string }>('/actuator/health'),
	list: <T>(resource: string) => request<T[]>(`/api/${resource}`),
	me: <T>() => request<T>('/api/usuarios/me'),
	catalogosTodos: <T>() => request<T[]>('/api/catalogos/all'),
	catalogosPublicos: <T>() => request<T[]>('/api/catalogos/publicos'),
	catalogosUsuario: <T>(usuarioId: number) => request<T[]>(`/api/catalogos/usuario/${usuarioId}`),
	create: <T>(resource: string, payload: unknown) => request<T>(`/api/${resource}`, {
		method: 'POST',
		body: JSON.stringify(payload),
	}),
	update: <T>(resource: string, id: number, payload: unknown) => request<T>(`/api/${resource}/${id}`, {
		method: 'PUT',
		body: JSON.stringify(payload),
	}),
	movement: (payload: unknown) => request<Movimiento>('/api/inventario/movimientos', {
		method: 'POST',
		body: JSON.stringify(payload),
	}),
	delete: (resource: string, id: number) => request<void>(`/api/${resource}/${id}`, {
		method: 'DELETE',
	}),
}