<script setup>
defineProps({
  title: { type: String, default: '关键提示' },
  tone: { type: String, default: 'note', validator: (value) => ['note', 'warning'].includes(value) },
})
</script>

<template>
  <aside class="reading-insight" :data-tone="tone" :aria-label="title">
    <p class="reading-insight__title">{{ title }}</p>
    <div><slot /></div>
  </aside>
</template>
