<script setup>
import FactoryBoot from './FactoryBoot.vue'
import SystemTopBar from './SystemTopBar.vue'
import DesktopCanvas from './DesktopCanvas.vue'
import { ref } from 'vue'

const homeEntering = ref(false)

function handleReveal() {
  homeEntering.value = true
}
</script>

<template>
  <FactoryBoot @reveal="handleReveal" />
  <main :class="['factory-home', { 'is-entering': homeEntering }]">
    <SystemTopBar />
    <DesktopCanvas />
  </main>
</template>
