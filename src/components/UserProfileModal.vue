<script setup lang="ts">
import { X, User, Image, LoaderCircle } from 'lucide-vue-next'
import { ref } from 'vue'

const uploadingPhoto = ref(false)
const uploadError = ref('')
const changePassword = ref(false)
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordError = ref('')

const props = defineProps<{
  visible: boolean
  form: {
    nombreUsuario: string
    nombre: string
    telefono: string
    fotoPerfil: string
  }
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', password?: { current: string; next: string }): void
  (e: 'update:nombreUsuario', value: string): void
  (e: 'update:nombre', value: string): void
  (e: 'update:telefono', value: string): void
  (e: 'update:fotoPerfil', value: string): void
}>()

function saveProfile() {
  passwordError.value = ''

  if (!changePassword.value) {
    emit('save')
    return
  }

  if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
    passwordError.value = 'Completa todos los campos de contraseña.'
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = 'Las contraseñas nuevas no coinciden.'
    return
  }

  emit('save', {
    current: currentPassword.value,
    next: newPassword.value,
  })
}

async function uploadPhoto(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) return

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

  if (!cloudName || !uploadPreset) {
    uploadError.value = 'Falta configurar Cloudinary en el archivo .env.'
    input.value = ''
    return
  }

  if (!file.type.startsWith('image/')) {
    uploadError.value = 'Selecciona un archivo de imagen válido.'
    input.value = ''
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    uploadError.value = 'La imagen no puede superar los 5 MB.'
    input.value = ''
    return
  }

  uploadingPhoto.value = true
  uploadError.value = ''

  try {
    const body = new FormData()
    body.append('file', file)
    body.append('upload_preset', uploadPreset)

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: 'POST', body },
    )

    const result = await response.json()

    if (!response.ok || !result.secure_url) {
      throw new Error(result.error?.message || 'No se pudo subir la imagen.')
    }

    emit('update:fotoPerfil', result.secure_url)
  } catch (reason) {
    uploadError.value = reason instanceof Error
      ? reason.message
      : 'No se pudo subir la imagen.'
  } finally {
    uploadingPhoto.value = false
    input.value = ''
  }
}
</script>

<template>
  <!-- Overlay del modal -->
  <div
    v-if="props.visible"
    class="fixed inset-0 z-[100] flex items-right justify-right bg-black/50"
    @click.self="emit('close')"
  >

    <!-- Contenido del modal -->
    <div
      class="login-card relative max-h-[100vh] w-full max-w-2xl overflow-y-auto"
    >

      <button
        type="button"
        class="close-modal"
        aria-label="Cerrar"
        @click="emit('close')"
      >
        <X :size="18" />
      </button>

      <span class="eyebrow">
        Mi información
      </span>

      <div class="flex space-x-5">
        <h2 class="my-auto">
          Perfil del usuario
        </h2>
      </div>

      <div class="field justify-items-center">

        <label>
          Foto de perfil
        </label>

        <div
          class="relative flex h-50 w-50 items-center justify-center overflow-hidden rounded-full shadow-lg"
        >

          <img
            v-if="props.form.fotoPerfil"
            :src="props.form.fotoPerfil"
            alt="Foto de perfil"
            class="h-full w-full object-cover"
          />

          <User
            v-if="!props.form.fotoPerfil"
            class="h-30 w-30"
          />
        </div>

        <label
          class="photo-upload-button"
          :class="{ disabled: uploadingPhoto }"
          title="Subir foto de perfil"
        >
          <LoaderCircle v-if="uploadingPhoto" :size="20" class="spin" />
          <Image v-else :size="20" />
          <input
            type="file"
            accept="image/*"
            :disabled="uploadingPhoto"
            @change="uploadPhoto"
          />
        </label>
        <!---
        <input
          :value="props.form.fotoPerfil"
          placeholder="URL de imagen"
          @input="
            emit(
              'update:fotoPerfil',
              ($event.target as HTMLInputElement).value
            )
          "
        /> --->

          <p v-if="uploadError" class="error">{{ uploadError }}</p>

      </div>

      <div class="field">
        <label>Nombre de usuario</label>

        <input
          :value="props.form.nombreUsuario"
          @input="
            emit(
              'update:nombreUsuario',
              ($event.target as HTMLInputElement).value
            )
          "
        />
      </div>

      <div class="field">
        <label>Nombre</label>

        <input
          :value="props.form.nombre"
          @input="
            emit(
              'update:nombre',
              ($event.target as HTMLInputElement).value
            )
          "
        />
      </div>

      <div class="field">
        <label>Teléfono</label>

        <input
          :value="props.form.telefono"
          @input="
            emit(
              'update:telefono',
              ($event.target as HTMLInputElement).value
            )
          "
        />
      </div>

      <section class="password-section">
        <label class="password-toggle">
          <input v-model="changePassword" type="checkbox" />
          <span>Cambiar contraseña</span>
        </label>

        <div v-if="changePassword" class="password-fields">
          <div class="field">
            <label for="current-password">Contraseña actual</label>
            <input id="current-password" v-model="currentPassword" type="password" autocomplete="current-password" />
          </div>

          <div class="field">
            <label for="new-password">Nueva contraseña</label>
            <input id="new-password" v-model="newPassword" type="password" autocomplete="new-password" />
          </div>

          <div class="field">
            <label for="confirm-password">Repetir nueva contraseña</label>
            <input id="confirm-password" v-model="confirmPassword" type="password" autocomplete="new-password" />
          </div>

          <p v-if="passwordError" class="error">{{ passwordError }}</p>
        </div>
      </section>

      <div class="form-actions">
        <button
          class="btn btn-ghost"
          type="button"
          @click="emit('close')"
        >
          Cancelar
        </button>

        <button
          class="btn btn-primary"
          type="button"
          @click="saveProfile"
        >
          Guardar cambios
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
.login-card {
  background: #fffefa;
  border: 1px solid #e5ebe3;
}

.close-modal {
  position: absolute;
  top: 16px;
  right: 16px;
  border: 0;
  background: transparent;
  color: #4a574f;
  cursor: pointer;
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
.photo-upload-button {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  margin-top: -52px;
  margin-left: 140px;
  position: relative;
  border-radius: 50%;
  background: white;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(17, 39, 31, 0.2);
}
.photo-upload-button.disabled {
  opacity: 0.65;
  cursor: wait;
}
.photo-upload-button input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
.spin {
  animation: spin 0.8s linear infinite;
}
.error {
  margin: 0;
  color: #a23b36;
  font-size: 0.9rem;
}
.password-section {
  margin: 24px 0;
  padding-top: 20px;
  border-top: 1px solid #e5ebe3;
}
.password-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #25332c;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.password-toggle input {
  width: 16px;
  height: 16px;
  accent-color: #1c7655;
}
.password-fields {
  margin-top: 18px;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
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

.btn-ghost {
  background: #eef2ee;
  color: #25332c;
}
</style>
