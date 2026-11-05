<script setup lang="ts">
import { ref } from 'vue'
import { X } from 'lucide-vue-next'
import PhoneInput from './PhoneInput.vue'
import { isValidPhoneNumber } from '../phone.ts'

const props = defineProps<{
  visible: boolean
  error: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit'): void
}>()

const metodoSolicitud = ref<'wapp' | 'gmail'>('wapp')

const wapp = ref('')
const posiblesCatalogos = ref('')
const nombre = ref('')
const descripcion = ref('')
const gmail = ref('')
const phoneError = ref('')

function infoUserMesage(): string {
  const datos = [
    'Hola, quiero unirme a CatalogosZone.',
    '',
    `Nombre: ${nombre.value}`,
    `Posibles catálogos: ${posiblesCatalogos.value}`,
    `Descripción: ${descripcion.value || 'No especificada'}`,
  ]

  if (metodoSolicitud.value === 'wapp') {
    datos.push(`Gmail: ${gmail.value}`)
  } else {
    datos.push(`WhatsApp: ${wapp.value}`)
  }

  return datos.join('\n')
}

function solicitarPorContacto() {
  phoneError.value = ''
  if (metodoSolicitud.value === 'gmail' && !isValidPhoneNumber(wapp.value)) {
    phoneError.value = 'Introduce un WhatsApp válido para el prefijo seleccionado.'
    return
  }
  const mensaje = infoUserMesage()

  if (metodoSolicitud.value === 'wapp') {
    const numero = '5359292460'
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`

    window.open(url, '_blank', 'noopener,noreferrer')
    return
  }

  const destinatario = 'danielsocorro111@gmail.com'
  const asunto = 'Solicitud de registro en CatalogosZone'

  const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(destinatario)}&su=${encodeURIComponent(asunto)}&body=${encodeURIComponent(mensaje)}`

  window.open(url, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <div v-if="props.visible" class="admin-overlay" @click.self="emit('close')">
    <form class="login-card register-card" role="dialog" aria-modal="true" aria-labelledby="register-modal-title"
      @submit.prevent="solicitarPorContacto">
      <button type="button" class="close-modal" aria-label="Cerrar" @click="emit('close')">
        <X :size="18" />
      </button>
      <span class="eyebrow">Regístrate</span>
      <h2 id="register-modal-title">Añade la información solicitada</h2>
      <p>Completa los datos para solicitar tu registro en el sitio.</p>
      <div class="register-fields">
        <!-- Nombre -->
        <div class="field" :class="{ 'col-span-2': metodoSolicitud === 'wapp' }">
          <label for="catalog-name">Nombre</label>
          <input id="catalog-name" v-model="nombre" type="text" required />
        </div>

        <!-- WhatsApp: solo se muestra al solicitar por Gmail -->
        <div v-if="metodoSolicitud === 'gmail'" class="field">
          <label>WhatsApp</label>
          <PhoneInput v-model="wapp" required label="WhatsApp" />
        </div>

        <!-- Posibles catálogos -->
        <div class="field">
          <label for="catalog-types">Posibles catálogos</label>
          <input id="catalog-types" v-model="posiblesCatalogos" type="text" required placeholder="Ej.: Tecnología" />
        </div>

        <!-- Descripción -->
        <div class="field">
          <label for="catalog-description">Descripción</label>
          <textarea id="catalog-description" v-model="descripcion" rows="1"></textarea>
        </div>

        <!-- Gmail: solo se muestra al solicitar por WhatsApp -->
        <div v-if="metodoSolicitud === 'wapp'" class="field col-span-2">
          <label for="catalog-gmail">Gmail</label>
          <input id="catalog-gmail" v-model="gmail" type="email" autocomplete="email" required
            placeholder="tu@gmail.com" />
        </div>

        <!-- Método de solicitud -->
        <div class="field col-span-2">
          <label>¿Cómo deseas solicitar?</label>

          <div class="flex flex-wrap gap-4 mt-2">
            <label class="flex items-center gap-2 cursor-pointer">
              <input v-model="metodoSolicitud" type="radio" value="wapp" name="metodoSolicitud" />
              <span>WhatsApp</span>
            </label>

            <label class="flex items-center gap-2 cursor-pointer">
              <input v-model="metodoSolicitud" type="radio" value="gmail" name="metodoSolicitud" />
              <span>Gmail</span>
            </label>
          </div>
        </div>
      </div>
      <p v-if="phoneError" class="error">{{ phoneError }}</p>
      <p v-if="props.error" class="error">{{ props.error }}</p>
      <button type="submit" class="btn btn-primary btn-wide">
        Solicitar
      </button>
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
  position: absolute;
  top: 18px;
  right: 18px;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1px solid #dedede;
  border-radius: 9px;
  background: #f5f5f5;
  color: #626262;
  transition: background .18s ease, color .18s ease;
}

.close-modal:hover {
  background: #ededed;
  color: #171717;
}

.eyebrow {
  display: block;
  color: #c65b19;
  text-transform: uppercase;
  letter-spacing: .14em;
  font-size: 11px;
  font-weight: 800;
}

.login-card h2 {
  margin: 9px 42px 7px 0;
  color: #171717;
  font-size: 27px;
  line-height: 1.15;
  letter-spacing: -.04em;
}

.login-card>p {
  color: #626262;
  margin: 0 0 18px;
  font-size: 14px;
  line-height: 1.5;
}

.register-card {
  width: min(100%, 520px);
  min-width: 0;
}

.register-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
  align-items: start;
}

.col-span-2 {
  grid-column: 1 / -1;
}

.field {
  display: grid;
  min-width: 0;
  gap: 6px;
  margin-bottom: 13px;
}

.field label {
  color: #454545;
  font-size: 13px;
  font-weight: 700;
}

.field-hint {
  color: #777;
  font-size: 11px;
  line-height: 1.35;
}

.field input,
.field textarea {
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

.field input:focus,
.field textarea:focus {
  border-color: #c65b19;
  outline: 0;
  box-shadow: 0 0 0 3px rgba(198, 91, 25, .12);
}

.field textarea {
  resize: vertical;
}

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

.btn-primary {
  background: #171717;
  color: #fff;
}

.btn-primary:hover {
  background: #c65b19;
  color: #171717;
  transform: translateY(-1px);
}

.btn-wide {
  width: 100%;
}

.request-hint {
  margin: 10px 0 0 !important;
  color: #777 !important;
  font-size: 12px !important;
  text-align: center;
}

.error {
  color: #a3312d;
  font-size: 13px;
  margin: 0 0 12px;
}

@media (max-width: 560px) {
  .admin-overlay {
    place-items: start center;
    padding: 12px;
  }

  .login-card {
    width: 100%;
    max-height: calc(100dvh - 24px);
    margin-block: auto;
    padding: 20px 16px;
  }

  .register-fields {
    grid-template-columns: minmax(0, 1fr);
  }

  .register-fields .field {
    margin-bottom: 11px;
  }

  .login-card h2 {
    font-size: 24px;
  }
}

@media (max-height: 520px) {
  .admin-overlay {
    place-items: start center;
  }

  .login-card {
    padding: 16px;
  }

  .login-card>p {
    margin-bottom: 10px;
  }

  .register-fields .field {
    margin-bottom: 5px;
  }

  .register-fields .field input,
  .register-fields .field textarea {
    min-height: 38px;
    padding-top: 8px;
    padding-bottom: 8px;
  }

  .request-hint {
    margin-top: 6px !important;
  }
}
</style>