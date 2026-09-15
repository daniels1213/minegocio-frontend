<script setup lang="ts">
import { X } from 'lucide-vue-next'

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
  <div v-if="props.visible" class="admin-overlay" @click.self="emit('close')">
    <div class="login-card admin-card">
      <button type="button" class="close-modal" aria-label="Cerrar" @click="emit('close')">
        <X :size="18" />
      </button>
      <span class="eyebrow">Mi información</span>
      <h2>Perfil del usuario</h2>

      <div class="field">
        <label>Nombre de usuario</label>
        <input :value="props.form.nombreUsuario" @input="emit('update:nombreUsuario', ($event.target as HTMLInputElement).value)" />
      </div>
      <div class="field">
        <label>Nombre</label>
        <input :value="props.form.nombre" @input="emit('update:nombre', ($event.target as HTMLInputElement).value)" />
      </div>
      <div class="field">
        <label>Apellido</label>
        <input :value="props.form.apellido" @input="emit('update:apellido', ($event.target as HTMLInputElement).value)" />
      </div>
      <div class="field">
        <label>Correo</label>
        <input type="email" :value="props.form.correo" @input="emit('update:correo', ($event.target as HTMLInputElement).value)" />
      </div>
      <div class="field">
        <label>Teléfono</label>
        <input :value="props.form.telefono" @input="emit('update:telefono', ($event.target as HTMLInputElement).value)" />
      </div>
      <div class="field">
        <label>Foto de perfil</label>
        <input :value="props.form.fotoPerfil" @input="emit('update:fotoPerfil', ($event.target as HTMLInputElement).value)" placeholder="URL de imagen" />
      </div>

      <div v-if="props.form.fotoPerfil" class="profile-preview">
        <img :src="props.form.fotoPerfil" alt="Foto de perfil" />
      </div>

      <div class="form-actions">
        <button class="btn btn-ghost" type="button" @click="emit('close')">Cancelar</button>
        <button class="btn btn-primary" type="button" @click="emit('save')">Guardar cambios</button>
      </div>
    </div>
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
  width: min(100%, 480px);
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
.profile-preview {
  margin: 10px 0 18px;
}
.profile-preview img {
  width: 100%;
  height: 180px;
  object-fit: cover;
  border-radius: 12px;
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
