<script setup>
defineProps({
  label: { type: String, default: '执行步骤' },
})
</script>

<template>
  <ol class="reading-steps" role="list" :aria-label="label"><slot /></ol>
</template>
