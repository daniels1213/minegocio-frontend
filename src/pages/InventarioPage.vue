<script setup lang="ts">
import CrudPage from '../components/CrudPage.vue'
</script>
<template><CrudPage title="Inventario" description="Gestiona productos, precios y existencias de tu negocio." resource="productos" :fields="[{ key: 'nombre', label: 'Producto', required: true }, { key: 'descripcion', label: 'Descripción', type: 'textarea' }, { key: 'precioVenta', label: 'Precio de venta', type: 'number', required: true }]" /></template>