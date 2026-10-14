<script setup lang="ts">
import CrudPage from '../components/CrudPage.vue'
</script>

<template>
  <CrudPage
    title="Etiquetas"
    description="Crea y administra las etiquetas disponibles para los catálogos."
    resource="etiquetas"
    :fields="[
      { key: 'nombre', label: 'Nombre', required: true, placeholder: 'Ej.: Tecnología' },
      { key: 'descripcion', label: 'Descripción', type: 'textarea', placeholder: 'Describe brevemente esta etiqueta' },
    ]"
  />
</template>
