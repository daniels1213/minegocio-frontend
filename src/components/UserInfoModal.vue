<script setup lang="ts">
import { Mail, MessageCircle, RefreshCw, Shield, Store, Trash2, UserRound, X } from 'lucide-vue-next'
import type { Catalogo, Usuario } from '../api.ts'
import { formatDate } from '../date.ts'

const props = defineProps<{
  user: Usuario
  catalogs: Catalogo[]
  catalogsLoading: boolean
  catalogError: string
  removingCatalogId: number | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'refresh-catalogs'): void
  (e: 'delete-catalog', catalog: Catalogo): void
}>()
</script>

<template>
  <div class="modal-layer" @click.self="emit('close')">
    <section class="user-info-modal" role="dialog" aria-modal="true" aria-labelledby="user-info-title">
      <header class="modal-head">
        <div>
          <p class="eyebrow">Administración</p>
          <h2 id="user-info-title">Información del usuario</h2>
        </div>
        <button class="icon-close" type="button" aria-label="Cerrar" @click="emit('close')"><X :size="18" /></button>
      </header>

      <div class="user-summary">
        <img v-if="props.user.urlFotoPerfil" class="avatar" :src="props.user.urlFotoPerfil" :alt="`Foto de ${props.user.nombre}`" />
        <div v-else class="avatar placeholder"><UserRound :size="26" /></div>
        <div>
          <strong>{{ props.user.nombre }}</strong>
          <span>@{{ props.user.username }}</span>
        </div>
      </div>

      <dl class="details">
        <div><dt>Nombre</dt><dd>{{ props.user.nombre || '—' }}</dd></div>
        <div><dt>Apellido</dt><dd>{{ props.user.apellido || '—' }}</dd></div>
        <div><dt>Username</dt><dd>{{ props.user.username || '—' }}</dd></div>
        <div>
          <dt><Mail :size="15" /> Gmail</dt>
          <dd>{{ props.user.gmail || props.user.email || props.user.correo || '—' }}</dd>
        </div>
        <div>
          <dt><MessageCircle :size="15" /> WhatsApp</dt>
          <dd>{{ props.user.wapp || '—' }}</dd>
        </div>
        <div>
          <dt><Shield :size="15" /> Rol</dt>
          <dd>{{ props.user.rol }}</dd>
        </div>
        <div><dt>Fecha de creación</dt><dd>{{ formatDate(props.user.fechaCreacion) }}</dd></div>
      </dl>

      <section class="catalogs">
        <div class="catalog-heading">
          <h3><Store :size="17" /> Catálogos</h3>
          <button type="button" class="refresh" :disabled="props.catalogsLoading" @click="emit('refresh-catalogs')">
            <RefreshCw :size="15" :class="{ spin: props.catalogsLoading }" /> Actualizar
          </button>
        </div>
        <p v-if="props.catalogsLoading" class="catalog-state">Cargando catálogos...</p>
        <p v-else-if="props.catalogError" class="error">{{ props.catalogError }}</p>
        <p v-else-if="!props.catalogs.length" class="catalog-state">Este usuario aún no tiene catálogos.</p>
        <div v-else class="catalog-list">
          <article v-for="catalog in props.catalogs" :key="catalog.id" class="catalog-item">
            <img v-if="catalog.urlFotoPortada" :src="catalog.urlFotoPortada" :alt="`Portada de ${catalog.nombre}`" />
            <Store v-else :size="20" class="catalog-icon" />
            <div class="catalog-copy">
              <strong>{{ catalog.nombre }}</strong>
              <small>{{ catalog.descripcion || 'Sin descripción' }}</small>
            </div>
            <button
              class="catalog-delete"
              type="button"
              :disabled="props.removingCatalogId === catalog.id"
              :aria-label="`Eliminar catálogo ${catalog.nombre}`"
              @click="emit('delete-catalog', catalog)"
            >
              <Trash2 :size="15" /> Eliminar
            </button>
          </article>
        </div>
      </section>
    </section>
  </div>
</template>

<style scoped>
.modal-layer {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  overflow-y: auto;
  padding: 20px;
  background: rgba(15, 12, 10, .76);
  backdrop-filter: blur(5px);
}

