<script setup lang="ts">
import CrudPage from '../components/CrudPage.vue'
</script>
<template><CrudPage title="Clientes" description="Mantén centralizada la información de tus clientes." resource="clientes" :fields="[{ key: 'nombre', label: 'Nombre', required: true }, { key: 'telefono', label: 'Teléfono', required: true }, { key: 'direccion', label: 'Dirección' }]" /></template>