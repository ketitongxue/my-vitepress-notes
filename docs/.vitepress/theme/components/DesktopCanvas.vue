<script setup>
import ProfileCard from './ProfileCard.vue'
import CurrentStatusCard from './CurrentStatusCard.vue'
import FeaturedProjectCard from './FeaturedProjectCard.vue'
import ProjectFolder from './ProjectFolder.vue'
import NotesLauncher from './NotesLauncher.vue'
import LabLauncher from './LabLauncher.vue'
import ContactTerminal from './ContactTerminal.vue'
import CanvasControls from './CanvasControls.vue'
</script>

<template>
  <div class="desktop-canvas">
    <div class="desktop-canvas__profile"><ProfileCard /></div>
    <div class="desktop-canvas__status"><CurrentStatusCard /></div>
    <div class="desktop-canvas__featured"><FeaturedProjectCard /></div>
    <div class="desktop-canvas__projects"><ProjectFolder /></div>
    <div class="desktop-canvas__notes"><NotesLauncher /></div>
    <div class="desktop-canvas__lab"><LabLauncher /></div>
    <div class="desktop-canvas__contact"><ContactTerminal /></div>
    <div class="desktop-canvas__controls"><CanvasControls /></div>
  </div>
</template>