.user-info-modal {
  width: min(620px, 100%);
  max-height: calc(100dvh - 40px);
  overflow-y: auto;
  padding: 24px;
  border: 1px solid #c65b19;
  border-radius: 16px;
  background: #f3e5d9;
  box-shadow: 0 24px 80px rgba(0, 0, 0, .45);
  color: #171717;
}

.modal-head,
.catalog-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.modal-head {
  margin: -24px -24px 20px;
  padding: 20px 24px;
  border-bottom: 4px solid #171717;
  border-radius: 15px 15px 0 0;
  background: linear-gradient(115deg, #e07836, #c65b19 72%);
}

.eyebrow {
  margin: 0;
  color: #3b1c0c;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .12em;
  text-transform: uppercase;
}

h2 {
  margin: 6px 0 0;
  color: #171717;
  font-size: 23px;
}

.icon-close {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  border: 1px solid rgba(23, 23, 23, .25);
  border-radius: 8px;
  background: rgba(255, 255, 255, .28);
  color: #171717;
  cursor: pointer;
}

.icon-close:hover {
  background: #c65b19;
  color: #171717;
}

.user-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border: 1px solid #171717;
  border-radius: 12px;
  background: #222;
}

.avatar {
  width: 48px;
  height: 48px;
  flex: 0 0 48px;
  object-fit: cover;
  border-radius: 50%;
}

.placeholder {
  display: grid;
  place-items: center;
  border: 2px solid #f3e5d9;
  background: #e07836;
  color: #171717;
}

.user-summary div:last-child {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.user-summary strong {
  color: #fffaf6;
  overflow-wrap: anywhere;
}

.user-summary span {
  color: #f3a181;
  font-size: 13px;
}

.details {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 14px 0 22px;
}

.details div {
  min-width: 0;
  padding: 12px;
  border: 1px solid #e0c3ad;
  border-radius: 10px;
  background: #fffaf6;
}

.details div:nth-child(3n + 2) {
  border-color: #e07836;
  background: #f8d8c1;
}

.details dt {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 5px;
  color: #8f3e13;
  font-size: 12px;
  font-weight: 700;
}

.details dd {
  margin: 0;
  color: #171717;
  overflow-wrap: anywhere;
  font-size: 14px;
  font-weight: 600;
}

.catalogs {
  padding: 16px;
  border: 1px solid #171717;
  border-radius: 12px;
  background: #292522;
}

.catalog-heading h3 {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0;
  color: #fff;
  font-size: 16px;
}

.refresh,
.catalog-delete {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid #e07836;
  border-radius: 8px;
  padding: 8px 10px;
  background: #f3a181;
  color: #171717;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.refresh:disabled,
.catalog-delete:disabled {
  opacity: .6;
  cursor: wait;
}

.catalog-list {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.catalog-item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 10px;
  border: 1px solid #76513a;
  border-radius: 10px;
  background: #3b3029;
}

.catalog-item img,
.catalog-icon {
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  object-fit: cover;
  border-radius: 8px;
  background: #f3a181;
  color: #171717;
}

.catalog-copy {
  display: grid;
  gap: 3px;
  min-width: 0;
  flex: 1;
}

.catalog-copy strong,
.catalog-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.catalog-copy strong {
  color: #fffaf6;
}

.catalog-copy small,
.catalog-state {
  color: #f3d9c7;
  font-size: 12px;
}

.catalog-delete {
  border-color: #f0aaa0;
  background: #f9e4df;
  color: #8f332b;
}

.error {
  color: #ffaaa0;
}

.catalog-state {
  margin: 12px 0 0;
}

.spin {
  animation: spin .8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 520px) {
  .user-info-modal {
    padding: 18px;
  }

  .modal-head {
    margin: -18px -18px 18px;
    padding: 18px;
  }

  .details {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .catalogs {
    padding: 12px;
  }

  .catalog-item {
    flex-wrap: wrap;
  }

  .catalog-copy {
    flex-basis: calc(100% - 60px);
  }

  .catalog-delete {
    margin-left: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .spin {
    animation: none;
  }
}
</style>
