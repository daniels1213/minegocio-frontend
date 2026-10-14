export type EstadoPedido = 'PENDIENTE' | 'CONFIRMADO' | 'PREPARANDO' | 'LISTO' | 'EN_ENTREGA' | 'ENTREGADO' | 'CANCELADO'
export type TipoMovimiento = 'COMPRA' | 'VENTA' | 'AJUSTE_INVENTARIO' | 'MERMA' | 'REGALO' | 'OTRO' | 'DEVOLUCION'
export interface EntityReference { id: number; label: string }
export interface Cliente { id?: number; nombre: string; telefono: string; direccion?: string }
export interface Proveedor { id?: number; nombre?: string; telefono?: string; direccion?: string }
export interface Producto { id?: number; nombre: string; descripcion?: string; urlFoto?: string; stockActual: number; precioVenta: number; ultimoPrecioCompra?: number; fechaCreacion?: string }
export interface Etiqueta { id: number; nombre: string; descripcion?: string }
export interface FotoGaleria { url: string; descripcion?: string }
export interface Catalogo { id?: number; usuarioId?: number; nombre: string; descripcion?: string; etiquetas?: Array<string | Etiqueta>; urlFotoPortada?: string; urlLogo?: string; whatsapp?: string; instagram?: string; facebook?: string; wappPropietario?: string; galeria?: FotoGaleria[]; fechaCreacion?: string; activo?: boolean; visible?: boolean; bloqueadoPorAdmin?: boolean }
export function normalizarGaleria(fotos: unknown): FotoGaleria[] {
	if (!Array.isArray(fotos)) return []
	return fotos.flatMap((foto: unknown) => {
		if (typeof foto === 'string') return [{ url: foto, descripcion: '' }]
		if (foto && typeof foto === 'object' && 'url' in foto && typeof foto.url === 'string') {
			return [{ url: foto.url, descripcion: 'descripcion' in foto && typeof foto.descripcion === 'string' ? foto.descripcion : '' }]
		}
		return []
	})
}
export interface VarianteCatalogo { id: number; nombre: string; urlFoto?: string; precio?: number | string; visible?: boolean }
export interface CatalogoProducto { productoId?: number; varianteId?: number; comboId?: number; nombre: string; descripcion?: string; orden: number; urlFoto?: string; precioVenta?: number | string; visible?: boolean; componentes?: ComponenteCombo[]; variantes?: VarianteCatalogo[] }
export interface Variante { id?: number; productoId: number; codigo: string; nombre: string; urlFoto?: string; precio: number; existencia: number; existenciaMinima: number; activa: boolean }
export interface ComponenteCombo { productoId: number; productoNombre?: string; urlFoto?: string; cantidad: number; varianteId?: number }
export interface Combo { id?: number; nombre: string; urlFoto?: string; precio: number; componentes: ComponenteCombo[] }
export interface DetallePedido { id?: number; productoId?: number; comboId?: number; nombre?: string; varianteId?: number; cantidad: number; precioUnitario: number; subtotal?: number; componentes?: ComponenteCombo[] }
export interface Pedido { id?: number; numeroPedido?: number; clienteId: number; clienteNombre?: string; clienteTelefono?: string; estado?: EstadoPedido; subtotal: number; costoEntrega?: number; total: number; moneda?: string; detalles?: DetallePedido[]; listaProductos?: DetallePedido[]; fechaCreacion?: string; fecha?: string; ingresoTotal?: number }
export interface Movimiento { id: number; productoId: number; productoNombre: string; varianteId?: number; varianteNombre?: string; tipo: TipoMovimiento; cantidad: number; stockAnterior: number; stockNuevo: number; fecha: string }
export interface Usuario { id: number; username: string; nombre: string; wapp: string; rol: 'USER' | 'ADMIN'; urlFotoPerfil?: string; fechaCreacion?: string }
export class ApiError extends Error {
	readonly status: number

