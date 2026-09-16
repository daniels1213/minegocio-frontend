<script setup lang="ts">
import { X, User, Image } from 'lucide-vue-next'
import { ref } from 'vue'

const fotoperfil = ref(true)

const props = defineProps<{
  visible: boolean
  form: {
    nombreUsuario: string
    nombre: string
    apellido: string
    correo: string
    telefono: string
    fotoPerfil: string
  }
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save'): void
  (e: 'update:nombreUsuario', value: string): void
  (e: 'update:nombre', value: string): void
  (e: 'update:apellido', value: string): void
  (e: 'update:correo', value: string): void
  (e: 'update:telefono', value: string): void
  (e: 'update:fotoPerfil', value: string): void
}>()
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
            v-if="fotoperfil && props.form.fotoPerfil"
            :src="props.form.fotoPerfil"
            alt="Foto de perfil"
            class="h-full w-full object-cover"
          />

          <User
            v-if="!fotoperfil || !props.form.fotoPerfil"
            class="h-30 w-30"
          />
        </div>
        <Image class="text-red-7 bg-red-1 w-10 h-10 cursor-pointer hover:color-red-900 mt--12 ml-35 relative"/>
        
        <input
          :value="props.form.fotoPerfil"
          placeholder="URL de imagen"
          @input="
            emit(
              'update:fotoPerfil',
              ($event.target as HTMLInputElement).value
            )
          "
        />

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
        <label>Apellido</label>

        <input
          :value="props.form.apellido"
          @input="
            emit(
              'update:apellido',
              ($event.target as HTMLInputElement).value
            )
          "
        />
      </div>

      <div class="field">
        <label>Correo</label>

        <input
          type="email"
          :value="props.form.correo"
          @input="
            emit(
              'update:correo',
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
          @click="emit('save')"
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
