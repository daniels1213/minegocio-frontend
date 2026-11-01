<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check, LoaderCircle, Plus, Search, X } from 'lucide-vue-next'
import { api, type Catalogo, type CatalogoProducto, type Combo } from '../api.ts'

const props = defineProps<{
  visible: boolean
  catalog: Catalogo | null
  adminMode?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'added'): void
}>()

const combos = ref<Combo[]>([])
const catalogItems = ref<CatalogoProducto[]>([])
const selectedComboId = ref<number | null>(null)
const comboSearch = ref('')
const loading = ref(false)
const saving = ref(false)
const error = ref('')

const availableCombos = computed(() => combos.value.filter((combo) =>
  combo.id && !catalogItems.value.some((item) => item.comboId === combo.id),
))
const filteredCombos = computed(() => {
  const query = comboSearch.value.trim().toLocaleLowerCase()
  return availableCombos.value.filter((combo) => combo.nombre.toLocaleLowerCase().includes(query))
})
const selectedCombo = computed(() => availableCombos.value.find((combo) => combo.id === selectedComboId.value) || null)

watch(() => [props.visible, props.catalog?.id] as const, async ([visible, catalogId]) => {
  if (!visible || !catalogId || !props.catalog) return
  loading.value = true
  error.value = ''
  selectedComboId.value = null
  comboSearch.value = ''
  try {
    const [comboList, itemList] = await Promise.all([
      props.adminMode && props.catalog.usuarioId
        ? api.combosAdminUsuario<Combo>(props.catalog.usuarioId)
        : api.combos<Combo>(),
      api.catalogoProductos<CatalogoProducto>(catalogId),
    ])
    combos.value = comboList
    catalogItems.value = itemList
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'No se pudieron cargar los combos.'
  } finally {
    loading.value = false
  }
}, { immediate: true })

function selectCombo(comboId?: number) {
  selectedComboId.value = comboId && Number.isInteger(comboId) && comboId > 0 ? comboId : null
  error.value = ''
}

