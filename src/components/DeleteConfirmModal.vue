<script setup lang="ts">
import { X, AlertTriangle } from 'lucide-vue-next'

const props = defineProps<{
  visible: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  loading?: boolean
  variant?: 'danger' | 'warning'
}>()

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

function handleConfirm() {
  emit('confirm')
}

function handleCancel() {
  emit('cancel')
}

function handleOverlayClick(event: MouseEvent) {
  if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
    handleCancel()
  }
}
</script>

<template>
  <Transition name="fade">
    <div v-if="props.visible" class="modal-overlay" @click="handleOverlayClick" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
      <div class="modal-container">
        <div class="modal-header">
          <div class="icon-wrapper" :class="`icon-${props.variant || 'danger'}`">
            <AlertTriangle :size="24" />
          </div>
          <h2 id="delete-modal-title" class="modal-title">{{ props.title }}</h2>
          <button class="close-button" type="button" aria-label="Cerrar" @click="handleCancel">
            <X :size="18" />
          </button>
        </div>

        <p class="modal-message">{{ props.message }}</p>

        <div class="modal-actions">
          <button class="btn btn-cancel" type="button" @click="handleCancel" :disabled="props.loading">
            {{ props.cancelText || 'Cancelar' }}
          </button>
          <button class="btn btn-confirm" type="button" @click="handleConfirm" :disabled="props.loading" :class="`btn-${props.variant || 'danger'}`">
            <span v-if="props.loading" class="loader">Cargando...</span>
            <span v-else>{{ props.confirmText || 'Eliminar' }}</span>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  animation: fadeIn 0.2s ease;
}

.modal-container {
  width: min(420px, 100%);
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.24);
  padding: 28px 24px;
  text-align: center;
  animation: slideUp 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  position: relative;
  margin-bottom: 8px;
}

.icon-wrapper {
  width: 56px;
  height: 56px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  flex-shrink: 0;
}

.icon-danger {
  background: #fef2f2;
  color: #dc2626;
}

.icon-warning {
  background: #fffbeb;
  color: #d97706;
}

.modal-title {
  margin: 0;
  font: 700 22px 'Space Grotesk', Arial, sans-serif;
  color: #171717;
  letter-spacing: -0.5px;
}

.close-button {
  position: absolute;
  top: 0;
  right: 0;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #999;
  cursor: pointer;
  transition: all 0.15s ease;
}

.close-button:hover {
  background: #f5f5f5;
  color: #333;
}

.modal-message {
  margin: 0 0 24px;
  color: #555;
  font-size: 14px;
  line-height: 1.55;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 120px;
  padding: 12px 20px;
  border: 0;
  border-radius: 10px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.18s ease;
  white-space: nowrap;
}

.btn:disabled {
  opacity: 0.6;
  cursor: wait;
}

.btn-cancel {
  background: #f0f0f0;
  color: #333;
}

.btn-cancel:hover:not(:disabled) {
  background: #e0e0e0;
}

.btn-confirm {
  background: #dc2626;
  color: #fff;
}

.btn-confirm:hover:not(:disabled) {
  background: #b91c1c;
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(220, 38, 38, 0.3);
}

.btn-warning {
  background: #d97706;
  color: #fff;
}

.btn-warning:hover:not(:disabled) {
  background: #b45309;
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(217, 119, 6, 0.3);
}

.loader {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.loader::before {
  content: '';
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(16px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-to,
.fade-leave-from {
  opacity: 1;
}
</style>