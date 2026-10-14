<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { ArrowLeft, Mail, MessageCircle } from 'lucide-vue-next'

const props = defineProps<{
  page: 'terms' | 'privacy'
}>()

const isPrivacy = computed(() => props.page === 'privacy')
const title = computed(() => isPrivacy.value ? 'Política de privacidad' : 'Términos de uso')
const previousTitle = document.title

onMounted(() => {
  document.title = `${title.value} | CatalogosZone`
})

onUnmounted(() => {
  document.title = previousTitle
})
</script>

<template>
  <main class="legal-page">
    <header class="legal-header">
      <a href="/" class="legal-brand">CatalogosZone</a>
      <a href="/" class="legal-back"><ArrowLeft :size="16" /> Volver a catálogos</a>
    </header>

    <article class="legal-content">
      <p class="legal-eyebrow">CatalogosZone · Cuba</p>
      <h1>{{ title }}</h1>
      <p class="legal-updated">Última actualización: 3 de octubre de 2026</p>

      <template v-if="!isPrivacy">
        <p>CatalogosZone es una plataforma para descubrir catálogos digitales y conocer negocios. Al navegar por el sitio, solicitar un catálogo o utilizar una cuenta, aceptas estos términos. Si no estás de acuerdo, deja de utilizar el servicio.</p>

        <h2>1. Qué ofrece el sitio</h2>
        <p>El sitio permite consultar catálogos publicados y, a los negocios, solicitar su incorporación. La solicitud se prepara en el navegador y se envía mediante WhatsApp solo cuando la persona confirma el envío allí. CatalogosZone no es vendedor ni intermediario de las compras, pagos, entregas, garantías o devoluciones que acuerden los visitantes con cada negocio.</p>

        <h2>2. Catálogos y responsabilidad de los negocios</h2>
        <p>Quien administra un catálogo es responsable de tener autorización para publicar su contenido y de mantener correctos sus productos, precios, disponibilidad, datos de contacto, imágenes y descripciones. Los catálogos activos pueden ser visibles públicamente. Los visitantes deben confirmar directamente con el negocio cualquier condición antes de comprar.</p>

        <h2>3. Uso aceptable</h2>
        <p>No está permitido utilizar el servicio para actividades ilegales, publicar contenido engañoso o que infrinja derechos de terceros, intentar acceder sin autorización a cuentas o sistemas, ni interferir con el funcionamiento o la seguridad del sitio. El administrador puede ocultar contenido o suspender el acceso ante un uso que incumpla estas condiciones o perjudique a otras personas.</p>

        <h2>4. Cuentas, disponibilidad y cambios</h2>
        <p>Las personas usuarias deben proteger sus credenciales y avisar si sospechan que alguien accedió a su cuenta. El sitio puede cambiar o interrumpir funciones por mantenimiento, seguridad o mejoras; no se garantiza disponibilidad continua ni que la información publicada por terceros esté siempre actualizada.</p>

        <h2>5. Enlaces y servicios externos</h2>
        <p>El sitio puede enlazar a WhatsApp y a páginas de terceros. Esos servicios tienen sus propios términos y políticas; CatalogosZone no controla su disponibilidad ni sus prácticas.</p>

        <h2>6. Contacto</h2>
        <p>Para consultas sobre estos términos, escribe a <a href="mailto:danielsocorro111@gmail.com">danielsocorro111@gmail.com</a> o por WhatsApp al <a href="https://wa.me/5359292460" target="_blank" rel="noopener noreferrer">+53 59292460</a>.</p>
      </template>

      <template v-else>
        <p>Esta política explica qué información puede tratar CatalogosZone y cómo se utiliza. El sitio es operado desde Cuba y se sirve mediante Netlify (sitio web) y Render (servicio de backend). Si tienes preguntas o deseas ejercer una solicitud sobre tus datos, utiliza los contactos indicados al final.</p>

        <h2>1. Información que se trata</h2>
        <ul>
          <li><strong>Solicitud de catálogo:</strong> nombre, WhatsApp, tipo de catálogo y descripción que escribas en el formulario. El formulario abre WhatsApp con un mensaje preparado; no lo envía automáticamente ni lo transmite al backend del sitio. Solo si confirmas el envío, WhatsApp recibe el mensaje y el operador del sitio puede verlo.</li>
          <li><strong>Cuentas de negocio:</strong> credenciales e información que se introduce al crear o administrar una cuenta, además de los catálogos y registros de productos que la persona usuaria decide gestionar.</li>
          <li><strong>Contenido público:</strong> nombre, descripción, imágenes, etiquetas y demás datos de los catálogos marcados como activos pueden mostrarse a cualquier visitante.</li>
          <li><strong>Datos técnicos:</strong> Netlify y Render pueden procesar datos de conexión y registros técnicos necesarios para servir, proteger y diagnosticar el sitio, según sus configuraciones y políticas.</li>
        </ul>

        <h2>2. Para qué se utiliza</h2>
        <p>La información se utiliza para responder solicitudes de incorporación, autenticar cuentas, administrar catálogos y sus datos, mostrar públicamente el contenido que el negocio activa y mantener la seguridad y el funcionamiento del servicio. No se vende la información personal como una lista de contactos.</p>

        <h2>3. Almacenamiento y servicios externos</h2>
        <p>El frontend se publica en Netlify y el backend se aloja en Render. Al solicitar un catálogo, el envío final depende de WhatsApp y queda sujeto a sus condiciones y política de privacidad. Estos proveedores pueden procesar datos técnicos necesarios para ofrecer sus servicios. La ubicación y retención de esos registros dependen de la configuración del servicio y de cada proveedor; la información puede procesarse fuera de Cuba.</p>
        <p>Para iniciar sesión, las credenciales se conservan temporalmente en el almacenamiento de sesión del navegador y se utilizan para autenticar las solicitudes al backend. La codificación usada en el navegador no es cifrado; evita utilizar la cuenta desde un dispositivo compartido y cierra la sesión al terminar.</p>

        <h2>4. Acceso, conservación y solicitudes</h2>
        <p>La información de cuenta y los datos de negocio se mantienen mientras sean necesarios para ofrecer las funciones solicitadas. No se publica en este momento un plazo fijo de conservación para los registros técnicos de los proveedores. Puedes solicitar acceso, corrección o eliminación de información escribiendo al contacto del operador; la solicitud se revisará y atenderá cuando sea posible y conforme a las obligaciones aplicables.</p>

        <h2>5. Seguridad y enlaces externos</h2>
        <p>Se aplican medidas técnicas razonables para operar el servicio, pero ningún sistema conectado a Internet puede garantizar seguridad absoluta. Los enlaces externos, incluido WhatsApp, se rigen por las prácticas del proveedor correspondiente.</p>

        <h2>6. Menores y cambios</h2>
        <p>El sitio no está dirigido intencionalmente a menores ni solicita que envíen datos personales de menores. Esta política puede actualizarse cuando cambien las funciones o las prácticas del servicio; la fecha de actualización se indicará en esta página.</p>

        <h2>7. Contacto del operador</h2>
        <p>Para preguntas, correcciones o solicitudes sobre privacidad, contacta al operador de CatalogosZone: <a href="mailto:danielsocorro111@gmail.com"><Mail :size="14" /> danielsocorro111@gmail.com</a> o <a href="https://wa.me/5359292460" target="_blank" rel="noopener noreferrer"><MessageCircle :size="14" /> +53 59292460</a>.</p>
      </template>

      <aside class="legal-note">
        Estos textos describen las funciones y los datos identificados actualmente en el sitio. Antes de usar la plataforma para operaciones comerciales a mayor escala, conviene revisar los textos con asesoría jurídica local y confirmar los plazos y ajustes de privacidad de Netlify y Render.
      </aside>
    </article>

    <footer class="legal-footer">© {{ new Date().getFullYear() }} CatalogosZone</footer>
  </main>