async function addCombo() {
  const catalogId = props.catalog?.id
  if (!catalogId || !selectedComboId.value) {
    error.value = 'Selecciona un combo.'
    return
  }
  saving.value = true
  error.value = ''
  try {
    await api.agregarComboCatalogo(catalogId, {
      comboId: selectedComboId.value,
      orden: catalogItems.value.length + 1,
    })
    emit('added')
    emit('close')
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'No se pudo añadir el combo al catálogo.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div v-if="visible" class="modal-layer" @click.self="emit('close')">
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="add-combo-title">
      <header><div><p class="eyebrow">Catálogo</p><h3 id="add-combo-title">Añadir combo</h3></div><button class="close" type="button" aria-label="Cerrar" @click="emit('close')"><X :size="18" /></button></header>
      <div v-if="loading" class="state"><LoaderCircle class="spin" :size="20" /> Cargando combos...</div>
      <section v-else-if="availableCombos.length" class="combo-selection" aria-labelledby="combo-selection-title">
        <div class="selection-heading">
          <label id="combo-selection-title">Selecciona un combo</label>
          <span v-if="selectedComboId">Seleccionado</span>
        </div>
        <label class="combo-search">
          <Search :size="16" aria-hidden="true" />
          <input v-model="comboSearch" type="search" placeholder="Filtrar combos por nombre" aria-label="Filtrar combos por nombre" />
          <button v-if="comboSearch" type="button" aria-label="Limpiar búsqueda de combos" @click="comboSearch = ''"><X :size="14" /></button>
        </label>
        <div class="combo-table-wrap">
          <table class="combo-table">
            <thead><tr><th>Combo</th><th>Precio</th><th aria-label="Selección"></th></tr></thead>
            <tbody>
              <tr v-for="combo in filteredCombos" :key="combo.id" :class="{ selected: selectedComboId === combo.id }">
                <td>
                  <div class="combo-option">
                    <strong>{{ combo.nombre }}</strong>
                    <small>{{ combo.componentes.map((item) => `${item.cantidad} × ${item.productoNombre}`).join(', ') || 'Sin productos' }}</small>
                    <small class="mobile-price">{{ combo.precio }} CUP</small>
                  </div>
                </td>
                <td class="combo-price">{{ combo.precio }} CUP</td>
                <td><button class="combo-select-button" type="button" :aria-label="`Seleccionar combo ${combo.nombre}`" :aria-pressed="selectedComboId === combo.id" @click="selectCombo(combo.id)"><Check v-if="selectedComboId === combo.id" :size="15" /><span v-else>Elegir</span></button></td>
              </tr>
              <tr v-if="!filteredCombos.length"><td colspan="3" class="combo-empty">No hay combos que coincidan con la búsqueda.</td></tr>
            </tbody>
          </table>
        </div>
        <p v-if="selectedCombo" class="components">Seleccionado: {{ selectedCombo.nombre }}</p>
      </section>
      <p v-else-if="!loading" class="state">No hay combos disponibles para añadir.</p>
      <p v-if="error" class="error">{{ error }}</p>
      <footer><button class="secondary" type="button" @click="emit('close')">Cancelar</button><button class="primary" type="button" :disabled="loading || saving || !selectedComboId || !availableCombos.length" @click="addCombo"><LoaderCircle v-if="saving" class="spin" :size="16" /><Plus v-else :size="16" />{{ saving ? 'Añadiendo...' : 'Añadir al catálogo' }}</button></footer>
    </section>
  </div>
</template>

<style scoped>
.modal-layer{position:fixed;inset:0;z-index:130;display:grid;place-items:center;overflow-y:auto;padding:18px;background:rgba(0,0,0,.62)}.modal{display:grid;gap:16px;width:min(560px,100%);max-height:calc(100dvh - 36px);overflow-y:auto;padding:24px;border-radius:16px;background:#fff;box-shadow:0 20px 60px rgba(0,0,0,.2)}.modal>header,.modal>footer{display:flex;align-items:center;justify-content:space-between;gap:12px}.eyebrow{margin:0;color:#777;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.modal h3{margin:6px 0 0;color:#171717;font-size:23px}.close{display:grid;place-items:center;width:32px;height:32px;padding:0;border:0;border-radius:6px;background:transparent;color:#777;cursor:pointer;transition:background .15s ease,color .15s ease}.close:hover{background:#f5f5f5;color:#333}.close:focus-visible{outline:2px solid rgba(198,91,25,.35);outline-offset:2px}.combo-selection{display:grid;gap:9px}.selection-heading{display:flex;align-items:center;justify-content:space-between;gap:8px}.selection-heading label{color:#333;font-size:13px;font-weight:700}.selection-heading span{color:#c65b19;font-size:11px;font-weight:700}.combo-search{display:flex;align-items:center;gap:8px;min-height:40px;padding:0 10px;border:0;border-radius:0;background:transparent;color:#777}.combo-search:focus-within{border:0;border-radius:0;outline:0;box-shadow:none}.combo-search input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:#171717;font:inherit;font-size:13px}.combo-search button{display:grid;place-items:center;flex:0 0 auto;padding:3px;border:0;background:transparent;color:#777;cursor:pointer}.combo-table-wrap{max-height:250px;overflow:auto;border:1px solid #e8e8e8;border-radius:8px}.combo-table{width:100%;border-collapse:collapse;font-size:12px}.combo-table th,.combo-table td{padding:9px 10px;border-bottom:1px solid #eee;text-align:left}.combo-table th{position:sticky;top:0;background:#fafafa;color:#777;font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase}.combo-table tbody tr:last-child td{border-bottom:0}.combo-table tbody tr.selected{background:#fff6f0}.combo-table td:last-child,.combo-table th:last-child{text-align:right;white-space:nowrap}.combo-option{display:grid;gap:3px;min-width:0}.combo-option strong{color:#171717;font-size:12px}.combo-option small{max-width:260px;overflow:hidden;color:#777;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.combo-select-button{display:inline-flex;align-items:center;justify-content:center;min-width:62px;min-height:30px;gap:4px;padding:5px 8px;border:1px solid #e8e8e8;border-radius:6px;background:#fff;color:#555;font:inherit;font-size:12px;font-weight:700;cursor:pointer}.combo-select-button[aria-pressed="true"]{border-color:#c65b19;background:#c65b19;color:#fff}.combo-empty{padding:18px!important;color:#777;text-align:center!important}.components{margin:0;color:#777;font-size:13px;line-height:1.5}.state{min-height:110px;display:flex;align-items:center;justify-content:center;gap:9px;color:#777;text-align:center}.error{margin:0;color:#a8584e;font-size:13px}.modal>footer{justify-content:flex-end;margin-top:4px}.primary,.secondary{display:inline-flex;align-items:center;gap:7px;padding:11px 14px;border:0;border-radius:9px;font-weight:700;cursor:pointer}.primary{background:#171717;color:#fff}.secondary{background:#fff6f0;color:#c65b19}.primary:disabled{opacity:.55;cursor:not-allowed}.spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:520px){.modal{padding:18px}.combo-table-wrap{overflow-x:hidden}.combo-table{table-layout:fixed}.combo-table thead,.combo-table .combo-price{display:none}.combo-table tbody tr:not(:has(.combo-empty)){display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:6px;border-bottom:1px solid #eee}.combo-table td{min-width:0;border-bottom:0}.combo-option{min-width:0}.combo-option small{max-width:100%;white-space:normal;overflow-wrap:anywhere}.combo-select-button{min-width:54px;padding:4px 6px}.mobile-price{display:block;color:#777}.modal>footer{align-items:stretch;flex-direction:column-reverse}.modal>footer button{justify-content:center}}
.mobile-price{display:none}
</style>
