<script setup lang="ts">
import { X, User, Image, LoaderCircle, ChevronDown } from 'lucide-vue-next'
import { ref } from 'vue'
import { uploadCloudinaryImage } from '../cloudinary.ts'
import ImageCropModal from './ImageCropModal.vue'

const uploadingPhoto = ref(false)
const cropVisible = ref(false)
const pendingImage = ref<File | null>(null)
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

function selectPhoto(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) return
  pendingImage.value = file
  cropVisible.value = true
  input.value = ''
}

async function uploadPhoto(file: File) {
  cropVisible.value = false
  uploadingPhoto.value = true
  uploadError.value = ''

  try {
    emit('update:fotoPerfil', await uploadCloudinaryImage(file, 'profile'))
  } catch (reason) {
    uploadError.value = reason instanceof Error
      ? reason.message
      : 'No se pudo subir la imagen.'
  } finally {
    uploadingPhoto.value = false
    pendingImage.value = null
  }
}
</script>

<template>
  <!-- Overlay del modal -->
<div
      v-if="props.visible"
      class="profile-modal-overlay fixed inset-0 z-[100] grid overflow-y-auto bg-black/60"
      @click.self="emit('close')"
    >

    <!-- Contenido del modal -->
    <div
      class="profile-modal-panel login-card relative w-full max-w-md overflow-y-auto p-6"
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

        <div class="profile-photo-wrap relative flex h-40 w-40 items-center justify-center rounded-full">

          <div class="absolute inset-0 flex items-center justify-center overflow-hidden rounded-full shadow-lg">
            <img
              v-if="props.form.fotoPerfil"
              :src="props.form.fotoPerfil"
              alt="Foto de perfil"
              class="h-full w-full object-cover"
            />

            <User
              v-if="!props.form.fotoPerfil"
              class="h-24 w-24"
            />
          </div>
          <label
            class="photo-upload-button"
            :class="{ disabled: uploadingPhoto }"
            title="Subir y ajustar foto de perfil"
            aria-label="Subir y ajustar foto de perfil"
          >
            <LoaderCircle v-if="uploadingPhoto" :size="20" class="spin" />
            <Image v-else :size="20" />
            <input type="file" accept="image/*" :disabled="uploadingPhoto" @change="selectPhoto" />
          </label>
        </div>
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
        <button
          class="password-toggle"
          type="button"
          :aria-expanded="changePassword"
          aria-controls="password-fields"
          @click="changePassword = !changePassword"
        >
          <span>Cambiar contraseña</span>
          <ChevronDown :size="18" :class="{ expanded: changePassword }" />
        </button>

        <div v-if="changePassword" id="password-fields" class="password-fields">
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
  <ImageCropModal :visible="cropVisible" :file="pendingImage" :aspect-ratio="1" title="Ajustar foto de perfil" @cancel="cropVisible = false; pendingImage = null" @crop="uploadPhoto" />
</template>

<style scoped>
.profile-modal-overlay {
  align-items: stretch;
  justify-items: end;
}

.profile-modal-panel {
  height: 100vh;
  height: 100dvh;
  max-height: none;
  border-radius: 16px 0 0 16px;
}

.login-card {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-right: none;
}

.close-modal {
  position: absolute;
  top: 16px;
  right: 16px;
  border: 0;
  background: transparent;
  color: #777;
  cursor: pointer;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 1.2px;
  font-size: 11px;
  font-weight: 700;
  color: #c65b19;
}

.login-card h2 {
  font: 700 32px 'Space Grotesk';
  margin: 12px 0 8px;
  letter-spacing: -1px;
  color: #171717;
}

.field {
  display: grid;
  gap: 7px;
  margin-bottom: 20px;
}

.field label {
  color: #333;
  font-size: 13px;
  font-weight: 600;
}

.field input {
  width: 100%;
  border: 0;
  border-bottom: 1px solid #e8e8e8;
  background: transparent;
  padding: 12px 0;
  color: #171717;
  border-radius: 0;
  transition: border-color 0.2s;
}
.field input:focus {
  outline: none;
  border-bottom-color: #c65b19;
  box-shadow: none;
}

.photo-upload-button {
  display: grid;
  place-items: center;
  position: absolute;
  right: 0;
  bottom: 0;
  width: 42px;
  height: 42px;
  z-index: 1;
  border-radius: 50%;
  background: white;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0,0,0,.2);
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
  color: #a8584e;
  font-size: 0.9rem;
}
.password-section {
  margin: 24px 0;
  padding-top: 20px;
  border-top: 1px solid #e8e8e8;
}
.password-toggle {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid #e8e8e8;
  border-radius: 9px;
  background: #fff;
  color: #171717;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  text-align: left;
}
.password-toggle:hover {
  border-color: #c65b19;
  background: #fff6f0;
}
.password-toggle svg {
  flex: 0 0 auto;
  transition: transform .18s ease;
}
.password-toggle svg.expanded {
  transform: rotate(180deg);
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

@media (max-width: 560px) {
  .login-card { padding: 22px 18px; }
  .form-actions { flex-direction: column-reverse; }
  .form-actions .btn { width: 100%; }
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
  background: #171717;
  color: #fff;
}

.btn-ghost {
  background: #f0f0f0;
  color: #333;
}
</style>
