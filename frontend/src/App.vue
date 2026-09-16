<template>
  <div id="app">
    <h1>Welcome to My Frontend Project</h1>
    <p>This is the main application component.</p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'App',
});
</script>

<style scoped>
#app {
  text-align: center;
  margin-top: 50px;
}
</style>