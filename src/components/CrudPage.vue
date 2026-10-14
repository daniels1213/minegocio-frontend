<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Pencil, Plus, RefreshCw, Save, Trash2, X } from 'lucide-vue-next'
import { api } from '../api.ts'
import DeleteConfirmModal from './DeleteConfirmModal.vue'

export interface CrudField { key: string; label: string; type?: string; required?: boolean; placeholder?: string }
const props = defineProps<{ title: string; description: string; resource: string; fields: CrudField[] }>()
const rows = ref<Record<string, unknown>[]>([])
const form = ref<Record<string, string | number>>({})
const editingId = ref<number | null>(null)
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const showForm = ref(false)
const deleteTargetRow = ref<Record<string, unknown> | null>(null)
const showDeleteModal = ref(false)

function resetForm() { form.value = Object.fromEntries(props.fields.map(field => [field.key, ''])); editingId.value = null; showForm.value = true; error.value = '' }
function edit(row: Record<string, unknown>) { form.value = Object.fromEntries(props.fields.map(field => [field.key, String(row[field.key] ?? '')])); editingId.value = Number(row.id); showForm.value = true; error.value = '' }
function closeForm() { showForm.value = false; error.value = '' }
async function load() { loading.value = true; error.value = ''; try { rows.value = await api.list<Record<string, unknown>>(props.resource) } catch (reason) { error.value = reason instanceof Error ? reason.message : 'No se pudo cargar la información.' } finally { loading.value = false } }
async function save() {
  if (props.fields.some(field => field.required && !String(form.value[field.key] ?? '').trim())) { error.value = 'Completa los campos obligatorios.'; return }
  saving.value = true; error.value = ''
  try { if (editingId.value) await api.update(props.resource, editingId.value, form.value); else await api.create(props.resource, form.value); closeForm(); await load() } catch (reason) { error.value = reason instanceof Error ? reason.message : 'No se pudo guardar.' } finally { saving.value = false }
}
function remove(row: Record<string, unknown>) {
  if (!row.id) return
  deleteTargetRow.value = row
  showDeleteModal.value = true
}

