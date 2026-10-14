<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { LoaderCircle, X } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  visible: boolean
  file: File | null
  aspectRatio?: number
  title?: string
}>(), {
  aspectRatio: 1,
  title: 'Ajustar imagen',
})

const emit = defineEmits<{
  (e: 'cancel'): void
  (e: 'crop', file: File): void
}>()

const stage = ref<HTMLElement | null>(null)
const imageElement = ref<HTMLImageElement | null>(null)
const source = ref('')
const stageSize = ref({ width: 0, height: 0 })
const naturalSize = ref({ width: 0, height: 0 })
const zoom = ref(1)
const offset = ref({ x: 0, y: 0 })
const cropping = ref(false)
const cropError = ref('')
let objectUrl = ''
let resizeObserver: ResizeObserver | undefined
let dragStart: { pointerX: number; pointerY: number; x: number; y: number } | undefined

const imageStyle = computed(() => {
  if (!naturalSize.value.width || !stageSize.value.width || !stageSize.value.height) return {}
  const scale = Math.max(
    stageSize.value.width / naturalSize.value.width,
    stageSize.value.height / naturalSize.value.height,
  ) * zoom.value
  return {
    width: `${naturalSize.value.width * scale}px`,
    height: `${naturalSize.value.height * scale}px`,
    left: `${offset.value.x}px`,
    top: `${offset.value.y}px`,
  }
})

const stageStyle = computed(() => ({
  aspectRatio: String(props.aspectRatio),
  width: `min(100%, 520px, calc(55dvh * ${props.aspectRatio}))`,
}))

watch(() => props.file, (file) => {
  if (objectUrl) URL.revokeObjectURL(objectUrl)
  objectUrl = file ? URL.createObjectURL(file) : ''
  source.value = objectUrl
  zoom.value = 1
  cropError.value = ''
  naturalSize.value = { width: 0, height: 0 }
})

watch(stage, (element) => {
  resizeObserver?.disconnect()
  if (!element) return
  resizeObserver = new ResizeObserver(([entry]) => {
    stageSize.value = {
      width: entry.contentRect.width,
      height: entry.contentRect.height,
    }
    clampOffset()
  })
  resizeObserver.observe(element)
}, { flush: 'post' })

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  if (objectUrl) URL.revokeObjectURL(objectUrl)
})

function baseScale() {
  if (!naturalSize.value.width || !stageSize.value.width || !stageSize.value.height) return 0
  return Math.max(
    stageSize.value.width / naturalSize.value.width,
    stageSize.value.height / naturalSize.value.height,
  )
}

function clampOffset() {
  const scale = baseScale() * zoom.value
  if (!scale) return
  const width = naturalSize.value.width * scale
  const height = naturalSize.value.height * scale
  offset.value = {
    x: Math.min(0, Math.max(stageSize.value.width - width, offset.value.x)),
    y: Math.min(0, Math.max(stageSize.value.height - height, offset.value.y)),
  }
}

function imageLoaded() {
  if (!imageElement.value) return
  if (stage.value) {
    const rect = stage.value.getBoundingClientRect()
    stageSize.value = { width: rect.width, height: rect.height }
  }
  naturalSize.value = {
    width: imageElement.value.naturalWidth,
    height: imageElement.value.naturalHeight,
  }
  zoom.value = 1
  requestAnimationFrame(() => {
    offset.value = {
      x: (stageSize.value.width - imageElement.value!.width) / 2,
      y: (stageSize.value.height - imageElement.value!.height) / 2,
    }
    clampOffset()
  })
}

function startDrag(event: PointerEvent) {
  if (!naturalSize.value.width) return
  stage.value?.setPointerCapture(event.pointerId)
  dragStart = {
    pointerX: event.clientX,
    pointerY: event.clientY,
    x: offset.value.x,
    y: offset.value.y,
  }
}

function drag(event: PointerEvent) {
  if (!dragStart) return
  offset.value = {
    x: dragStart.x + event.clientX - dragStart.pointerX,
    y: dragStart.y + event.clientY - dragStart.pointerY,
  }
  clampOffset()
}

function stopDrag() {
  dragStart = undefined
}

function changeZoom(value: number) {
  const previousScale = baseScale() * zoom.value
  if (!previousScale) return
  const centerX = (stageSize.value.width / 2 - offset.value.x) / previousScale
  const centerY = (stageSize.value.height / 2 - offset.value.y) / previousScale
  zoom.value = value
  const nextScale = baseScale() * zoom.value
  offset.value = {
    x: stageSize.value.width / 2 - centerX * nextScale,
    y: stageSize.value.height / 2 - centerY * nextScale,
  }
  clampOffset()
}

