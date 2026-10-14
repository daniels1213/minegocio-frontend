<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AlertCircle, ArrowDown, ArrowLeft, ArrowUp, ChevronDown, ChevronUp, Eye, EyeOff, Facebook, Globe2, ImagePlus, Instagram, Layers, LockKeyhole, MessageCircle, Package, Pencil, Plus, RefreshCw, Save, Search, Store, Tag, Trash2, X, Image } from 'lucide-vue-next'
import type { Catalogo, CatalogoProducto, Etiqueta, FotoGaleria, Usuario, Variante } from '../api.ts'
import { api, currentUsername, normalizarGaleria } from '../api.ts'
import AddProductToCatalogModal from '../components/AddProductToCatalogModal.vue'
import AddComboToCatalogModal from '../components/AddComboToCatalogModal.vue'
import ImageCropModal from '../components/ImageCropModal.vue'
import DeleteConfirmModal from '../components/DeleteConfirmModal.vue'
import { uploadCloudinaryImage } from '../cloudinary.ts'

const props = defineProps<{
  usuarioId: number
  isAdmin?: boolean
  refreshKey?: number
}>()

const emit = defineEmits<{
  (e: 'create'): void
  (e: 'edit', catalog: Catalogo): void
}>()

const catalogs = ref<Catalogo[]>([])
const loading = ref(false)
const error = ref('')
const removingId = ref<number | null>(null)
const section = ref<'mine' | 'all'>('mine')
const allCatalogs = ref<Catalogo[]>([])
const users = ref<Usuario[]>([])
const allSearch = ref('')
const allLoading = ref(false)
const allError = ref('')
const removingAllId = ref<number | null>(null)
const allLoaded = ref(false)
const selectedCatalog = ref<Catalogo | null>(null)
const catalogProducts = ref<CatalogoProducto[]>([])
const expandedVariantGroupKeys = ref<string[]>([])
const productVariants = ref<Record<number, Variante[]>>({})
const variantsLoadingByProduct = ref<number[]>([])
const variantsErrorByProduct = ref<Record<number, string>>({})
const catalogProductsLoading = ref(false)
const catalogProductsError = ref('')
const showAddProduct = ref(false)
const showAddCombo = ref(false)
const savingItemKey = ref('')
const draftCatalogGroupOrder = ref<string[]>([])
const savedCatalogGroupOrder = ref<string[]>([])
const savingVisibilityId = ref<number | null>(null)
const showCatalogTags = ref(false)
const showCatalogGallery = ref(false)
const showCatalogSocials = ref(false)

const deleteTargetCatalog = ref<Catalogo | null>(null)
const showDeleteCatalogModal = ref(false)
const deleteTargetAllCatalog = ref<Catalogo | null>(null)
const showDeleteAllCatalogModal = ref(false)
const deleteTargetCatalogItem = ref<CatalogoProducto | null>(null)
const showDeleteCatalogItemModal = ref(false)
const socialDraft = ref({ whatsapp: '', instagram: '', facebook: '' })
const socialSaving = ref(false)
const socialError = ref('')
const galleryDraft = ref<FotoGaleria[]>([])
const galleryError = ref('')
const gallerySaving = ref(false)
const galleryUploading = ref(false)
const cropGalleryVisible = ref(false)
const pendingGalleryFile = ref<File | null>(null)
const pendingGalleryIndex = ref<number | null>(null)
const catalogTags = ref<Etiqueta[]>([])
const selectedTagIds = ref<number[]>([])
const catalogTagsLoading = ref(false)
const catalogTagsSaving = ref(false)
const catalogTagsError = ref('')
const requestedTagName = ref('')
const showTagRequestModal = ref(false)
const showCatalogBlockedModal = ref(false)

// Logo
const logoDraft = ref<string | null>(null)
const logoUploading = ref(false)
const logoError = ref('')
const cropLogoVisible = ref(false)
const pendingLogoFile = ref<File | null>(null)

const canManageSelectedCatalog = computed(() => props.isAdmin || selectedCatalog.value?.usuarioId === props.usuarioId)
const hasUnsavedGallery = computed(() => JSON.stringify(galleryDraft.value) !== JSON.stringify(selectedCatalog.value?.galeria || []))

const deleteCatalogMessage = computed(() => deleteTargetCatalog.value ? '¿Eliminar el catálogo "' + deleteTargetCatalog.value.nombre + '"?' : '¿Eliminar el catálogo seleccionado?')
const deleteAllCatalogMessage = computed(() => deleteTargetAllCatalog.value ? '¿Eliminar el catálogo "' + deleteTargetAllCatalog.value.nombre + '"?' : '¿Eliminar el catálogo seleccionado?')
const deleteCatalogItemMessage = computed(() => deleteTargetCatalogItem.value ? 'Quitar "' + deleteTargetCatalogItem.value.nombre + '" de este catálogo' : '¿Quitar el elemento seleccionado del catálogo?')

const filteredAllCatalogs = computed(() => {
  const query = allSearch.value.trim().toLocaleLowerCase()
  if (!query) return allCatalogs.value
  return allCatalogs.value.filter((catalog) => catalog.nombre.toLocaleLowerCase().includes(query))
})

const catalogProductGroups = computed(() => {
  const mainItems = catalogProducts.value.filter((item) => !item.varianteId && !item.comboId)
  const variantItems = catalogProducts.value.filter((item) => item.varianteId)
  const groups = mainItems.map((main) => ({
    key: catalogItemKey(main),
    main,
    variants: variantItems.filter((variant) => variant.productoId === main.productoId),
  }))
  const groupedVariantIds = new Set(groups.flatMap((group) => group.variants.map((variant) => variant.varianteId)))
  for (const variant of variantItems) {
    if (groupedVariantIds.has(variant.varianteId)) continue
    groups.push({ key: catalogItemKey(variant), main: variant, variants: [] })
  }
  groups.push(...catalogProducts.value
    .filter((item) => item.comboId)
    .map((combo) => ({ key: catalogItemKey(combo), main: combo, variants: [] })))
  const draftPositions = new Map(draftCatalogGroupOrder.value.map((key, index) => [key, index]))
  return groups.sort((a, b) => {
    const aPosition = draftPositions.get(a.key)
    const bPosition = draftPositions.get(b.key)
    if (aPosition !== undefined && bPosition !== undefined) return aPosition - bPosition
    if (aPosition !== undefined) return -1
    if (bPosition !== undefined) return 1
    return a.main.orden - b.main.orden
  })
})
const hasUnsavedCatalogOrder = computed(() =>
  draftCatalogGroupOrder.value.length !== savedCatalogGroupOrder.value.length
  || draftCatalogGroupOrder.value.some((key, index) => key !== savedCatalogGroupOrder.value[index]),
)

type DisplayVariant = {
  id: number
  nombre: string
  urlFoto?: string
  existencia?: number
  cantidad?: number
  esComponenteCombo?: boolean
  catalogItem?: CatalogoProducto
}

function displayVariants(group: (typeof catalogProductGroups.value)[number]): DisplayVariant[] {
  if (group.main.comboId) {
    return (group.main.componentes || []).map((component) => ({
      id: component.productoId,
      nombre: component.productoNombre || `Producto ${component.productoId}`,
      urlFoto: component.urlFoto,
      cantidad: component.cantidad,
      esComponenteCombo: true,
    }))
  }
  if (!group.main.productoId) return []
  const fetchedVariants = productVariants.value[group.main.productoId]
  if (!fetchedVariants) {
    return group.variants.flatMap((item) => item.varianteId
      ? [{ id: item.varianteId, nombre: item.nombre, urlFoto: item.urlFoto, catalogItem: item }]
      : [])
  }

  return fetchedVariants.map((variant) => {
    const catalogItem = group.variants.find((item) => item.varianteId === variant.id)
    return {
      id: variant.id ?? 0,
      nombre: variant.nombre,
      urlFoto: variant.urlFoto || catalogItem?.urlFoto,
      existencia: variant.existencia,
      catalogItem,
    }
  }).filter((variant) => variant.id > 0)
}

const ownerNames = computed(() => new Map(users.value.map((user) => [user.id, user.username])))

async function loadCatalogs() {
  if (!props.usuarioId) return

  loading.value = true
  error.value = ''

  try {
    catalogs.value = await api.catalogosUsuario<Catalogo>(props.usuarioId)
    if (selectedCatalog.value?.id) {
      selectedCatalog.value = catalogs.value.find((catalog) => catalog.id === selectedCatalog.value?.id) || selectedCatalog.value
    }
  } catch (reason) {
    error.value = reason instanceof Error
      ? reason.message
      : 'No se pudieron cargar tus catálogos.'
  } finally {
    loading.value = false
  }
}

async function manageCatalogProducts(catalog: Catalogo) {
  if (!catalog.id) return
  selectedCatalog.value = catalog
  draftCatalogGroupOrder.value = []
  savedCatalogGroupOrder.value = []
  expandedVariantGroupKeys.value = []
  productVariants.value = {}
  variantsLoadingByProduct.value = []
  variantsErrorByProduct.value = {}
  showCatalogTags.value = false
  showCatalogGallery.value = false
  galleryDraft.value = normalizarGaleria(catalog.galeria)
  galleryError.value = ''
  logoDraft.value = catalog.urlLogo || null
  logoError.value = ''
  await loadCatalogProducts(true)
}

function selectGalleryPhoto(event: Event, index: number | null = null) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (index === null && galleryDraft.value.length >= 10) {
    galleryError.value = 'La galería admite un máximo de 10 fotos.'
    input.value = ''
    return
  }
  galleryError.value = ''
  pendingGalleryFile.value = file
  pendingGalleryIndex.value = index
  cropGalleryVisible.value = true
  input.value = ''
}

async function uploadGalleryPhoto(file: File) {
  cropGalleryVisible.value = false
  galleryUploading.value = true
  galleryError.value = ''
  try {
    const url = await uploadCloudinaryImage(file, 'gallery')
    if (pendingGalleryIndex.value === null) galleryDraft.value = [...galleryDraft.value, { url, descripcion: '' }]
    else galleryDraft.value = galleryDraft.value.map((photo, index) => index === pendingGalleryIndex.value ? { ...photo, url } : photo)
  } catch (reason) {
    galleryError.value = reason instanceof Error ? reason.message : 'No se pudo subir la foto de la galería.'
  } finally {
    galleryUploading.value = false
    pendingGalleryFile.value = null
    pendingGalleryIndex.value = null
  }
}

function removeGalleryPhoto(index: number) {
  galleryDraft.value = galleryDraft.value.filter((_, photoIndex) => photoIndex !== index)
  galleryError.value = ''
}

async function saveCatalogGallery() {
  const catalogId = selectedCatalog.value?.id
  if (!catalogId || !canManageSelectedCatalog.value || !hasUnsavedGallery.value || gallerySaving.value || galleryUploading.value) return
  gallerySaving.value = true
  galleryError.value = ''
  try {
    const updated = await api.actualizarGaleriaCatalogo<Catalogo>(catalogId, galleryDraft.value)
    selectedCatalog.value = updated
    catalogs.value = catalogs.value.map((catalog) => catalog.id === updated.id ? updated : catalog)
    allCatalogs.value = allCatalogs.value.map((catalog) => catalog.id === updated.id ? updated : catalog)
    galleryDraft.value = normalizarGaleria(updated.galeria)
  } catch (reason) {
    galleryError.value = reason instanceof Error ? reason.message : 'No se pudo guardar la galería.'
  } finally {
    gallerySaving.value = false
  }
}

function selectLogoPhoto(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  logoError.value = ''
  pendingLogoFile.value = file
  cropLogoVisible.value = true
  input.value = ''
}

async function uploadLogoPhoto(file: File) {
  cropLogoVisible.value = false
  logoUploading.value = true
  logoError.value = ''
  try {
    const url = await uploadCloudinaryImage(file, 'catalog')
    logoDraft.value = url
  } catch (reason) {
    logoError.value = reason instanceof Error ? reason.message : 'No se pudo subir el logo.'
  } finally {
    logoUploading.value = false
    pendingLogoFile.value = null
  }
}

function removeLogo() {
  logoDraft.value = null
  logoError.value = ''
}