async function confirmDelete() {
  if (!deleteTargetRow.value?.id) return
  try {
    await api.delete(props.resource, Number(deleteTargetRow.value.id))
    await load()
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'No se pudo eliminar.'
  } finally {
    deleteTargetRow.value = null
    showDeleteModal.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="crud-page">
    <div class="heading"><div><p class="eyebrow">Gestión</p><h2>{{ title }}</h2><p class="muted">{{ description }}</p></div><button class="primary" type="button" @click="resetForm"><Plus :size="17" /> Nuevo</button></div>
    <div v-if="error && !showForm" class="notice">{{ error }}</div>
    <div v-if="loading" class="state"><RefreshCw :size="24" class="spin" /> Cargando...</div>
    <div v-else-if="!rows.length" class="state"><p>Aún no hay registros.</p><button class="secondary" type="button" @click="resetForm">Crear el primero</button></div>
    <div v-else class="table-wrap"><table><thead><tr><th v-for="field in fields" :key="field.key">{{ field.label }}</th><th>Acciones</th></tr></thead><tbody><tr v-for="row in rows" :key="String(row.id)"><td v-for="field in fields" :key="field.key">{{ row[field.key] || '—' }}</td><td class="actions"><button type="button" title="Editar" @click="edit(row)"><Pencil :size="16" /></button><button type="button" title="Eliminar" @click="remove(row)"><Trash2 :size="16" /></button></td></tr></tbody></table></div>
    <div v-if="showForm" class="modal-layer" @click.self="closeForm">
      <form class="form-card" role="dialog" aria-modal="true" :aria-label="`${editingId ? 'Editar' : 'Nuevo'} registro`" @submit.prevent="save">
        <div class="form-heading"><h3>{{ editingId ? 'Editar' : 'Nuevo' }} registro</h3><button type="button" aria-label="Cerrar" @click="closeForm"><X :size="18" /></button></div>
        <div class="fields"><label v-for="field in fields" :key="field.key">{{ field.label }}<textarea v-if="field.type === 'textarea'" v-model="form[field.key]" :placeholder="field.placeholder" :required="field.required" rows="3" /><input v-else v-model="form[field.key]" :type="field.type || 'text'" :placeholder="field.placeholder" :required="field.required" /></label></div>
        <p v-if="error" class="error">{{ error }}</p>
        <div class="form-actions"><button class="secondary" type="button" @click="closeForm">Cancelar</button><button class="primary" type="submit" :disabled="saving"><Save :size="16" /> {{ saving ? 'Guardando...' : 'Guardar' }}</button></div>
      </form>
    </div>
    <DeleteConfirmModal
      :visible="showDeleteModal"
      :title="`Eliminar registro`"
      :message="deleteTargetRow ? `¿Eliminar ${deleteTargetRow.nombre || 'este registro'}?` : '¿Eliminar el registro seleccionado?'"
      :loading="false"
      @confirm="confirmDelete"
      @cancel="showDeleteModal = false; deleteTargetRow = null"
    />
  </section>
</template>

<style scoped>
/* =========================
   CONTENEDOR
   ========================= */

.crud-page {
  width: 100%;
  min-width: 0;
  padding: 34px 0;
  color: #171717;
  box-sizing: border-box;
}

.crud-page *,
.crud-page *::before,
.crud-page *::after {
  box-sizing: border-box;
}

/* =========================
   ENCABEZADO
   ========================= */

.heading,
.form-heading,
.form-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.heading {
  margin-bottom: 28px;
}

.heading > div {
  min-width: 0;
}

.eyebrow {
  margin: 0;
  color: #777;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.crud-page h2 {
  margin: 8px 0 7px;
  color: #171717;
  font-family: 'Space Grotesk', Arial, sans-serif;
  font-size: clamp(28px, 4vw, 42px);
  font-weight: 700;
  line-height: 1.2;
}

.muted {
  margin: 0;
  color: #777;
  font-size: 14px;
  line-height: 1.5;
}

/* =========================
   BOTONES
   ========================= */

.primary,
.secondary,
.actions button {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 38px;
  padding: 10px 14px;
  border: 0;
  border-radius: 9px;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background 0.2s ease,
    transform 0.2s ease;
}

.primary {
  background: #171717;
  color: #fff;
}

.primary:hover:not(:disabled) {
  background: #333;
}

.secondary {
  background: #fff6f0;
  color: #c65b19;
}

.secondary:hover:not(:disabled) {
  background: #ffeadc;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

button:focus-visible,
input:focus-visible,
textarea:focus-visible {
  outline: 3px solid rgba(198, 91, 25, 0.35);
  outline-offset: 2px;
}

/* =========================
   ESTADOS Y MENSAJES
   ========================= */

.state,
.notice,
.table-wrap,
.form-card {
  border: 1px solid #e8e8e8;
  border-radius: 14px;
  background: #fff;
}

.state {
  display: grid;
  min-height: 260px;
  place-content: center;
  justify-items: center;
  gap: 12px;
  padding: 24px;
  color: #777;
  text-align: center;
}

.state p {
  margin: 0;
}

.notice {
  margin-bottom: 18px;
  padding: 16px;
  color: #a8584e;
  font-size: 13px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

/* =========================
   TABLA
   ========================= */

.table-wrap {
  width: 100%;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
}

.table-wrap table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.table-wrap th,
.table-wrap td {
  padding: 15px;
  border-bottom: 1px solid #edf1ed;
  vertical-align: middle;
}

.table-wrap th {
  color: #777;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.table-wrap td {
  color: #333;
  font-size: 13px;
}

/* Mantiene visibles los datos sin deformar las columnas */

.table-wrap td:not(.actions) {
  overflow-wrap: anywhere;
}

.table-wrap tbody tr:last-child td {
  border-bottom: 0;
}

.table-wrap tbody tr:hover {
  background: #fffdfb;
}

/* Acciones de cada registro */

.actions {
  display: flex;
  align-items: center;
  gap: 7px;
}

.actions button {
  width: 36px;
  height: 36px;
  min-width: 36px;
  padding: 0;
  background: #fff6f0;
  color: #c65b19;
}

.actions button:last-child {
  background: #fff2ef;
  color: #a8584e;
}

.actions button:hover {
  filter: brightness(0.96);
}

/* =========================
   MODAL
   ========================= */

.modal-layer {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 16px;
  background: rgba(0, 0, 0, 0.64);
  overscroll-behavior: contain;
}

.form-card {
  width: 100%;
  max-width: 680px;
  min-width: 0;
  max-height: calc(100vh - 32px);
  max-height: calc(100dvh - 32px);
  overflow-x: hidden;
  overflow-y: auto;
  padding: 24px;
  color: #171717;
  box-shadow: 0 22px 70px rgba(0, 0, 0, 0.2);
  overscroll-behavior: contain;
}

.form-heading {
  margin-bottom: 4px;
}

.form-heading h3 {
  min-width: 0;
  margin: 0;
  font-size: 22px;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.form-heading button {
  display: grid;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 9px;
  background: #fff6f0;
  color: #c65b19;
  cursor: pointer;
}

/* =========================
   CAMPOS DEL FORMULARIO
   ========================= */

.fields {
  display: grid;
  gap: 16px;
  min-width: 0;
  margin: 20px 0;
}

.fields label {
  display: grid;
  min-width: 0;
  gap: 7px;
  color: #333;
  font-size: 13px;
  font-weight: 700;
}

.fields input,
.fields textarea {
  display: block;
  width: 100%;
  min-width: 0;
  padding: 11px 12px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  background: #fff;
  color: #171717;
  font: inherit;
  font-size: 14px;
  font-weight: 400;
}

.fields input {
  min-height: 42px;
}

.fields textarea {
  min-height: 90px;
  resize: vertical;
}

.fields input:focus,
.fields textarea:focus {
  border-color: #c65b19;
  outline: 2px solid rgba(198, 91, 25, 0.12);
}

/* =========================
   BOTONES DEL FORMULARIO
   ========================= */

.form-actions {
  justify-content: flex-end;
  flex-wrap: wrap;
  margin-top: 22px;
}

.form-actions button {
  max-width: 100%;
}

.error {
  margin: 12px 0;
  color: #a8584e;
  font-size: 13px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

/* =========================
   ANIMACIONES
   ========================= */

.spin {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* =========================
   TABLETS
   ========================= */

@media (max-width: 768px) {
  .crud-page {
    padding-top: 24px;
  }

  .heading {
    gap: 14px;
    margin-bottom: 22px;
  }

  .table-wrap th,
  .table-wrap td {
    padding: 12px;
  }

  .form-card {
    padding: 22px;
  }
}

/* =========================
   MÓVILES
   ========================= */

@media (max-width: 600px) {
  .crud-page {
    padding-top: 20px;
  }

  .heading {
    align-items: center;
    gap: 12px;
  }

  .heading > div {
    flex: 1;
  }

  /* El botón Nuevo se mantiene a la derecha */

  .heading > button.primary {
    flex-shrink: 0;
    margin-left: auto;
  }

  .crud-page h2 {
    font-size: clamp(26px, 7vw, 34px);
  }

  .muted {
    font-size: 13px;
  }

  .state {
    min-height: 200px;
    padding: 18px;
  }

  /* La tabla se desplaza horizontalmente */

  .table-wrap table {
    min-width: 420px;
  }

  .table-wrap th,
  .table-wrap td {
    padding: 11px 10px;
    font-size: 12px;
  }

  .actions {
    gap: 6px;
  }

  .actions button {
    width: 34px;
    height: 34px;
    min-width: 34px;
  }

  /* Modal adaptado al móvil */

  .modal-layer {
    padding: 10px;
  }

  .form-card {
    max-height: calc(100vh - 20px);
    max-height: calc(100dvh - 20px);
    padding: 18px;
    border-radius: 12px;
  }

  .form-heading h3 {
    font-size: 20px;
  }

  .fields {
    gap: 14px;
    margin: 16px 0;
  }

  .form-actions {
    gap: 8px;
  }

  .form-actions button {
    flex: 1 1 auto;
  }
}

/* =========================
   TELÉFONOS ESTRECHOS
   ========================= */

@media (max-width: 360px) {
  .heading {
    gap: 8px;
  }

  .crud-page h2 {
    font-size: 26px;
  }

  .heading > button.primary {
    padding: 9px 10px;
    font-size: 12px;
  }

  .form-card {
    padding: 15px;
  }

  .form-actions button {
    padding: 10px;
    font-size: 12px;
  }
}

/* Respeta las preferencias de accesibilidad */

@media (prefers-reduced-motion: reduce) {
  .spin {
    animation: none;
  }

  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
</style>