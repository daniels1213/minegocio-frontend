<script setup lang="ts">
import { ref } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps<{
  visible: boolean
  error: string
}>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit'): void
}>()

const wappCliente = ref('')
const tipoCatalogo = ref('')
const nombre = ref('')
const descripcion = ref('')

function contactOnWhatsApp() {
  const message = [
    'Hola, quiero registrar un catálogo.',
    '',
    `Nombre: ${nombre.value}`,
    `Tipo de catálogo: ${tipoCatalogo.value}`,
    `WhatsApp de contacto: ${wappCliente.value}`,
    `Descripción o detalles: ${descripcion.value}`,
  ].join('\n')

  const whatsappUrl = `https://wa.me/5359292460?text=${encodeURIComponent(message)}`
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
}
</script>
<template>
  <div v-if="props.visible" class="admin-overlay" @click.self="emit('close')">
    <form class="login-card h-135" @submit.prevent="contactOnWhatsApp">
      <button type="button" class="close-modal" aria-label="Cerrar" @click="emit('close')">
        <X :size="18" />
      </button>
      <span class="eyebrow">Nuevo catálogo</span>
      <h2>Añade tu catálogo</h2>
      <p>Completa los datos para registrar tu catálogo.</p>
      <div class="field">
        <label for="catalog-name">Nombre</label>
        <input id="catalog-name" v-model="nombre" type="text" required />
      </div>
      <div class="field">
        <label for="catalog-type">Tipo de catálogo</label>
        <input id="catalog-type" v-model="tipoCatalogo" type="text" required />
      </div>
      <div class="field">
        <label for="catalog-phone">WhatsApp de contacto</label>
        <input id="catalog-phone" v-model="wappCliente" type="tel" required />
      </div>
      <div class="field">
        <label for="catalog-description">Descripción o detalles</label>
        <textarea
          id="catalog-description"
          v-model="descripcion"
          rows="1"
        ></textarea>
      </div>
      <p v-if="props.error" class="error">{{ props.error }}</p>
      <button class="btn btn-primary btn-wide" type="submit">
        Contactar por WhatsApp
      </button>
    </form>
  </div>
</template>
<style scoped>
.admin-overlay {
  position: fixed;
  inset: 0;
  background: rgba(17, 20, 19, 0.52);
  display: grid;
  place-items: center;
  z-index: 90;
}
.login-card {
  width: min(100%, 420px);
  background: #fffefa;
  border: 1px solid #e5ebe3;
  box-shadow: 0 22px 70px rgba(17, 39, 31, 0.2);
  padding: 32px 28px;
  border-radius: 18px;
  position: relative;
}
.close-modal {
  position: absolute;
  top: 16px;
  right: 16px;
  border: 0;
  background: transparent;
  color: #4a574f;
}
.eyebrow {
  text-transform: uppercase;
  letter-spacing: 1.2px;
  font-size: 11px;
  font-weight: 700;
  color: #1c7655;
}
.login-card h2 {
  font: 700 32px 'Space Grotesk';
  margin: 12px 0 8px;
  letter-spacing: -1px;
}
.login-card > p {
  color: #707d76;
  margin: 0 0 16px;
}
.field {
  display: grid;
  gap: 7px;
  margin-bottom: 17px;
}
.field label {
  color: #525c55;
  font-size: 13px;
  font-weight: 600;
}
.field input {
  width: 100%;
  border: 1px solid #dfe5df;
  background: #fff;
  padding: 12px 13px;
  color: #20262d;
  border-radius: 8px;
}
.field textarea {
  width: 100%;
  resize: vertical;
  border: 1px solid #dfe5df;
  background: #fff;
  padding: 12px 13px;
  color: #20262d;
  border-radius: 8px;
  font: inherit;
}
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 12px;
  padding: 0.9rem 1.15rem;
  font-weight: 700;
  cursor: pointer;
}
.btn-primary {
  background: #1c7655;
  color: #fff;
}
.btn-wide {
  width: 100%;
}
.error {
  color: #a23b36;
  font-size: 0.9rem;
  margin: 0 0 14px;
}
</style>