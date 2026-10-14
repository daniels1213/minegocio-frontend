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

const wapp = ref('')
const posiblesCatalogos = ref('')
const nombre = ref('')
const descripcion = ref('')

function contactOnWhatsApp() {
  const message = [
    'Hola, quiero solicitar un catálogo.',
    '',
    `Nombre: ${nombre.value}`,
    `Wapp: ${wapp.value}`,
    `Posibles catálogos: ${posiblesCatalogos.value}`,
    `Descripción: ${descripcion.value}`,
  ].join('\n')

  const whatsappUrl = `https://wa.me/5359292460?text=${encodeURIComponent(message)}`
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
}
</script>
<template>
  <div v-if="props.visible" class="admin-overlay" @click.self="emit('close')">
    <form class="login-card register-card" role="dialog" aria-modal="true" aria-labelledby="register-modal-title" @submit.prevent="contactOnWhatsApp">
      <button type="button" class="close-modal" aria-label="Cerrar" @click="emit('close')">
        <X :size="18" />
      </button>
      <span class="eyebrow">Regístrate</span>
      <h2 id="register-modal-title">Añade la información solicitada</h2>
      <p>Completa los datos para solicitar tu registro en el sitio.</p>
      <div class="register-fields">
        <div class="field">
          <label for="catalog-name">Nombre</label>
          <input id="catalog-name" v-model="nombre" type="text" required />
        </div>
        <div class="field">
          <label for="catalog-phone">Wapp</label>
          <input id="catalog-phone" v-model="wapp" type="tel" autocomplete="tel" required />
        </div>
        <div class="field">
          <label for="catalog-types">Posibles catálogos</label>
          <input id="catalog-types" v-model="posiblesCatalogos" type="text" aria-describedby="catalog-types-hint" required />
          <small id="catalog-types-hint" class="field-hint">Ej.: Tecnología, Artículos personalizados, etc.</small>
        </div>
        <div class="field">
          <label for="catalog-description">Descripción</label>
          <textarea class="mb-8"
            id="catalog-description"
            v-model="descripcion"
            rows="1"
          ></textarea>
        </div>
      </div>
      <p v-if="props.error" class="error">{{ props.error }}</p>
      <button class="btn btn-primary btn-wide" type="submit">
        Solicitar
      </button>
      <p class="request-hint">La solicitud se realiza vía Wapp.</p>
    </form>
  </div>
</template>
<style scoped>
.admin-overlay {
  position: fixed;
  inset: 0;
  overflow-y: auto;
  padding: 16px;
  display: grid;
  place-items: center;
  z-index: 90;
  background-color: rgba(0, 0, 0, 0.7);
}
.login-card {
  width: min(100%, 500px);
  max-height: calc(100dvh - 32px);
  overflow-y: auto;
  border: 1px solid #dedede;
  background: #fff;
  box-shadow: 0 24px 70px rgba(23, 23, 23, .2);
  padding: 28px;
  border-radius: 14px;
  position: relative;
}
.close-modal {
  position: absolute; top: 18px; right: 18px;
  display: grid; place-items: center;
  width: 36px; height: 36px;
  border: 1px solid #dedede; border-radius: 9px;
  background: #f5f5f5; color: #626262;
  transition: background .18s ease, color .18s ease;
}
.close-modal:hover { background: #ededed; color: #171717; }
.eyebrow { display: block; color: #c65b19; text-transform: uppercase; letter-spacing: .14em; font-size: 11px; font-weight: 800; }
.login-card h2 {
  margin: 9px 42px 7px 0;
  color: #171717;
  font-size: 27px;
  line-height: 1.15;
  letter-spacing: -.04em;
}
.login-card > p { color: #626262; margin: 0 0 18px; font-size: 14px; line-height: 1.5; }
.register-card { width: min(100%, 520px); }
.register-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 16px; }
.field {
  display: grid;
  min-width: 0;
  gap: 6px;
  margin-bottom: 13px;
}
.field label { color: #454545; font-size: 13px; font-weight: 700; }
.field-hint { color: #777; font-size: 11px; line-height: 1.35; }
.field input, .field textarea {
  width: 100%;
  min-width: 0;
  min-height: 42px;
  border: 1px solid #dedede;
  background: #fff;
  padding: 10px 11px;
  color: #171717;
  border-radius: 8px;
  font: inherit;
  font-size: 14px;
  transition: border-color .18s ease, box-shadow .18s ease;
}
.field input:focus, .field textarea:focus { border-color: #c65b19; outline: 0; box-shadow: 0 0 0 3px rgba(198, 91, 25, .12); }
.field textarea { resize: vertical; }
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 9px;
  padding: 12px 16px;
  font-weight: 700;
  cursor: pointer;
  transition: background .18s ease, transform .18s ease;
}
.btn-primary { background: #171717; color: #fff; }
.btn-primary:hover { background: #c65b19; color: #171717; transform: translateY(-1px); }
.btn-wide { width: 100%; }
.request-hint { margin: 10px 0 0 !important; color: #777 !important; font-size: 12px !important; text-align: center; }
.error { color: #a3312d; font-size: 13px; margin: 0 0 12px; }
@media (max-width: 560px) {
  .login-card { padding: 24px 20px; }
  .register-fields { grid-template-columns: 1fr; }
  .register-fields .field { margin-bottom: 11px; }
}
@media (max-height: 520px) {
  .login-card { padding: 16px 20px; }
  .login-card > p { margin-bottom: 10px; }
  .register-fields .field { margin-bottom: 5px; }
  .register-fields .field input, .register-fields .field textarea { min-height: 38px; padding-top: 8px; padding-bottom: 8px; }
  .request-hint { margin-top: 6px !important; }
}
</style>