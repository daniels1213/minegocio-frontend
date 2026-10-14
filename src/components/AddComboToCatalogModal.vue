<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { LoaderCircle, Plus, X } from 'lucide-vue-next'
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
const loading = ref(false)
const saving = ref(false)
const error = ref('')

const availableCombos = computed(() => combos.value.filter((combo) =>
  combo.id && !catalogItems.value.some((item) => item.comboId === combo.id),
))

watch(() => [props.visible, props.catalog?.id] as const, async ([visible, catalogId]) => {
  if (!visible || !catalogId || !props.catalog) return
  loading.value = true
  error.value = ''
  selectedComboId.value = null
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
      <template v-else-if="availableCombos.length">
        <label class="field">Combo<select v-model.number="selectedComboId"><option :value="null">Selecciona un combo</option><option v-for="combo in availableCombos" :key="combo.id" :value="combo.id">{{ combo.nombre }} · {{ combo.precio }}</option></select></label>
        <p v-if="selectedComboId" class="components">{{ availableCombos.find((combo) => combo.id === selectedComboId)?.componentes.map((item) => `${item.cantidad} × ${item.productoNombre}`).join(', ') }}</p>
      </template>
      <p v-else class="state">No hay combos disponibles para añadir.</p>
      <p v-if="error" class="error">{{ error }}</p>
      <footer><button class="secondary" type="button" @click="emit('close')">Cancelar</button><button class="primary" type="button" :disabled="loading || saving || !selectedComboId || !availableCombos.length" @click="addCombo"><LoaderCircle v-if="saving" class="spin" :size="16" /><Plus v-else :size="16" />{{ saving ? 'Añadiendo...' : 'Añadir al catálogo' }}</button></footer>
    </section>
  </div>
</template>

<style scoped>
.modal-layer{position:fixed;inset:0;z-index:130;display:grid;place-items:center;padding:18px;background:rgba(0,0,0,.62)}.modal{width:min(520px,100%);padding:24px;border-radius:16px;background:#fff;box-shadow:0 20px 60px rgba(0,0,0,.2)}.modal>header,.modal>footer{display:flex;align-items:center;justify-content:space-between;gap:12px}.eyebrow{margin:0;color:#777;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.modal h3{margin:6px 0 0;color:#171717;font-size:23px}.close{display:grid;place-items:center;width:34px;height:34px;border:0;border-radius:9px;background:#fff6f0;color:#c65b19}.field{display:grid;gap:8px;margin:24px 0 10px;color:#333;font-size:13px;font-weight:700}.field select{min-height:44px;padding:10px 12px;border:1px solid #e8e8e8;border-radius:8px;background:#fff;font:inherit;font-weight:400}.components{margin:10px 0 22px;color:#777;font-size:13px;line-height:1.5}.state{min-height:110px;display:flex;align-items:center;justify-content:center;gap:9px;color:#777;text-align:center}.error{color:#a8584e}.modal>footer{justify-content:flex-end;margin-top:20px}.primary,.secondary{display:inline-flex;align-items:center;gap:7px;padding:11px 14px;border:0;border-radius:9px;font-weight:700}.primary{background:#171717;color:#fff}.secondary{background:#fff6f0;color:#c65b19}.primary:disabled{opacity:.55;cursor:not-allowed}.spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
</style>
