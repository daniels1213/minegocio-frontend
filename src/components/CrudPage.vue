<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Pencil, Plus, RefreshCw, Save, Trash2, X } from 'lucide-vue-next'
import { api } from '../api.ts'

export interface CrudField { key: string; label: string; type?: string; required?: boolean; placeholder?: string }
const props = defineProps<{ title: string; description: string; resource: string; fields: CrudField[] }>()
const rows = ref<Record<string, unknown>[]>([])
const form = ref<Record<string, string | number>>({})
const editingId = ref<number | null>(null)
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const showForm = ref(false)

function resetForm() { form.value = Object.fromEntries(props.fields.map(field => [field.key, ''])); editingId.value = null; showForm.value = true; error.value = '' }
function edit(row: Record<string, unknown>) { form.value = Object.fromEntries(props.fields.map(field => [field.key, String(row[field.key] ?? '')])); editingId.value = Number(row.id); showForm.value = true; error.value = '' }
function closeForm() { showForm.value = false; error.value = '' }
async function load() { loading.value = true; error.value = ''; try { rows.value = await api.list<Record<string, unknown>>(props.resource) } catch (reason) { error.value = reason instanceof Error ? reason.message : 'No se pudo cargar la información.' } finally { loading.value = false } }
async function save() {
  if (props.fields.some(field => field.required && !String(form.value[field.key] ?? '').trim())) { error.value = 'Completa los campos obligatorios.'; return }
  saving.value = true; error.value = ''
  try { if (editingId.value) await api.update(props.resource, editingId.value, form.value); else await api.create(props.resource, form.value); closeForm(); await load() } catch (reason) { error.value = reason instanceof Error ? reason.message : 'No se pudo guardar.' } finally { saving.value = false }
}
async function remove(row: Record<string, unknown>) { if (!row.id || !window.confirm(`¿Eliminar ${row.nombre || 'este registro'}?`)) return; try { await api.delete(props.resource, Number(row.id)); await load() } catch (reason) { error.value = reason instanceof Error ? reason.message : 'No se pudo eliminar.' } }
onMounted(load)
</script>

<template>
  <section class="crud-page">
    <div class="heading"><div><p class="eyebrow">Gestión</p><h2>{{ title }}</h2><p class="muted">{{ description }}</p></div><button class="primary" type="button" @click="resetForm"><Plus :size="17" /> Nuevo</button></div>
    <div v-if="error && !showForm" class="notice">{{ error }}</div>
    <div v-if="loading" class="state"><RefreshCw :size="24" class="spin" /> Cargando...</div>
    <div v-else-if="!rows.length" class="state"><p>Aún no hay registros.</p><button class="secondary" type="button" @click="resetForm">Crear el primero</button></div>
    <div v-else class="table-wrap"><table><thead><tr><th v-for="field in fields" :key="field.key">{{ field.label }}</th><th>Acciones</th></tr></thead><tbody><tr v-for="row in rows" :key="String(row.id)"><td v-for="field in fields" :key="field.key">{{ row[field.key] || '—' }}</td><td class="actions"><button type="button" title="Editar" @click="edit(row)"><Pencil :size="16" /></button><button type="button" title="Eliminar" @click="remove(row)"><Trash2 :size="16" /></button></td></tr></tbody></table></div>
    <div v-if="showForm" class="form-card"><div class="form-heading"><h3>{{ editingId ? 'Editar' : 'Nuevo' }} registro</h3><button type="button" @click="closeForm"><X :size="18" /></button></div><div class="fields"><label v-for="field in fields" :key="field.key">{{ field.label }}<textarea v-if="field.type === 'textarea'" v-model="form[field.key]" :placeholder="field.placeholder" :required="field.required" rows="3" /><input v-else v-model="form[field.key]" :type="field.type || 'text'" :placeholder="field.placeholder" :required="field.required" /></label></div><p v-if="error" class="error">{{ error }}</p><div class="form-actions"><button class="secondary" type="button" @click="closeForm">Cancelar</button><button class="primary" type="button" :disabled="saving" @click="save"><Save :size="16" /> {{ saving ? 'Guardando...' : 'Guardar' }}</button></div></div>
  </section>
</template>

<style scoped>
.crud-page{padding:34px 0;color:#17332a}.heading,.form-heading,.form-actions{display:flex;align-items:center;justify-content:space-between;gap:18px}.heading{align-items:end;margin-bottom:28px}.eyebrow{margin:0;color:#6c8175;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}h2{margin:8px 0 7px;font:700 clamp(28px,4vw,42px) 'Space Grotesk',Arial,sans-serif}.muted{margin:0;color:#75847b}.primary,.secondary,.actions button{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:0;border-radius:9px;padding:11px 14px;font-weight:700;cursor:pointer}.primary{background:#1a5f47;color:#fff}.secondary{background:#e7f0ea;color:#1a5f47}.state,.notice,.table-wrap,.form-card{border:1px solid #e3e9e2;border-radius:14px;background:#fff}.state{min-height:260px;display:grid;place-content:center;justify-items:center;gap:12px;color:#75847b}.notice,.form-card{padding:18px;color:#a8584e}.table-wrap{overflow:auto}.table-wrap table{width:100%;border-collapse:collapse;text-align:left}.table-wrap th,.table-wrap td{padding:15px;border-bottom:1px solid #edf1ed;white-space:nowrap}.table-wrap th{color:#6c8175;font-size:11px;text-transform:uppercase}.actions{display:flex;gap:6px}.actions button,.form-heading button{padding:8px;background:#edf4ef;color:#1a5f47}.actions button:last-child{color:#a8584e;background:#f8e9e6}.form-card{max-width:680px;margin-top:20px;color:#17332a}.form-heading h3{margin:0}.form-heading button{border:0;cursor:pointer}.fields{display:grid;gap:14px;margin:20px 0}.fields label{display:grid;gap:7px;font-size:13px;font-weight:700}.fields input,.fields textarea{width:100%;padding:11px;border:1px solid #dfe5df;border-radius:8px;font:inherit;font-weight:400}.form-actions{justify-content:end}.error{color:#a8584e}.spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:620px){.heading{align-items:start;flex-direction:column}.heading .primary{width:100%}}
</style>