async function confirmCrop() {
  const image = imageElement.value
  const file = props.file
  const scale = baseScale() * zoom.value
  if (!image || !file || !scale || !stageSize.value.width || !stageSize.value.height) return

  cropping.value = true
  try {
    const outputWidth = props.aspectRatio >= 1 ? 1600 : Math.round(1600 * props.aspectRatio)
    const outputHeight = Math.round(outputWidth / props.aspectRatio)
    const canvas = document.createElement('canvas')
    canvas.width = outputWidth
    canvas.height = outputHeight
    const context = canvas.getContext('2d')
    if (!context) throw new Error('No se pudo preparar el recorte de la imagen.')

    const sourceX = -offset.value.x / scale
    const sourceY = -offset.value.y / scale
    const sourceWidth = stageSize.value.width / scale
    const sourceHeight = stageSize.value.height / scale
    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, outputWidth, outputHeight)

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result)
        else reject(new Error('No se pudo generar el recorte de la imagen.'))
      }, 'image/jpeg', 0.92)
    })
    const fileName = file.name.replace(/\.[^.]+$/, '') || 'imagen'
    emit('crop', new File([blob], `${fileName}-recortada.jpg`, { type: 'image/jpeg' }))
  } catch (reason) {
    cropError.value = reason instanceof Error ? reason.message : 'No se pudo recortar la imagen.'
  } finally {
    cropping.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="props.visible && source" class="crop-overlay" @click.self="emit('cancel')" @keydown.esc="emit('cancel')">
      <section class="crop-dialog" role="dialog" aria-modal="true" aria-labelledby="image-crop-title">
        <header>
          <div><p class="eyebrow">Imagen</p><h2 id="image-crop-title">{{ props.title }}</h2></div>
          <button class="close" type="button" aria-label="Cancelar recorte" @click="emit('cancel')"><X :size="19" /></button>
        </header>
        <p class="help">Arrastra la imagen para elegir el encuadre y usa el control para acercar o alejar.</p>
        <div
          ref="stage"
          class="crop-stage"
          :style="stageStyle"
          @pointerdown="startDrag"
          @pointermove="drag"
          @pointerup="stopDrag"
          @pointercancel="stopDrag"
          @lostpointercapture="stopDrag"
        >
          <img ref="imageElement" :src="source" alt="Vista previa del recorte" :style="imageStyle" draggable="false" @load="imageLoaded" />
          <span class="crop-guide" aria-hidden="true"></span>
        </div>
        <label class="zoom-control">Zoom
          <input :value="zoom" type="range" min="1" max="3" step="0.01" :disabled="!naturalSize.width || cropping" @input="changeZoom(Number(($event.target as HTMLInputElement).value))" />
        </label>
        <p v-if="cropError" class="crop-error" role="alert">{{ cropError }}</p>
        <footer>
          <button class="secondary" type="button" :disabled="cropping" @click="emit('cancel')">Cancelar</button>
          <button class="primary" type="button" :disabled="cropping || !naturalSize.width" @click="confirmCrop"><LoaderCircle v-if="cropping" class="spin" :size="16" /><span>{{ cropping ? 'Preparando...' : 'Usar este encuadre' }}</span></button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.crop-overlay{position:fixed;inset:0;z-index:300;display:grid;place-items:center;overflow-y:auto;padding:18px;background:rgba(0,0,0,.72)}
.crop-dialog{width:min(620px,100%);max-height:calc(100dvh - 36px);overflow:auto;padding:22px;border-radius:16px;background:#fff;box-shadow:0 20px 60px rgba(0,0,0,.3);color:#171717}
.crop-dialog>header,.crop-dialog>footer{display:flex;align-items:center;justify-content:space-between;gap:12px}
.eyebrow{margin:0;color:#777;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
h2{margin:6px 0 0;font-size:22px;color:#171717}
.close{display:grid;place-items:center;width:36px;height:36px;border:0;border-radius:9px;background:#fff6f0;color:#c65b19;cursor:pointer}
.help{margin:16px 0;color:#777;font-size:13px;line-height:1.5}
.crop-stage{position:relative;max-height:55dvh;margin:auto;overflow:hidden;background:#000;touch-action:none;cursor:grab}
.crop-stage:active{cursor:grabbing}
.crop-stage img{position:absolute;max-width:none;max-height:none;user-select:none;pointer-events:none}
.crop-guide{position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 0 1px #ffffffc9,inset 0 0 0 2px rgba(0,0,0,.4)}
.zoom-control{display:grid;grid-template-columns:44px minmax(0,1fr);align-items:center;gap:12px;margin:18px 0;color:#333;font-size:13px;font-weight:700}
.zoom-control input{width:100%;accent-color:#c65b19}
.crop-error{margin:0;color:#a8584e;font-size:13px}
.crop-dialog>footer{justify-content:flex-end;margin-top:18px}
.primary,.secondary{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:40px;padding:10px 14px;border:0;border-radius:9px;font-weight:700;cursor:pointer}
.primary{background:#171717;color:#fff}.secondary{background:#fff6f0;color:#c65b19}
button:disabled{opacity:.6;cursor:wait}
.spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:520px){.crop-dialog{padding:18px}.crop-dialog>footer button{flex:1}}
</style>
