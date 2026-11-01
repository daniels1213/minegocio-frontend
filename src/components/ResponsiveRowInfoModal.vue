<script setup lang="ts">
import { X } from 'lucide-vue-next'

defineProps<{
  title: string
  fields: Array<{ label: string; value: string | number }>
}>()
const emit = defineEmits<{ (event: 'close'): void }>()
</script>

<template>
  <div class="info-layer" @click.self="emit('close')">
    <section class="info-modal" role="dialog" aria-modal="true" :aria-label="`Información de ${title}`">
      <header><div><p class="eyebrow">Información</p><h3>{{ title }}</h3></div><button type="button" aria-label="Cerrar" @click="emit('close')"><X :size="18" /></button></header>
      <dl>
        <div v-for="field in fields" :key="field.label"><dt>{{ field.label }}</dt><dd>{{ field.value || '—' }}</dd></div>
      </dl>
      <footer><button type="button" @click="emit('close')">Cerrar</button></footer>
    </section>
  </div>
</template>

<style scoped>
.info-layer{position:fixed;inset:0;z-index:150;display:grid;place-items:center;overflow-y:auto;padding:16px;background:rgba(0,0,0,.62)}
.info-modal{width:min(480px,100%);max-height:calc(100dvh - 32px);overflow:auto;padding:20px;border:1px solid #e8e8e8;border-radius:14px;background:#fff;box-shadow:0 20px 60px rgba(0,0,0,.24)}
header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding-bottom:14px;border-bottom:1px solid #eee}
.eyebrow{margin:0;color:#c65b19;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
h3{margin:5px 0 0;color:#171717;font-size:20px;overflow-wrap:anywhere}
header button{display:grid;place-items:center;width:34px;height:34px;flex:0 0 auto;border:0;border-radius:7px;background:#f5f5f5;color:#666;cursor:pointer}
dl{display:grid;gap:0;margin:6px 0 16px}
dl>div{display:grid;grid-template-columns:minmax(105px,.7fr) minmax(0,1.3fr);gap:12px;padding:12px 0;border-bottom:1px solid #f0f0f0}
dt{color:#777;font-size:12px;font-weight:700}
dd{margin:0;color:#222;font-size:13px;overflow-wrap:anywhere}
footer{display:flex;justify-content:flex-end}
footer button{padding:9px 14px;border:0;border-radius:8px;background:#fff6f0;color:#c65b19;font:inherit;font-weight:700;cursor:pointer}
@media(max-width:380px){.info-modal{padding:16px}dl>div{grid-template-columns:1fr;gap:4px}}
</style>
