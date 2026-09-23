<script setup lang="ts">
import CrudPage from '../components/CrudPage.vue'
</script>
<template><CrudPage title="Proveedores" description="Gestiona tus proveedores y sus datos de contacto." resource="proveedores" :fields="[{ key: 'nombre', label: 'Nombre', required: true }, { key: 'telefono', label: 'Teléfono' }, { key: 'direccion', label: 'Dirección' }]" /></template>