<script setup lang="ts">
import { X, LockKeyhole } from 'lucide-vue-next'

const props = defineProps<{
  visible: boolean
  loading: boolean
  error: string
  username: string
  password: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit'): void
  (e: 'update:username', value: string): void
  (e: 'update:password', value: string): void
}>()
</script>

<template>
  <div v-if="props.visible" class="admin-overlay" @click.self="emit('close')">
    <form class="login-card admin-card" role="dialog" aria-modal="true" aria-labelledby="admin-modal-title" autocomplete="off" @submit.prevent="emit('submit')">
      <button type="button" class="close-modal" aria-label="Cerrar" @click="emit('close')">
        <X :size="18" />
      </button>
      <span class="eyebrow">Área privada</span>
      <h2 id="admin-modal-title">Administración</h2>
      <p>Verifica tus credenciales para entrar al panel operativo.</p>

      <div class="field">
        <label for="username">Usuario</label>
        <input id="username" :value="props.username" @input="emit('update:username', ($event.target as HTMLInputElement).value)" required autocomplete="off" placeholder="tu.usuario" />
      </div>
      <div class="field">
        <label for="password">Contraseña</label>
        <input id="password" :value="props.password" @input="emit('update:password', ($event.target as HTMLInputElement).value)" required type="password" autocomplete="new-password" placeholder="••••••••" />
      </div>

      <p v-if="props.error" class="error">{{ props.error }}</p>
      <button class="btn btn-primary btn-wide" :disabled="props.loading">
        <LockKeyhole :size="17" />
        {{ props.loading ? 'Verificando...' : 'Entrar al panel' }}
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
  width: min(100%, 420px);
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
.login-card > p { color: #626262; margin: 0 0 19px; font-size: 14px; line-height: 1.5; }
.field {
  display: grid;
  gap: 6px;
  margin-bottom: 14px;
}
.field label { color: #454545; font-size: 13px; font-weight: 700; }
.field input {
  width: 100%;
  min-width: 0;
  border: 1px solid #dedede;
  background: #fff;
  padding: 11px 12px;
  color: #171717;
  border-radius: 8px;
  font: inherit;
  font-size: 14px;
  transition: border-color .18s ease, box-shadow .18s ease;
}
.field input:focus { border-color: #c65b19; outline: 0; box-shadow: 0 0 0 3px rgba(198, 91, 25, .12); }
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
.btn-primary:hover:not(:disabled) { background: #c65b19; color: #171717; transform: translateY(-1px); }
.btn-primary:disabled { cursor: wait; opacity: .7; }
.btn-wide { width: 100%; }
.error { color: #a3312d; font-size: 13px; margin: 0 0 14px; }
@media (max-width: 560px) { .login-card { padding: 24px 20px; } }
@media (max-height: 520px) { .login-card { padding: 18px 20px; } .login-card > p { margin-bottom: 12px; } .field { margin-bottom: 10px; } }
</style>