	constructor(message: string, status: number) {
		super(message)
		this.name = 'ApiError'
		this.status = status
	}
}
const baseUrl = import.meta.env.DEV ? '' : import.meta.env.VITE_API_URL || 'https://minegocio-backend.onrender.com'
let credentials = sessionStorage.getItem('minegocio_credentials') || ''
export function setCredentials(username: string, password: string) { credentials = btoa(`${username}:${password}`); sessionStorage.setItem('minegocio_credentials', credentials); sessionStorage.setItem('minegocio_username', username) }
export function clearCredentials() { credentials = ''; sessionStorage.removeItem('minegocio_credentials'); sessionStorage.removeItem('minegocio_username') }
export function hasCredentials() { return Boolean(credentials) }
export function currentUsername() { return sessionStorage.getItem('minegocio_username') || '' }
async function request<T>(path: string, options: RequestInit = {}, includeCredentials = true): Promise<T> {
	let response: Response

	try {
		response = await fetch(`${baseUrl}${path}`, {
			...options,
			headers: {
				'Content-Type': 'application/json',
				...(includeCredentials && credentials ? { Authorization: `Basic ${credentials}` } : {}),
				...(options.headers || {}),
			},
		})
	} catch {
		throw new Error('No se puede conectar con el backend')
	}

	if (!response.ok) {
		const responseText = await response.text()
		const body = (() => {
			try { return JSON.parse(responseText) }
			catch { return null }
		})()
		if (response.status === 401) {
			if (includeCredentials) {
				clearCredentials()
				throw new ApiError('Usuario o contraseña incorrectos', response.status)
			}
			throw new ApiError(body?.detail || body?.message || `Error ${response.status}`, response.status)
		}
		if (response.status === 403) {
			throw new ApiError(body?.detail || body?.message || responseText || 'Tu usuario no tiene permisos para administrar este panel', response.status)
		}
		throw new ApiError(body?.detail || body?.message || `Error ${response.status}`, response.status)
	}

	if (response.status === 204) return undefined as T
	return response.json()
}