</template>

<style scoped>
.legal-page { min-height: 100vh; background: #faf9f7; color: #272727; }
.legal-header { display: flex; align-items: center; justify-content: space-between; gap: 18px; min-height: 72px; padding: 0 6%; border-bottom: 1px solid #e7e2dd; background: #fff; }
.legal-brand { color: #171717; font-size: 18px; font-weight: 900; text-decoration: none; }
.legal-back { display: inline-flex; align-items: center; gap: 7px; color: #8f3e13; font-size: 13px; font-weight: 700; text-decoration: none; }
.legal-content { width: min(100% - 36px, 820px); margin: 0 auto; padding: 48px 0 64px; }
.legal-eyebrow { margin: 0 0 10px; color: #a34716; font-size: 11px; font-weight: 900; letter-spacing: .13em; text-transform: uppercase; }
.legal-content h1 { margin: 0; color: #171717; font-size: clamp(30px, 5vw, 42px); line-height: 1.1; letter-spacing: -.04em; }
.legal-updated { margin: 12px 0 30px; color: #777; font-size: 12px; }
.legal-content h2 { margin: 30px 0 9px; color: #242424; font-size: 17px; }
.legal-content p, .legal-content li { color: #555; font-size: 14px; line-height: 1.8; }
.legal-content p { margin: 0 0 14px; }
.legal-content ul { display: grid; gap: 10px; padding-left: 22px; }
.legal-content a { display: inline-flex; align-items: center; gap: 5px; color: #984210; font-weight: 700; overflow-wrap: anywhere; }
.legal-note { margin-top: 34px; padding: 16px 18px; border-left: 3px solid #c65b19; background: #fff3eb; color: #69452f; font-size: 12px; line-height: 1.7; }
.legal-footer { padding: 18px 6%; border-top: 1px solid #e7e2dd; color: #888; font-size: 11px; text-align: center; }
@media (max-width: 560px) {
  .legal-header { min-height: 64px; padding: 0 18px; }
  .legal-content { padding: 34px 0 48px; }
  .legal-content p, .legal-content li { font-size: 13px; }
  .legal-back { font-size: 12px; }
}
</style>
