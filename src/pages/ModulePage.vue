<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  title: string
  description: string
  icon: Component
}>()
</script>

<template>
  <section class="module-page">
    <div class="module-icon">
      <component :is="icon" :size="24" />
    </div>
    <p class="eyebrow">Módulo</p>
    <h2>{{ title }}</h2>
    <p class="module-description">{{ description }}</p>
  </section>
</template>

<style scoped>
.module-page { min-height: calc(100vh - 140px); display: grid; place-content: center; justify-items: center; padding: 32px 0; text-align: center; }
.module-icon { width: 56px; height: 56px; display: grid; place-items: center; border-radius: 16px; background: #e6f0eb; color: #247050; }
.eyebrow { color: #6c8175; font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
h2 { margin: 10px 0 8px; color: #17332a; font: 700 clamp(28px, 4vw, 42px) 'Space Grotesk', Arial, sans-serif; }
.module-description { max-width: 430px; margin: 0; color: #75847b; line-height: 1.55; }
</style>