export const api = {
	health: () => request<{ status: string }>('/actuator/health'),
	list: <T>(resource: string) => request<T[]>(`/api/${resource}`),
	productosDeUsuarioAdmin: <T>(usuarioId: number) => request<T[]>(`/api/productos/admin/usuario/${usuarioId}`),
	me: <T>() => request<T>('/api/usuarios/me'),
	etiquetasTodas: <T>() => request<T[]>('/api/etiquetas', {}, false),
	catalogosTodos: <T>() => request<T[]>('/api/catalogos/all'),
	catalogoPorId: <T>(id: number) => request<T>(`/api/catalogos/${id}`),
	actualizarGaleriaCatalogo: <T>(id: number, fotos: FotoGaleria[]) => request<T>(`/api/catalogos/${id}/galeria`, {
		method: 'PUT',
		body: JSON.stringify(fotos),
	}),
	actualizarVisibilidadCatalogo: <T>(id: number, visible: boolean) => request<T>(`/api/catalogos/${id}/visibilidad`, {
		method: 'PUT',
		body: JSON.stringify({ visible }),
	}),
	catalogoProductos: <T>(catalogoId: number) => request<T[]>(`/api/catalogos/${catalogoId}/productos`),
	actualizarElementoCatalogo: <T>(catalogoId: number, tipo: 'producto' | 'variante' | 'combo', elementoId: number, payload: { orden?: number; visible?: boolean }) => request<T>(`/api/catalogos/${catalogoId}/elementos/${tipo}/${elementoId}`, {
		method: 'PUT',
		body: JSON.stringify(payload),
	}),
	eliminarElementoCatalogo: (catalogoId: number, tipo: 'producto' | 'variante' | 'combo', elementoId: number) => request<void>(`/api/catalogos/${catalogoId}/elementos/${tipo}/${elementoId}`, {
		method: 'DELETE',
	}),
	agregarProductoCatalogo: <T>(catalogoId: number, payload: { productoId: number; varianteId?: number; orden: number }) => request<T>(`/api/catalogos/${catalogoId}/productos`, {
		method: 'POST',
		body: JSON.stringify(payload),
	}),
	agregarComboCatalogo: <T>(catalogoId: number, payload: { comboId: number; orden: number }) => request<T>(`/api/catalogos/${catalogoId}/combos`, {
		method: 'POST',
		body: JSON.stringify(payload),
	}),
	combos: <T>() => request<T[]>('/api/combos'),
	combosAdminUsuario: <T>(usuarioId: number) => request<T[]>(`/api/combos/admin/usuario/${usuarioId}`),
	crearCombo: <T>(payload: unknown) => request<T>('/api/combos', { method: 'POST', body: JSON.stringify(payload) }),
	actualizarCombo: <T>(id: number, payload: unknown) => request<T>(`/api/combos/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
	eliminarCombo: (id: number) => request<void>(`/api/combos/${id}`, { method: 'DELETE' }),
	catalogosPublicos: <T>() => request<T[]>('/api/catalogos/publicos'),
	catalogosUsuario: <T>(usuarioId: number) => request<T[]>(`/api/catalogos/usuario/${usuarioId}`),
	catalogosAdminUsuario: <T>(usuarioId: number) => request<T[]>(`/api/catalogos/admin/usuario/${usuarioId}`),
	updateCatalogo: <T>(usuarioId: number, id: number, payload: unknown) => request<T>(`/api/catalogos/${id}?usuarioId=${usuarioId}`, {
		method: 'PUT',
		body: JSON.stringify(payload),
	}),
	updateCatalogoAdmin: <T>(id: number, payload: unknown) => request<T>(`/api/catalogos/admin/${id}`, {
		method: 'PUT',
		body: JSON.stringify(payload),
	}),
	deleteCatalogo: (usuarioId: number, id: number) => request<void>(`/api/catalogos/${id}?usuarioId=${usuarioId}`, {
		method: 'DELETE',
	}),
	deleteCatalogoAdmin: (id: number) => request<void>(`/api/catalogos/admin/${id}`, {
		method: 'DELETE',
	}),
	createCatalogo: <T>(usuarioId: number, payload: unknown) => request<T>(`/api/catalogos?usuarioId=${usuarioId}`, {
		method: 'POST',
		body: JSON.stringify(payload),
	}),
	create: <T>(resource: string, payload: unknown) => request<T>(`/api/${resource}`, {
		method: 'POST',
		body: JSON.stringify(payload),
	}),
	update: <T>(resource: string, id: number, payload: unknown) => request<T>(`/api/${resource}/${id}`, {
		method: 'PUT',
		body: JSON.stringify(payload),
	}),
	updatePedidoEstado: <T>(id: number, estado: EstadoPedido) => request<T>(`/api/pedidos/${id}/estado`, {
		method: 'PUT',
		body: JSON.stringify({ estado }),
	}),
	actualizarPedido: <T>(id: number, payload: unknown) => request<T>(`/api/pedidos/${id}`, {
		method: 'PUT',
		body: JSON.stringify(payload),
	}),
	eliminarPedido: (id: number) => request<void>(`/api/pedidos/${id}`, {
		method: 'DELETE',
	}),
	createProductoProveedor: <T>(payload: { productoId: number; proveedorId: number; precio: number }) => request<T>('/api/producto-proveedores', {
		method: 'POST',
		body: JSON.stringify(payload),
	}),
	changePassword: (id: number, payload: { passwordActual: string; nuevaPassword: string }) => request<void>(`/api/usuarios/${id}/password`, {
		method: 'PUT',
		body: JSON.stringify(payload),
	}),
	movement: (payload: unknown) => request<void>('/api/inventario/movimientos', {
		method: 'POST',
		body: JSON.stringify(payload),
	}),
	movimientos: <T>(queryParams?: string) => request<T[]>(`/api/inventario/movimientos${queryParams ? '?' + queryParams : ''}`),
	variantesProducto: <T>(productoId: number) => request<T[]>(`/api/productos/${productoId}/variantes`),
	crearVariante: <T>(productoId: number, payload: { nombre: string; existencia: number; urlFoto?: string }) => request<T>(`/api/productos/${productoId}/variantes`, {
		method: 'POST',
		body: JSON.stringify(payload),
	}),
	actualizarVariante: <T>(productoId: number, varianteId: number, payload: { nombre: string; urlFoto?: string }) => request<T>(`/api/productos/${productoId}/variantes/${varianteId}`, {
		method: 'PUT',
		body: JSON.stringify(payload),
	}),
	eliminarVariante: (productoId: number, varianteId: number) => request<void>(`/api/productos/${productoId}/variantes/${varianteId}`, {
		method: 'DELETE',
	}),
	delete: (resource: string, id: number) => request<void>(`/api/${resource}/${id}`, {
		method: 'DELETE',
	}),
}