async function saveCatalogLogo() {
  const catalogId = selectedCatalog.value?.id
  if (!catalogId || !canManageSelectedCatalog.value || logoUploading.value) return
  const newLogo = logoDraft.value ?? undefined
  const currentLogo = selectedCatalog.value?.urlLogo ?? undefined
  if (newLogo === currentLogo) return
  logoUploading.value = true
  logoError.value = ''
  try {
    const payload = {
      nombre: selectedCatalog.value!.nombre,
      descripcion: selectedCatalog.value!.descripcion || '',
      urlFotoPortada: selectedCatalog.value!.urlFotoPortada || null,
      whatsapp: selectedCatalog.value!.whatsapp ?? null,
      instagram: selectedCatalog.value!.instagram ?? null,
      facebook: selectedCatalog.value!.facebook ?? null,
      urlLogo: newLogo || null,
    }
    const updated = props.isAdmin
      ? await api.updateCatalogoAdmin<Catalogo>(catalogId, payload)
      : await api.updateCatalogo<Catalogo>(props.usuarioId, catalogId, payload)
    const updateList = (items: Catalogo[]) => items.map((item) => item.id === updated.id ? updated : item)
    catalogs.value = updateList(catalogs.value)
    allCatalogs.value = updateList(allCatalogs.value)
    selectedCatalog.value = updated
    logoDraft.value = updated.urlLogo || null
  } catch (reason) {
    logoError.value = reason instanceof Error ? reason.message : 'No se pudo guardar el logo.'
  } finally {
    logoUploading.value = false
  }
}

async function toggleProductVariants(group: (typeof catalogProductGroups.value)[number]) {
  if (expandedVariantGroupKeys.value.includes(group.key)) {
    expandedVariantGroupKeys.value = expandedVariantGroupKeys.value.filter((key) => key !== group.key)
    return
  }
  expandedVariantGroupKeys.value = [...expandedVariantGroupKeys.value, group.key]
  if (group.main.comboId) return
  const productId = group.main.productoId
  if (!productId) return
  if (productVariants.value[productId] || variantsLoadingByProduct.value.includes(productId)) return

  variantsLoadingByProduct.value = [...variantsLoadingByProduct.value, productId]
  variantsErrorByProduct.value = { ...variantsErrorByProduct.value, [productId]: '' }
  try {
    const variants = await api.variantesProducto<Variante>(productId)
    productVariants.value = {
      ...productVariants.value,
      [productId]: variants.filter((variant) => variant.activa !== false),
    }
  } catch (reason) {
    variantsErrorByProduct.value = {
      ...variantsErrorByProduct.value,
      [productId]: reason instanceof Error ? reason.message : 'No se pudieron cargar las variantes.',
    }
  } finally {
    variantsLoadingByProduct.value = variantsLoadingByProduct.value.filter((id) => id !== productId)
  }
}

async function openCatalogTags() {
  const catalog = selectedCatalog.value
  if (!catalog || !canManageSelectedCatalog.value) return
  if (showCatalogTags.value) {
    showCatalogTags.value = false
    return
  }
  showCatalogTags.value = true

  selectedTagIds.value = (catalog.etiquetas || []).flatMap((tag) => {
    if (typeof tag === 'string') {
      const found = catalogTags.value.find((item) => item.nombre === tag)
      return found ? [found.id] : []
    }
    return [tag.id]
  }).slice(0, 2)
  if (catalogTags.value.length) return

  await loadCatalogTags()
}

async function loadCatalogTags() {
  const catalog = selectedCatalog.value
  if (!catalog) return
  catalogTagsLoading.value = true
  catalogTagsError.value = ''
  try {
    catalogTags.value = await api.etiquetasTodas<Etiqueta>()
    selectedTagIds.value = (catalog.etiquetas || []).flatMap((tag) => {
      if (typeof tag === 'string') {
        const found = catalogTags.value.find((item) => item.nombre === tag)
        return found ? [found.id] : []
      }
      return [tag.id]
    }).slice(0, 2)
  } catch (reason) {
    catalogTagsError.value = reason instanceof Error ? reason.message : 'No se pudieron cargar las etiquetas.'
  } finally {
    catalogTagsLoading.value = false
  }
}

function toggleCatalogTag(id: number) {
  if (selectedTagIds.value.includes(id)) {
    selectedTagIds.value = selectedTagIds.value.filter((item) => item !== id)
  } else if (selectedTagIds.value.length < 2) {
    selectedTagIds.value = [...selectedTagIds.value, id]
  }
}

function normalizeSocialValue(value: string, type: 'whatsapp' | 'instagram' | 'facebook') {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (type === 'whatsapp') {
    const digits = trimmed.replace(/\D+/g, '')
    if (digits) return `https://wa.me/${digits}`
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
    return `https://${trimmed}`
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  return `https://${trimmed}`
}

function openCatalogSocials() {
  const catalog = selectedCatalog.value
  if (!catalog || !canManageSelectedCatalog.value) return
  socialDraft.value = {
    whatsapp: catalog.whatsapp || '',
    instagram: catalog.instagram || '',
    facebook: catalog.facebook || '',
  }
  socialError.value = ''
  showCatalogSocials.value = true
}

async function saveCatalogSocials() {
  const catalog = selectedCatalog.value
  if (!catalog?.id || !canManageSelectedCatalog.value) return
  socialSaving.value = true
  socialError.value = ''
  try {
    const payload = {
      nombre: catalog.nombre,
      descripcion: catalog.descripcion || '',
      urlFotoPortada: catalog.urlFotoPortada || null,
      whatsapp: normalizeSocialValue(socialDraft.value.whatsapp, 'whatsapp'),
      instagram: normalizeSocialValue(socialDraft.value.instagram, 'instagram'),
      facebook: normalizeSocialValue(socialDraft.value.facebook, 'facebook'),
      etiquetaIds: (catalog.etiquetas || []).flatMap((tag) => {
        if (typeof tag === 'string') {
          const found = catalogTags.value.find((item) => item.nombre === tag)
          return found ? [found.id] : []
        }
        return [tag.id]
      }).slice(0, 2),
    }
    const updated = props.isAdmin
      ? await api.updateCatalogoAdmin<Catalogo>(catalog.id, payload)
      : await api.updateCatalogo<Catalogo>(props.usuarioId, catalog.id, payload)
    const updateList = (items: Catalogo[]) => items.map((item) => item.id === updated.id ? updated : item)
    catalogs.value = updateList(catalogs.value)
    allCatalogs.value = updateList(allCatalogs.value)
    selectedCatalog.value = updated
    showCatalogSocials.value = false
  } catch (reason) {
    socialError.value = reason instanceof Error ? reason.message : 'No se pudieron guardar las redes sociales.'
  } finally {
    socialSaving.value = false
  }
}

async function saveCatalogTags() {
  const catalog = selectedCatalog.value
  if (!catalog?.id || !canManageSelectedCatalog.value) return
  catalogTagsSaving.value = true
  catalogTagsError.value = ''
  try {
    const payload = {
      nombre: catalog.nombre,
      descripcion: catalog.descripcion || '',
      urlFotoPortada: catalog.urlFotoPortada || null,
      whatsapp: catalog.whatsapp ?? null,
      instagram: catalog.instagram ?? null,
      facebook: catalog.facebook ?? null,
      etiquetaIds: selectedTagIds.value,
    }
    const updated = props.isAdmin
      ? await api.updateCatalogoAdmin<Catalogo>(catalog.id, payload)
      : await api.updateCatalogo<Catalogo>(props.usuarioId, catalog.id, payload)
    const updateList = (items: Catalogo[]) => items.map((item) => item.id === updated.id ? updated : item)
    catalogs.value = updateList(catalogs.value)
    allCatalogs.value = updateList(allCatalogs.value)
    selectedCatalog.value = updated
    showCatalogTags.value = false
  } catch (reason) {
    catalogTagsError.value = reason instanceof Error ? reason.message : 'No se pudieron guardar las etiquetas.'
  } finally {
    catalogTagsSaving.value = false
  }
}

function requestCatalogTag() {
  const tagName = requestedTagName.value.trim()
  if (!tagName) return
  const message = `Hola, quisiera solicitar la creación de la etiqueta "${tagName}" para mis catálogos.`
  window.open(`https://wa.me/5359292460?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
  showTagRequestModal.value = false
}

function adminContactLink() {
  const message = `Hola, soy el usuario ${currentUsername()} del sitio CatalogoZone, quisiera saber las razones por la que mi catálogo ${selectedCatalog.value?.nombre || ''} ha sido bloqueado`
  return `https://wa.me/5359292460?text=${encodeURIComponent(message)}`
}

function openTagRequestModal() {
  requestedTagName.value = ''
  showTagRequestModal.value = true
}

async function toggleCatalogVisibility(catalog: Catalogo) {
  if (!catalog.id || (catalog.usuarioId !== props.usuarioId && !props.isAdmin)) return
  if (catalog.bloqueadoPorAdmin && !props.isAdmin) {
    showCatalogBlockedModal.value = true
    return
  }
  savingVisibilityId.value = catalog.id
  const errorTarget = section.value === 'all' ? allError : error
  errorTarget.value = ''
  try {
    const updated = await api.actualizarVisibilidadCatalogo<Catalogo>(catalog.id, catalog.visible === false)
    const updateList = (items: Catalogo[]) => items.map((item) => item.id === updated.id ? updated : item)
    catalogs.value = updateList(catalogs.value)
    allCatalogs.value = updateList(allCatalogs.value)
    if (selectedCatalog.value?.id === updated.id) selectedCatalog.value = updated
  } catch (reason) {
    errorTarget.value = reason instanceof Error ? reason.message : 'No se pudo cambiar la visibilidad del catálogo.'
  } finally {
    savingVisibilityId.value = null
  }
}

function syncCatalogGroupOrder(resetOrder = false) {
  const currentKeys = catalogProductGroups.value.map((group) => group.key)
  if (resetOrder) {
    savedCatalogGroupOrder.value = currentKeys
    draftCatalogGroupOrder.value = currentKeys
    return
  }

  const currentKeySet = new Set(currentKeys)
  const retainedDraftKeys = draftCatalogGroupOrder.value.filter((key) => currentKeySet.has(key))
  const addedKeys = currentKeys.filter((key) => !retainedDraftKeys.includes(key))
  const retainedSavedKeys = savedCatalogGroupOrder.value.filter((key) => currentKeySet.has(key))
  const savedKeySet = new Set(retainedSavedKeys)
  draftCatalogGroupOrder.value = [...retainedDraftKeys, ...addedKeys]
  savedCatalogGroupOrder.value = [...retainedSavedKeys, ...addedKeys.filter((key) => !savedKeySet.has(key))]
}

async function loadCatalogProducts(resetOrder = false) {
  if (!selectedCatalog.value?.id) return
  catalogProductsLoading.value = true
  catalogProductsError.value = ''
  try {
    catalogProducts.value = await api.catalogoProductos<CatalogoProducto>(selectedCatalog.value.id)
    catalogProducts.value.sort((a, b) => a.orden - b.orden)
    syncCatalogGroupOrder(resetOrder)
  } catch (reason) {
    catalogProductsError.value = reason instanceof Error ? reason.message : 'No se pudieron cargar los productos del catálogo.'
  } finally {
    catalogProductsLoading.value = false
  }
}

function catalogItemKey(item: CatalogoProducto) {
  if (item.comboId) return `combo-${item.comboId}`
  if (item.varianteId) return `variante-${item.varianteId}`
  return `producto-${item.productoId}`
}

async function updateCatalogItem(item: CatalogoProducto, changes: { orden?: number; visible?: boolean }) {
  if (!selectedCatalog.value?.id || !canManageSelectedCatalog.value) return
  const tipo = item.comboId ? 'combo' : item.varianteId ? 'variante' : 'producto'
  const elementoId = item.comboId ?? item.varianteId ?? item.productoId
  if (!elementoId) return
  const key = catalogItemKey(item)
  savingItemKey.value = key
  catalogProductsError.value = ''
  try {
    await api.actualizarElementoCatalogo(selectedCatalog.value.id, tipo, elementoId, changes)
    await loadCatalogProducts()
  } catch (reason) {
    catalogProductsError.value = reason instanceof Error ? reason.message : 'No se pudo actualizar el producto del catálogo.'
  } finally {
    savingItemKey.value = ''
  }
}

function moveCatalogItem(groupIndex: number, offset: -1 | 1) {
  const targetIndex = groupIndex + offset
  if (targetIndex < 0 || targetIndex >= catalogProductGroups.value.length) return

  const reordered = [...catalogProductGroups.value.map((group) => group.key)]
  const [groupKey] = reordered.splice(groupIndex, 1)
  reordered.splice(targetIndex, 0, groupKey)
  draftCatalogGroupOrder.value = reordered
}

async function saveCatalogOrder() {
  const catalogId = selectedCatalog.value?.id
  if (!catalogId || !canManageSelectedCatalog.value || !hasUnsavedCatalogOrder.value || savingItemKey.value) return

  savingItemKey.value = 'reordering'
  catalogProductsError.value = ''
  try {
    const updates: Array<{ item: CatalogoProducto; orden: number; request: Promise<CatalogoProducto> }> = []
    let order = 1
    for (const groupKey of draftCatalogGroupOrder.value) {
      const group = catalogProductGroups.value.find((itemGroup) => itemGroup.key === groupKey)
      if (!group) continue
      for (const item of [group.main, ...group.variants]) {
        const tipo = item.comboId ? 'combo' : item.varianteId ? 'variante' : 'producto'
        const elementoId = item.comboId ?? item.varianteId ?? item.productoId
        if (!elementoId) continue
        const itemOrder = order++
        updates.push({
          item,
          orden: itemOrder,
          request: api.actualizarElementoCatalogo<CatalogoProducto>(catalogId, tipo, elementoId, { orden: itemOrder }),
        })
      }
    }
    const results = await Promise.allSettled(updates.map((update) => update.request))
    const failedUpdate = results.find((result) => result.status === 'rejected')
    if (failedUpdate?.status === 'rejected') throw failedUpdate.reason

    const orderByKey = new Map(updates.map(({ item, orden }) => [catalogItemKey(item), orden]))
    catalogProducts.value = catalogProducts.value.map((item) => {
      const orden = orderByKey.get(catalogItemKey(item))
      return orden === undefined ? item : { ...item, orden }
    })
    savedCatalogGroupOrder.value = [...draftCatalogGroupOrder.value]
  } catch (reason) {
    catalogProductsError.value = reason instanceof Error ? reason.message : 'No se pudo guardar el orden del catálogo.'
  } finally {
    savingItemKey.value = ''
  }
}

function closeCatalogProducts(discardUnsavedOrder = false) {
  if (savingItemKey.value) return
  if (galleryUploading.value || gallerySaving.value || cropGalleryVisible.value || logoUploading.value || cropLogoVisible.value) return
  if (!discardUnsavedOrder && hasUnsavedCatalogOrder.value && !window.confirm('Hay cambios de posición sin guardar. ¿Quieres cerrar y descartarlos?')) return
  if (!discardUnsavedOrder && hasUnsavedGallery.value && !window.confirm('Hay cambios de galería sin guardar. ¿Quieres cerrar y descartarlos?')) return
  if (!discardUnsavedOrder && logoDraft.value && logoDraft.value !== selectedCatalog.value?.urlLogo && !window.confirm('Hay cambios de logo sin guardar. ¿Quieres cerrar y descartarlos?')) return
  selectedCatalog.value = null
  catalogProducts.value = []
  draftCatalogGroupOrder.value = []
  savedCatalogGroupOrder.value = []
  expandedVariantGroupKeys.value = []
  productVariants.value = {}
  variantsLoadingByProduct.value = []
  variantsErrorByProduct.value = {}
  catalogProductsError.value = ''
  showCatalogTags.value = false
  showCatalogGallery.value = false
  galleryDraft.value = []
  galleryError.value = ''
  showTagRequestModal.value = false
  showCatalogBlockedModal.value = false
  logoDraft.value = null
  logoError.value = ''
}

function editSelectedCatalog() {
  if (!selectedCatalog.value) return
  emit('edit', selectedCatalog.value)
}

async function loadAllCatalogs() {
  allLoading.value = true
  allError.value = ''
  try {
    const [catalogResults, userResults] = await Promise.all([
      api.catalogosTodos<Catalogo>(),
      api.list<Usuario>('usuarios/all'),
    ])
    allCatalogs.value = catalogResults
    users.value = userResults
    if (selectedCatalog.value?.id) {
      selectedCatalog.value = catalogResults.find((catalog) => catalog.id === selectedCatalog.value?.id) || selectedCatalog.value
    }
    allLoaded.value = true
  } catch (reason) {
    allError.value = reason instanceof Error ? reason.message : 'No se pudieron cargar todos los catálogos.'
  } finally {
    allLoading.value = false
  }
}

function selectSection(nextSection: 'mine' | 'all') {
  section.value = nextSection
  if (nextSection === 'all' && !allLoaded.value) void loadAllCatalogs()
}

async function removeCatalog(catalog: Catalogo) {
  if (!catalog.id) return
  deleteTargetCatalog.value = catalog
  showDeleteCatalogModal.value = true
}

async function confirmDeleteCatalog() {
  if (!deleteTargetCatalog.value?.id) return
  removingId.value = deleteTargetCatalog.value.id
  error.value = ''
  try {
    await api.deleteCatalogo(props.usuarioId, deleteTargetCatalog.value.id)
    catalogs.value = catalogs.value.filter((item) => item.id !== deleteTargetCatalog.value!.id)
    if (selectedCatalog.value?.id === deleteTargetCatalog.value.id) closeCatalogProducts(true)
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'No se pudo eliminar el catálogo.'
  } finally {
    removingId.value = null
    deleteTargetCatalog.value = null
    showDeleteCatalogModal.value = false
  }
}

async function removeAllCatalog(catalog: Catalogo) {
  if (!catalog.id) return
  deleteTargetAllCatalog.value = catalog
  showDeleteAllCatalogModal.value = true
}

async function confirmDeleteAllCatalog() {
  if (!deleteTargetAllCatalog.value?.id) return
  removingAllId.value = deleteTargetAllCatalog.value.id
  allError.value = ''
  try {
    await api.deleteCatalogoAdmin(deleteTargetAllCatalog.value.id)
    allCatalogs.value = allCatalogs.value.filter((item) => item.id !== deleteTargetAllCatalog.value!.id)
    catalogs.value = catalogs.value.filter((item) => item.id !== deleteTargetAllCatalog.value!.id)
    if (selectedCatalog.value?.id === deleteTargetAllCatalog.value.id) closeCatalogProducts(true)
  } catch (reason) {
    allError.value = reason instanceof Error ? reason.message : 'No se pudo eliminar el catálogo.'
  } finally {
    removingAllId.value = null
    deleteTargetAllCatalog.value = null
    showDeleteAllCatalogModal.value = false
  }
}

function deleteSelectedCatalog(catalog: Catalogo) {
  if (catalog.usuarioId === props.usuarioId) void removeCatalog(catalog)
  else if (props.isAdmin) void removeAllCatalog(catalog)
}

async function toggleCatalogItemVisibility(item: CatalogoProducto) {
  await updateCatalogItem(item, { visible: item.visible === false })
}

async function removeCatalogItem(item: CatalogoProducto) {
  if (!selectedCatalog.value?.id || !canManageSelectedCatalog.value) return
  deleteTargetCatalogItem.value = item
  showDeleteCatalogItemModal.value = true
}

async function confirmDeleteCatalogItem() {
  if (!deleteTargetCatalogItem.value || !selectedCatalog.value?.id || !canManageSelectedCatalog.value) return
  savingItemKey.value = catalogItemKey(deleteTargetCatalogItem.value)
  catalogProductsError.value = ''
  try {
    const tipo = deleteTargetCatalogItem.value.comboId ? 'combo' : deleteTargetCatalogItem.value.varianteId ? 'variante' : 'producto'
    const elementoId = deleteTargetCatalogItem.value.comboId ?? deleteTargetCatalogItem.value.varianteId ?? deleteTargetCatalogItem.value.productoId
    if (!elementoId) return
    await api.eliminarElementoCatalogo(selectedCatalog.value.id, tipo, elementoId)
    await loadCatalogProducts()
  } catch (reason) {
    catalogProductsError.value = reason instanceof Error ? reason.message : 'No se pudo quitar el producto del catálogo.'
  } finally {
    savingItemKey.value = ''
    deleteTargetCatalogItem.value = null
    showDeleteCatalogItemModal.value = false
  }
}


watch(
  [() => props.usuarioId, () => props.refreshKey],
  () => {
    void loadCatalogs()
    if (section.value === 'all') {
      allLoaded.value = false
      void loadAllCatalogs()
    }
  },
  { immediate: true },
)
</script>

<template>
  <section class="catalog-page">
    <div class="page-heading">
      <div>
        <p class="eyebrow">Gestión de catálogos</p>
        <h2>{{ section === 'mine' ? 'Mis catálogos' : 'Todos los catálogos' }}</h2>
        <p class="muted">{{ section === 'mine' ? 'Administra los catálogos vinculados a tu negocio.' : 'Busca, edita y elimina los catálogos del sistema.' }}</p>
      </div>
      <button v-if="section === 'mine'" class="primary-action" type="button" @click="emit('create')">
        <Plus :size="17" />
        Crear nuevo catálogo
      </button>
    </div>

    <div v-if="props.isAdmin" class="catalog-tabs" role="tablist" aria-label="Secciones de catálogos">
      <button type="button" role="tab" :aria-selected="section === 'mine'" :class="{ active: section === 'mine' }" @click="selectSection('mine')">Mis catálogos</button>
      <button type="button" role="tab" :aria-selected="section === 'all'" :class="{ active: section === 'all' }" @click="selectSection('all')">Todos los catálogos</button>
    </div>

    <div v-if="selectedCatalog" class="catalog-management-overlay" @click.self="closeCatalogProducts()" @keydown.esc="closeCatalogProducts()">
      <section class="catalog-products-page" role="dialog" aria-modal="true" :aria-label="`Gestión del catálogo ${selectedCatalog.nombre}`">
        <header class="management-cover" :style="selectedCatalog.urlFotoPortada ? { backgroundImage: `linear-gradient(90deg, rgba(13,31,24,.84), rgba(13,31,24,.35)), url('${selectedCatalog.urlFotoPortada}')` } : undefined">
          <div class="cover-content">
            <button class="back-action" type="button" @click="closeCatalogProducts()"><ArrowLeft :size="15" /> {{ section === 'mine' ? 'Mis catálogos' : 'Todos los catálogos' }}</button>
            <p class="eyebrow">Gestión del catálogo</p>
            <h2>{{ selectedCatalog.nombre }}</h2>
            <p>{{ selectedCatalog.descripcion || (canManageSelectedCatalog ? 'Administra los productos, su visibilidad y posición.' : 'Productos incluidos en este catálogo.') }}</p>
          </div>
          <div class="management-cover-logo" v-if="canManageSelectedCatalog">
            <div v-if="logoDraft || selectedCatalog.urlLogo" class="logo-preview" :style="{ backgroundImage: `url('${logoDraft || selectedCatalog.urlLogo}')` }" @click="removeLogo" title="Quitar logo">
              <X :size="16" />
            </div>
            <label v-else class="logo-upload-btn">
              <Image :size="20" />
              <span>Subir logo</span>
              <input type="file" accept="image/*" :disabled="logoUploading" @change="selectLogoPhoto" />
            </label>
            <p v-if="logoError" class="logo-error">{{ logoError }}</p>
            <p v-if="logoUploading" class="logo-uploading">Subiendo...</p>
            <button v-if="logoDraft && logoDraft !== selectedCatalog.urlLogo" class="save-logo-btn" type="button" :disabled="logoUploading" @click="saveCatalogLogo">
              <Save :size="14" /> Guardar logo
            </button>
          </div>
          <div class="management-header-actions">
            <button v-if="canManageSelectedCatalog" class="header-icon-button visibility-toggle" :class="{ shown: selectedCatalog.visible !== false, blocked: selectedCatalog.bloqueadoPorAdmin && !props.isAdmin }" type="button" :title="selectedCatalog.bloqueadoPorAdmin && !props.isAdmin ? 'Bloqueado por el administrador' : selectedCatalog.visible === false ? 'Mostrar en la página principal' : 'Ocultar de la página principal'" :aria-label="selectedCatalog.bloqueadoPorAdmin && !props.isAdmin ? 'Bloqueado por el administrador. Contactar con administración' : selectedCatalog.visible === false ? 'Mostrar catálogo en la página principal' : 'Ocultar catálogo de la página principal'" :disabled="savingVisibilityId === selectedCatalog.id" @click="toggleCatalogVisibility(selectedCatalog)"><RefreshCw v-if="savingVisibilityId === selectedCatalog.id" class="spin" :size="16" /><LockKeyhole v-else-if="selectedCatalog.bloqueadoPorAdmin && !props.isAdmin" :size="16" /><Eye v-else-if="selectedCatalog.visible === false" :size="16" /><EyeOff v-else :size="16" /></button>
            <button v-if="canManageSelectedCatalog" class="header-icon-button" :class="{ active: showCatalogTags }" type="button" title="Añadir o editar etiquetas" aria-label="Añadir o editar etiquetas" @click="openCatalogTags"><Tag :size="16" /></button>
            <button v-if="canManageSelectedCatalog" class="header-icon-button" :class="{ active: showCatalogSocials }" type="button" title="Redes sociales" aria-label="Redes sociales" @click="openCatalogSocials"><Globe2 :size="16" /></button>
            <button v-if="canManageSelectedCatalog" class="header-icon-button" :class="{ active: showCatalogGallery }" type="button" title="Gestionar galería" aria-label="Gestionar galería" @click="showCatalogGallery = !showCatalogGallery"><ImagePlus :size="16" /></button>
            <button v-if="canManageSelectedCatalog" class="header-icon-button" type="button" title="Editar catálogo" aria-label="Editar catálogo" @click="editSelectedCatalog"><Pencil :size="16" /></button>
            <button v-if="canManageSelectedCatalog" class="header-icon-button danger" type="button" title="Eliminar catálogo" aria-label="Eliminar catálogo" :disabled="Boolean(savingItemKey) || removingId === selectedCatalog.id || removingAllId === selectedCatalog.id" @click="deleteSelectedCatalog(selectedCatalog)"><RefreshCw v-if="removingId === selectedCatalog.id || removingAllId === selectedCatalog.id" class="spin" :size="16" /><Trash2 v-else :size="16" /></button>
            <button class="header-icon-button close" type="button" title="Cerrar" aria-label="Cerrar gestión del catálogo" :disabled="Boolean(savingItemKey) || gallerySaving || galleryUploading || cropGalleryVisible" @click="closeCatalogProducts()"><X :size="19" /></button>
          </div>
        </header>

        <div class="management-content">
          <section v-if="showCatalogTags" class="catalog-tags-panel" aria-label="Etiquetas del catálogo">
            <header><div><h3>Etiquetas <span>{{ selectedTagIds.length }}/2</span></h3><p>Elige hasta dos etiquetas para ayudar a encontrar este catálogo.</p></div><button type="button" title="Cerrar etiquetas" aria-label="Cerrar etiquetas" @click="showCatalogTags = false"><X :size="16" /></button></header>
            <div v-if="catalogTagsLoading" class="tag-loading"><RefreshCw :size="16" class="spin" /> Cargando etiquetas...</div>
            <p v-if="catalogTagsError" class="catalog-inline-error">{{ catalogTagsError }} <button class="tag-retry" type="button" @click="loadCatalogTags">Reintentar</button></p>
            <div v-else-if="!catalogTagsLoading && catalogTags.length" class="catalog-tag-picker">
              <button v-for="tag in catalogTags" :key="tag.id" type="button" :class="{ selected: selectedTagIds.includes(tag.id) }" :aria-pressed="selectedTagIds.includes(tag.id)" :disabled="selectedTagIds.length >= 2 && !selectedTagIds.includes(tag.id)" @click="toggleCatalogTag(tag.id)"><Tag :size="13" />{{ tag.nombre }}</button>
            </div>
            <p v-else-if="!catalogTagsLoading" class="tag-loading">No hay etiquetas disponibles.</p>
            <p class="tag-request-copy">¿No encuentras tu etiqueta? No te preocupes, puedes solicitar la creación de una nueva.</p>
            <button class="open-tag-request" type="button" @click="openTagRequestModal"><Tag :size="15" /> Solicitar una etiqueta</button>
            <footer><button class="save-tags-button" type="button" :disabled="catalogTagsSaving || catalogTagsLoading || Boolean(catalogTagsError)" @click="saveCatalogTags"><RefreshCw v-if="catalogTagsSaving" class="spin" :size="15" /><Tag v-else :size="15" />{{ catalogTagsSaving ? 'Guardando...' : 'Guardar etiquetas' }}</button></footer>
          </section>

          <section v-if="showCatalogSocials" class="catalog-tags-panel" aria-label="Redes sociales del catálogo">
            <header>
              <div>
                <h3>Redes sociales</h3>
                <p>Agrega tus enlaces para que los clientes puedan contactarte desde la página pública.</p>
              </div>
              <button type="button" title="Cerrar redes sociales" aria-label="Cerrar redes sociales" @click="showCatalogSocials = false"><X :size="16" /></button>
            </header>
            <p v-if="socialError" class="catalog-inline-error">{{ socialError }}</p>
            <div class="catalog-social-grid">
              <label class="catalog-social-field">
                <span><MessageCircle :size="14" /> WhatsApp</span>
                <input v-model="socialDraft.whatsapp" type="url" placeholder="https://wa.me/549... o enlace de grupo" />
              </label>
              <label class="catalog-social-field">
                <span><Instagram :size="14" /> Instagram</span>
                <input v-model="socialDraft.instagram" type="url" placeholder="https://instagram.com/usuario" />
              </label>
              <label class="catalog-social-field">
                <span><Facebook :size="14" /> Facebook</span>
                <input v-model="socialDraft.facebook" type="url" placeholder="https://facebook.com/usuario" />
              </label>
            </div>
            <footer>
              <span class="gallery-unsaved-note">Opcional</span>
              <button class="save-tags-button" type="button" :disabled="socialSaving" @click="saveCatalogSocials">
                <RefreshCw v-if="socialSaving" class="spin" :size="15" />
                <Save v-else :size="15" />
                {{ socialSaving ? 'Guardando...' : 'Guardar redes' }}
              </button>
            </footer>
          </section>

          <section v-if="showCatalogGallery" class="catalog-gallery-panel" aria-label="Galería del catálogo">
            <header>
              <div><h3>Galería <span>{{ galleryDraft.length }}/10</span></h3><p>Añade hasta 10 fotos de diseños y productos para mostrar en tu catálogo.</p></div>
              <button type="button" title="Cerrar galería" aria-label="Cerrar galería" @click="showCatalogGallery = false"><X :size="16" /></button>
            </header>
            <p v-if="galleryError" class="catalog-inline-error">{{ galleryError }}</p>
            <div class="gallery-photo-grid">
              <article v-for="(photo, index) in galleryDraft" :key="`${photo}-${index}`" class="gallery-photo-card">
                <img :src="photo.url" :alt="`Foto ${index + 1} de la galería`" />
                <label class="gallery-description-label">Descripción<textarea v-model="photo.descripcion" maxlength="300" rows="2" placeholder="Describe el diseño o producto"></textarea></label>
                <div class="gallery-photo-actions">
                  <label class="gallery-change-button">Cambiar<input type="file" accept="image/*" :disabled="galleryUploading" @change="selectGalleryPhoto($event, index)" /></label>
                  <button type="button" :aria-label="`Quitar foto ${index + 1}`" title="Quitar foto" :disabled="galleryUploading" @click="removeGalleryPhoto(index)"><Trash2 :size="14" /></button>
                </div>
              </article>
              <label v-if="galleryDraft.length < 10" class="gallery-add-card" :class="{ disabled: galleryUploading }">
                <ImagePlus :size="23" /><span>{{ galleryUploading ? 'Subiendo...' : 'Añadir foto' }}</span>
                <input type="file" accept="image/*" :disabled="galleryUploading" @change="selectGalleryPhoto($event)" />
              </label>
            </div>
            <footer>
              <span v-if="hasUnsavedGallery" class="gallery-unsaved-note">Tienes cambios sin guardar.</span>
              <button class="save-tags-button" type="button" :disabled="!hasUnsavedGallery || gallerySaving || galleryUploading" @click="saveCatalogGallery">
                <RefreshCw v-if="gallerySaving || galleryUploading" class="spin" :size="15" />
                <Save v-else :size="15" />
                {{ galleryUploading ? 'Subiendo foto...' : gallerySaving ? 'Guardando...' : 'Guardar galería' }}
              </button>
            </footer>
          </section>

          <div v-if="showTagRequestModal" class="catalog-submodal-overlay" @click.self="showTagRequestModal = false" @keydown.esc.stop="showTagRequestModal = false">
            <section class="catalog-submodal" role="dialog" aria-modal="true" aria-labelledby="tag-request-title">
              <button class="submodal-close" type="button" aria-label="Cerrar" @click="showTagRequestModal = false"><X :size="18" /></button>
              <div class="submodal-icon"><Tag :size="22" /></div>
              <h3 id="tag-request-title">Solicitar una etiqueta</h3>
              <p>¿No encuentras tu etiqueta? No te preocupes, puedes solicitar la creación de una nueva.</p>
              <label for="requested-tag-name">Nombre de la etiqueta</label>
              <input id="requested-tag-name" v-model="requestedTagName" type="text" maxlength="100" placeholder="Escribe la etiqueta que necesitas" />
              <div class="submodal-actions">
                <button class="secondary-action" type="button" @click="showTagRequestModal = false">Cancelar</button>
                <button class="save-tags-button" type="button" :disabled="!requestedTagName.trim()" @click="requestCatalogTag">Continuar por WhatsApp</button>
              </div>
            </section>
          </div>

          <div v-if="showCatalogBlockedModal" class="catalog-submodal-overlay" @click.self="showCatalogBlockedModal = false" @keydown.esc.stop="showCatalogBlockedModal = false">
            <section class="catalog-submodal blocked-notice" role="dialog" aria-modal="true" aria-labelledby="catalog-blocked-title">
              <button class="submodal-close" type="button" aria-label="Cerrar" @click="showCatalogBlockedModal = false"><X :size="18" /></button>
              <div class="submodal-icon blocked"><LockKeyhole :size="22" /></div>
              <h3 id="catalog-blocked-title">Catálogo bloqueado</h3>
              <p>Este catálogo ha sido bloqueado por el administrador del sitio. Para conocer las razones, contacta con el administrador.</p>
              <a class="contact-admin-button" :href="adminContactLink()" target="_blank" rel="noopener noreferrer">Contactar con el administrador por WhatsApp</a>
              <button class="secondary-action" type="button" @click="showCatalogBlockedModal = false">Cerrar</button>
            </section>
          </div>

          <div class="products-heading">
            <div><p class="eyebrow">Selección</p><h3>Productos <span>{{ catalogProductGroups.length }}</span></h3></div>
            <div v-if="canManageSelectedCatalog" class="products-heading-actions">
              <button class="save-order-button" type="button" :disabled="!hasUnsavedCatalogOrder || catalogProductsLoading || Boolean(savingItemKey)" @click="saveCatalogOrder">
                <RefreshCw v-if="savingItemKey === 'reordering'" class="spin" :size="16" />
                <Save v-else :size="16" />
                {{ savingItemKey === 'reordering' ? 'Guardando...' : hasUnsavedCatalogOrder ? 'Guardar posiciones' : 'Posiciones guardadas' }}
              </button>
              <button class="add-product-icon add-combo-icon" type="button" title="Añadir combo" aria-label="Añadir combo" :disabled="Boolean(savingItemKey)" @click="showAddCombo = true"><Layers :size="18" /></button>
              <button class="add-product-icon" type="button" title="Añadir producto" aria-label="Añadir producto" :disabled="Boolean(savingItemKey)" @click="showAddProduct = true"><Plus :size="19" /></button>
            </div>
          </div>

          <p v-if="error" class="catalog-inline-error">{{ error }}</p>
          <p v-if="section === 'all' && allError" class="catalog-inline-error">{{ allError }}</p>
          <div v-if="catalogProductsLoading" class="catalog-state"><RefreshCw :size="24" class="spin" /><p>Cargando productos del catálogo...</p></div>
          <div v-else-if="catalogProductsError" class="catalog-state error-state"><AlertCircle :size="28" /><p>{{ catalogProductsError }}</p><button class="secondary-action" type="button" @click="loadCatalogProducts()">Reintentar</button></div>
          <div v-else-if="!catalogProducts.length" class="catalog-state empty-catalogs"><Package :size="36" /><h3>Este catálogo todavía no tiene productos</h3><p>{{ canManageSelectedCatalog ? 'Agrega productos desde tu inventario y define su posición.' : 'Todavía no se han agregado productos.' }}</p><button v-if="canManageSelectedCatalog" class="primary-action" type="button" :disabled="Boolean(savingItemKey)" @click="showAddProduct = true"><Plus :size="17" /> Añadir producto</button></div>
          <div v-else class="catalog-products-list">
            <section v-for="(group, index) in catalogProductGroups" :key="group.key" class="catalog-product-group">
              <article class="catalog-product-row" :class="{ 'is-hidden': group.main.visible === false }">
                <div class="item-photo"><img v-if="group.main.urlFoto" :src="group.main.urlFoto" :alt="group.main.nombre" loading="lazy" /><Package v-else :size="25" /></div>
                <div class="catalog-product-info"><div class="product-title-line"><strong>{{ group.main.nombre }}</strong><span class="visibility-status" :class="{ hidden: group.main.visible === false }">{{ group.main.visible === false ? 'Oculto' : 'Visible' }}</span></div><p>{{ group.main.descripcion || 'Sin descripción disponible.' }}</p><strong v-if="group.main.precioVenta !== undefined" class="product-price">{{ group.main.precioVenta }}</strong></div>
                <div v-if="canManageSelectedCatalog" class="item-actions">
                  <div class="order-actions">
                    <button type="button" :aria-label="`Mover ${group.main.nombre} arriba`" title="Mover arriba" :disabled="index === 0 || Boolean(savingItemKey)" @click="moveCatalogItem(index, -1)"><ArrowUp :size="14" /></button>
                    <button type="button" :aria-label="`Mover ${group.main.nombre} abajo`" title="Mover abajo" :disabled="index === catalogProductGroups.length - 1 || Boolean(savingItemKey)" @click="moveCatalogItem(index, 1)"><ArrowDown :size="14" /></button>
                  </div>
                  <button class="visibility-button" :class="{ visible: group.main.visible !== false }" type="button" :aria-label="`${group.main.visible === false ? 'Mostrar' : 'Ocultar'} ${group.main.nombre}`" :title="group.main.visible === false ? 'Mostrar en el catálogo' : 'Ocultar del catálogo'" :disabled="Boolean(savingItemKey)" @click="toggleCatalogItemVisibility(group.main)"><Eye v-if="group.main.visible === false" :size="15" /><EyeOff v-else :size="15" /><span>{{ group.main.visible === false ? 'Mostrar' : 'Ocultar' }}</span></button>
                  <button class="show-variants-button" type="button" :aria-expanded="expandedVariantGroupKeys.includes(group.key)" :aria-label="`${expandedVariantGroupKeys.includes(group.key) ? 'Ocultar' : 'Mostrar'} ${group.main.comboId ? 'productos' : 'variantes'} de ${group.main.nombre}`" :title="`${expandedVariantGroupKeys.includes(group.key) ? 'Ocultar' : 'Mostrar'} ${group.main.comboId ? 'productos del combo' : 'variantes'}`" @click="toggleProductVariants(group)">
                    <ChevronUp v-if="expandedVariantGroupKeys.includes(group.key)" :size="14" />
                    <ChevronDown v-else :size="14" />
                    <span>{{ expandedVariantGroupKeys.includes(group.key) ? 'Ocultar lista' : group.main.comboId ? 'Ver productos' : 'Mostrar variantes' }}</span>
                    <small>{{ group.main.comboId ? group.main.componentes?.length ?? 0 : productVariants[group.main.productoId ?? 0]?.length ?? group.variants.length }}</small>
                  </button>
                  <button class="remove-item" type="button" :aria-label="`Quitar ${group.main.nombre} del catálogo`" title="Quitar del catálogo" :disabled="Boolean(savingItemKey)" @click="removeCatalogItem(group.main)"><RefreshCw v-if="savingItemKey === catalogItemKey(group.main)" class="spin" :size="15" /><Trash2 v-else :size="15" /></button>
                </div>
              </article>
              <p v-if="group.main.productoId && variantsLoadingByProduct.includes(group.main.productoId) && expandedVariantGroupKeys.includes(group.key)" class="variant-state"><RefreshCw :size="14" class="spin" /> Cargando variantes...</p>
              <p v-else-if="group.main.productoId && variantsErrorByProduct[group.main.productoId] && expandedVariantGroupKeys.includes(group.key)" class="variant-state variant-error">{{ variantsErrorByProduct[group.main.productoId] }}</p>
              <p v-else-if="!group.main.comboId && group.main.productoId && productVariants[group.main.productoId]?.length === 0 && expandedVariantGroupKeys.includes(group.key)" class="variant-state">Este producto no tiene variantes activas.</p>
              <article v-for="variant in displayVariants(group)" v-show="expandedVariantGroupKeys.includes(group.key)" :key="variant.id" class="catalog-variant-row" :class="{ 'is-hidden': variant.catalogItem?.visible === false }">
                <div class="variant-branch" aria-hidden="true"></div>
                <div class="item-photo"><img v-if="variant.urlFoto" :src="variant.urlFoto" :alt="variant.nombre" loading="lazy" /><Package v-else :size="21" /></div>
                <div class="catalog-product-info"><div class="product-title-line"><strong>{{ variant.nombre }}</strong><span class="subproduct-label">{{ variant.esComponenteCombo ? 'Producto del combo' : 'Variante' }}</span><span v-if="variant.catalogItem" class="visibility-status" :class="{ hidden: variant.catalogItem.visible === false }">{{ variant.catalogItem.visible === false ? 'Oculto' : 'Visible' }}</span></div><p>{{ variant.esComponenteCombo ? `Cantidad: ${variant.cantidad}` : group.main.nombre }}<template v-if="variant.existencia !== undefined"> · {{ variant.existencia }} en stock</template></p></div>
                <div v-if="canManageSelectedCatalog && variant.catalogItem" class="item-actions">
                  <button class="visibility-button" :class="{ visible: variant.catalogItem.visible !== false }" type="button" :aria-label="`${variant.catalogItem.visible === false ? 'Mostrar' : 'Ocultar'} variante ${variant.nombre}`" :title="variant.catalogItem.visible === false ? 'Mostrar en el catálogo' : 'Ocultar del catálogo'" :disabled="Boolean(savingItemKey)" @click="toggleCatalogItemVisibility(variant.catalogItem)"><Eye v-if="variant.catalogItem.visible === false" :size="15" /><EyeOff v-else :size="15" /><span>{{ variant.catalogItem.visible === false ? 'Mostrar' : 'Ocultar' }}</span></button>
                  <button class="remove-item" type="button" :aria-label="`Quitar variante ${variant.nombre} del catálogo`" title="Quitar del catálogo" :disabled="Boolean(savingItemKey)" @click="removeCatalogItem(variant.catalogItem)"><RefreshCw v-if="savingItemKey === catalogItemKey(variant.catalogItem)" class="spin" :size="15" /><Trash2 v-else :size="15" /></button>
                </div>
              </article>
            </section>
          </div>
        </div>
      </section>
    </div>

    <template v-else-if="section === 'mine'">
    <div v-if="loading" class="catalog-state">
      <RefreshCw :size="24" class="spin" />
      <p>Cargando tus catálogos...</p>
    </div>

    <div v-else-if="error" class="catalog-state error-state">
      <AlertCircle :size="28" />
      <p>{{ error }}</p>
      <button class="secondary-action" type="button" @click="loadCatalogs">Reintentar</button>
    </div>

    <div v-else-if="!catalogs.length" class="catalog-state empty-catalogs">
      <div class="empty-illustration"><Store :size="42" /></div>
      <h3>Aún no tienes catálogos</h3>
      <p>Crea tu primer catálogo para empezar a mostrar tus productos.</p>
      <button class="primary-action" type="button" @click="emit('create')">
        <Plus :size="17" />
        Crear nuevo catálogo
      </button>
    </div>

    <div v-else class="catalog-grid">
      <article v-for="catalog in catalogs" :key="catalog.id ?? catalog.nombre" class="catalog-card" role="button" tabindex="0" @click="manageCatalogProducts(catalog)" @keydown.enter.prevent="manageCatalogProducts(catalog)" @keydown.space.prevent="manageCatalogProducts(catalog)">
        <div class="catalog-cover">
          <img v-if="catalog.urlFotoPortada" :src="catalog.urlFotoPortada" :alt="catalog.nombre" />
          <Store v-else :size="38" />
        </div>
        <div class="catalog-info">
          <h3>{{ catalog.nombre }}</h3>
          <p>{{ catalog.descripcion || 'Sin descripción disponible.' }}</p>
        </div>
      </article>
    </div>
    </template>

    <template v-else-if="section === 'all'">
      <div class="all-catalog-toolbar">
        <label class="all-catalog-search"><Search :size="17" aria-hidden="true" /><input v-model="allSearch" type="search" placeholder="Filtrar por nombre" aria-label="Filtrar catálogos por nombre" /></label>
        <button class="secondary-action" type="button" :disabled="allLoading" @click="loadAllCatalogs"><RefreshCw :size="16" :class="{ spin: allLoading }" /> Actualizar</button>
      </div>
      <div v-if="allLoading" class="catalog-state"><RefreshCw :size="24" class="spin" /><p>Cargando todos los catálogos...</p></div>
      <div v-else-if="allError" class="catalog-state error-state"><AlertCircle :size="28" /><p>{{ allError }}</p><button class="secondary-action" type="button" @click="loadAllCatalogs">Reintentar</button></div>
      <div v-else-if="!filteredAllCatalogs.length" class="catalog-state empty-catalogs"><Store :size="36" /><p>{{ allSearch ? 'No hay catálogos que coincidan con el nombre.' : 'Aún no hay catálogos en el sistema.' }}</p></div>
      <div v-else class="catalog-grid">
        <article v-for="catalog in filteredAllCatalogs" :key="catalog.id ?? catalog.nombre" class="catalog-card admin-catalog-card">
          <div class="catalog-cover">
            <img v-if="catalog.urlFotoPortada" :src="catalog.urlFotoPortada" :alt="`Portada de ${catalog.nombre}`" />
            <Store v-else :size="38" />
            <button v-if="props.isAdmin" class="catalog-visibility-action" :class="{ shown: catalog.visible !== false }" type="button" :title="catalog.visible === false ? 'Mostrar en la página principal' : 'Ocultar de la página principal'" :aria-label="catalog.visible === false ? `Mostrar ${catalog.nombre} en la página principal` : `Ocultar ${catalog.nombre} de la página principal`" :disabled="savingVisibilityId === catalog.id" @click="toggleCatalogVisibility(catalog)"><RefreshCw v-if="savingVisibilityId === catalog.id" class="spin" :size="17" /><Eye v-else-if="catalog.visible === false" :size="17" /><EyeOff v-else :size="17" /></button>
            <span class="catalog-visibility-status" :class="{ hidden: catalog.visible === false }">{{ catalog.visible === false ? 'Oculto' : 'Visible' }}</span>
          </div>
          <div class="catalog-info">
            <h3>{{ catalog.nombre }}</h3>
            <p class="catalog-owner">Propietario: {{ ownerNames.get(catalog.usuarioId ?? -1) || 'Usuario desconocido' }}</p>
            <p>{{ catalog.descripcion || 'Sin descripción disponible.' }}</p>
          </div>
        </article>
      </div>
    </template>

    <AddProductToCatalogModal
      :visible="showAddProduct"
      :catalogs="catalogs"
      :fixed-catalog="selectedCatalog || undefined"
      :admin-mode="props.isAdmin"
      @close="showAddProduct = false"
      @added="loadCatalogProducts(true)"
    />
    <ImageCropModal
      :visible="cropGalleryVisible"
      :file="pendingGalleryFile"
      :aspect-ratio="4 / 3"
      title="Ajustar foto de galería"
      @cancel="cropGalleryVisible = false; pendingGalleryFile = null; pendingGalleryIndex = null"
      @crop="uploadGalleryPhoto"
    />
    <ImageCropModal
      :visible="cropLogoVisible"
      :file="pendingLogoFile"
      :aspect-ratio="1 / 1"
      title="Ajustar logo"
      @cancel="cropLogoVisible = false; pendingLogoFile = null"
      @crop="uploadLogoPhoto"
    />
    <AddComboToCatalogModal
      :visible="showAddCombo"
      :catalog="selectedCatalog"
      :admin-mode="props.isAdmin"
      @close="showAddCombo = false"
      @added="loadCatalogProducts(true)"
    />
    <DeleteConfirmModal
      :visible="showDeleteCatalogModal"
      :title="'Eliminar catálogo'"
      :message="deleteCatalogMessage"
      :loading="removingId !== null"
      @confirm="confirmDeleteCatalog"
      @cancel="showDeleteCatalogModal = false; deleteTargetCatalog = null"
    />
    <DeleteConfirmModal
      :visible="showDeleteAllCatalogModal"
      :title="'Eliminar catálogo'"
      :message="deleteAllCatalogMessage"
      :loading="removingAllId !== null"
      @confirm="confirmDeleteAllCatalog"
      @cancel="showDeleteAllCatalogModal = false; deleteTargetAllCatalog = null"
    />
    <DeleteConfirmModal
      :visible="showDeleteCatalogItemModal"
      :title="'Quitar del catálogo'"
      :message="deleteCatalogItemMessage"
      :loading="savingItemKey !== ''"
      @confirm="confirmDeleteCatalogItem"
      @cancel="showDeleteCatalogItemModal = false; deleteTargetCatalogItem = null"
    />
  </section>
</template>

<style scoped>
.catalog-page { padding: 34px 0; }
.page-heading { display: flex; align-items: end; justify-content: space-between; gap: 24px; margin-bottom: 28px; }
.eyebrow { margin: 0; color: #777; font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
h2 { margin: 8px 0 7px; color: #171717; font: 700 clamp(28px, 4vw, 42px) 'Space Grotesk', Arial, sans-serif; }
.muted, .catalog-info p { color: #777; }
.page-heading p:last-child { margin: 0; }
.primary-action, .secondary-action { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 0; border-radius: 10px; padding: 12px 15px; font-weight: 700; cursor: pointer; }
.primary-action { background: #171717; color: #fff; }
.secondary-action { background: #fff6f0; color: #c65b19; }
.catalog-state { min-height: 350px; display: grid; place-content: center; justify-items: center; gap: 10px; padding: 30px; border: 1px solid #e8e8e8; border-radius: 16px; background: #fff; color: #777; text-align: center; }
.catalog-state p { margin: 0; }
.catalog-inline-error { margin:0;color:#a8584e; }
.empty-illustration { width: 86px; height: 86px; display: grid; place-items: center; margin-bottom: 6px; border-radius: 28px; background: #fff6f0; color: #c65b19; }
.empty-catalogs h3 { margin: 0; color: #171717; font-size: 22px; }
.empty-catalogs p { max-width: 340px; line-height: 1.5; }
.error-state { color: #a8584e; }
.catalog-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
.catalog-card { overflow: hidden; border: 1px solid #e8e8e8; border-radius: 16px; background: #fff; cursor:pointer; transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease; }
.catalog-card:hover,.catalog-card:focus-visible { transform:translateY(-2px);border-color:#c65b19;box-shadow:0 12px 28px rgba(198,91,25,0.12);outline:none; }
.catalog-cover { position: relative; height: 170px; display: grid; place-items: center; overflow: hidden; background: #fff6f0; color: #c65b19; }
.catalog-cover img { width: 100%; height: 100%; object-fit: cover; }
.admin-catalog-card { cursor:default; }
.admin-catalog-card:hover { transform:none; }
.catalog-visibility-action { position:absolute;top:12px;right:12px;z-index:1;display:grid;place-items:center;width:36px;height:36px;border:1px solid rgba(255,255,255,.65);border-radius:11px;background:rgba(255,255,255,.92);color:#a8584e;box-shadow:0 5px 16px rgba(0,0,0,.18);cursor:pointer;backdrop-filter:blur(5px); }
.catalog-visibility-action.shown { color:#c65b19; }
.catalog-visibility-action:hover { transform:translateY(-1px);background:#fff; }
.catalog-visibility-action:disabled { opacity:.55;cursor:wait; }
.catalog-visibility-status { position:absolute;left:12px;bottom:12px;padding:5px 9px;border-radius:999px;background:#fff6f0;color:#c65b19;font-size:10px;font-weight:800;box-shadow:0 3px 10px rgba(0,0,0,.12); }
.catalog-visibility-status.hidden { background:#f6e5e1;color:#985149; }
.status { position: absolute; top: 12px; right: 12px; padding: 5px 8px; border-radius: 999px; font-size: 11px; font-weight: 800; }
.status-on { background: #fff6f0; color: #c65b19; }
.status-off { background: #f6e5e1; color: #985149; }
.catalog-info { padding: 18px; }
.catalog-info h3 { margin: 0 0 7px; color: #171717; }
.catalog-info p { margin: 0; line-height: 1.5; }
.catalog-tabs { display: flex; gap: 8px; margin: 0 0 20px; border-bottom: 1px solid #e8e8e8; }
.catalog-tabs button { padding: 10px 14px; border: 0; border-bottom: 2px solid transparent; background: transparent; color: #777; font-weight: 700; }
.catalog-tabs button.active { border-bottom-color: #c65b19; color: #c65b19; }
.all-catalog-toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
.all-catalog-search { display: flex; align-items: center; gap: 9px; width: min(100%, 460px); min-height: 44px; padding: 0 12px; border: 1px solid #e8e8e8; border-radius: 9px; background: #fff; color: #777; }
.all-catalog-search input { width: 100%; min-width: 0; border: 0; outline: 0; background: transparent; color: #171717; font: inherit; }
.catalog-owner { margin-bottom: 6px !important; font-size: 12px; font-weight: 700; }
.catalog-gallery-panel { display:grid;gap:16px;margin-bottom:22px;padding:18px;border:1px solid #e8e8e8;border-radius:16px;background:#fff; }
.catalog-gallery-panel>header { display:flex;align-items:flex-start;justify-content:space-between;gap:14px; }
.catalog-gallery-panel>header h3 { display:flex;align-items:center;gap:8px;margin:0;color:#171717;font-size:18px; }
.catalog-gallery-panel>header h3 span { display:grid;place-items:center;min-width:24px;height:24px;padding:0 7px;border-radius:999px;background:#fff6f0;color:#c65b19;font-size:11px; }
.catalog-gallery-panel>header p { margin:5px 0 0;color:#777;font-size:12px;line-height:1.5; }
.catalog-gallery-panel>header>button,.gallery-photo-actions>button { display:grid;place-items:center;width:32px;height:32px;flex:0 0 auto;border:0;border-radius:9px;background:#fff6f0;color:#c65b19;cursor:pointer; }
.gallery-photo-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px; }
.gallery-photo-card { min-width:0;overflow:hidden;border:1px solid #e8e8e8;border-radius:12px;background:#fafafa; }
.gallery-photo-card>img { display:block;width:100%;aspect-ratio:4/3;object-fit:cover; }
.gallery-description-label { display:grid;gap:5px;padding:8px 8px 0;color:#777;font-size:11px;font-weight:700; }
.gallery-description-label textarea { width:100%;resize:vertical;padding:7px;border:1px solid #e8e8e8;border-radius:7px;background:#fff;color:#171717;font:inherit;font-weight:400; }
.gallery-photo-actions { display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px; }
.gallery-change-button { position:relative;display:inline-flex;align-items:center;justify-content:center;min-height:32px;padding:0 10px;border-radius:8px;background:#fff6f0;color:#c65b19;font-size:12px;font-weight:700;cursor:pointer; }
.gallery-photo-actions input,.gallery-add-card input { position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white_space:nowrap; }
.gallery-add-card { position:relative;display:grid;place-content:center;justify-items:center;gap:8px;min-height:154px;border:1px dashed #e8e8e8;border-radius:12px;background:#fafafa;color:#c65b19;font-size:12px;font-weight:700;cursor:pointer; }
.gallery-add-card.disabled { opacity:.6;cursor:wait; }
.catalog-gallery-panel>footer { display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:4px; }
.gallery-unsaved-note { color:#777;font-size:12px; }
.catalog-management-overlay { position:fixed;inset:0;z-index:110;display:grid;place-items:stretch;overflow:hidden;padding:0;background:rgba(0,0,0,.68); }
.catalog-products-page { width:100%;height:100%;max-height:100dvh;overflow-y:auto;overflow-x:hidden;border:0;border-radius:0;background:#fafafa;box-shadow:none; }
.management-cover { position:relative;min-height:220px;display:flex;align-items:end;justify-content:space-between;gap:20px;overflow:hidden;padding:28px 32px;background:linear-gradient(135deg,#171717,#333);background-position:center;background-size:cover;color:#fff; }
.cover-content { position:relative;z-index:1;max-width:720px; }
.cover-content .eyebrow { color:#ccc; }
.cover-content h2 { margin:7px 0;color:#fff;font-size:clamp(24px,4vw,36px); }
.cover-content>p:last-child { max-width:600px;margin:0;color:#ddd;font-size:14px;line-height:1.5; }
.back-action { display:inline-flex;align-items:center;gap:6px;margin:0 0 22px;padding:7px 10px;border:1px solid rgba(255,255,255,.32);border-radius:999px;background:rgba(0,0,0,.18);color:#fff;font-size:12px;font-weight:700;cursor:pointer; }
.back-action:hover { background:rgba(0,0,0,.34); }
.management-header-actions { position:absolute;z-index:2;top:18px;right:18px;display:flex;gap:7px; }
.header-icon-button { display:grid;place-items:center;width:36px;height:36px;border:1px solid rgba(255,255,255,.28);border-radius:11px;background:rgba(255,255,255,.18);color:#fff;backdrop-filter:blur(8px);cursor:pointer; }
.header-icon-button:hover { background:rgba(255,255,255,.3); }
.header-icon-button.danger { color:#fff1ed; }
.header-icon-button.visibility-toggle { color:#fff1ed; }
.header-icon-button.visibility-toggle.shown { color:#e5ffe9; }
.header-icon-button.visibility-toggle.blocked { border-color:rgba(255,255,255,.22);background:rgba(31,36,31,.42);color:#f4d8a6; }
.header-icon-button.close { margin-left:5px;background:#fff;color:#171717; }
.header-icon-button:disabled { opacity:.55;cursor:wait; }

.management-cover-logo { position:absolute;right:32px;bottom:28px;display:flex;flex-direction:column;align-items:flex-end;gap:8px;z-index:2; }
.management-cover-logo .logo-preview { width:80px;height:80px;border-radius:16px;background-size:contain;background-repeat:no-repeat;background-position:center;background-color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.18);border:1px solid rgba(255,255,255,.3);cursor:pointer;transition:transform .18s; }
.management-cover-logo .logo-preview:hover { transform:scale(1.05); }
.management-cover-logo .logo-preview svg { width:24px;height:24px;color:#fff;background:rgba(0,0,0,.5);border-radius:50%; }
.management-cover-logo .logo-upload-btn { position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;width:80px;height:80px;border:2px dashed rgba(255,255,255,.5);border-radius:16px;background:rgba(255,255,255,.1);color:#fff;font-size:12px;font-weight:700;cursor:pointer;transition:background .18s,border-color .18s;backdrop-filter:blur(4px); }
.management-cover-logo .logo-upload-btn:hover { background:rgba(255,255,255,.2);border-color:rgba(255,255,255,.8); }
.management-cover-logo .logo-upload-btn input { position:absolute;inset:0;opacity:0;cursor:pointer; }
.management-cover-logo .logo-upload-btn svg { width:28px;height:28px; }
.management-cover-logo .logo-error { margin:0;color:#ffd1d1;font-size:11px;text-align:right; }
.management-cover-logo .logo-uploading { margin:0;color:#fff;font-size:11px;opacity:.8; }
.management-cover-logo .save-logo-btn { display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border:0;border-radius:999px;background:#171717;color:#fff;font-size:11px;font-weight:800;cursor:pointer;white-space:nowrap; }
.management-cover-logo .save-logo-btn:hover { background:#000; }
.management-cover-logo .save-logo-btn:disabled { opacity:.55;cursor:wait; }

.management-content { min-height:calc(100dvh - 220px);padding:24px clamp(12px,2vw,28px) 30px; }
.catalog-tags-panel { display:grid;gap:13px;margin-bottom:22px;padding:17px 19px;border:1px solid #e8e8e8;border-radius:16px;background:linear-gradient(145deg,#fff,#fafafa);box-shadow:0 6px 18px rgba(0,0,0,.045); }
.catalog-tags-panel>header,.catalog-tags-panel>footer { display:flex;align-items:center;justify-content:space-between;gap:12px; }
.catalog-tags-panel h3 { display:flex;align-items:center;gap:8px;margin:0;color:#171717;font-size:16px; }
.catalog-tags-panel h3 span { display:grid;place-items:center;min-width:23px;height:23px;padding:0 6px;border-radius:999px;background:#f0f0f0;color:#333;font-size:10px; }
.catalog-tags-panel header p,.tag-request-copy { margin:4px 0 0;color:#777;font-size:12px;line-height:1.45; }
.catalog-tags-panel header>button { display:grid;place-items:center;width:30px;height:30px;border:0;border-radius:8px;background:#f0f0f0;color:#333;cursor:pointer; }
.catalog-social-grid { display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px; }
.catalog-social-field { display:grid;gap:7px;color:#333;font-size:12px;font-weight:700; }
.catalog-social-field span { display:inline-flex;align-items:center;gap:6px; }
.catalog-social-field input { width:100%;padding:10px 11px;border:1px solid #e8e8e8;border-radius:9px;background:#fff;color:#171717;font:inherit; }
.catalog-tag-picker { display:flex;flex-wrap:wrap;gap:8px; }
.catalog-tag-picker>button { display:inline-flex;align-items:center;gap:6px;padding:8px 11px;border:1px solid #e8e8e8;border-radius:999px;background:#fff;color:#777;font:inherit;font-size:12px;cursor:pointer; }
.catalog-tag-picker>button.selected { border-color:#c65b19;background:#fff6f0;color:#c65b19;font-weight:800; }
.catalog-tag-picker>button:disabled { opacity:.45;cursor:not-allowed; }
.tag-loading { display:flex;align-items:center;gap:8px;margin:0;color:#777;font-size:12px; }
.tag-request-copy { margin:0; }
.open-tag-request { display:inline-flex;align-items:center;justify-content:center;gap:7px;width:fit-content;padding:9px 12px;border:1px solid #e8e8e8;border-radius:9px;background:#fafafa;color:#c65b19;font-size:12px;font-weight:800;cursor:pointer; }
.open-tag_request:hover { border_color:#c65b19;background:#fff6f0; }
.tag-retry { padding:9px 12px;border:0;border-radius:9px;background:#fff6f0;color:#c65b19;font-size:12px;font_weight:800;cursor:pointer; }
.save-tags-button { display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:9px 13px;border:0;border-radius:9px;background:#c65b19;color:#fff;font-size:12px;font-weight:800;cursor:pointer; }
.save-tags-button:disabled { opacity:.55;cursor:wait; }
.catalog-submodal-overlay { position:fixed;inset:0;z-index:125;display:grid;place-items:center;overflow-y:auto;padding:18px;background:rgba(0,0,0,.66);backdrop-filter:blur(4px); }
.catalog-submodal { position:relative;display:grid;gap:12px;width:min(440px,100%);padding:28px;border:1px solid #e8e8e8;border-radius:20px;background:#fff;box-shadow:0 22px 70px rgba(0,0,0,.28); }
.catalog-submodal h3 { margin:0;color:#171717;font-size:21px; }
.catalog-submodal p { margin:0;color:#777;font-size:13px;line-height:1.55; }
.catalog-submodal label { margin-top:5px;color:#777;font-size:12px;font-weight:800; }
.catalog-submodal input { width:100%;min-width:0;padding:11px 12px;border:1px solid #e8e8e8;border-radius:9px;background:#fff;color:#171717;font:inherit;font-size:13px; }
.submodal-close { position:absolute;top:14px;right:14px;display:grid;place-items:center;width:32px;height:32px;border:0;border-radius:9px;background:#f0f0f0;color:#333;cursor:pointer; }
.submodal-icon { display:grid;place-items:center;width:46px;height:46px;border-radius:14px;background:#fff6f0;color:#c65b19; }
.submodal-icon.blocked { background:#fdf5e6;color:#b8860b; }
.submodal-actions { display:flex;justify-content:flex-end;gap:8px;margin-top:7px; }
.submodal-actions .secondary-action,.blocked-notice>.secondary-action { padding:9px 13px;border:1px solid #e8e8e8;border-radius:9px;background:#fff;color:#777;font-size:12px;font-weight:800;cursor:pointer; }
.contact-admin-button { display:inline-flex;align-items:center;justify-content:center;padding:11px 13px;border-radius:9px;background:#c65b19;color:#fff;text-align:center;text-decoration:none;font-size:12px;font-weight:800; }
.products-heading { display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:18px; }
.products-heading-actions { display:flex;align-items:center;gap:8px; }
.save-order-button { display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:38px;padding:0 13px;border:1px solid #e8e8e8;border-radius:11px;background:#fafafa;color:#c65b19;font-size:12px;font-weight:800;cursor:pointer;transition:background .15s,border-color .15s; }
.save-order-button:hover:not(:disabled) { border-color:#c65b19;background:#fff6f0; }
.save-order-button:disabled { opacity:.55;cursor:not-allowed; }
.products-heading h3 { display:flex;align-items:center;gap:9px;margin:5px 0 0;color:#171717;font-size:21px; }
.products-heading h3 span { display:grid;place-items:center;min-width:24px;height:24px;padding:0 6px;border-radius:999px;background:#f0f0f0;color:#333;font-size:11px; }
.add-product-icon { display:grid;place-items:center;width:38px;height:38px;border:0;border-radius:12px;background:#171717;color:#fff;box-shadow:0 5px 12px rgba(0,0,0,.3);cursor:pointer;transition:transform .15s,background .15s; }
.add-product-icon:hover { transform:translateY(-1px);background:#000; }
.catalog-products-page .eyebrow { margin:0; }
.catalog-products-list { display:grid;grid-template-columns:minmax(0,1fr);gap:12px;width:100%; }
.catalog-product-group { display:grid;gap:7px;width:100%;min-width:0;padding:10px;border:1px solid #e8e8e8;border-radius:17px;background:#fafafa; }
.catalog-product-group>.catalog-product-row { border-color:#e8e8e8;background:#fff; }
.show-variants-button { display:inline-flex;align-items:center;justify-content:center;gap:4px;min-height:32px;padding:0 8px;border:1px solid #e8e8e8;border-radius:9px;background:#fafafa;color:#333;font-size:11px;font-weight:800;cursor:pointer; }
.show-variants-button:hover { border-color:#c65b19;background:#fff6f0; }
.show-variants-button small { display:grid;place-items:center;min-width:17px;height:17px;padding:0 4px;border-radius:999px;background:#f0f0f0;color:#333;font-size:9px; }
.variant-state { display:flex;align-items:center;gap:7px;margin:0 0 0 25px;padding:10px 12px;border:1px solid #e8e8e8;border-radius:11px;background:#fff;color:#777;font-size:12px; }
.variant-state.variant-error { border-color:#f9e4df;background:#fdf5e6;color:#a8584e; }
.catalog-variant-row { position:relative;display:flex;align-items:center;gap:11px;min-width:0;margin-left:25px;padding:9px 10px;border:1px solid #e8e8e8;border-radius:12px;background:#fff; }
.variant-branch { position:absolute;top:-9px;left:-17px;width:14px;height:calc(50% + 9px);border-bottom:1px solid #ddd;border-left:1px solid #ddd;border-bottom-left-radius:8px; }
.catalog-variant-row .item-photo { width:48px;height:48px;flex-basis:48px;border-radius:10px; }
.subproduct-label { flex:0 0 auto;padding:3px 7px;border-radius:999px;background:#f0f0f0;color:#777;font-size:9px;font-weight:800; }
.catalog-variant-row .catalog-product-info p { -webkit-line-clamp:1; }
.catalog-variant-row .item-actions { gap:5px; }
.catalog-product-row { display:flex;align-items:center;gap:13px;min-width:0;padding:13px;border:1px solid #e8e8e8;border-radius:15px;background:#fff;box-shadow:0 3px 10px rgba(0,0,0,.035);transition:opacity .18s,border-color .18s,transform .18s; }
.catalog-product-row:hover { transform:translateY(-1px);border-color:#ddd; }
.catalog-product-row.is-hidden { background:#f5f5f5;opacity:.68; }
.item-photo { display:grid;place-items:center;width:68px;height:68px;flex:0 0 68px;overflow:hidden;border-radius:12px;background:linear-gradient(145deg,#f0f0f0,#e8e8e8);color:#777; }
.item-photo img { width:100%;height:100%;object-fit:cover; }
.catalog-product-info { display:grid;gap:6px;min-width:0;flex:1; }
.product-title-line { display:flex;align-items:center;gap:7px;min-width:0; }
.product-title-line>strong { overflow:hidden;color:#171717;text-overflow:ellipsis;white-space:nowrap; }
.visibility-status { flex:0 0 auto;padding:3px 7px;border-radius:999px;background:#fff6f0;color:#c65b19;font-size:10px;font-weight:800; }
.visibility-status.hidden { background:#f0f0f0;color:#777; }
.catalog-product-info p { display:-webkit-box;overflow:hidden;margin:0;color:#777;font-size:12px;line-height:1.45;-webkit-box-orient:vertical;-webkit-line-clamp:2; }
.product-price { color:#c65b19;font-size:13px;font-weight:800; }
.item-actions { display:flex;align-items:center;gap:6px; }
.order-actions { display:grid;gap:3px; }
.item-actions button { display:flex;align-items:center;justify-content:center;gap:5px;min-width:32px;height:32px;padding:0 8px;border:1px solid #e8e8e8;border-radius:9px;background:#fafafa;color:#333;cursor:pointer;transition:background .15s,border-color .15s,transform .15s; }
.item-actions button:hover { transform:translateY(-1px);border-color:#ddd;background:#f0f0f0; }
.item-actions button.visibility-button { height:34px;border-color:#e8e8e8;background:#fafafa;color:#333;font-size:11px;font-weight:800; }
.item-actions button.visibility-button.visible { border-color:#e8e8e8;background:#f5f5f5;color:#777; }
.item-actions button.remove-item { width:32px;padding:0;border-color:#f9e4df;background:#fff2ef;color:#a8584e; }
.item-actions button.remove-item:hover { border-color:#eac4ba;background:#ffe7e1; }
.item-actions button:disabled { opacity:.43;cursor:wait;transform:none; }
.delete-action { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 0; border-radius: 10px; padding: 12px 15px; background: #f8e9e6; color: #a8584e; font-weight: 700; cursor: pointer; }
.delete-action:disabled { opacity: .6; cursor: wait; }
.spin { animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
/* ==========================================
   RESPONSIVE: TABLETS Y MÓVILES
   ========================================== */

@media (max-width: 1024px) {
  .catalog-page {
    padding: 28px 0;
  }

  .catalog-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 15px;
  }

  .management-cover {
    padding: 26px 24px;
  }

  .management-cover-logo {
    right: 24px;
  }

  .management-content {
    padding: 22px 20px 28px;
  }

  .catalog-product-row {
    flex-wrap: wrap;
  }

  .catalog-product-info {
    flex: 1 1 200px;
  }

  .item-actions {
    flex-wrap: wrap;
  }
}

/* ==========================================
   MÓVILES
   ========================================== */

@media (max-width: 680px) {
  .catalog-page {
    width: 100%;
    min-width: 0;
    padding: 22px 0;
  }

  /* Encabezado de la página */

  .page-heading {
    align-items: stretch;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 22px;
  }

  .page-heading > div {
    min-width: 0;
  }

  .page-heading h2 {
    font-size: clamp(25px, 7vw, 34px);
    line-height: 1.15;
    overflow-wrap: anywhere;
  }

  .page-heading .muted {
    font-size: 13px;
    line-height: 1.5;
  }

  .page-heading .primary-action {
    width: 100%;
    min-height: 44px;
  }

  /* Pestañas del administrador */

  .catalog-tabs {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0;
    margin-bottom: 18px;
  }

  .catalog-tabs button {
    padding: 12px 6px;
    font-size: 12px;
    line-height: 1.35;
  }

  /* Tarjetas de catálogos */

  .catalog-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .catalog-card {
    min-width: 0;
    border-radius: 12px;
  }

  .catalog-cover {
    height: auto;
    aspect-ratio: 1.15 / 1;
  }

  .catalog-info {
    padding: 12px;
  }

  .catalog-info h3 {
    margin-bottom: 6px;
    font-size: 14px;
    overflow-wrap: anywhere;
  }

  .catalog-info p {
    font-size: 12px;
    line-height: 1.45;
    overflow-wrap: anywhere;
  }

  .catalog-owner {
    font-size: 11px;
  }

  .catalog-visibility-action {
    top: 7px;
    right: 7px;
    width: 32px;
    height: 32px;
  }

  .catalog-visibility-status {
    left: 7px;
    bottom: 7px;
    padding: 4px 7px;
  }

  /* Búsqueda de todos los catálogos */

  .all-catalog-toolbar {
    align-items: stretch;
    flex-direction: column;
    gap: 10px;
  }

  .all-catalog-search {
    width: 100%;
    min-height: 44px;
  }

  .all-catalog-toolbar > .secondary-action {
    width: 100%;
    min-height: 42px;
  }

  /* Ventana de gestión del catálogo */

  .catalog-management-overlay {
    display: block;
    overflow: hidden;
  }

  .catalog-products-page {
    width: 100%;
    height: 100%;
    height: 100dvh;
    max-height: 100dvh;
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  .management-cover {
    min-height: 0;
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
    padding: 76px 16px 20px;
    background-position: center;
  }

  .cover-content {
    width: 100%;
    max-width: none;
    min-width: 0;
  }

  .cover-content h2 {
    margin: 7px 0;
    font-size: clamp(23px, 6vw, 30px);
    line-height: 1.2;
    overflow-wrap: anywhere;
  }

  .cover-content > p:last-child {
    font-size: 13px;
    overflow-wrap: anywhere;
  }

  .back-action {
    max-width: 100%;
    margin: 0 0 12px;
    padding: 7px 9px;
    font-size: 11px;
  }

  /* Botones del encabezado:
     dos filas para evitar que se salgan de la pantalla */

  .management-header-actions {
    top: 12px;
    right: 12px;
    left: 12px;
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 6px;
  }

  .header-icon-button {
    width: 34px;
    height: 34px;
    flex: 0 0 34px;
    border-radius: 9px;
  }

  .header-icon-button.close {
    margin-left: 0;
  }

  /* Logo */

  .management-cover-logo {
    position: relative;
    top: auto;
    right: auto;
    bottom: auto;
    align-self: flex-start;
    align-items: flex-start;
    width: 100%;
    gap: 7px;
  }

  .management-cover-logo .logo-preview,
  .management-cover-logo .logo-upload-btn {
    width: 64px;
    height: 64px;
    border-radius: 12px;
  }

  .management-cover-logo .logo-upload-btn {
    font-size: 10px;
  }

  .management-cover-logo .logo-upload-btn svg {
    width: 22px;
    height: 22px;
  }

  .management-cover-logo .logo-error {
    text-align: left;
    overflow-wrap: anywhere;
  }

  .management-cover-logo .save-logo-btn {
    white-space: normal;
  }

  /* Contenido de la gestión */

  .management-content {
    min-height: 0;
    padding: 16px 12px 24px;
  }

  /* Paneles de etiquetas, redes y galería */

  .catalog-tags-panel,
  .catalog-gallery-panel {
    gap: 12px;
    margin-bottom: 16px;
    padding: 13px;
    border-radius: 12px;
  }

  .catalog-tags-panel > header,
  .catalog-tags-panel > footer,
  .catalog-gallery-panel > header,
  .catalog-gallery-panel > footer {
    align-items: flex-start;
    gap: 10px;
  }

  .catalog-tags-panel > footer,
  .catalog-gallery-panel > footer {
    flex-wrap: wrap;
  }

  .catalog-tags-panel header p,
  .catalog-gallery-panel > header p,
  .tag-request-copy {
    font-size: 12px;
    line-height: 1.5;
  }

  .catalog-tag-picker {
    gap: 7px;
  }

  .catalog-tag-picker > button {
    max-width: 100%;
    padding: 8px 10px;
    overflow-wrap: anywhere;
  }

  .open-tag-request {
    width: 100%;
  }

  .save-tags-button {
    max-width: 100%;
    min-height: 38px;
  }

  .catalog-social-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }

  .catalog-social-field input {
    min-width: 0;
    font-size: 13px;
  }

  .gallery-photo-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 9px;
  }

  .gallery-photo-card {
    min-width: 0;
  }

  .gallery-description-label {
    padding: 7px;
  }

  .gallery-description-label textarea {
    box-sizing: border-box;
    min-width: 0;
    font-size: 12px;
  }

  .gallery-photo-actions {
    gap: 5px;
    padding: 6px;
  }

  .gallery-change-button {
    padding: 0 8px;
  }

  .gallery-add-card {
    min-width: 0;
    min-height: 120px;
    padding: 8px;
    text-align: center;
  }

  /* Encabezado de productos */

  .products-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 14px;
  }

  .products-heading h3 {
    font-size: 20px;
  }

  .products-heading-actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 38px 38px;
    align-items: center;
    width: 100%;
    gap: 7px;
  }

  .save-order-button {
    width: 100%;
    min-width: 0;
    min-height: 38px;
    padding: 0 8px;
    font-size: 11px;
    white-space: normal;
  }

  .add-product-icon {
    width: 38px;
    height: 38px;
  }

  /* Grupos y filas de productos */

  .catalog-products-list {
    gap: 10px;
  }

  .catalog-product-group {
    gap: 7px;
    padding: 8px;
    border-radius: 12px;
  }

  .catalog-product-row {
    display: grid;
    grid-template-columns: 54px minmax(0, 1fr);
    align-items: start;
    gap: 10px;
    padding: 10px;
    border-radius: 11px;
  }

  .item-photo {
    width: 54px;
    height: 54px;
    min-width: 0;
    flex: initial;
    border-radius: 9px;
  }

  .item-photo svg {
    max-width: 22px;
    max-height: 22px;
  }

  .catalog-product-info {
    display: grid;
    grid-column: 2;
    gap: 5px;
    min-width: 0;
    width: 100%;
  }

  .product-title-line {
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 5px;
  }

  .product-title-line > strong {
    flex: 1 1 100%;
    min-width: 0;
    overflow-wrap: anywhere;
    white-space: normal;
    line-height: 1.35;
  }

  .visibility-status,
  .subproduct-label {
    font-size: 9px;
  }

  .catalog-product-info p {
    font-size: 12px;
    line-height: 1.45;
    overflow-wrap: anywhere;
  }

  .product-price {
    font-size: 13px;
  }

  /* Acciones debajo de la información del producto */

  .catalog-product-row > .item-actions {
    display: flex;
    grid-column: 1 / -1;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-start;
    gap: 6px;
    width: 100%;
    padding-top: 8px;
    border-top: 1px solid #f0f0f0;
  }

  .order-actions {
    display: flex;
    gap: 4px;
  }

  .item-actions button {
    min-width: 34px;
    min-height: 34px;
    height: 34px;
    padding: 0 8px;
  }

  .item-actions button.visibility-button {
    min-height: 34px;
    height: 34px;
    padding: 0 9px;
    font-size: 11px;
  }

  .item-actions button.remove-item {
    width: 34px;
    min-width: 34px;
    padding: 0;
  }

  .show-variants-button {
    min-height: 34px;
    padding: 0 8px;
    font-size: 10px;
  }

  /* Variantes y componentes de combos */

  .catalog-variant-row {
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr);
    gap: 8px;
    margin-left: 12px;
    padding: 8px;
    border-radius: 10px;
  }

  .catalog-variant-row .variant-branch {
    left: -9px;
    width: 7px;
  }

  .catalog-variant-row .item-photo {
    grid-column: 1;
    width: 42px;
    height: 42px;
  }

  .catalog-variant-row .catalog-product-info {
    grid-column: 2;
  }

  .catalog-variant-row .item-actions {
    display: flex;
    grid-column: 1 / -1;
    flex-wrap: wrap;
    justify-content: flex-start;
    gap: 6px;
    padding-top: 7px;
    border-top: 1px solid #f0f0f0;
  }

  .catalog-variant-row .product-title-line > strong {
    flex-basis: 100%;
  }

  .variant-state {
    margin-left: 12px;
    padding: 9px;
    font-size: 11px;
    overflow-wrap: anywhere;
  }

  /* Estados vacíos y mensajes */

  .catalog-state {
    min-height: 220px;
    gap: 10px;
    padding: 20px 14px;
    overflow-wrap: anywhere;
  }

  .empty-catalogs h3 {
    font-size: 19px;
  }

  .empty-catalogs p {
    font-size: 13px;
  }

  .catalog-inline-error {
    overflow-wrap: anywhere;
    line-height: 1.5;
  }

  /* Ventanas modales */

  .catalog-submodal-overlay {
    align-items: center;
    padding: 12px;
  }

  .catalog-submodal {
    width: 100%;
    max-width: 440px;
    max-height: calc(100dvh - 24px);
    overflow-y: auto;
    padding: 22px 17px;
    border-radius: 15px;
  }

  .catalog-submodal h3 {
    font-size: 19px;
    padding-right: 20px;
  }

  .submodal-actions {
    flex-direction: column-reverse;
    gap: 8px;
  }

  .submodal-actions button,
  .blocked-notice > .secondary-action {
    width: 100%;
    min-height: 40px;
  }

  .contact-admin-button {
    width: 100%;
    box-sizing: border-box;
    line-height: 1.5;
  }
}

/* ==========================================
   MÓVILES ESTRECHOS
   ========================================== */

@media (max-width: 400px) {
  .catalog-grid {
    gap: 8px;
  }

  .catalog-info {
    padding: 9px;
  }

  .catalog-info h3 {
    font-size: 13px;
  }

  .catalog-info p {
    font-size: 11px;
  }

  .management-header-actions {
    right: 8px;
    left: 8px;
    gap: 5px;
  }

  .header-icon-button {
    width: 31px;
    height: 31px;
    flex-basis: 31px;
  }

  .management-cover {
    padding-right: 12px;
    padding-left: 12px;
  }

  .management-content {
    padding-right: 8px;
    padding-left: 8px;
  }

  .products-heading-actions {
    grid-template-columns: minmax(0, 1fr) 34px 34px;
    gap: 5px;
  }

  .add-product-icon {
    width: 34px;
    height: 34px;
  }

  .save-order-button {
    font-size: 10px;
  }

  .catalog-product-row {
    grid-template-columns: 46px minmax(0, 1fr);
    gap: 8px;
    padding: 8px;
  }

  .catalog-product-row .item-photo {
    width: 46px;
    height: 46px;
  }

  .catalog-product-group {
    padding: 6px;
  }

  .item-actions button.visibility-button {
    padding: 0 7px;
    font-size: 10px;
  }

  .show-variants-button {
    gap: 3px;
    padding: 0 6px;
    font-size: 9px;
  }

  .gallery-photo-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .gallery-add-card {
    min-height: 100px;
  }
}

/* ==========================================
   ACCESIBILIDAD: REDUCIR ANIMACIONES
   ========================================== */

@media (prefers-reduced-motion: reduce) {
  .catalog-card,
  .catalog-product-row,
  .item-actions button,
  .add-product-icon,
  .header-icon-button {
    transition: none;
  }

  .spin {
    animation-duration: 1.5s;
  }
}
</style>